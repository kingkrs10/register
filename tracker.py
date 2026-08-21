"""
MicroBountyHarvest - Tracker & Status Auditor Module
Autonomously checks and tracks live status of open and solved cases daily.
Verifies issue states (open/closed), PR statuses (open/merged/closed), maintainer activity, and generates status reports.
"""

import datetime
import json
import os
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Tuple

import config


def get_ssl_context() -> ssl.SSLContext:
    """Returns SSL context that bypasses macOS certificate verification issues."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def make_github_request(url: str) -> Tuple[int, Dict[str, Any]]:
    """Makes an authenticated GitHub REST API request."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "Accept": "application/vnd.github.v3+json",
    }
    if config.GITHUB_TOKEN:
        headers["Authorization"] = f"token {config.GITHUB_TOKEN}"

    ctx = get_ssl_context()
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, context=ctx) as resp:
            data = json.loads(resp.read().decode())
            return resp.status, data
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception as e:
        return 0, {}


class BountyTracker:
    def __init__(self):
        self.ctx = get_ssl_context()

    def audit_open_bounties(self, max_check: int = 50) -> Dict[str, Any]:
        """
        Audits all open bounties in open_bounties.json:
        - Verifies live GitHub issue status (open vs closed)
        - Checks comment count and activity
        - Archives closed/stale bounties
        """
        if not config.OPEN_BOUNTIES_FILE.exists():
            return {"total": 0, "active_open": 0, "closed_stale": 0, "items": []}

        try:
            with open(config.OPEN_BOUNTIES_FILE, "r", encoding="utf-8") as f:
                open_list = json.load(f)
        except Exception:
            open_list = []

        if not open_list:
            return {"total": 0, "active_open": 0, "closed_stale": 0, "items": []}

        # Deduplicate
        seen = set()
        unique_open = []
        for b in open_list:
            b_id = b.get("id") or f"{b.get('repo_owner')}/{b.get('repo_name')}#{b.get('issue_number')}"
            if b_id not in seen:
                seen.add(b_id)
                unique_open.append(b)

        print(f"[*] Auditing {min(len(unique_open), max_check)}/{len(unique_open)} open micro-bounty cases on GitHub...")

        active_open = []
        closed_stale = []
        total_open_value = 0.0

        for idx, b in enumerate(unique_open[:max_check]):
            owner = b.get("repo_owner")
            repo = b.get("repo_name")
            issue_num = b.get("issue_number")

            if not owner or not repo or not issue_num:
                active_open.append(b)
                total_open_value += b.get("reward_usd", 0.0)
                continue

            issue_url = f"https://api.github.com/repos/{owner}/{repo}/issues/{issue_num}"
            status_code, data = make_github_request(issue_url)

            if status_code == 200 and data:
                live_state = data.get("state", "open")
                comments_count = data.get("comments", 0)
                is_locked = data.get("locked", False)

                b["live_status"] = live_state
                b["comments_count"] = comments_count
                b["last_audited"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

                if live_state == "open" and not is_locked:
                    active_open.append(b)
                    total_open_value += b.get("reward_usd", 0.0)
                else:
                    b["close_reason"] = "issue_closed" if live_state != "open" else "issue_locked"
                    closed_stale.append(b)
            else:
                # If rate limited or network error, keep item as open
                active_open.append(b)
                total_open_value += b.get("reward_usd", 0.0)

        # Include remaining unchecked items
        for b in unique_open[max_check:]:
            active_open.append(b)
            total_open_value += b.get("reward_usd", 0.0)

        # Update open_bounties.json with active only
        with open(config.OPEN_BOUNTIES_FILE, "w", encoding="utf-8") as f:
            json.dump(active_open, f, indent=2)

        return {
            "total_audited": len(unique_open[:max_check]),
            "active_open_count": len(active_open),
            "closed_stale_count": len(closed_stale),
            "total_open_potential_usd": total_open_value,
            "active_items": active_open,
            "closed_items": closed_stale,
        }

    def audit_solved_bounties(self) -> Dict[str, Any]:
        """
        Audits all solved bounties in solved_bounties.json:
        - Deduplicates records
        - Verifies upstream issue state
        - Verifies PR state (open, merged, closed) if submitted
        - Categorizes cases into: Ready to Claim, Submitted PR, Merged/Won, Closed
        """
        if not config.SOLVED_BOUNTIES_FILE.exists():
            return {
                "total_solved": 0,
                "ready_to_claim": 0,
                "pr_open": 0,
                "pr_merged": 0,
                "closed": 0,
                "items": [],
            }

        try:
            with open(config.SOLVED_BOUNTIES_FILE, "r", encoding="utf-8") as f:
                solved_list = json.load(f)
        except Exception:
            solved_list = []

        if not solved_list:
            return {
                "total_solved": 0,
                "ready_to_claim": 0,
                "pr_open": 0,
                "pr_merged": 0,
                "closed": 0,
                "items": [],
            }

        # Deduplicate by repo_owner/repo_name#issue_number
        unique_solved = {}
        for s in solved_list:
            key = f"{s.get('repo_owner')}/{s.get('repo_name')}#{s.get('issue_number')}"
            unique_solved[key] = s

        print(f"[*] Auditing {len(unique_solved)} solved micro-bounty cases on GitHub...")

        audited_solved = []
        ready_to_claim = []
        pr_open = []
        pr_merged = []
        closed_cases = []
        total_solved_value = 0.0
        total_merged_value = 0.0

        for key, s in unique_solved.items():
            owner = s.get("repo_owner")
            repo = s.get("repo_name")
            num = s.get("issue_number")
            pr_url = s.get("pr_url")
            reward_usd = s.get("reward_usd", 0.0)
            total_solved_value += reward_usd

            issue_state = "open"
            pr_state = "none"

            # Check upstream issue state
            if owner and repo and num:
                issue_api = f"https://api.github.com/repos/{owner}/{repo}/issues/{num}"
                status_code, data = make_github_request(issue_api)
                if status_code == 200 and data:
                    issue_state = data.get("state", "open")
                    s["issue_live_state"] = issue_state
                    s["issue_comments"] = data.get("comments", 0)

            # Check PR state if PR exists
            if pr_url and "/pull/" in pr_url:
                pr_parts = pr_url.split("/pull/")[-1].split("/")
                pr_num = pr_parts[0] if pr_parts else ""
                if pr_num and owner and repo:
                    pr_api = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_num}"
                    status_code, pr_data = make_github_request(pr_api)
                    if status_code == 200 and pr_data:
                        if pr_data.get("merged", False):
                            pr_state = "merged"
                        else:
                            pr_state = pr_data.get("state", "open")
                        s["pr_live_state"] = pr_state

            s["last_audited"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

            # Categorization
            if pr_state == "merged":
                s["tracking_status"] = "merged"
                pr_merged.append(s)
                total_merged_value += reward_usd
            elif pr_url and pr_state == "open":
                s["tracking_status"] = "pr_submitted"
                pr_open.append(s)
            elif not pr_url and issue_state == "open":
                s["tracking_status"] = "ready_to_claim"
                ready_to_claim.append(s)
            else:
                s["tracking_status"] = "closed"
                closed_cases.append(s)

            audited_solved.append(s)

        # Write clean deduplicated list back to solved_bounties.json
        with open(config.SOLVED_BOUNTIES_FILE, "w", encoding="utf-8") as f:
            json.dump(audited_solved, f, indent=2)

        return {
            "total_solved_unique": len(audited_solved),
            "ready_to_claim_count": len(ready_to_claim),
            "pr_open_count": len(pr_open),
            "pr_merged_count": len(pr_merged),
            "closed_count": len(closed_cases),
            "total_solved_value_usd": total_solved_value,
            "total_merged_value_usd": total_merged_value,
            "ready_to_claim_items": ready_to_claim,
            "pr_open_items": pr_open,
            "pr_merged_items": pr_merged,
            "closed_items": closed_cases,
            "all_items": audited_solved,
        }

    def generate_daily_report(self) -> Dict[str, Any]:
        """Runs full autonomous check of both open and solved cases, saving structured report."""
        timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        print(f"\n{'='*60}")
        print(f"  AUTONOMOUS DAILY BOUNTY STATUS CHECK [{timestamp}]")
        print(f"{'='*60}\n")

        open_report = self.audit_open_bounties(max_check=50)
        solved_report = self.audit_solved_bounties()

        report = {
            "report_timestamp": timestamp,
            "open_cases_summary": {
                "active_open_count": open_report["active_open_count"],
                "closed_stale_filtered": open_report["closed_stale_count"],
                "total_potential_usd": open_report["total_open_potential_usd"],
            },
            "solved_cases_summary": {
                "total_solved_cases": solved_report["total_solved_unique"],
                "ready_to_claim": solved_report["ready_to_claim_count"],
                "pr_submitted_open": solved_report["pr_open_count"],
                "pr_merged_claimed": solved_report["pr_merged_count"],
                "closed_or_stale": solved_report["closed_count"],
                "total_solved_value_usd": solved_report["total_solved_value_usd"],
                "total_merged_value_usd": solved_report["total_merged_value_usd"],
            },
            "solved_cases_detail": solved_report.get("all_items", []),
        }

        # Save JSON report
        report_path = config.DATA_DIR / "daily_status_report.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        # Generate Markdown status report
        md_content = self.render_markdown_report(report)
        md_path = config.DATA_DIR / "daily_status_report.md"
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_content)

        print(f"[+] Daily status report saved to:")
        print(f"    - JSON: {report_path}")
        print(f"    - Markdown: {md_path}\n")

        self.print_console_summary(report)
        return report

    def render_markdown_report(self, report: Dict[str, Any]) -> str:
        """Renders report as a clean GitHub flavored markdown document."""
        ts = report.get("report_timestamp", "")
        open_sum = report.get("open_cases_summary", {})
        solved_sum = report.get("solved_cases_summary", {})
        solved_items = report.get("solved_cases_detail", [])

        lines = [
            f"# 🎯 MicroBountyHarvest - Daily Status Report",
            f"*Generated on: `{ts}`*",
            "",
            "## 📊 Executive Summary",
            "",
            "| Metric | Value |",
            "|---|---|",
            f"| **Active Open Bounties** | **{open_sum.get('active_open_count', 0)}** |",
            f"| **Open Bounty Pipeline Value** | **${open_sum.get('total_potential_usd', 0):,.2f}** |",
            f"| **Total Solved Bounties** | **{solved_sum.get('total_solved_cases', 0)}** |",
            f"| **Solved Bounties Value** | **${solved_sum.get('total_solved_value_usd', 0):,.2f}** |",
            f"| **Ready to Claim (Local Fix Tested)** | **{solved_sum.get('ready_to_claim', 0)}** |",
            f"| **PRs Submitted & Pending Review** | **{solved_sum.get('pr_submitted_open', 0)}** |",
            f"| **PRs Merged / Payout Won** | **{solved_sum.get('pr_merged_claimed', 0)}** |",
            f"| **Closed / Inactive Cases** | **{solved_sum.get('closed_or_stale', 0)}** |",
            "",
            "## 🛠️ Solved Cases Live Status Breakdown",
            "",
            "| # | Target Repo & Issue | Platform | Reward | Live Issue State | Tracking Status | PR Link |",
            "|---|---|---|---|---|---|---|",
        ]

        for idx, item in enumerate(solved_items, 1):
            repo = f"{item.get('repo_owner')}/{item.get('repo_name')}#{item.get('issue_number')}"
            plat = item.get("platform", "algora") or "algora"
            reward = item.get("reward_formatted", "$?")
            issue_st = item.get("issue_live_state", "open")
            track_st = item.get("tracking_status", "ready_to_claim")
            pr_url = item.get("pr_url")
            pr_link = f"[PR Link]({pr_url})" if pr_url else "Not Submitted"

            status_badge = {
                "ready_to_claim": "🟢 Ready to Claim",
                "pr_submitted": "🟡 PR Open",
                "merged": "🏆 Merged / Won",
                "closed": "⚪ Closed",
            }.get(track_st, track_st)

            lines.append(f"| {idx} | `{repo}` | {plat} | **{reward}** | `{issue_st}` | {status_badge} | {pr_link} |")

        lines.extend([
            "",
            "## 🚀 Actionable Next Steps",
            "- Run `python main.py --claim` to submit pull requests for **Ready to Claim** cases in dry-run or live mode.",
            "- Run `python main.py --solve` to pick the next highest-scoring open bounty and generate verified patches.",
            "- Run `python main.py --status` anytime to refresh live GitHub status.",
        ])

        return "\n".join(lines)

    def print_console_summary(self, report: Dict[str, Any]):
        """Prints clean terminal summary."""
        open_sum = report.get("open_cases_summary", {})
        solved_sum = report.get("solved_cases_summary", {})

        print(f"┌────────────────────────────────────────────────────────┐")
        print(f"│               DAILY STATUS SUMMARY                     │")
        print(f"├────────────────────────────────────────────────────────┤")
        print(f"│  Active Open Cases:      {open_sum.get('active_open_count', 0):<5} (${open_sum.get('total_potential_usd', 0):>8,.2f} total value)   │")
        print(f"│  Stale Filtered:         {open_sum.get('closed_stale_filtered', 0):<5}                                │")
        print(f"│  Unique Solved Cases:    {solved_sum.get('total_solved_cases', 0):<5} (${solved_sum.get('total_solved_value_usd', 0):>8,.2f} total value)   │")
        print(f"│    - Ready to Claim:     {solved_sum.get('ready_to_claim', 0):<5}                                │")
        print(f"│    - PRs Submitted:      {solved_sum.get('pr_submitted_open', 0):<5}                                │")
        print(f"│    - PRs Merged / Won:   {solved_sum.get('pr_merged_claimed', 0):<5}                                │")
        print(f"│    - Closed / Stale:     {solved_sum.get('closed_or_stale', 0):<5}                                │")
        print(f"└────────────────────────────────────────────────────────┘")


def run_status_check() -> Dict[str, Any]:
    """Convenience entrypoint function."""
    tracker = BountyTracker()
    return tracker.generate_daily_report()


if __name__ == "__main__":
    run_status_check()
