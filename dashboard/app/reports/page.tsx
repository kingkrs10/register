'use client';

import useSWR from 'swr';
import { DailyReport } from '@/lib/types';
import { formatUSD } from '@/lib/utils';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ReportsPage() {
  const { data, error, isLoading } = useSWR<DailyReport>('/api/data?file=daily_report', fetcher, { refreshInterval: 60000 });
  const [copiedJSON, setCopiedJSON] = useState(false);
  const [copiedMD, setCopiedMD] = useState(false);

  if (isLoading) return <div className="text-slate-400 p-8 flex justify-center">Loading report...</div>;
  if (error) return <div className="text-red-500 p-8">Error loading report.</div>;
  if (!data) return null;

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2000);
  };

  const copyMarkdown = () => {
    const md = `# Daily Status Report
Timestamp: ${data.report_timestamp}

## Open Cases Summary
- Active: ${data.open_cases_summary.active_open_count}
- Stale/Closed: ${data.open_cases_summary.closed_stale_filtered}
- Potential Value: ${formatUSD(data.open_cases_summary.total_potential_usd)}

## Solved Cases Summary
- Total Solved: ${data.solved_cases_summary.total_solved_cases}
- Ready to Claim: ${data.solved_cases_summary.ready_to_claim}
- Submitted: ${data.solved_cases_summary.pr_submitted_open}
- Merged: ${data.solved_cases_summary.pr_merged_claimed}
- Total Value: ${formatUSD(data.solved_cases_summary.total_solved_value_usd)}
- Merged Value: ${formatUSD(data.solved_cases_summary.total_merged_value_usd)}
`;
    navigator.clipboard.writeText(md);
    setCopiedMD(true);
    setTimeout(() => setCopiedMD(false), 2000);
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Daily Status Report</h1>
          <p className="text-slate-400 mt-1">{data.report_timestamp}</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={copyJSON} 
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-md hover:bg-slate-700 hover:text-white text-sm font-medium transition-colors"
          >
            {copiedJSON ? 'Copied JSON!' : 'Copy as JSON'}
          </button>
          <button 
            onClick={copyMarkdown} 
            className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-md hover:bg-slate-700 hover:text-white text-sm font-medium transition-colors"
          >
            {copiedMD ? 'Copied Markdown!' : 'Copy as Markdown'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-50 mb-5 pb-2 border-b border-slate-800">Open Cases Summary</h2>
          <ul className="space-y-4 text-slate-300">
            <li className="flex justify-between items-center"><span className="text-slate-400">Active Open:</span> <span className="font-semibold text-slate-200">{data.open_cases_summary.active_open_count}</span></li>
            <li className="flex justify-between items-center"><span className="text-slate-400">Closed/Stale Filtered:</span> <span className="font-semibold text-slate-200">{data.open_cases_summary.closed_stale_filtered}</span></li>
            <li className="flex justify-between items-center pt-4 mt-2 border-t border-slate-800"><span className="text-slate-400 font-medium">Total Potential Value:</span> <span className="text-emerald-400 font-bold text-lg">{formatUSD(data.open_cases_summary.total_potential_usd)}</span></li>
          </ul>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-50 mb-5 pb-2 border-b border-slate-800">Solved Cases Summary</h2>
          <ul className="space-y-4 text-slate-300">
            <li className="flex justify-between items-center"><span className="text-slate-400">Total Solved:</span> <span className="font-semibold text-slate-200">{data.solved_cases_summary.total_solved_cases}</span></li>
            <li className="flex justify-between items-center"><span className="text-slate-400">Ready to Claim:</span> <span className="font-semibold text-slate-200">{data.solved_cases_summary.ready_to_claim}</span></li>
            <li className="flex justify-between items-center"><span className="text-slate-400">PR Submitted:</span> <span className="font-semibold text-slate-200">{data.solved_cases_summary.pr_submitted_open}</span></li>
            <li className="flex justify-between items-center"><span className="text-slate-400">PR Merged:</span> <span className="font-semibold text-slate-200">{data.solved_cases_summary.pr_merged_claimed}</span></li>
            <li className="flex justify-between items-center"><span className="text-slate-400">Closed/Stale:</span> <span className="font-semibold text-slate-200">{data.solved_cases_summary.closed_or_stale}</span></li>
            <li className="flex justify-between items-center pt-4 mt-2 border-t border-slate-800"><span className="text-slate-400 font-medium">Total Solved Value:</span> <span className="text-emerald-400 font-bold">{formatUSD(data.solved_cases_summary.total_solved_value_usd)}</span></li>
            <li className="flex justify-between items-center"><span className="text-slate-400 font-medium">Total Merged Value:</span> <span className="text-blue-400 font-bold text-lg">{formatUSD(data.solved_cases_summary.total_merged_value_usd)}</span></li>
          </ul>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-slate-50">Solved Cases Detail</h2>
        </div>
        <div className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950">
              <tr className="text-slate-400 border-b border-slate-800">
                <th className="py-4 px-6 font-medium">Repository</th>
                <th className="py-4 px-6 font-medium">Domain</th>
                <th className="py-4 px-6 font-medium">Reward</th>
                <th className="py-4 px-6 font-medium">Status</th>
                <th className="py-4 px-6 font-medium">PR/Link</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 divide-y divide-slate-800/50">
              {data.solved_cases_detail.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs text-slate-200">{b.repo_owner}/{b.repo_name} #{b.issue_number}</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                      {b.domain}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-emerald-400 font-medium">{formatUSD(b.reward_usd)}</td>
                  <td className="py-4 px-6">
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{b.tracking_status.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="py-4 px-6">
                    {b.pr_url ? <a href={b.pr_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">View PR</a> : <span className="text-slate-600">-</span>}
                  </td>
                </tr>
              ))}
              {data.solved_cases_detail.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 italic">No solved cases in this report.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
