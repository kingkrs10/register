export interface OpenBounty {
  id: string;
  title: string;
  url: string;
  platform: string;
  repo_owner: string;
  repo_name: string;
  issue_number: number;
  org_handle: string;
  org_name: string;
  body: string;
  reward_usd: number;
  reward_formatted: string;
  tech: string[];
  status: string;
  domain: string;
  solvability_score: number;
  live_status: string;
  comments_count: number;
  last_audited: string;
}

export interface SolvedBounty {
  id: string;
  title: string;
  url: string;
  platform?: string;
  repo_owner: string;
  repo_name: string;
  issue_number: number;
  org_handle?: string;
  org_name?: string;
  body?: string;
  reward_usd: number;
  reward_formatted: string;
  tech?: string[];
  status: string;
  domain: string;
  solvability_score: number;
  workspace?: string;
  issue_live_state: string;
  issue_comments?: number;
  last_audited: string;
  tracking_status: string;
  pr_url?: string;
  pr_live_state?: string;
  advisory_report?: string;
  cv_score?: number;
  submission_file?: string;
}

export interface DailyReport {
  report_timestamp: string;
  open_cases_summary: {
    active_open_count: number;
    closed_stale_filtered: number;
    total_potential_usd: number;
  };
  solved_cases_summary: {
    total_solved_cases: number;
    ready_to_claim: number;
    pr_submitted_open: number;
    pr_merged_claimed: number;
    closed_or_stale: number;
    total_solved_value_usd: number;
    total_merged_value_usd: number;
  };
  solved_cases_detail: SolvedBounty[];
}

export interface DashboardData {
  openBounties: OpenBounty[];
  solvedBounties: SolvedBounty[];
  dailyReport: DailyReport;
}

export type ActionType = 'scan' | 'solve' | 'claim' | 'claim-live' | 'status' | 'auto-dry-run' | 'auto-live';
export type DomainType = 'all' | 'code' | 'web3_desci' | 'security' | 'kaggle';

export interface WorkflowRun {
  id: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
}
