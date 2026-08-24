'use client';

import useSWR from 'swr';
import { ClaimActions } from '@/components/claim-actions';
import { SolvedBounty } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ClaimsPage() {
  const { data, error, isLoading } = useSWR<SolvedBounty[]>('/api/data?file=solved_bounties', fetcher, { refreshInterval: 60000 });

  if (isLoading) return <div className="text-slate-400 p-8 flex justify-center">Loading claims data...</div>;
  if (error) return <div className="text-red-500 p-8">Error loading claims data.</div>;
  if (!data) return null;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Claims</h1>
        <p className="text-slate-400 mt-1">Manage bounty claims and submissions</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-sm">
        <ClaimActions bounties={data} />
      </div>
    </div>
  );
}
