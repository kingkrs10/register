"""
MicroBountyHarvest - Main CLI Orchestrator
Runs full autonomous bounty hunting pipelines (Scout -> Solve -> Claim).
"""

import argparse
import sys
from claimer import claim_solved_bounties
from scout import scan_bounties
from solver import solve_top_bounty
from tracker import run_status_check


def main():
    parser = argparse.ArgumentParser(
        description="MicroBountyHarvest - Multi-Domain Autonomous AI Micro-Bounty Hunter Engine"
    )
    parser.add_argument(
        "--scan", action="store_true", help="Scout open micro-bounties across supported domains"
    )
    parser.add_argument(
        "--solve", action="store_true", help="Solve top scouted micro-bounty"
    )
    parser.add_argument(
        "--claim", action="store_true", help="Submit Pull Request or claim artifact for solved bounty"
    )
    parser.add_argument(
        "--domain",
        type=str,
        default=None,
        choices=["all", "code", "web3_desci", "security", "kaggle"],
        help="Target specific domain (default: all)",
    )
    parser.add_argument(
        "--live", action="store_true", help="Execute live network submissions (pushes fork & creates PRs / Kaggle submit)"
    )
    parser.add_argument(
        "--all", action="store_true", help="Apply action to all eligible bounties instead of just the top one"
    )
    parser.add_argument(
        "--status",
        "--check-daily",
        action="store_true",
        help="Check live status of open and solved bounties across all domains",
    )
    parser.add_argument(
        "--auto-dry-run",
        action="store_true",
        help="Run full end-to-end pipeline in safe dry-run mode",
    )
    parser.add_argument(
        "--auto-live",
        action="store_true",
        help="Run full end-to-end pipeline in live submission mode",
    )
    parser.add_argument(
        "--limit", type=int, default=30, help="Max bounties to scan (default: 30)"
    )

    args = parser.parse_args()

    if not any([args.scan, args.solve, args.claim, args.status, args.auto_dry_run, args.auto_live]):
        parser.print_help()
        sys.exit(0)

    if args.status:
        run_status_check()

    if args.scan:
        scan_bounties(limit=args.limit, domain=args.domain)

    if args.solve:
        solve_top_bounty(domain=args.domain)

    if args.claim:
        is_dry_run = not args.live
        claim_solved_bounties(dry_run=is_dry_run, claim_all=args.all, domain=args.domain)

    if args.auto_dry_run:
        dom_str = f"[{args.domain.upper()}]" if args.domain else "[ALL DOMAINS]"
        print(f"\n=== STARTING AUTONOMOUS BOUNTY HUNTER (DRY-RUN MODE {dom_str}) ===")
        bounties = scan_bounties(limit=args.limit, domain=args.domain)
        if bounties:
            solved = solve_top_bounty(domain=args.domain)
            if solved:
                claim_solved_bounties(dry_run=True, domain=args.domain)
        run_status_check()
        print("\n=== AUTONOMOUS BOUNTY HUNTER RUN COMPLETE ===")

    if args.auto_live:
        dom_str = f"[{args.domain.upper()}]" if args.domain else "[ALL DOMAINS]"
        print(f"\n=== STARTING AUTONOMOUS BOUNTY HUNTER (LIVE MODE {dom_str}) ===")
        bounties = scan_bounties(limit=args.limit, domain=args.domain)
        if bounties:
            solved = solve_top_bounty(domain=args.domain)
            if solved:
                claim_solved_bounties(dry_run=False, domain=args.domain)
        run_status_check()
        print("\n=== AUTONOMOUS BOUNTY HUNTER RUN COMPLETE ===")


if __name__ == "__main__":
    main()
