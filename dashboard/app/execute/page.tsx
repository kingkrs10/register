'use client';

import { ExecutePanel } from '@/components/execute-panel';

export default function ExecutePage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50">Execute</h1>
        <p className="text-slate-400 mt-1">Trigger bounty engine operations</p>
      </div>
      <ExecutePanel />
    </div>
  );
}
