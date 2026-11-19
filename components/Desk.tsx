'use client';
import { useEffect, useState } from 'react';
import { ROLES, type Role } from '@/lib/catalog';
import { api, type FieldDesc, type Marker } from './client';

type ListRes = {
  fields: FieldDesc[];
  restricted: Marker[];
  minimumNecessary: { needed: string[]; extras: string[] };
  rows: { id: string; code: string; values: Record<string, string> }[];
};
type DetailRes = { code: string; fields: FieldDesc[]; restricted: Marker[]; values: Record<string, string> };

export default function Desk({ role, onActivity }: { role: Role; onActivity: () => void }) {
  const [list, setList] = useState<ListRes | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailRes | null>(null);

  useEffect(() => {
    let live = true;
    api<ListRes>('/api/patients', role).then((r) => { if (live && r.ok) { setList(r.data); onActivity(); } });
    return () => { live = false; };
  }, [role, onActivity]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    let live = true;
    api<DetailRes>(`/api/patients/${selected}`, role).then((r) => { if (live && r.ok) { setDetail(r.data); onActivity(); } });
    return () => { live = false; };
  }, [selected, role, onActivity]);

  const roleInfo = ROLES.find((r) => r.key === role)!;
  const mn = list?.minimumNecessary;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-lg font-semibold">Callback list</h1>
        <span className="text-sm text-muted">{roleInfo.label}: {roleInfo.blurb}</span>
      </div>

      {mn && mn.extras.length > 0 && (
        <div className="card mb-4 border-l-4 border-l-accent px-4 py-3 text-sm" role="note">
          <span className="label mr-2">Minimum necessary</span>
          This task list only needs {mn.needed.join(' and ').toLowerCase()}. {roleInfo.label} can also see: {mn.extras.join(', ')}.
          <span className="text-muted"> Simplified illustration with a fixed rule, not a compliance determination.</span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-hair">
                <th className="label whitespace-nowrap px-3 py-2">ID</th>
                {list?.fields.map((f) => <th key={f.key} className="label whitespace-nowrap px-3 py-2">{f.label}</th>)}
                {list?.restricted.map((m) => <th key={m.label} className="label whitespace-nowrap px-3 py-2">{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {list?.rows.map((r) => (
                <tr key={r.id} className={`border-b border-hair last:border-0 ${selected === r.id ? 'bg-accent-soft' : ''}`}>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                    <button className="underline decoration-hair underline-offset-4 hover:text-accent" onClick={() => setSelected(r.id)} aria-label={`Open record ${r.code}`}>{r.code}</button>
                  </td>
                  {list.fields.map((f) => <td key={f.key} className={`px-3 py-2 ${f.key === 'note' ? 'min-w-[220px]' : 'whitespace-nowrap'}`}>{r.values[f.key]}</td>)}
                  {list.restricted.map((m) => <td key={m.label} className="whitespace-nowrap px-3 py-2 text-xs text-muted" title={m.explanation}>Restricted for this role</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {!list && <p className="p-4 text-sm text-muted">Loading synthetic records.</p>}
        </div>

        <aside className="card self-start p-4" aria-label="Record detail">
          <h2 className="label mb-3">Record detail</h2>
          {!detail && <p className="text-sm text-muted">Select a record ID. Opening a record is written to the audit trail.</p>}
          {detail && (
            <div>
              <p className="mb-3 font-mono text-xs">{detail.code} <span className="chip ml-2 border-accent text-accent">Synthetic</span></p>
              <dl className="space-y-3 text-sm">
                {detail.fields.map((f) => (
                  <div key={f.key}><dt className="label">{f.label}</dt><dd>{detail.values[f.key]}</dd></div>
                ))}
                {detail.restricted.map((m) => (
                  <div key={m.label}>
                    <dt className="label">{m.label}</dt>
                    <dd className="text-muted">Restricted for this role<span className="block text-xs">{m.explanation}</span></dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
