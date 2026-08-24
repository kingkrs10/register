"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, CheckCircle, GitBranch, ExternalLink, Play, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Open Bounties", href: "/bounties/open", icon: Search },
  { name: "Solved Bounties", href: "/bounties/solved", icon: CheckCircle },
  { name: "Pipeline", href: "/pipeline", icon: GitBranch },
  { name: "Claims", href: "/claims", icon: ExternalLink },
  { name: "Execute", href: "/execute", icon: Play },
  { name: "Reports", href: "/reports", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 h-screen bg-slate-900 border-r border-slate-800">
      <div className="p-6">
        <h1 className="text-xl font-bold text-slate-50 flex items-center gap-2">
          🎯 BountyHarvest
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              )}
            >
              <Icon className="w-5 h-5" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <span>Engine v1.0</span>
        <div className="w-2 h-2 rounded-full bg-emerald-500" title="Workflow Succeeded" />
      </div>
    </div>
  );
}
