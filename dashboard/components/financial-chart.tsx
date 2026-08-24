"use client";

import { DailyReport } from "@/lib/types";
import { formatUSD } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

export function FinancialChart({ data }: { data: DailyReport }) {
  const chartData = [
    {
      name: "Pipeline Value",
      value: data.open_cases_summary.total_potential_usd,
      fill: "#3b82f6", // blue-500
    },
    {
      name: "Solved Value",
      value: data.solved_cases_summary.total_solved_value_usd,
      fill: "#a855f7", // purple-500
    },
    {
      name: "Merged Value",
      value: data.solved_cases_summary.total_merged_value_usd,
      fill: "#10b981", // emerald-500
    },
  ];

  return (
    <Card className="bg-slate-900 border-slate-800 p-6 h-full flex flex-col">
      <h3 className="text-lg font-medium text-slate-50 mb-4">Financial Overview</h3>
      
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} />
            <YAxis 
              stroke="#64748b" 
              tick={{ fill: '#94a3b8' }} 
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              cursor={{ fill: '#1e293b' }}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
              itemStyle={{ color: '#f8fafc' }}
              formatter={(value: number) => [formatUSD(value), "USD"]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-800">
        <div className="text-center">
          <div className="text-sm text-slate-400">Pipeline</div>
          <div className="font-semibold text-blue-400">{formatUSD(chartData[0].value)}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-slate-400">Solved</div>
          <div className="font-semibold text-purple-400">{formatUSD(chartData[1].value)}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-slate-400">Merged</div>
          <div className="font-semibold text-emerald-400">{formatUSD(chartData[2].value)}</div>
        </div>
      </div>
    </Card>
  );
}
