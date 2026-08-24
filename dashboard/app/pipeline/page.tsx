'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { PipelineFunnel } from '@/components/pipeline-funnel';
import { DashboardData } from '@/lib/types';
import { formatUSD } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function ExpandableSection({ title, children, defaultExpanded = false }: { title: string, children: React.ReactNode, defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <button 
        className="w-full flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
        <span className="text-slate-400 text-xl leading-none">{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          {children}
        </div>
      )}
    </div>
  );
}

export default function PipelinePage() {
  const { data, error, isLoading } = useSWR<DashboardData>('/api/data', fetcher, { refreshInterval: 60000 });

  if (isLoading) return <div className="text-slate-400 p-8 flex justify-center">Loading pipeline data...</div>;
  if (error) return <div className="text-red-500 p-8">Error loading pipeline data.</div>;
  if (!data) return null;

  const topOpen = [...data.openBounties].sort((a, b) => b.solvability_score - a.solvability_score).slice(0, 5);
  const topSolved = [...data.solvedBounties].sort((a, b) => b.reward_usd - a.reward_usd).slice(0, 5);
  const readyAndSubmitted = data.solvedBounties.filter(b => ['ready_to_claim', 'pr_submitted'].includes(b.tracking_status));
  const merged = data.solvedBounties.filter(b => b.tracking_status === 'merged');

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Pipeline</h1>
        <p className="text-slate-400 mt-1">End-to-end bounty hunting flow</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <PipelineFunnel data={data.dailyReport} />
      </div>

      <div className="space-y-4">
        <ExpandableSection title={`1. Scout (${data.openBounties.length} open bounties)`} defaultExpanded={true}>
          <p className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Top 5 by solvability score</p>
          <ul className="space-y-2">
            {topOpen.map(b => (
              <li key={b.id} className="flex justify-between items-center text-sm p-3 bg-slate-950 rounded-md border border-slate-800">
                <span className="text-slate-300 font-mono">{b.repo_owner}/{b.repo_name} #{b.issue_number}</span>
                <div className="flex gap-6 items-center">
                  <span className="text-slate-400 text-xs bg-slate-800 px-2 py-1 rounded">Score: {b.solvability_score.toFixed(1)}</span>
                  <span className="text-emerald-400 font-semibold">{b.reward_formatted}</span>
                </div>
              </li>
            ))}
          </ul>
        </ExpandableSection>

        <ExpandableSection title={`2. Solve (${data.solvedBounties.length} solved bounties)`}>
          <p className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Top 5 by reward value</p>
          <ul className="space-y-2">
            {topSolved.map(b => (
              <li key={b.id} className="flex justify-between items-center text-sm p-3 bg-slate-950 rounded-md border border-slate-800">
                <span className="text-slate-300 font-mono">{b.repo_owner}/{b.repo_name} #{b.issue_number}</span>
                <span className="text-emerald-400 font-semibold">{formatUSD(b.reward_usd)}</span>
              </li>
            ))}
          </ul>
        </ExpandableSection>

        <ExpandableSection title={`3. Claim (${readyAndSubmitted.length} ready/submitted)`}>
          <ul className="space-y-2">
            {readyAndSubmitted.map(b => (
              <li key={b.id} className="flex justify-between items-center text-sm p-3 bg-slate-950 rounded-md border border-slate-800">
                <span className="text-slate-300 font-mono">{b.repo_owner}/{b.repo_name} #{b.issue_number}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${
                  b.tracking_status === 'ready_to_claim' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {b.tracking_status.replace(/_/g, ' ').toUpperCase()}
                </span>
              </li>
            ))}
            {readyAndSubmitted.length === 0 && (
              <p className="text-slate-500 italic p-2">No bounties in claim phase.</p>
            )}
          </ul>
        </ExpandableSection>

        <ExpandableSection title={`4. Merged (${merged.length} successfully claimed)`}>
          {merged.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {merged.map(b => (
                <div key={b.id} className="bg-slate-950 p-4 rounded-md border border-blue-500/30 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-slate-200 font-mono text-sm">{b.repo_owner}/{b.repo_name}</p>
                    <p className="text-xs text-slate-500 mt-1">Issue #{b.issue_number}</p>
                  </div>
                  <span className="text-emerald-400 font-bold text-lg">{formatUSD(b.reward_usd)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 italic p-2">No merged bounties yet.</p>
          )}
        </ExpandableSection>
      </div>
    </div>
  );
}
