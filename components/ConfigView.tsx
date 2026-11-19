'use client';
import { useCallback, useEffect, useState } from 'react';
import type { FieldKey, Role, ToolConfig } from '@/lib/catalog';
import { api } from './client';

type Cfg = {
  fields: { key: FieldKey; label: string; locked?: boolean }[];
  roles: { key: Role; label: string }[];
  config: ToolConfig;
  minimumNecessary: Record<Role, { needed: string[]; extras: string[] }>;
};
type Versions = { versions: { version: number; createdAt: string; config: ToolConfig }[]; draftDiffersFromPublished: boolean };

export default function ConfigView({ role, onActivity }: { role: Role; onActivity: () => void }) {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [vers, setVers] = useState<Versions | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [c, v] = await Promise.all([api<Cfg>('/api/config', role), api<Versions>('/api/versions', role)]);
    if (c.ok) setCfg(c.data);
    if (v.ok) setVers(v.data);
  }, [role]);

  useEffect(() => { if (role === 'admin') load(); }, [role, load]);

  if (role !== 'admin') {
    return (
      <div className="card max-w-xl p-5">
        <h1 className="text-lg font-semibold">Tool config</h1>
        <p className="mt-2 text-sm font-medium">Restricted for this role</p>
        <p className="text-sm text-muted">Only Practice admin can change which fields exist and who sees them. Switch to Practice admin above.</p>
      </div>
    );
  }

  async function patch(body: { field: FieldKey; enabled?: boolean; roles?: Role[] }) {
    const r = await api<Cfg & { error?: string }>('/api/config', role, { method: 'PUT', body });
    if (r.ok) { setCfg(r.data); setMsg(''); await load(); } else setMsg(r.data.error ?? 'Change rejected.');
    onActivity();
  }

  async function deploy() {
    const r = await api<{ version: number }>('/api/deploy', role, { method: 'POST' });
    setMsg(r.ok ? `Published v${r.data.version}.` : 'Deploy failed.');
    await load();
    onActivity();
  }

  if (!cfg) return <p className="text-sm text-muted">Loading config.</p>;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section className="card overflow-x-auto">
        <div className="border-b border-hair px-4 py-3">
          <h1 className="text-lg font-semibold">Tool config</h1>
          <p className="text-sm text-muted">Changes apply immediately to every role&apos;s API response and are audit-logged.</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-hair">
              <th className="label px-4 py-2">Field</th>
              <th className="label px-3 py-2">In tool</th>
              {cfg.roles.map((r) => <th key={r.key} className="label px-3 py-2">{r.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {cfg.fields.map((f) => {
              const rule = cfg.config[f.key];
              return (
                <tr key={f.key} className="border-b border-hair last:border-0">
                  <td className="px-4 py-2">{f.label}{f.locked && <span className="ml-2 text-xs text-muted">locked</span>}</td>
                  <td className="px-3 py-2">
                    <input type="checkbox" className="h-4 w-4 accent-accent" disabled={f.locked} checked={rule.enabled} aria-label={`${f.label} exists in tool`} onChange={(e) => patch({ field: f.key, enabled: e.target.checked })} />
                  </td>
                  {cfg.roles.map((r) => (
                    <td key={r.key} className="px-3 py-2">
                      <input
                        type="checkbox" className="h-4 w-4 accent-accent" disabled={f.locked || !rule.enabled}
                        checked={rule.roles.includes(r.key)} aria-label={`${r.label} can see ${f.label}`}
                        onChange={(e) => patch({ field: f.key, roles: e.target.checked ? [...rule.roles, r.key] : rule.roles.filter((x) => x !== r.key) })}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="border-t border-hair px-4 py-3 text-sm">
          <span className="label mr-2">Minimum necessary</span>
          {cfg.roles.map((r) => {
            const e = cfg.minimumNecessary[r.key].extras;
            return <p key={r.key} className="text-muted"><span className="text-ink">{r.label}:</span> {e.length ? `sees beyond the task list: ${e.join(', ')}` : 'sees only what the task list needs'}</p>;
          })}
          <p className="mt-1 text-xs text-muted">Simplified illustration with a fixed rule, not a compliance determination.</p>
        </div>
      </section>

      <section className="card self-start p-4">
        <h2 className="label mb-2">Publish snapshot</h2>
        <p className="mb-3 text-sm text-muted">
          {vers?.draftDiffersFromPublished ? 'The live config has changes not yet published as a version.' : 'The latest version matches the live config.'}
        </p>
        <button className="btn-primary" onClick={deploy}>Publish snapshot</button>
        <p className="mt-1 text-xs text-muted">Saves a versioned snapshot of the current config for comparison and rollback reference. It does not deploy infrastructure or publish anything outside this demo.</p>
        <p className="mt-2 min-h-5 text-sm" role="status">{msg}</p>
        <h3 className="label mb-2 mt-4">Versions</h3>
        <ul className="space-y-2 text-sm">
          {vers?.versions.map((v) => (
            <li key={v.version} className="flex justify-between rounded-btn border border-hair px-3 py-2">
              <span className="font-mono">v{v.version}</span>
              <span className="text-muted">{v.createdAt.replace('T', ' ').slice(0, 19)}Z</span>
            </li>
          ))}
          {vers && vers.versions.length === 0 && <li className="text-muted">No snapshots yet.</li>}
        </ul>
      </section>
    </div>
  );
}
