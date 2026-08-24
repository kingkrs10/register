# 🎯 MicroBountyHarvest Web Dashboard

A free, real-time web dashboard for the **MicroBountyHarvest** multi-domain autonomous bounty hunting engine.

Built with **Next.js 14 (App Router)**, **Tailwind CSS**, and **Recharts**. Designed to deploy 100% free on **Vercel** with zero server costs or external database requirements.

---

## 🚀 Features

1. **📊 Overview & KPIs**: Real-time pipeline value ($3,557+), solved cases ($2,110+), merged payouts ($50+), domain breakdowns, and recent activity.
2. **🔍 Open Bounties Explorer**: Searchable, filterable, and sortable table of all scouted bounties across Polar.sh, Algora, Opire, IssueHunt, and Gitcoin with solvability scoring.
3. **✅ Solved Bounties Tracker**: Live status tracking of all local fixes, pull requests, issue states, and payout badges.
4. **🔗 Claims & Manual Action Center**: Action hub for ready-to-claim bounties, direct GitHub PR submit buttons, Kaggle submission upload links, and security advisory reports.
5. **🔀 Pipeline Flow Visualizer**: Interactive funnel from **Scout** ➔ **Solve** ➔ **Claim** ➔ **Merged**.
6. **⚡ Execution Controls**: One-click triggering of GitHub Actions workflows:
   - 🔍 Scan Bounties (`--scan`)
   - 🧠 Solve Top Bounty (`--solve`)
   - 📤 Claim (Dry Run & Live with safety confirmations)
   - 📊 Refresh Status (`--status`)
   - 🚀 Full Auto (`--auto-live` / `--auto-dry-run`)
7. **📑 Daily Status Reports**: Rendered executive summary reports with 1-click **Copy as Markdown** and **Copy as JSON** export.

---

## 🛠️ Local Development

```bash
cd dashboard
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard in your browser.

---

## 🌐 100% Free Vercel Deployment Guide

### Step 1: Push Repo to GitHub
Make sure all your code (including the `dashboard/` directory) is pushed to your GitHub repository.

### Step 2: Import into Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub (Free Tier).
2. Click **"Add New..."** ➔ **"Project"**.
3. Select your `MicroBountyHarvest` repository.
4. In the configuration:
   - **Root Directory**: Select `dashboard`
   - **Framework Preset**: Next.js (auto-detected)

### Step 3: Configure Environment Variables
Add the following in Vercel's **Environment Variables** section:

| Variable | Value | Description |
|---|---|---|
| `GITHUB_TOKEN` | `ghp_...` | GitHub Personal Access Token (with `repo` and `workflow` scopes) |
| `GITHUB_REPO_OWNER` | `kingkrs10` | GitHub repository owner |
| `GITHUB_REPO_NAME` | `amengine` | GitHub repository name |

### Step 4: Click Deploy
Vercel will build and deploy your dashboard to a free `*.vercel.app` domain with automatic HTTPS and instant CI/CD upon git push!

---

## 🔐 Architecture & Security

- **Data Fetching**: Reads committed JSON files (`data/open_bounties.json`, `data/solved_bounties.json`, `data/daily_status_report.json`) directly via GitHub REST API with 60s in-memory cache and automatic local filesystem fallback.
- **Workflow Triggers**: Uses GitHub Actions `workflow_dispatch` API to trigger backend automation safely without requiring a continuous background server.
- **Destructive Action Protection**: Live claims and live auto-execution require explicit confirmation dialogs before firing.
