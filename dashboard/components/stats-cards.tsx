"use client";

import { DailyReport } from "@/lib/types";
import { formatUSD } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface StatsCardsProps {
  data: DailyReport;
}

export function StatsCards({ data }: StatsCardsProps) {
  const stats = [
    {
      title: "🎯 Active Bounties",
      value: data.open_cases_summary.active_open_count,
      color: "text-blue-400",
    },
    {
      title: "💰 Pipeline Value",
      value: formatUSD(data.open_cases_summary.total_potential_usd),
      color: "text-emerald-400",
    },
    {
      title: "✅ Solved Cases",
      value: data.solved_cases_summary.total_solved_cases,
      color: "text-purple-400",
    },
    {
      title: "🏆 Merged / Won",
      value: data.solved_cases_summary.pr_merged_claimed,
      subtitle: formatUSD(data.solved_cases_summary.total_merged_value_usd),
      color: "text-amber-400",
    },
    {
      title: "📤 PRs Pending",
      value: data.solved_cases_summary.pr_submitted_open,
      color: "text-orange-400",
    },
    {
      title: "🟢 Ready to Claim",
      value: data.solved_cases_summary.ready_to_claim,
      color: "text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <Card key={i} className="bg-slate-900 border-slate-800 p-6 flex flex-col items-center justify-center text-center">
          <div className="text-sm font-medium text-slate-400 mb-2">{stat.title}</div>
          <div className={`text-4xl font-bold ${stat.color}`}>{stat.value}</div>
          {stat.subtitle && (
            <div className="text-sm text-slate-500 mt-2">{stat.subtitle}</div>
          )}
        </Card>
      ))}
    </div>
  );
}
