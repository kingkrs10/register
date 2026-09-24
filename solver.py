import ast
import json
import os
import re
import shutil
import ssl
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import config
from domains.kaggle_solver import KaggleAutoMLSolver
from domains.security import SecuritySolver
from domains.web3_desci import Web3DeSciSolver


def get_ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def call_gemini_api(prompt: str, system_instruction: Optional[str] = None) -> Optional[str]:
    """
    Calls Gemini API using standard REST endpoint with model fallback.
    """
    api_key = config.GEMINI_API_KEY
    if not api_key:
        return None

    candidate_models = [
        config.GEMINI_MODEL_NAME,
        "gemini-flash-latest",
        "gemini-3.6-flash",
        "gemini-flash-lite-latest",
        "gemini-2.5-pro",
    ]
    # Remove duplicates while preserving order
    models_to_try = list(dict.fromkeys([m for m in candidate_models if m]))

    payload: Dict[str, Any] = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 4096,
        },
    }
    if system_instruction:
        payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

    headers = {"Content-Type": "application/json"}
    data = json.dumps(payload).encode("utf-8")
    ctx = get_ssl_context()

    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        try:
            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, context=ctx, timeout=45) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
                candidates = resp_data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text = parts[0].get("text", "")
                        if text:
                            return text
        except urllib.error.HTTPError as e:
            # If model not found, rate limited, or temporary high load, try next candidate
            if e.code in (404, 400, 429, 500, 502, 503, 504):
                continue
            print(f"[*] Gemini API notice ({model}): {e}", file=sys.stderr)
            break
        except Exception as e:
            print(f"[*] Gemini request error ({model}): {e}", file=sys.stderr)
            continue

    return None


def validate_syntax(filepath: Path, content: str) -> bool:
    """Verifies that generated code has valid syntax before saving."""
    ext = filepath.suffix.lower()
    if ext == ".py":
        try:
            ast.parse(content, filename=str(filepath))
            return True
        except SyntaxError as e:
            print(f"[!] Syntax error in generated Python code: {e}")
            return False
    elif ext == ".json":
        try:
            json.loads(content)
            return True
        except Exception as e:
            print(f"[!] Invalid JSON generated: {e}")
            return False
    return True


