import type { Role } from '@/lib/catalog';

export async function api<T = any>(path: string, role: Role, init?: { method?: string; body?: unknown }): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(path, {
    method: init?.method ?? 'GET',
    headers: { 'x-as-role': role, ...(init?.body ? { 'content-type': 'application/json' } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export type Marker = { label: string; explanation: string };
export type FieldDesc = { key: string; label: string };
