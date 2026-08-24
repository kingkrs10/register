'use client';

import useSWR from 'swr';
import { BountyTable } from '@/components/bounty-table';
import { SolvedBounty } from '@/lib/types';
import { formatUSD } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function SolvedBountiesPage() {
  const { data, error, isLoading } = useSWR<SolvedBounty[]>('/api/data?file=solved_bounties', fetcher, { refreshInterval: 60000 });

  if (isLoading) {
    return <div className="text-slate-400 p-8 flex justify-center">Loading solved bounties...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-8">Error loading solved bounties.</div>;
  }

  if (!data) return null;

  const readyToClaim = data.filter(b => b.tracking_status === 'ready_to_claim').length;
  const submitted = data.filter(b => b.tracking_status === 'pr_submitted').length;
  const merged = data.filter(b => b.tracking_status === 'merged').length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Solved Bounties</h1>
        <p className="text-slate-400 mt-1">Verified solutions ready for submission</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-sm">
          <p className="text-sm text-slate-400 font-medium mb-1">Total Solved</p>
          <p className="text-3xl font-bold text-slate-50">{data.length}</p>
        </div>
        <div className="bg-slate-900 border border-emerald-500/30 rounded-lg p-5 shadow-sm">
          <p className="text-sm text-emerald-500/80 font-medium mb-1">Ready to Claim</p>
          <p className="text-3xl font-bold text-emerald-400">{readyToClaim}</p>
        </div>
        <div className="bg-slate-900 border border-amber-500/30 rounded-lg p-5 shadow-sm">
          <p className="text-sm text-amber-500/80 font-medium mb-1">Submitted</p>
          <p className="text-3xl font-bold text-amber-400">{submitted}</p>
        </div>
        <div className="bg-slate-900 border border-blue-500/30 rounded-lg p-5 shadow-sm">
          <p className="text-sm text-blue-500/80 font-medium mb-1">Merged</p>
          <p className="text-3xl font-bold text-blue-400">{merged}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <BountyTable type="solved" bounties={data} />
      </div>
    </div>
  );
}
