import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function getDomainColor(domain: string): string {
  switch (domain) {
    case 'code': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'web3_desci': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'security': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'kaggle': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

export function getDomainLabel(domain: string): string {
  switch (domain) {
    case 'code': return 'Code & Docs';
    case 'web3_desci': return 'Web3 / DeSci';
    case 'security': return 'Security';
    case 'kaggle': return 'Kaggle';
    default: return domain;
  }
}

export function getPlatformColor(platform: string): string {
  const p = platform.toLowerCase();
  if (p.includes('algora')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (p.includes('polar')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (p.includes('opire')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  if (p.includes('issuehunt')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (p.includes('gitcoin')) return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
  if (p.includes('kaggle')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (p.includes('security') || p.includes('github_security')) return 'bg-red-500/20 text-red-400 border-red-500/30';
  return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
}

export function getTrackingStatusColor(status: string): string {
  switch (status) {
    case 'ready_to_claim': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'pr_submitted': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'merged': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'closed': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

export function getTrackingStatusLabel(status: string): string {
  switch (status) {
    case 'ready_to_claim': return '🟢 Ready to Claim';
    case 'pr_submitted': return '🟡 Submitted';
    case 'merged': return '🏆 Merged';
    case 'closed': return '⚪ Closed';
    default: return status;
  }
}