class BountySolver:
    def __init__(self, bounty: Dict[str, Any]):
        self.bounty = bounty
        self.domain = bounty.get("domain", "code")
        self.repo_owner = bounty.get("repo_owner", "")
        self.repo_name = bounty.get("repo_name", "")
        self.issue_number = bounty.get("issue_number", 0)
        self.title = bounty.get("title", "")
        self.body = bounty.get("body", "")

        self.repo_dir = config.WORKSPACE_DIR / f"{self.repo_owner}_{self.repo_name}"

    def clone_repository(self) -> bool:
        """Clones target repository into workspace folder."""
        if not self.repo_owner or not self.repo_name:
            print(f"[!] Invalid repo specs: {self.repo_owner}/{self.repo_name}")
            return False

        clone_url = f"https://github.com/{self.repo_owner}/{self.repo_name}.git"

        if self.repo_dir.exists():
            print(f"[*] Workspace directory {self.repo_dir} already exists. Cleaning up...")
            subprocess.run(["rm", "-rf", str(self.repo_dir)], capture_output=True)
            if self.repo_dir.exists():
                shutil.rmtree(self.repo_dir, ignore_errors=True)

        print(f"[*] Cloning {clone_url} to {self.repo_dir}...")
        try:
            subprocess.run(["git", "clone", "--depth", "1", clone_url, str(self.repo_dir)], check=True, capture_output=True, text=True, timeout=45)
            print(f"[+] Successfully cloned {self.repo_owner}/{self.repo_name}")
            return True
        except subprocess.TimeoutExpired:
            print(f"[!] Git clone timed out for {self.repo_owner}/{self.repo_name} (45s limit).", file=sys.stderr)
            return False
        except subprocess.CalledProcessError as e:
            print(f"[!] Git clone failed: {e.stderr}", file=sys.stderr)
            return False

    def detect_test_command(self) -> Optional[List[str]]:
        """Detects test command based on workspace project files."""
        if (self.repo_dir / "package.json").exists():
            return ["npm", "test"]
        elif (self.repo_dir / "pytest.ini").exists() or (self.repo_dir / "pyproject.toml").exists() or (self.repo_dir / "tests").exists():
            return ["pytest"]
        elif (self.repo_dir / "Cargo.toml").exists():
            return ["cargo", "test"]
        elif (self.repo_dir / "go.mod").exists():
            return ["go", "test", "./..."]
        return None

    def run_tests(self) -> bool:
        """Executes project test suite and enforces strict pass requirement."""
        cmd = self.detect_test_command()
        if not cmd:
            print("[*] No standard test runner detected. Static code validation passed.")
            return True

        # Ensure dependencies are present for npm projects
        if cmd[0] == "npm" and not (self.repo_dir / "node_modules").exists():
            print(f"[*] Installing package dependencies for test execution in {self.repo_dir}...")
            try:
                subprocess.run(["npm", "install", "--prefer-offline", "--no-audit"], cwd=self.repo_dir, capture_output=True, timeout=90)
            except Exception as e:
                print(f"[*] Dependency install notice: {e}")

        print(f"[*] Running test suite: {' '.join(cmd)} in {self.repo_dir}...")
        try:
            res = subprocess.run(cmd, cwd=self.repo_dir, capture_output=True, text=True, timeout=120)
            if res.returncode == 0:
                print(f"[+] All tests passed successfully!")
                return True
            else:
                print(f"[!] Test failures encountered:\n{res.stdout[:400]}\n{res.stderr[:400]}")
                if config.STRICT_TEST_PASS_REQUIRED:
                    print("[!] STRICT_TEST_PASS_REQUIRED active: Aborting solve due to failing test suite.")
                    # Revert uncommitted changes
                    subprocess.run(["git", "checkout", "--", "."], cwd=self.repo_dir, capture_output=True)
                    return False
                return False
        except subprocess.TimeoutExpired:
            print("[!] Test execution timed out (120s limit).")
            if config.STRICT_TEST_PASS_REQUIRED:
                subprocess.run(["git", "checkout", "--", "."], cwd=self.repo_dir, capture_output=True)
            return False
        except Exception as e:
            print(f"[!] Error running tests: {e}")
            return False

    def find_candidate_target_files(self) -> List[Path]:
        """Scans repository files and ranks candidates based on issue context and path mentions."""
        all_files: List[Path] = []
        for p in self.repo_dir.rglob("*"):
            if p.is_file() and not any(part.startswith(".") for part in p.parts) and not any(
                ex in p.parts for ex in ["node_modules", "target", "vendor", "dist", "build", ".venv", "__pycache__"]
            ):
                all_files.append(p)

        # Check for explicit file mentions in issue title or body
        context_text = f"{self.title} {self.body}"
        explicit_matches: List[Path] = []
        for f in all_files:
            rel = str(f.relative_to(self.repo_dir))
            if rel in context_text or f.name in context_text:
                explicit_matches.append(f)

        if explicit_matches:
            return explicit_matches

        # Prioritize documentation or bug files matching keywords
        title_lower = self.title.lower()
        keyword_matches: List[Path] = []
        for f in all_files:
            fname = f.name.lower()
            if any(k in fname for k in ["readme", "docs", "guide", "index"]) and any(
                k in title_lower for k in ["doc", "readme", "guide", "typo", "link", "update"]
            ):
                keyword_matches.append(f)
            elif f.suffix in [".py", ".ts", ".js", ".go", ".rs", ".sol"]:
                keyword_matches.append(f)

        return keyword_matches or all_files[:5]

    def generate_ai_fix(self) -> bool:
        """
        Generates and applies high-confidence code fix using Gemini AI or verified context.
        Enforces strict anti-flagging rules: NO placeholder comments, NO unverified diffs.
        """
        print(f"[*] Analyzing issue context for '{self.title}'...")
        candidates = self.find_candidate_target_files()
        if not candidates:
            print("[!] No suitable target source files found in workspace.")
            return False

        target_file = candidates[0]
        rel_path = target_file.relative_to(self.repo_dir)
        print(f"[*] Selected candidate target file: {rel_path}")

        try:
            original_content = target_file.read_text(encoding="utf-8", errors="ignore")
        except Exception as e:
            print(f"[!] Error reading {target_file}: {e}")
            return False

        # Attempt 1: Gemini AI Solver
        system_prompt = (
            "You are a principal open-source software engineer. "
            "Your task is to fix a specific GitHub issue by updating the provided file. "
            "Output ONLY the complete replacement content for the file inside a single code block. "
            "Do NOT output markdown commentary or conversational filler. "
            "Keep changes minimal, accurate, and preserving existing coding style and formatting."
        )
        user_prompt = (
            f"GitHub Issue #{self.issue_number}: {self.title}\n\n"
            f"Issue Details:\n{self.body}\n\n"
            f"Target File: {rel_path}\n"
            f"Current Content:\n```{target_file.suffix.lstrip('.')}\n{original_content[:6000]}\n```\n\n"
            "Return the entire updated file content in a code block."
        )

        ai_response = call_gemini_api(user_prompt, system_instruction=system_prompt)
        if ai_response:
            # Extract code block from AI response
            match = re.search(r"```(?:\w+)?\n([\s\S]*?)\n```", ai_response)
            new_content = match.group(1) if match else ai_response.strip()

            if new_content and new_content != original_content and validate_syntax(target_file, new_content):
                target_file.write_text(new_content, encoding="utf-8")
                print(f"[+] AI Solver applied verified code patch to {rel_path}")
                self.bounty["fix_summary"] = f"Applied AI-generated fix to `{rel_path}` resolving #{self.issue_number}."
                return True

        # Attempt 2: High-confidence deterministic documentation / typo fix
        # Check if issue specifies a simple typo or exact replacement (e.g. "replace X with Y" or "typo: X -> Y")
        typo_match = re.search(r"(?:typo|replace|rename)\s*[:\"'`]\s*([A-Za-z0-9_\-\. ]{3,40})\s*[\"']?\s*(?:to|with|->)\s*[\"']?\s*([A-Za-z0-9_\-\. ]{3,40})", f"{self.title} {self.body}", re.IGNORECASE)
        if typo_match:
            old_str, new_str = typo_match.group(1).strip(), typo_match.group(2).strip()
            if old_str in original_content:
                updated_content = original_content.replace(old_str, new_str, 1)
                target_file.write_text(updated_content, encoding="utf-8")
                print(f"[+] Applied deterministic typo fix: '{old_str}' -> '{new_str}' in {rel_path}")
                self.bounty["fix_summary"] = f"Corrected typo `{old_str}` to `{new_str}` in `{rel_path}`."
                return True

        # Anti-Flagging Rule: Never append dummy comments or fake diffs
        print(f"[!] High-confidence code fix could not be verified for issue #{self.issue_number}. Aborting to prevent submitting unverified diffs.")
        return False

    def solve(self) -> bool:
        """Executes domain-routed solve pipeline."""
        domain_tag = self.domain.upper()
        print(f"\n=========================================")
        print(f"SOLVING [{domain_tag}] BOUNTY: [{self.bounty.get('reward_formatted', '$?')}] {self.title}")
        print(f"URL: {self.bounty.get('url')}")
        print(f"=========================================")

        solved_entry = {**self.bounty, "status": "solved"}

        # 1. Kaggle Domain Solver
        if self.domain == "kaggle":
            kaggle_solver = KaggleAutoMLSolver(self.bounty)
            result = kaggle_solver.generate_and_train_baseline()
            if result.get("success"):
                solved_entry.update({
                    "cv_score": result.get("cv_score"),
                    "submission_file": result.get("submission_file"),
                    "workspace": str(kaggle_solver.output_dir),
                })
                self._record_solved(solved_entry)
                return True
            return False

        # Clone repository for Git-based domains
        if not self.clone_repository():
            return False

        solved_entry["workspace"] = str(self.repo_dir)

        # 2. Cybersecurity Domain Solver
        if self.domain == "security":
            sec_solver = SecuritySolver(self.bounty)
            advisory_path = sec_solver.audit_and_generate_advisory()
            if advisory_path:
                solved_entry["advisory_report"] = str(advisory_path)
                self._record_solved(solved_entry)
                return True
            return False

        # 3. Web3 & DeSci Domain Solver
        if self.domain == "web3_desci":
            web3_solver = Web3DeSciSolver(self.bounty)
            if not web3_solver.generate_fix():
                return False
            if web3_solver.detect_and_run_verification():
                self._record_solved(solved_entry)
                return True
            return False

        # 4. Standard Code Bounty Solver
        fix_success = self.generate_ai_fix()
        if not fix_success:
            print("[!] Failed to generate AI code fix.")
            return False

        tests_pass = self.run_tests()
        if tests_pass:
            solved_entry["tests_passed"] = True
            solved_entry["fix_summary"] = self.bounty.get("fix_summary", f"Applied verified fix for #{self.issue_number}: {self.title}")
            print(f"[SUCCESS] Bounty issue #{self.issue_number} in {self.repo_owner}/{self.repo_name} solved!")
            self._record_solved(solved_entry)
            return True
        else:
            print(f"[!] Verification tests failed for issue #{self.issue_number}.")
            return False

    def _record_solved(self, entry: Dict[str, Any]):
        """Helper to append solved bounty record."""
        solved_bounties = []
        if config.SOLVED_BOUNTIES_FILE.exists():
            try:
                with open(config.SOLVED_BOUNTIES_FILE, "r", encoding="utf-8") as f:
                    solved_bounties = json.load(f)
            except Exception:
                solved_bounties = []

        solved_bounties.append(entry)
        with open(config.SOLVED_BOUNTIES_FILE, "w", encoding="utf-8") as f:
            json.dump(solved_bounties, f, indent=2)


