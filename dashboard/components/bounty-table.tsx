"use client";

import { useState } from "react";
import { OpenBounty, SolvedBounty } from "@/lib/types";
import { formatUSD, truncate, cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { TrackingStatusBadge, DomainBadge, PlatformBadge } from "./status-badge";
import { Badge } from "@/components/ui/badge";

interface BountyTableProps {
  bounties: (OpenBounty | SolvedBounty)[];
  type: 'open' | 'solved';
}

export function BountyTable({ bounties, type }: BountyTableProps) {
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [sortBy, setSortBy] = useState<'reward' | 'score' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const filtered = bounties.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.repo_owner.toLowerCase().includes(search.toLowerCase()) ||
      b.repo_name.toLowerCase().includes(search.toLowerCase());

    const matchesDomain = domainFilter === "all" || b.domain === domainFilter;

    return matchesSearch && matchesDomain;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortBy) return 0;
    const mul = sortDir === 'desc' ? -1 : 1;
    if (sortBy === 'reward') return (a.reward_usd - b.reward_usd) * mul;
    if (sortBy === 'score') return (a.solvability_score - b.solvability_score) * mul;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const displayed = sorted.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const toggleSort = (col: 'reward' | 'score') => {
    if (sortBy === col) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 mb-4">
        <Input
          placeholder="Search repo, title..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm bg-slate-900 border-slate-700 text-slate-100"
        />
        <select
          value={domainFilter}
          onChange={(e) => { setDomainFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Domains</option>
          <option value="code">Code &amp; Docs</option>
          <option value="web3_desci">Web3 / DeSci</option>
          <option value="security">Security</option>
          <option value="kaggle">Kaggle</option>
        </select>
        <div className="text-sm text-slate-400 self-center ml-auto">
          {filtered.length} bounties
        </div>
      </div>

      <div className="rounded-md border border-slate-800 overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-900/50">
            <TableRow className="border-slate-800 hover:bg-slate-800/50">
              <TableHead className="text-slate-400">Repo &amp; Issue</TableHead>
              <TableHead className="text-slate-400">Title</TableHead>
              <TableHead className="text-slate-400">Platform</TableHead>
              <TableHead className="text-slate-400">Domain</TableHead>
              <TableHead
                className="text-slate-400 cursor-pointer hover:text-slate-200 select-none"
                onClick={() => toggleSort('reward')}
              >
                Reward {sortBy === 'reward' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
              </TableHead>
              {type === 'open' ? (
                <>
                  <TableHead
                    className="text-slate-400 cursor-pointer hover:text-slate-200 select-none"
                    onClick={() => toggleSort('score')}
                  >
                    Score {sortBy === 'score' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                  </TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-slate-400">Tracking</TableHead>
                  <TableHead className="text-slate-400">PR</TableHead>
                  <TableHead className="text-slate-400">Issue State</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={type === 'open' ? 7 : 8} className="text-center text-slate-500 py-8">
                  No bounties found.
                </TableCell>
              </TableRow>
            ) : (
              displayed.map((bounty, i) => (
                <TableRow key={bounty.id || i} className="border-slate-800 hover:bg-slate-800/30">
                  <TableCell>
                    <div className="flex flex-col">
                      <a href={`https://github.com/${bounty.repo_owner}/${bounty.repo_name}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-medium text-sm">
                        {bounty.repo_owner}/{bounty.repo_name}
                      </a>
                      <a href={bounty.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-200 text-xs">
                        #{bounty.issue_number}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-200 font-medium text-sm max-w-[300px]" title={bounty.title}>
                    {truncate(bounty.title, 60)}
                  </TableCell>
                  <TableCell>
                    <PlatformBadge platform={bounty.platform || 'unknown'} />
                  </TableCell>
                  <TableCell>
                    <DomainBadge domain={bounty.domain} />
                  </TableCell>
                  <TableCell className={cn("font-medium", bounty.reward_usd >= 100 ? "text-emerald-400" : "text-slate-300")}>
                    {formatUSD(bounty.reward_usd)}
                  </TableCell>
                  {type === 'open' ? (
                    <>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", bounty.solvability_score > 70 ? "bg-emerald-500" : bounty.solvability_score > 40 ? "bg-amber-500" : "bg-red-500")}
                              style={{ width: `${Math.min(100, Math.max(0, bounty.solvability_score))}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">{bounty.solvability_score}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(bounty as OpenBounty).live_status || bounty.status}
                        </Badge>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <TrackingStatusBadge status={(bounty as SolvedBounty).tracking_status} />
                      </TableCell>
                      <TableCell>
                        {(bounty as SolvedBounty).pr_url ? (
                          <a href={(bounty as SolvedBounty).pr_url!} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-xs">
                            View PR
                          </a>
                        ) : (
                          <span className="text-slate-500 text-xs">Not Submitted</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(bounty as SolvedBounty).issue_live_state || 'Unknown'}
                        </Badge>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Previous
        </Button>
        <span className="text-slate-400 text-sm">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
