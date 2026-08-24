"""
MicroBountyHarvest Configuration
Centralized configuration settings for multi-domain bounty scouting, solving, and claiming.
Supports: Code & Docs, Web3 & DeSci, Cybersecurity & Vulnerabilities, and Kaggle AutoML.
"""

import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.resolve()
DATA_DIR = BASE_DIR / "data"
WORKSPACE_DIR = BASE_DIR / "workspace"
SECURITY_REPORTS_DIR = DATA_DIR / "security_reports"
KAGGLE_SUBMISSIONS_DIR = DATA_DIR / "kaggle_submissions"

DATA_DIR.mkdir(exist_ok=True)
WORKSPACE_DIR.mkdir(exist_ok=True)
SECURITY_REPORTS_DIR.mkdir(exist_ok=True)
KAGGLE_SUBMISSIONS_DIR.mkdir(exist_ok=True)

# Load .env if present
env_file = BASE_DIR / ".env"
if env_file.exists():
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

# Domains Supported
ENABLED_DOMAINS = ["code", "web3_desci", "security", "kaggle"]

# Bounty Scout Settings
MIN_BOUNTY_USD = float(os.getenv("MIN_BOUNTY_USD", "10"))
MAX_BOUNTY_USD = float(os.getenv("MAX_BOUNTY_USD", "500"))
TARGET_LANGUAGES = [
    "typescript",
    "javascript",
    "python",
    "markdown",
    "docs",
    "go",
    "rust",
    "solidity",
    "jupyter",
]

# Web3 & DeSci Settings
WEB3_DESCI_KEYWORDS = [
    "solidity",
    "foundry",
    "smart-contract",
    "web3",
    "researchhub",
    "desci",
    "data-cleaning",
    "dataset",
    "erc20",
    "erc721",
]

# Cybersecurity Settings
SECURITY_KEYWORDS = [
    "bug-bounty",
    "security-bounty",
    "vulnerability",
    "cve",
    "sast",
    "secret-leak",
    "broken-link",
    "security.md",
]

# Kaggle & Data Science Settings
KAGGLE_USERNAME = os.getenv("KAGGLE_USERNAME", "")
KAGGLE_KEY = os.getenv("KAGGLE_KEY", "")

# Solvability Criteria
PREFER_DOCS_AND_SIMPLE_BUGS = True
MAX_OPEN_PR_COMPETITORS = 5

# AI Solver Settings
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")  # default solver model
MAX_SOLVER_RETRIES = 3

# Claimer & Git Settings
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
DRY_RUN = os.getenv("DRY_RUN", "true").lower() in ("true", "1", "yes")

# Files
OPEN_BOUNTIES_FILE = DATA_DIR / "open_bounties.json"
SOLVED_BOUNTIES_FILE = DATA_DIR / "solved_bounties.json"
DAILY_STATUS_REPORT_FILE = DATA_DIR / "daily_status_report.json"
DAILY_STATUS_MD_FILE = DATA_DIR / "daily_status_report.md"

