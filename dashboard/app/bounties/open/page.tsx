'use client';

import useSWR from 'swr';
import { BountyTable } from '@/components/bounty-table';
import { OpenBounty } from '@/lib/types';
import { formatUSD } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function OpenBountiesPage() {
  const { data, error, isLoading } = useSWR<OpenBounty[]>('/api/data?file=open_bounties', fetcher, { refreshInterval: 60000 });

  if (isLoading) {
    return <div className="text-slate-400 p-8 flex justify-center">Loading open bounties...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-8">Error loading open bounties.</div>;
  }

  if (!data) return null;

  const totalValue = data.reduce((acc, b) => acc + (b.reward_usd || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Open Bounties</h1>
        <p className="text-slate-400 mt-1">Scouted bounties across all platforms</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex space-x-12 shadow-sm">
        <div>
          <p className="text-sm text-slate-400 font-medium mb-1">Total Bounties</p>
          <p className="text-3xl font-bold text-slate-50">{data.length}</p>
        </div>
        <div>
          <p className="text-sm text-slate-400 font-medium mb-1">Total Value</p>
          <p className="text-3xl font-bold text-emerald-400">{formatUSD(totalValue)}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <BountyTable type="open" bounties={data} />
      </div>
    </div>
  );
}
