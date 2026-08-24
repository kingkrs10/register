"use client";

import { DailyReport } from "@/lib/types";
import { formatUSD } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export function PipelineFunnel({ data }: { data: DailyReport }) {
  const stages = [
    {
      name: "Scout",
      count: data.open_cases_summary.active_open_count,
      value: formatUSD(data.open_cases_summary.total_potential_usd),
      color: "border-blue-500 bg-blue-500/10 text-blue-400",
    },
    {
      name: "Solve",
      count: data.solved_cases_summary.total_solved_cases,
      value: formatUSD(data.solved_cases_summary.total_solved_value_usd),
      color: "border-purple-500 bg-purple-500/10 text-purple-400",
    },
    {
      name: "Claim",
      count: data.solved_cases_summary.pr_submitted_open + data.solved_cases_summary.ready_to_claim,
      value: "-",
      color: "border-amber-500 bg-amber-500/10 text-amber-400",
    },
    {
      name: "Merged",
      count: data.solved_cases_summary.pr_merged_claimed,
      value: formatUSD(data.solved_cases_summary.total_merged_value_usd),
      color: "border-emerald-500 bg-emerald-500/10 text-emerald-400",
    },
  ];

  return (
    <Card className="bg-slate-900 border-slate-800 p-6">
      <h3 className="text-lg font-medium text-slate-50 mb-6 text-center">Pipeline Funnel</h3>
      <div className="flex flex-col md:flex-row items-center justify-center gap-4">
        {stages.map((stage, i) => (
          <div key={stage.name} className="flex items-center gap-4 flex-col md:flex-row">
            <div className={`flex flex-col items-center justify-center w-32 h-24 rounded-lg border ${stage.color}`}>
              <div className="font-semibold">{stage.name}: {stage.count}</div>
              <div className="text-sm mt-1">{stage.value}</div>
            </div>
            {i < stages.length - 1 && (
              <ArrowRight className="text-slate-600 hidden md:block" />
            )}
            {i < stages.length - 1 && (
              <ArrowRight className="text-slate-600 rotate-90 md:hidden my-2" />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
