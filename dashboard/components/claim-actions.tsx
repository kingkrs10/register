"use client";

import { SolvedBounty } from "@/lib/types";
import { formatUSD } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DomainBadge, PlatformBadge } from "@/components/status-badge";
import { 
  ExternalLink, 
  Github, 
  Upload, 
  AlertTriangle, 
  Trophy, 
  GitPullRequest, 
  FolderGit2, 
  CheckCircle2,
  Clock,
  Flame,
  ArrowRight
} from "lucide-react";

export function ClaimActions({ bounties }: { bounties: SolvedBounty[] }) {
  const readyToClaim = bounties.filter(b => b.tracking_status === 'ready_to_claim');
  const pendingReview = bounties.filter(b => b.tracking_status === 'pr_submitted');
  const merged = bounties.filter(b => b.tracking_status === 'merged');

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-emerald-500/30 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Local Solved (Ready to Submit)</p>
              <p className="text-2xl font-bold text-slate-100">{readyToClaim.length} Cases</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900 border-amber-500/30 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">In Maintainer Review (Active PRs)</p>
              <p className="text-2xl font-bold text-slate-100">{pendingReview.length} PRs</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-900 border-blue-500/30 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Merged &amp; Won Bounties</p>
              <p className="text-2xl font-bold text-slate-100">{merged.length} Cases</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 1. READY TO CLAIM / LOCAL FIXES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-100">
              Active Local Fixes — Ready to Claim ({readyToClaim.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">Local patch tested &amp; verified</span>
        </div>

        <div className="grid gap-4">
          {readyToClaim.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-800 p-6 text-center text-slate-500 text-sm">
              All solved bounties have been submitted! Run <code className="text-emerald-400 bg-slate-800 px-1 py-0.5 rounded">python main.py --solve</code> to solve the next top bounty.
            </Card>
          ) : (
            readyToClaim.map(bounty => (
              <Card key={bounty.id} className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PlatformBadge platform={bounty.platform || 'github'} />
                      <DomainBadge domain={bounty.domain} />
                      <span className="text-xs text-slate-400 font-mono">
                        {bounty.repo_owner}/{bounty.repo_name} #{bounty.issue_number}
                      </span>
                    </div>

                    <a 
                      href={bounty.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-base font-semibold text-slate-100 hover:text-emerald-400 hover:underline inline-block transition-colors"
                    >
                      {bounty.title}
                    </a>

                    {bounty.workspace && (
                      <p className="text-xs font-mono text-slate-500 truncate max-w-xl">
                        📁 Workspace: {bounty.workspace}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <div className="text-right">
                      <div className="text-xl font-bold text-emerald-400">{formatUSD(bounty.reward_usd)}</div>
                      <div className="text-[11px] text-slate-500">Bounty Reward</div>
                    </div>

                    {bounty.domain === 'kaggle' ? (
                      <a href={bounty.submission_file ? `file://${bounty.submission_file}` : '#'} target="_blank" rel="noopener noreferrer">
                        <Button variant="default" className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5 text-xs h-9">
                          <Upload className="w-3.5 h-3.5" /> Submit to Kaggle
                        </Button>
                      </a>
                    ) : bounty.domain === 'security' ? (
                      <a href={bounty.advisory_report ? `file://${bounty.advisory_report}` : '#'} target="_blank" rel="noopener noreferrer">
                        <Button variant="default" className="bg-red-600 hover:bg-red-700 text-white gap-1.5 text-xs h-9">
                          <AlertTriangle className="w-3.5 h-3.5" /> Submit Advisory
                        </Button>
                      </a>
                    ) : (
                      <a href={bounty.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs h-9 font-medium">
                          <Github className="w-3.5 h-3.5" /> Submit PR <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* 2. PENDING MAINTAINER REVIEW */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-slate-100">
              Under Maintainer Review — Submitted PRs ({pendingReview.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">Waiting for merge &amp; bounty release</span>
        </div>

        <div className="grid gap-3">
          {pendingReview.map(bounty => (
            <Card key={bounty.id} className="bg-slate-900/90 border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-blue-400 font-medium">{bounty.repo_owner}/{bounty.repo_name}</span>
                  <DomainBadge domain={bounty.domain} />
                  <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 bg-amber-500/10">
                    PR Open
                  </Badge>
                </div>
                <div className="text-sm font-medium text-slate-200">{bounty.title}</div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <span className="font-semibold text-emerald-400 text-sm">{formatUSD(bounty.reward_usd)}</span>
                {bounty.pr_url && (
                  <a href={bounty.pr_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1 text-xs h-8">
                      <ExternalLink className="w-3 h-3" /> View PR
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          ))}
          {pendingReview.length === 0 && <p className="text-slate-500 text-sm">No PRs currently pending review.</p>}
        </div>
      </section>

      {/* 3. MERGED & WON */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-slate-100">
            Won Bounties &amp; Merged PRs ({merged.length})
          </h2>
        </div>

        <div className="grid gap-3">
          {merged.map(bounty => (
            <Card key={bounty.id} className="bg-slate-900 border-blue-900/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-full shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">{bounty.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5 font-mono">
                    {bounty.repo_owner}/{bounty.repo_name}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-emerald-400 font-bold">{formatUSD(bounty.reward_usd)}</div>
                {bounty.pr_url && (
                  <a href={bounty.pr_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-1 text-xs h-8">
                      <ExternalLink className="w-3 h-3" /> View
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          ))}
          {merged.length === 0 && (
            <p className="text-slate-500 text-sm">No merged bounties yet. Keep the engine running!</p>
          )}
        </div>
      </section>
    </div>
  );
}
