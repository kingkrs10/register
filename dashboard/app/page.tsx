'use client';

import useSWR from 'swr';
import { StatsCards } from '@/components/stats-cards';
import { PipelineFunnel } from '@/components/pipeline-funnel';
import { FinancialChart } from '@/components/financial-chart';
import { DomainBreakdown } from '@/components/domain-breakdown';
import { TrackingStatusBadge } from '@/components/status-badge';
import { DashboardData } from '@/lib/types';
import { formatUSD } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DashboardOverview() {
  const { data, error, isLoading } = useSWR<DashboardData>('/api/data', fetcher, { refreshInterval: 60000 });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-900 rounded-xl border border-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-900 rounded-xl border border-slate-800" />
          <div className="h-64 bg-slate-900 rounded-xl border border-slate-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-500 p-6 border border-red-500/30 bg-red-500/10 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Error loading dashboard</h2>
          <p className="text-red-400 text-sm">Failed to fetch bounty data. Make sure your GitHub token is configured.</p>
        </div>
      </div>
    );
  }

  if (!data || !data.dailyReport) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Dashboard</h1>
        <p className="text-slate-400 mt-1">MicroBountyHarvest Engine Overview</p>
      </div>

      <StatsCards data={data.dailyReport} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineFunnel data={data.dailyReport} />
        <FinancialChart data={data.dailyReport} />
      </div>

      <DomainBreakdown
        openBounties={data.openBounties || []}
        solvedBounties={data.solvedBounties || []}
      />

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-slate-50 mb-4">Recent Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="pb-3 font-medium">Repository</th>
                <th className="pb-3 font-medium">Reward</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">PR Link</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {(data.solvedBounties || []).slice(0, 5).map(bounty => (
                <tr key={bounty.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
                  <td className="py-4">
                    <a href={bounty.url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-blue-400 hover:underline">
                      {bounty.repo_owner}/{bounty.repo_name} #{bounty.issue_number}
                    </a>
                  </td>
                  <td className="py-4 text-emerald-400 font-medium">{bounty.reward_formatted || formatUSD(bounty.reward_usd)}</td>
                  <td className="py-4"><TrackingStatusBadge status={bounty.tracking_status} /></td>
                  <td className="py-4">
                    {bounty.pr_url ? (
                      <a href={bounty.pr_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors text-sm">View PR</a>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {(!data.solvedBounties || data.solvedBounties.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 italic">No recent activity found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
