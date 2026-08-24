import fs from 'fs';
import path from 'path';
import { OpenBounty, SolvedBounty, DailyReport, WorkflowRun } from '@/lib/types';

const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'kingkrs10';
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'register';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const headers = {
  'Accept': 'application/vnd.github.v3.raw',
  'Authorization': `Bearer ${GITHUB_TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
};

// In-memory cache with TTL
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 60_000; // 60 seconds

async function fetchWithCache(url: string): Promise<unknown> {
  const now = Date.now();
  const cached = cache.get(url);
  if (cached && cached.expiry > now) return cached.data;
  
  const res = await fetch(url, { headers, next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  cache.set(url, { data, expiry: now + CACHE_TTL });
  return data;
}

export async function fetchRepoFile(filePath: string) {
  try {
    return await fetchWithCache(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`);
  } catch (error) {
    // Fallback to local data directory if available
    try {
      const localPath = path.resolve(process.cwd(), '..', filePath);
      if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, 'utf-8');
        return JSON.parse(content);
      }
      const directLocalPath = path.resolve(process.cwd(), filePath);
      if (fs.existsSync(directLocalPath)) {
        const content = fs.readFileSync(directLocalPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch {
      // ignore and throw original error
    }
    throw error;
  }
}

export async function fetchOpenBounties(): Promise<OpenBounty[]> {
  return fetchRepoFile('data/open_bounties.json') as Promise<OpenBounty[]>;
}

export async function fetchSolvedBounties(): Promise<SolvedBounty[]> {
  return fetchRepoFile('data/solved_bounties.json') as Promise<SolvedBounty[]>;
}

export async function fetchDailyReport(): Promise<DailyReport> {
  return fetchRepoFile('data/daily_status_report.json') as Promise<DailyReport>;
}

export async function triggerWorkflow(action: string, domain: string = 'all', limit: string = '30') {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/bounty-hunter.yml/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ref: 'main',
      inputs: { action, domain, limit },
    }),
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Failed to trigger workflow: ${res.status} ${text}`);
  }
  return { success: true };
}

export async function fetchLatestWorkflowRun(): Promise<WorkflowRun | null> {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/bounty-hunter.yml/runs?per_page=1`;
  const data = await fetchWithCache(url) as { workflow_runs: WorkflowRun[] };
  return data.workflow_runs?.[0] || null;
}
