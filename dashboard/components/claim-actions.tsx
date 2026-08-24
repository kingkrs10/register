"use client";

import { SolvedBounty } from "@/lib/types";
import { formatUSD } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Github, Upload, AlertTriangle, Trophy } from "lucide-react";

export function ClaimActions({ bounties }: { bounties: SolvedBounty[] }) {
  const readyToClaim = bounties.filter(b => b.tracking_status === 'ready_to_claim');
  const pendingReview = bounties.filter(b => b.tracking_status === 'pr_submitted');
  const merged = bounties.filter(b => b.tracking_status === 'merged');

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-4">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          Ready to Claim ({readyToClaim.length})
        </h2>
        <div className="grid gap-4">
          {readyToClaim.length === 0 ? (
            <p className="text-slate-500 text-sm">No items ready to claim right now.</p>
          ) : (
            readyToClaim.map(bounty => (
              <Card key={bounty.id} className="bg-slate-900 border-slate-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <a href={bounty.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-medium hover:underline text-lg">
                    {bounty.title}
                  </a>
                  <div className="text-sm text-slate-400 mt-1">
                    {bounty.repo_owner}/{bounty.repo_name} #{bounty.issue_number}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-emerald-400 font-bold text-lg">{formatUSD(bounty.reward_usd)}</div>
                  {bounty.domain === 'kaggle' ? (
                    <a href={bounty.submission_file ? `file://${bounty.submission_file}` : '#'} target="_blank" rel="noopener noreferrer">
                      <Button variant="default" className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
                        <Upload className="w-4 h-4" /> Submit to Kaggle
                      </Button>
                    </a>
                  ) : bounty.domain === 'security' ? (
                    <a href={bounty.advisory_report ? `file://${bounty.advisory_report}` : '#'} target="_blank" rel="noopener noreferrer">
                      <Button variant="default" className="bg-red-600 hover:bg-red-700 text-white gap-2">
                        <AlertTriangle className="w-4 h-4" /> Submit Advisory
                      </Button>
                    </a>
                  ) : (
                    <a href={bounty.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                        <Github className="w-4 h-4" /> Submit PR
                      </Button>
                    </a>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-4">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          Pending Review ({pendingReview.length})
        </h2>
        <div className="grid gap-4">
          {pendingReview.map(bounty => (
            <Card key={bounty.id} className="bg-slate-900 border-slate-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-slate-200 font-medium">{bounty.title}</div>
                <div className="text-sm text-slate-400 mt-1">
                  {bounty.repo_owner}/{bounty.repo_name}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500">
                  Last audited: {new Date(bounty.last_audited).toLocaleDateString()}
                </span>
                {bounty.pr_url && (
                  <a href={bounty.pr_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="border-slate-700 text-slate-300 gap-2">
                      <ExternalLink className="w-4 h-4" /> View PR
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          ))}
          {pendingReview.length === 0 && <p className="text-slate-500 text-sm">No PRs pending review.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-4">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          Merged & Won ({merged.length})
        </h2>
        <div className="grid gap-4">
          {merged.map(bounty => (
            <Card key={bounty.id} className="bg-slate-900 border-blue-900/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-full flex-shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-blue-100 font-medium">{bounty.title}</div>
                  <div className="text-sm text-blue-400/70 mt-1">
                    {bounty.repo_owner}/{bounty.repo_name}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-blue-400 font-bold">{formatUSD(bounty.reward_usd)}</div>
                {bounty.pr_url && (
                  <a href={bounty.pr_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-2">
                      <ExternalLink className="w-4 h-4" /> View
                    </Button>
                  </a>
                )}
              </div>
            </Card>
          ))}
          {merged.length === 0 && <p className="text-slate-500 text-sm">No merged bounties yet. Keep pushing!</p>}
        </div>
      </section>
    </div>
  );
}
