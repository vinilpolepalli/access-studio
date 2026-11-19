'use client';
import { useEffect, useState } from 'react';
import type { Role } from '@/lib/catalog';
import { api } from './client';

type Entry = { id: number; ts: string; actorRole: string; action: string; target: string };

export default function AuditDrawer({ role, tick, onClose }: { role: Role; tick: number; onClose: () => void }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (role !== 'admin') return;
    let live = true;
    api<{ entries: Entry[]; actions: string[] }>(`/api/audit${filter ? `?action=${filter}` : ''}`, role).then((r) => {
      if (live && r.ok) { setEntries(r.data.entries); setActions(r.data.actions); }
    });
    return () => { live = false; };
  }, [role, filter, tick]);

  return (
    <aside aria-label="Audit trail" className="fixed inset-x-0 bottom-0 z-10 max-h-[60vh] overflow-y-auto border-t border-hair bg-white md:bottom-0 md:left-auto md:right-0 md:top-[57px] md:max-h-none md:w-[420px] md:border-l md:border-t-0">
      <div className="sticky top-0 flex items-center justify-between border-b border-hair bg-white px-4 py-3">
        <h2 className="text-sm font-semibold">Audit trail</h2>
        <button className="btn" onClick={onClose}>Close</button>
      </div>
      {role !== 'admin' ? (
        <div className="p-4 text-sm">
          <p className="font-medium">Restricted for this role</p>
          <p className="mt-1 text-muted">Only Practice admin can read the audit trail. Your actions are still being recorded.</p>
        </div>
      ) : (
        <div className="p-4">
          <label className="label block" htmlFor="audit-filter">Filter by action</label>
          <select id="audit-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-3 mt-1 w-full rounded-input border border-hair bg-white px-2 py-1.5 text-sm">
            <option value="">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <ol className="space-y-2 font-mono text-xs">
            {entries.map((e) => (
              <li key={e.id} className="rounded-btn border border-hair px-2.5 py-2">
                <div className="flex justify-between text-muted"><span>{e.ts.replace('T', ' ').slice(0, 19)}Z</span><span>{e.actorRole}</span></div>
                <div><span className="font-semibold text-accent">{e.action}</span> {e.target}</div>
              </li>
            ))}
            {entries.length === 0 && <li className="text-muted">No entries.</li>}
          </ol>
        </div>
      )}
    </aside>
  );
}