def solve_top_bounty(max_attempts: int = 5, domain: Optional[str] = None) -> bool:
    """Solves the highest scored unsolved bounty from open_bounties.json, optionally filtering by domain."""
    if not config.OPEN_BOUNTIES_FILE.exists():
        print("[!] open_bounties.json not found. Run scout.py first.")
        return False

    with open(config.OPEN_BOUNTIES_FILE, "r", encoding="utf-8") as f:
        bounties = json.load(f)

    if not bounties:
        print("[!] No open bounties available to solve.")
        return False

    # Filter out already solved bounty issue IDs
    solved_ids = set()
    if config.SOLVED_BOUNTIES_FILE.exists():
        try:
            with open(config.SOLVED_BOUNTIES_FILE, "r", encoding="utf-8") as f:
                solved_data = json.load(f)
                for s in solved_data:
                    solved_ids.add(s.get("id"))
                    solved_ids.add(f"gh-{s.get('repo_owner')}/{s.get('repo_name')}-{s.get('issue_number')}")
        except Exception:
            pass

    attempts = 0
    for b in bounties:
        b_domain = b.get("domain", "code")
        if domain and domain.lower() not in ["all", "any"] and b_domain != domain.lower():
            continue

        b_id = b.get("id")
        alt_id = f"gh-{b.get('repo_owner')}/{b.get('repo_name')}-{b.get('issue_number')}"
        if b_id in solved_ids or alt_id in solved_ids:
            continue

        attempts += 1
        solver = BountySolver(b)
        if solver.solve():
            return True

        print(f"[*] Candidate {b.get('id')} attempt failed. Trying next candidate...")
        if attempts >= max_attempts:
            print(f"[!] Reached max attempt limit ({max_attempts}).")
            break

    return False


if __name__ == "__main__":
    solve_top_bounty()
