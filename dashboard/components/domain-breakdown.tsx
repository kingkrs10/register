"use client";

import { OpenBounty, SolvedBounty } from "@/lib/types";
import { getDomainLabel } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface DomainBreakdownProps {
  openBounties: OpenBounty[];
  solvedBounties: SolvedBounty[];
}

export function DomainBreakdown({ openBounties, solvedBounties }: DomainBreakdownProps) {
  const domainCounts: Record<string, number> = {};
  
  const allBounties = [...openBounties, ...solvedBounties];
  
  allBounties.forEach(b => {
    domainCounts[b.domain] = (domainCounts[b.domain] || 0) + 1;
  });

  const data = Object.entries(domainCounts).map(([domain, count]) => ({
    name: getDomainLabel(domain),
    value: count,
    originalDomain: domain,
  }));

  const getColor = (domain: string) => {
    switch(domain) {
      case 'code': return '#3b82f6'; // blue-500
      case 'web3_desci': return '#a855f7'; // purple-500
      case 'security': return '#ef4444'; // red-500
      case 'kaggle': return '#f97316'; // orange-500
      default: return '#64748b'; // slate-500
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800 p-6 h-full flex flex-col">
      <h3 className="text-lg font-medium text-slate-50 mb-4">Domain Breakdown</h3>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.originalDomain)} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
              itemStyle={{ color: '#f8fafc' }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
