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
        description="MicroBountyHarvest - Autonomous AI Micro-Bounty Hunter Engine"
    )
    parser.add_argument(
        "--scan", action="store_true", help="Scout open micro-bounties on Algora and GitHub"
    )
    parser.add_argument(
        "--solve", action="store_true", help="Solve top scouted micro-bounty"
    )
    parser.add_argument(
        "--claim", action="store_true", help="Submit Pull Request and claim solved bounty"
    )
    parser.add_argument(
        "--live", action="store_true", help="Execute live network submissions (pushes fork & creates PRs)"
    )
    parser.add_argument(
        "--all", action="store_true", help="Apply action to all eligible bounties instead of just the top one"
    )
    parser.add_argument(
        "--status",
        "--check-daily",
        action="store_true",
        help="Check live status of open and solved bounties on GitHub",
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
        scan_bounties(limit=args.limit)

    if args.solve:
        solve_top_bounty()

    if args.claim:
        is_dry_run = not args.live
        claim_solved_bounties(dry_run=is_dry_run, claim_all=args.all)


    if args.auto_dry_run:
        print("\n=== STARTING AUTONOMOUS BOUNTY HUNTER (DRY-RUN MODE) ===")
        bounties = scan_bounties(limit=args.limit)
        if bounties:
            solved = solve_top_bounty()
            if solved:
                claim_solved_bounties(dry_run=True)
        run_status_check()
        print("\n=== AUTONOMOUS BOUNTY HUNTER RUN COMPLETE ===")

    if args.auto_live:
        print("\n=== STARTING AUTONOMOUS BOUNTY HUNTER (LIVE MODE) ===")
        bounties = scan_bounties(limit=args.limit)
        if bounties:
            solved = solve_top_bounty()
            if solved:
                claim_solved_bounties(dry_run=False)
        run_status_check()
        print("\n=== AUTONOMOUS BOUNTY HUNTER RUN COMPLETE ===")



if __name__ == "__main__":
    main()
