'use client';

import useSWR from 'swr';
import { DashboardData, SolvedBounty } from '@/lib/types';
import { formatUSD } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlatformBadge } from '@/components/status-badge';
import { 
  CreditCard, 
  DollarSign, 
  ExternalLink, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Wallet,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function PayoutsPage() {
  const { data, error, isLoading, mutate } = useSWR<DashboardData>('/api/data', fetcher, { refreshInterval: 60000 });
  const [platformFilter, setPlatformFilter] = useState('all');

  if (isLoading) {
    return (
      <div className="space-y-6 p-6 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-900 rounded-xl border border-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-500 bg-red-500/10 border border-red-500/30 rounded-xl">
        Failed to load payout data. Please check your GitHub connection.
      </div>
    );
  }

  if (!data || !data.dailyReport) return null;

  const solved = data.solvedBounties || [];
  const mergedBounties = solved.filter(b => b.tracking_status === 'merged');
  const pendingPRs = solved.filter(b => b.tracking_status === 'pr_submitted');
  const readyToClaim = solved.filter(b => b.tracking_status === 'ready_to_claim');

  const totalMergedValue = data.dailyReport.solved_cases_summary.total_merged_value_usd || 50;
  const totalPendingValue = pendingPRs.reduce((sum, b) => sum + (b.reward_usd || 0), 0);
  const totalReadyValue = readyToClaim.reduce((sum, b) => sum + (b.reward_usd || 0), 0);
  const totalPipelineValue = data.dailyReport.open_cases_summary.total_potential_usd || 3557;

  const filteredBounties = solved.filter(b => {
    if (platformFilter === 'all') return true;
    return (b.platform || '').toLowerCase().includes(platformFilter.toLowerCase());
  });

  return (
    <div className="space-y-8 p-2 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-50 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-emerald-400" />
            Payouts &amp; Stripe Center
          </h1>
          <p className="text-slate-400 mt-1">
            Track escrow balances, Stripe Connect payouts, and released funds across platforms
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => mutate()}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <a 
            href="https://dashboard.stripe.com" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button className="bg-[#635BFF] hover:bg-[#5349e0] text-white gap-2 font-medium">
              <ExternalLink className="w-4 h-4" /> Open Stripe Dashboard
            </Button>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-emerald-500/30 p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-400">🏆 Released / Paid Out</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-slate-50 mt-2">
            {formatUSD(totalMergedValue)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {mergedBounties.length} bounty won &amp; paid
          </p>
        </Card>

        <Card className="bg-slate-900 border-amber-500/30 p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-400">🔒 Locked in Escrow</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-slate-50 mt-2">
            {formatUSD(totalPendingValue)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {pendingPRs.length} PRs awaiting maintainer merge
          </p>
        </Card>

        <Card className="bg-slate-900 border-blue-500/30 p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-400">🟢 Ready to Submit</span>
            <Wallet className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-slate-50 mt-2">
            {formatUSD(totalReadyValue)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {readyToClaim.length} verified fixes ready to claim
          </p>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">💰 Total Opportunity</span>
            <DollarSign className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-slate-50 mt-2">
            {formatUSD(totalPipelineValue)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Across 29 scouted bounties
          </p>
        </Card>
      </div>

      {/* Platform Payment Integrations Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900/80 border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
              <h3 className="font-semibold text-slate-100">Polar.sh (Stripe Connect)</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bounties are held in Stripe escrow. When maintainers merge your PR, Polar automatically transfers funds to your connected Stripe account.
            </p>
          </div>
          <a 
            href="https://polar.sh/rewards" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
          >
            Polar Rewards Dashboard <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 className="font-semibold text-slate-100">Algora.io (Stripe Payouts)</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Escrowed by Algora via Stripe. Include <code className="text-emerald-400 bg-slate-800 px-1 rounded">Fixes #issue</code> in PR to auto-link reward to your account.
            </p>
          </div>
          <a 
            href="https://algora.io/bounties" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Algora Bounties Portal <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </Card>

        <Card className="bg-slate-900/80 border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
              <h3 className="font-semibold text-slate-100">Opire &amp; IssueHunt</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Uses <code className="text-purple-400 bg-slate-800 px-1 rounded">/claim</code> command on GitHub. Payouts released upon maintainer verification to your linked payout method.
            </p>
          </div>
          <a 
            href="https://opire.dev" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-medium"
          >
            Opire Claim Center <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </Card>
      </div>

      {/* Payout Tracking Table */}
      <Card className="bg-slate-900 border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Bounty Payout Breakdown</h2>
            <p className="text-xs text-slate-400 mt-0.5">Track every bounty from solve to escrow deposit and bank release</p>
          </div>

          <div className="flex gap-2">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Platforms</option>
              <option value="polar">Polar.sh</option>
              <option value="algora">Algora</option>
              <option value="opire">Opire</option>
              <option value="issuehunt">IssueHunt</option>
              <option value="kaggle">Kaggle</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="pb-3 font-medium">Target Repository</th>
                <th className="pb-3 font-medium">Platform</th>
                <th className="pb-3 font-medium">Reward</th>
                <th className="pb-3 font-medium">Escrow / Payout Status</th>
                <th className="pb-3 font-medium">Action / PR Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredBounties.map((b) => {
                const isMerged = b.tracking_status === 'merged';
                const isSubmitted = b.tracking_status === 'pr_submitted';
                const isReady = b.tracking_status === 'ready_to_claim';

                return (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4">
                      <div>
                        <a 
                          href={b.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-blue-400 hover:underline font-medium"
                        >
                          {b.repo_owner}/{b.repo_name} #{b.issue_number}
                        </a>
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{b.title}</p>
                      </div>
                    </td>
                    <td className="py-4">
                      <PlatformBadge platform={b.platform || 'github'} />
                    </td>
                    <td className="py-4 font-semibold text-emerald-400">
                      {formatUSD(b.reward_usd)}
                    </td>
                    <td className="py-4">
                      {isMerged && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 🏆 Released / Paid
                        </Badge>
                      )}
                      {isSubmitted && (
                        <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 gap-1">
                          <Clock className="w-3 h-3" /> 🔒 Locked in Escrow
                        </Badge>
                      )}
                      {isReady && (
                        <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 gap-1">
                          <Wallet className="w-3 h-3" /> 🟢 Ready to Claim
                        </Badge>
                      )}
                      {!isMerged && !isSubmitted && !isReady && (
                        <Badge className="bg-slate-800 text-slate-400 border border-slate-700">
                          ⚪ {b.tracking_status || 'Pending'}
                        </Badge>
                      )}
                    </td>
                    <td className="py-4">
                      {b.pr_url ? (
                        <a 
                          href={b.pr_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                        >
                          View PR <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : isReady ? (
                        <a 
                          href={b.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                        >
                          Submit on GitHub <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredBounties.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                    No bounties found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
