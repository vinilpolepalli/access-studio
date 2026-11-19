'use client';
import { useCallback, useEffect, useState } from 'react';
import { ROLES, type Role } from '@/lib/catalog';
import { api } from './client';
import Desk from './Desk';
import AuditDrawer from './AuditDrawer';
import ConfigView from './ConfigView';

type View = 'desk' | 'config';

export default function App() {
  const [role, setRole] = useState<Role>('frontdesk');
  const [view, setView] = useState<View>('desk');
  const [auditOpen, setAuditOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const h = window.location.hash;
    const q = new URLSearchParams(window.location.search);
    const r = q.get('role');
    if (r === 'nurse' || r === 'admin' || r === 'frontdesk') setRole(r);
    if (h === '#config') setView('config');
    if (h === '#audit') setAuditOpen(true);
  }, []);

  async function switchRole(to: Role) {
    if (to === role) return;
    await api('/api/role', role, { method: 'POST', body: { to } });
    setRole(to);
    bump();
  }

  return (
    <div className="min-h-screen">
      <header className="relative z-20 border-b border-hair bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <div className="flex items-center gap-3 max-md:order-first">
            <span className="text-base font-semibold tracking-tight">Access Studio</span>
            <span className="chip border-accent text-accent">Synthetic data</span>
          </div>
          <div role="group" aria-label="Current role" className="order-first flex w-full gap-2 md:order-none md:w-auto">
            <span className="label hidden self-center md:inline">Viewing as</span>
            {ROLES.map((r) => (
              <button
                key={r.key}
                aria-pressed={role === r.key}
                onClick={() => switchRole(r.key)}
                className={`chip flex-1 justify-center py-1.5 text-sm md:flex-none ${role === r.key ? 'border-accent bg-accent text-white' : 'bg-white hover:border-accent'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <nav className="ml-auto flex gap-2" aria-label="Views">
            <button className="btn" aria-pressed={view === 'desk'} onClick={() => setView('desk')}>Desk</button>
            <button className="btn" aria-pressed={view === 'config'} onClick={() => setView('config')}>Tool config</button>
            <button className="btn" aria-pressed={auditOpen} onClick={() => setAuditOpen((o) => !o)}>Audit trail</button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <p className="mb-5 max-w-3xl text-sm text-muted">
          A fictional clinic&apos;s callback list. Every patient is SYNTHETIC. The server decides which fields each role receives; the browser never gets the rest.
        </p>
        {view === 'desk' ? <Desk role={role} onActivity={bump} /> : <ConfigView role={role} onActivity={bump} />}

        <section className="mt-10 max-w-3xl border-t border-hair pt-5 text-sm text-muted">
          <h2 className="label mb-1">About this demo</h2>
          <p>
            The access rules here are a simplified illustration of role-scoped access, not HIPAA compliance advice. No real patient data exists anywhere in this app.
            The role is a selection you make in this demo so you can see what server-side enforcement does; a real deployment binds the role to an authenticated identity.
          </p>
        </section>
      </main>

      <footer className="border-t border-hair px-4 py-5 text-center text-xs text-muted">
        Independent demo built by Vinil Polepalli. Synthetic data; simplified illustration of access control, not compliance advice. Not affiliated with or endorsed by Floracene.
      </footer>

      {auditOpen && <AuditDrawer role={role} tick={tick} onClose={() => setAuditOpen(false)} />}
    </div>
  );
}
