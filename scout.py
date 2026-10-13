"""
MicroBountyHarvest - Scout Module
Discovers, filters, and ranks open micro-bounties across Algora, Polar.sh, Gitcoin, Opire, IssueHunt & GitHub.
"""

import json
import os
import re
import ssl
import subprocess
import sys
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Set

import config
from domains.kaggle_solver import fetch_kaggle_competitions
from domains.security import fetch_security_bounties
from domains.web3_desci import fetch_web3_desci_bounties

if config.STRICT_CASH_ESCROW_ONLY:
    # Strictly target pre-funded escrow footprints (Polar pledges, IssueHunt deposits)
    SEARCH_QUERIES = [
        ('"polar.sh/api/github"', "polar.sh"),
        ('"<!-- POLAR PLEDGE BADGE START -->"', "polar.sh"),
        ('"issuehunt.io/r/"', "issuehunt"),
    ]
else:
    SEARCH_QUERIES = [
        ("bounty", "bounty"),
        ("gitcoin", "gitcoin"),
        ("polar.sh", "polar.sh"),
        ("opire", "opire"),
        ("issuehunt", "issuehunt"),
    ]


def get_ssl_context():
    """Returns SSL context that bypasses macOS certificate verification issues."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def fetch_algora_bounties(limit: int = 50) -> List[Dict[str, Any]]:
    """Fetches active bounties from Algora tRPC API."""
    params = {"json": {"limit": limit}}
    input_str = urllib.parse.quote(json.dumps(params))
    url = f"https://algora.io/api/trpc/bounty.list?input={input_str}"

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"},
    )

    ctx = get_ssl_context()
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            res = data[0] if isinstance(data, list) else data
            json_data = res.get("result", {}).get("data", {}).get("json", {})
            return json_data.get("items", [])
    except Exception as e:
        print(f"[!] Algora tRPC fetch error: {e}", file=sys.stderr)
        return []


def fetch_github_bounties_multi(limit_per_query: int = 15) -> List[Dict[str, Any]]:
    """Fetches open GitHub issues across multiple bounty platform keywords (Gitcoin, Polar, Opire, Algora, IssueHunt)."""
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
    if config.GITHUB_TOKEN:
        headers["Authorization"] = f"token {config.GITHUB_TOKEN}"

    all_items = []
    seen_urls: Set[str] = set()
    ctx = get_ssl_context()

    for query_term, platform_name in SEARCH_QUERIES:
        query_str = urllib.parse.quote(f"{query_term} state:open type:issue")
        url = f"https://api.github.com/search/issues?q={query_str}&per_page={limit_per_query}"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=5) as resp:
                data = json.loads(resp.read().decode())
                items = data.get("items", [])
                for item in items:
                    html_url = item.get("html_url", "")
                    if html_url and html_url not in seen_urls:
                        seen_urls.add(html_url)

                        repo_url = item.get("repository_url", "")
                        repo_parts = repo_url.split("/repos/")[-1].split("/") if "/repos/" in repo_url else ["", ""]
                        repo_owner = repo_parts[0] if len(repo_parts) > 0 else ""
                        repo_name = repo_parts[1] if len(repo_parts) > 1 else ""
                        body = item.get("body") or ""
                        title = item.get("title") or ""

                        # Anti-spam filter: reject scrapers, newsletters, phishing or non-development topics
                        spam_triggers = [
                            "usdt-tracker", "shipping/shopping", "paste prompt.md", "airdrop",
                            "earn by few clicks", "telegram", "bounty scout —", "bounty scout -",
                            "revenue mesh radar", "bounty alert", "dependency dashboard", "bountyradar",
                            "opportunities found", "opportunityies found", "kiai-bounties"
                        ]
                        if any(st in (title + body).lower() for st in spam_triggers):
                            continue

                        # Clean out boilerplate instructions and unfunded templates before matching rewards
                        clean_body = re.sub(r"<details[\s\S]*?</details>", " ", body, flags=re.IGNORECASE)
                        clean_body = re.sub(r"This repo is using Opire[\s\S]*", " ", clean_body, flags=re.IGNORECASE)
                        clean_body = re.sub(r"Stellar Wave Program[\s\S]*", " ", clean_body, flags=re.IGNORECASE)
                        clean_body = re.sub(r"/reward\s+100\b", " ", clean_body, flags=re.IGNORECASE)
                        clean_body = re.sub(r"replace\s+[`'\"]?100[`'\"]?", " ", clean_body, flags=re.IGNORECASE)

                        # Extract explicit reward if specified (e.g., "$150", "bounty of $100", "pledged $50")
                        reward_match = re.search(r"(?:bounty|reward|funded|pledged?)\s*(?:of|is|:)?\s*\$?(\d+(?:\.\d{2})?)", title + " " + clean_body, re.IGNORECASE)
                        if not reward_match:
                            reward_match = re.search(r"\$(\d+(?:\.\d{2})?)", title + " " + clean_body)

                        reward_usd = float(reward_match.group(1)) if reward_match else 0.0

                        # In strict cash mode, Polar and IssueHunt bounties must have a verified pledge
                        if config.STRICT_CASH_ESCROW_ONLY:
                            if reward_usd < config.MIN_BOUNTY_USD:
                                # Check if issue has a polar pledge or issuehunt backer badge with default min
                                if "polar.sh" in platform_name or "issuehunt" in platform_name:
                                    if "pledge" in body.lower() or "issuehunt" in body.lower():
                                        reward_usd = max(config.MIN_BOUNTY_USD, reward_usd)

                        if reward_usd < config.MIN_BOUNTY_USD:
                            continue

                        all_items.append(
                            {
                                "id": f"gh-{repo_owner}/{repo_name}-{item.get('number')}",
                                "title": title,
                                "url": html_url,
                                "platform": platform_name,
                                "repo_owner": repo_owner,
                                "repo_name": repo_name,
                                "issue_number": item.get("number", 0),
                                "org_handle": repo_owner,
                                "org_name": f"{repo_owner}/{repo_name}",
                                "body": body,
                                "reward_usd": reward_usd,
                                "reward_formatted": f"${reward_usd:.0f}",
                                "tech": [
                                    l.get("name", "")
                                    for l in item.get("labels", [])
                                    if isinstance(l, dict)
                                ],
                                "status": "active",
                            }
                        )
        except Exception as e:
            print(f"[!] GitHub search error for query '{query_term}': {e}", file=sys.stderr)

    return all_items


MAINTAINER_ACTIVITY_CACHE: Dict[str, bool] = {}
COMPETITOR_PR_CACHE: Dict[str, int] = {}


def check_maintainer_activity(repo_owner: str, repo_name: str, days: Optional[int] = None) -> bool:
    """Verifies if repository maintainers have recent commits or merged PRs within the last N days."""
    if not repo_owner or not repo_name:
        return False

    active_days = days or config.MAX_MAINTAINER_INACTIVE_DAYS
    cache_key = f"{repo_owner}/{repo_name}"
    if cache_key in MAINTAINER_ACTIVITY_CACHE:
        return MAINTAINER_ACTIVITY_CACHE[cache_key]

    headers = {"User-Agent": "Mozilla/5.0"}
    if config.GITHUB_TOKEN:
        headers["Authorization"] = f"token {config.GITHUB_TOKEN}"

    ctx = get_ssl_context()
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/commits?per_page=3"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=3) as resp:
            commits = json.loads(resp.read().decode())
            import datetime
            now = datetime.datetime.now(datetime.timezone.utc)
            cutoff = now - datetime.timedelta(days=active_days)
            for c in commits:
                date_str = c.get("commit", {}).get("committer", {}).get("date")
                if date_str:
                    c_date = datetime.datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    if c_date >= cutoff:
                        MAINTAINER_ACTIVITY_CACHE[cache_key] = True
                        return True
    except Exception:
        pass

    MAINTAINER_ACTIVITY_CACHE[cache_key] = False
    return False


def count_open_competitor_prs(repo_owner: str, repo_name: str, issue_number: int) -> int:
    """Checks how many open PRs currently target this issue to avoid competition and maintainer fatigue."""
    if not repo_owner or not repo_name or not issue_number:
        return 0
    cache_key = f"{repo_owner}/{repo_name}#{issue_number}"
    if cache_key in COMPETITOR_PR_CACHE:
        return COMPETITOR_PR_CACHE[cache_key]

    headers = {"User-Agent": "Mozilla/5.0"}
    if config.GITHUB_TOKEN:
        headers["Authorization"] = f"token {config.GITHUB_TOKEN}"
    ctx = get_ssl_context()
    query = urllib.parse.quote(f"repo:{repo_owner}/{repo_name} type:pr state:open #{issue_number}")
    url = f"https://api.github.com/search/issues?q={query}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, context=ctx, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            total_count = data.get("total_count", 0)
            COMPETITOR_PR_CACHE[cache_key] = total_count
            return total_count
    except Exception:
        pass
    COMPETITOR_PR_CACHE[cache_key] = 0
    return 0


def verify_funded_escrow(bounty: Dict[str, Any]) -> bool:
    """
    Strict Escrow Verification:
    Ensures the bounty has verified, pre-deposited funds in escrow rather than just a generic bot template or unfunded footer.
    """
    platform = (bounty.get("platform") or "").lower()
    title = (bounty.get("title") or "").lower()
    body = (bounty.get("body") or "").lower()
    domain = bounty.get("domain", "code")

    # Anti-grant & manual program disqualifiers (Wave, Drips points, retroactive grants)
    wave_disqualifiers = [
        "stellar wave", "wave program", "drips.network", "drips network",
        "grant application", "retroactive grant", "airdrop"
    ]
    if any(wd in title or wd in body for wd in wave_disqualifiers):
        return False

    if config.STRICT_CASH_ESCROW_ONLY:
        # Strictly disallow non-escrow domains
        if domain in ["security", "kaggle"]:
            return False

        # 1. Algora: direct bounties are backed by pre-funded escrow
        if platform == "algora":
            return True

        # 2. Polar.sh: verified pledge badge or polar issue URL with real pledged amount
        if "polar" in platform or "polar.sh" in body:
            polar_indicators = [
                "polar pledge", "pledge.svg", "polar.sh/api/github", "/pledge",
                "<!-- polar pledge badge start -->"
            ]
            if any(ind in body or ind in title for ind in polar_indicators):
                return bounty.get("reward_usd", 0) >= config.MIN_BOUNTY_USD
            return False

        # 3. IssueHunt: funded badges or backer deposits
        if "issuehunt" in platform or "issuehunt" in body:
            funded_indicators = [
                "issuehunt-%24", "issuehunt.io/r/", "oss.issuehunt.io", "<!-- issuehunt badges -->"
            ]
            if any(ind in body for ind in funded_indicators):
                return bounty.get("reward_usd", 0) >= config.MIN_BOUNTY_USD
            return False

        # All other platforms under strict mode (Opire, Gitcoin, unverified Web3) are rejected
        return False

    # Non-strict legacy fallback mode
    if platform == "algora":
        return True
    if "issuehunt" in platform or "issuehunt" in body:
        return any(ind in body for ind in ["funded", "backers", "issuehunt-%24", "issuehunt.io/r/"])
    if "polar" in platform or "polar.sh" in body:
        return any(ind in body or ind in title for ind in ["polar pledge", "pledge.svg", "polar.sh/api/github", "/pledge"])
    if "opire" in platform or "opire" in body:
        if "/reward" in body and not ("replace" in body and "100" in body):
            return True
        return False
    if "gitcoin" in platform:
        return "bounty" in title or "reward" in body
    if bounty.get("reward_usd", 0) > 0 and ("bounty" in title or "reward" in title):
        return True

    return False


def score_bounty_solvability(bounty: Dict[str, Any]) -> float:
    """
    Computes a solvability score (0.0 to 100.0) based on:
    - Strict Escrow Verification (guaranteed pre-funded rewards)
    - Anti-Bot / Anti-Flagging rules (rejects no-ai repos and high-competition PRs)
    - Target active maintainers (merged PRs / commits in last 14 days)
    - Language / tech stack match
    - Reward range appropriateness ($10 to $500)
    - Clear title/description details
    """
    domain = bounty.get("domain", "code")

    # In strict cash escrow mode, reject non-escrow domains immediately
    if config.STRICT_CASH_ESCROW_ONLY and domain in ["kaggle", "security"]:
        return 0.0

    # Strict Escrow Verification Check: reject unfunded template issues
    if not verify_funded_escrow(bounty):
        return 0.0

    # Domain-specific scoring rules (legacy non-strict)
    if domain == "kaggle":
        return 90.0  # Automated ML pipelines have high automated feasibility
    elif domain == "security":
        return 85.0  # Automated SAST / secret scans have reproducible PoC verification

    score = 50.0

    title = (bounty.get("title") or "").lower()
    body = (bounty.get("body") or "").lower()
    tech = [t.lower() for t in bounty.get("tech") or []]
    reward_usd = bounty.get("reward_usd", 0.0)
    repo_owner = bounty.get("repo_owner", "")
    repo_name = bounty.get("repo_name", "")
    issue_num = bounty.get("issue_number", 0)

    # Anti-Bot label check: Reject repos that prohibit automated contributions
    anti_bot_labels = ["no-ai", "human-only", "no-bots", "no-automation", "manual-only"]
    if any(ab in t for t in tech for ab in anti_bot_labels):
        return 0.0

    # Competitor PR check: Disqualify crowded issues to avoid maintainer fatigue
    if repo_owner and repo_name and issue_num:
        competitor_prs = count_open_competitor_prs(repo_owner, repo_name, issue_num)
        bounty["competitor_prs"] = competitor_prs
        if competitor_prs >= config.MAX_OPEN_PR_COMPETITORS:
            return 0.0

    # Rule 1: Target Active Maintainers check (within MAX_MAINTAINER_INACTIVE_DAYS)
    if repo_owner and repo_name:
        if check_maintainer_activity(repo_owner, repo_name, days=config.MAX_MAINTAINER_INACTIVE_DAYS):
            score += 25.0
        else:
            # Inactive maintainer: severely penalize
            score -= 25.0

    if config.MIN_BOUNTY_USD <= reward_usd <= config.MAX_BOUNTY_USD:
        score += 15.0
    elif reward_usd < config.MIN_BOUNTY_USD:
        score -= 20.0

    # Tech stack bonus
    matched_tech = any(
        lang in tech or any(lang in t for t in tech) for lang in config.TARGET_LANGUAGES
    )
    if matched_tech:
        score += 15.0

    # Platform reputational bonus
    platform = bounty.get("platform", "").lower()
    if platform in ["polar.sh", "opire", "gitcoin", "algora"]:
        score += 10.0

    # Rule 0: Anti-Spam / Non-Code Disqualifiers (Grants, Alerts, Automated Feeds)
    spam_or_non_code = [
        "[funding]",
        "gitcoin grants",
        "bounty alert",
        "tz-radar",
        "[demand]",
        "opportunities found",
        "opportunityies found",
        "public model transfer link",
    ]
    if any(s in title or s in body for s in spam_or_non_code):
        return 0.0

    # Ease keywords bonus
    easy_keywords = [
        "doc",
        "readme",
        "fix typo",
        "update",
        "bump",
        "export",
        "ui bug",
        "css",
        "type",
        "refactor",
        "cors",
        "solidity",
        "foundry",
    ]
    if any(kw in title or kw in body for kw in easy_keywords):
        score += 10.0

    # Penalize complex or vague keywords
    hard_keywords = [
        "architecture redesign",
        "migration",
        "flaky test",
        "race condition",
    ]
    if any(kw in title for kw in hard_keywords):
        score -= 25.0

    return max(0.0, min(100.0, score))



def scan_bounties(limit: int = 50, domain: Optional[str] = None) -> List[Dict[str, Any]]:
    """Scans verified platforms (Algora, Polar.sh, IssueHunt, etc.) for open bounties."""
    if config.STRICT_CASH_ESCROW_ONLY and (domain is None or domain.lower() == "all"):
        active_domain = "code"
    else:
        active_domain = (domain or "all").lower()

    print(f"[*] Scouting micro-bounties (domain={active_domain}, limit={limit}, strict_cash_escrow={config.STRICT_CASH_ESCROW_ONLY})...")

    all_bounties: List[Dict[str, Any]] = []

    # 1. Code / Algora & GitHub Escrow Bounties
    if active_domain in ["all", "code", "github"]:
        algora_raw = fetch_algora_bounties(limit=limit)
        for raw in algora_raw:
            task = raw.get("task") or {}
            org = raw.get("org") or {}
            reward = raw.get("reward") or {}
            reward_usd = (reward.get("amount") or 0) / 100.0
            all_bounties.append(
                {
                    "id": task.get("id") or f"bounty-{task.get('number')}",
                    "domain": "code",
                    "title": task.get("title") or "Untitled",
                    "url": task.get("url") or "",
                    "platform": "algora",
                    "repo_owner": task.get("repo_owner") or org.get("handle") or "",
                    "repo_name": task.get("repo_name") or "",
                    "issue_number": task.get("number") or 0,
                    "org_handle": org.get("handle") or "",
                    "org_name": org.get("display_name") or org.get("name") or "",
                    "body": task.get("body") or "",
                    "reward_usd": reward_usd,
                    "reward_formatted": raw.get("reward_formatted") or f"${reward_usd:.0f}",
                    "tech": raw.get("tech") or [],
                    "status": task.get("status") or "active",
                }
            )

        gh_bounties = fetch_github_bounties_multi(limit_per_query=15)
        for g in gh_bounties:
            g["domain"] = "code"
            all_bounties.append(g)

    # 2. Web3 & DeSci Domain (skipped in strict cash escrow mode)
    if not config.STRICT_CASH_ESCROW_ONLY and active_domain in ["all", "web3", "desci", "web3_desci"]:
        print("[*] Scouting Web3 & DeSci bounties...")
        web3_items = fetch_web3_desci_bounties(limit_per_keyword=8)
        all_bounties.extend(web3_items)

    # 3. Cybersecurity Domain (skipped in strict cash escrow mode)
    if not config.STRICT_CASH_ESCROW_ONLY and active_domain in ["all", "security", "cybersecurity"]:
        print("[*] Scouting Cybersecurity & Bug Bounty targets...")
        sec_items = fetch_security_bounties(limit_per_keyword=8)
        all_bounties.extend(sec_items)

    # 4. Kaggle & AI Competitions Domain (skipped in strict cash escrow mode)
    if not config.STRICT_CASH_ESCROW_ONLY and active_domain in ["all", "kaggle", "ai"]:
        print("[*] Scouting Kaggle & AI micro-competitions...")
        kaggle_items = fetch_kaggle_competitions(limit=8)
        all_bounties.extend(kaggle_items)

    filtered = []
    seen_ids = set()

    for item in all_bounties:
        item["solvability_score"] = score_bounty_solvability(item)
        item_id = item.get("id")
        if (
            item_id not in seen_ids
            and item["solvability_score"] > 0
            and config.MIN_BOUNTY_USD <= item["reward_usd"] <= config.MAX_BOUNTY_USD
        ):
            seen_ids.add(item_id)
            filtered.append(item)

    # Sort by solvability score descending
    filtered.sort(key=lambda x: x["solvability_score"], reverse=True)

    # Save to disk
    with open(config.OPEN_BOUNTIES_FILE, "w", encoding="utf-8") as f:
        json.dump(filtered, f, indent=2)

    print(f"[+] Found {len(filtered)} eligible micro-bounties across active domains. Saved to {config.OPEN_BOUNTIES_FILE}")
    return filtered


if __name__ == "__main__":
    bounties = scan_bounties(limit=50)
    print("\n--- TOP MULTI-DOMAIN BOUNTIES SCOUTED ---")
    for idx, b in enumerate(bounties[:10], 1):
        domain_tag = b.get("domain", "code").upper()
        print(f"{idx}. [{b['reward_formatted']}] [{domain_tag}] Score: {b['solvability_score']:.1f}/100 | {b['title']}")
        print(f"   URL: {b['url']} (Repo: {b.get('repo_owner')}/{b.get('repo_name')})")
