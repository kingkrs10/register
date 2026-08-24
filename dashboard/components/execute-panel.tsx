"use client";

import { useState, useEffect } from "react";
import { ActionType, DomainType, WorkflowRun } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ExecutePanel() {
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<DomainType>("all");
  const [limit, setLimit] = useState("30");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowRun | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then(res => res.json())
      .then(data => setWorkflow(data.workflow))
      .catch(() => {});
  }, []);

  const actions: { id: ActionType; title: string; desc: string; destructive?: boolean; color: string }[] = [
    { id: "scan", title: "🔍 Scan Bounties", desc: "Discover open bounties across all platforms", color: "text-blue-400 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10" },
    { id: "solve", title: "🧠 Solve Top", desc: "Clone, patch, and verify the highest-scoring bounty", color: "text-purple-400 border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10" },
    { id: "claim", title: "📤 Claim (Dry Run)", desc: "Preview PR submission without pushing", color: "text-amber-400 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10" },
    { id: "claim-live", title: "📤 Claim (Live)", desc: "Submit PRs and claim bounties FOR REAL", destructive: true, color: "text-emerald-500 border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20" },
    { id: "status", title: "📊 Refresh Status", desc: "Audit live GitHub issue and PR states", color: "text-slate-300 border-slate-700 bg-slate-800/50 hover:bg-slate-800" },
    { id: "auto-dry-run", title: "🚀 Full Auto (Dry)", desc: "Run complete pipeline in safe mode", color: "text-indigo-400 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10" },
    { id: "auto-live", title: "🚀 Full Auto (Live)", desc: "Run complete pipeline with live submissions", destructive: true, color: "text-red-500 border-red-500/50 bg-red-500/10 hover:bg-red-500/20" },
  ];

  const handleTrigger = async () => {
    if (!selectedAction) return;

    const actionDef = actions.find(a => a.id === selectedAction);
    if (actionDef?.destructive && !showConfirmDialog) {
      setShowConfirmDialog(true);
      return;
    }

    setShowConfirmDialog(false);
    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: selectedAction, domain: selectedDomain, limit }),
      });
      const data = await res.json();
      setResult({ success: res.ok, message: data.message || (res.ok ? "Workflow triggered successfully! Check Actions tab for progress." : "Failed to trigger workflow.") });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "An error occurred";
      setResult({ success: false, message });
    } finally {
      setIsLoading(false);
      setSelectedAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="space-y-2 flex-1 w-full">
          <label className="text-sm font-medium text-slate-300">Target Domain</label>
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value as DomainType)}
            className="w-full h-10 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Domains</option>
            <option value="code">Code &amp; Docs</option>
            <option value="web3_desci">Web3 / DeSci</option>
            <option value="security">Security</option>
            <option value="kaggle">Kaggle</option>
          </select>
        </div>
        <div className="space-y-2 w-full md:w-32">
          <label className="text-sm font-medium text-slate-300">Limit</label>
          <Input
            type="number"
            value={limit}
            onChange={e => setLimit(e.target.value)}
            className="bg-slate-950 border-slate-700 text-slate-100"
          />
        </div>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {actions.map(action => (
          <Card
            key={action.id}
            className={cn(
              "p-4 border cursor-pointer transition-all",
              action.color,
              selectedAction === action.id && "ring-2 ring-emerald-500 scale-[1.02]"
            )}
            onClick={() => setSelectedAction(action.id)}
          >
            <h3 className="font-semibold text-lg">{action.title}</h3>
            <p className="text-sm opacity-80 mt-1">{action.desc}</p>
            {action.destructive && (
              <span className="text-xs mt-2 inline-block text-red-400/80">⚠️ Requires confirmation</span>
            )}
          </Card>
        ))}
      </div>

      {/* Execute Button + Workflow Status */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-800">
        <div className="text-sm text-slate-400">
          {workflow ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-300">Latest Run:</span>
              <span className={workflow.conclusion === 'success' ? 'text-emerald-400' : workflow.conclusion === 'failure' ? 'text-red-400' : 'text-amber-400'}>
                {workflow.status} {workflow.conclusion ? `(${workflow.conclusion})` : ''}
              </span>
              <span className="text-slate-500">•</span>
              <a href={workflow.html_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                View Logs
              </a>
            </div>
          ) : (
            <span>No recent workflow runs</span>
          )}
        </div>
        <Button
          size="lg"
          onClick={handleTrigger}
          disabled={!selectedAction || isLoading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[180px]"
        >
          {isLoading && (
            <svg className="w-5 h-5 animate-spin mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          Execute Action
        </Button>
      </div>

      {/* Result Message */}
      {result && (
        <div className={cn(
          "p-4 rounded-lg flex items-center gap-3",
          result.success
            ? "bg-emerald-900/30 text-emerald-400 border border-emerald-900/50"
            : "bg-red-900/30 text-red-400 border border-red-900/50"
        )}>
          <span className="text-lg">{result.success ? '✅' : '❌'}</span>
          {result.message}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        title="⚠️ WARNING: Live Execution"
      >
        <p className="text-slate-300 mb-6">
          Are you sure? This will make <strong className="text-red-400">LIVE submissions</strong> — creating actual Pull Requests and submitting to external platforms for real bounties.
          Only proceed if you are confident in the generated patches.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleTrigger} className="bg-red-600 hover:bg-red-700 text-white">
            Yes, Execute Live
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
