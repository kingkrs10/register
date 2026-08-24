# MicroBountyHarvest 🎯🤖

> **Multi-Domain Autonomous AI Micro-Bounty Hunter Engine**
> Automatically scouts, solves, verifies, and claims open micro-bounties ($10–$500) across **Code & Docs**, **Web3 & DeSci**, **Cybersecurity Vulnerabilities**, and **Kaggle AI Competitions**.

---

## 🌐 Supported Domains & Engines

1. **💻 Code & Docs (`code`)**: Scouts Algora, Polar.sh, Gitcoin, and GitHub issues. Analyzes context with Gemini AI, patches source code/docs, and runs local test runners (`npm test`, `pytest`, `cargo test`, `go test`).
2. **⛓️ Web3 & DeSci (`web3_desci`)**: Scouts Solidity smart contract and DeSci (ResearchHub / dataset cleaning) bounties. Executes Foundry (`forge test`), Hardhat, or Pandas data validation pipelines.
3. **🛡️ Cybersecurity (`security`)**: Automated SAST & vulnerability hunting engine. Scans repos for exposed API secrets, broken link hijacking, and security misconfigurations (CORS, debug flags, dangerous evals). Generates reproducible Security Advisory PoC markdown reports.
4. **📊 Kaggle & AI Competitions (`kaggle`)**: Discovers active tabular & dataset competitions, constructs AutoML baseline pipelines, runs 5-fold cross-validation, and submits verified `submission.csv` via Kaggle CLI.

---

## 🚀 Pipeline Features

- **The Scout (`scout.py`)**: Multi-domain query engine that scores candidate bounties based on solvability, language match, escrow funding, and active maintainer responsiveness.
- **The Solver (`solver.py`)**: Domain-routed solver executing specialized unit tests, security audits, or AutoML pipelines in isolated workspaces.
- **The Claimer (`claimer.py`)**: Submits clean GitHub Pull Requests, disclosure advisories, or Kaggle submissions with full `--live` and dry-run safety modes.
- **The Tracker (`tracker.py`)**: Autonomously audits live status of open & solved cases daily across all domains, generating JSON & Markdown executive reports.

---

## 🛠️ Requirements & Setup

1. **Python 3.10+ & Node 18+**
2. **GitHub CLI (`gh`)** logged in (`gh auth login`)
3. Optional Domain Tooling:
   - `GEMINI_API_KEY` for AI solver code generation
   - `kaggle` CLI / API credentials (`~/.kaggle/kaggle.json`)
   - `forge` (Foundry) for Solidity smart contract verification

---

## 📖 Usage Commands

### 1. Check Live Daily Status Report
```bash
python3 main.py --status
```

### 2. Scout Open Bounties (All Domains or Specific Domain)
```bash
# Scout all active domains
python3 main.py --scan --limit 30

# Scout specific domain
python3 main.py --scan --domain security
python3 main.py --scan --domain web3_desci
python3 main.py --scan --domain kaggle
```

### 3. Solve Highest Scored Bounty
```bash
# Solve top overall bounty
python3 main.py --solve

# Solve top bounty in a specific domain
python3 main.py --solve --domain security
```

### 4. Claim Solved Bounty (Dry-Run / Live)
```bash
python3 main.py --claim
python3 main.py --claim --live
```

### 5. Full Autonomous Pipeline (Dry Run)
```bash
python3 main.py --auto-dry-run --limit 20
```

### 6. Full Autonomous Pipeline (Live Mode)
```bash
python3 main.py --auto-live --limit 20
```

---

## 📂 Project Structure

```
MicroBountyHarvest/
├── config.py                 # Multi-domain configuration & threshold settings
├── scout.py                  # Multi-domain bounty discovery & solvability scoring
├── solver.py                 # Domain-routed solver & verification engine
├── claimer.py                # GitHub PR submission, advisory disclosure & Kaggle submitter
├── tracker.py                # Daily live status checker & multi-domain reporting
├── main.py                   # Main CLI orchestrator
├── domains/                  # Domain-specific hunting modules
│   ├── web3_desci.py         # Web3/Solidity (Foundry) & DeSci data cleaning engine
│   ├── security.py           # Cybersecurity SAST, secret leak scanner & PoC generator
│   └── kaggle_solver.py      # Kaggle competition scout, AutoML trainer & CV evaluator
├── data/                     # Stores open_bounties.json, solved_bounties.json, reports
│   ├── security_reports/     # Generated security advisory PoC reports
│   └── kaggle_submissions/   # Generated AutoML pipelines & submission CSVs
├── workspace/                # Local workspace for cloned target repos
└── .github/workflows/        # GitHub Actions workflow for 24/7 automation
```
