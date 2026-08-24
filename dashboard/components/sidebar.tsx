"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Search, 
  CheckCircle, 
  GitBranch, 
  ExternalLink, 
  Play, 
  FileText,
  CreditCard,
  Flame
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Open Bounties", href: "/bounties/open", icon: Search },
  { name: "Active Claims (WIP)", href: "/claims", icon: Flame },
  { name: "Solved Bounties", href: "/bounties/solved", icon: CheckCircle },
  { name: "Pipeline Flow", href: "/pipeline", icon: GitBranch },
  { name: "Payouts & Stripe", href: "/payouts", icon: CreditCard },
  { name: "Execute Engine", href: "/execute", icon: Play },
  { name: "Daily Reports", href: "/reports", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 h-screen bg-slate-900 border-r border-slate-800 shrink-0">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-50 flex items-center gap-2">
            🎯 BountyHarvest
          </h1>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto scrollbar-thin">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                isActive
                  ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="System Live" />
          <span>Engine v1.0 Live</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">kingkrs10/register</span>
      </div>
    </div>
  );
}
