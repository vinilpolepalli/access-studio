import { NextRequest, NextResponse } from 'next/server';
import { isRole, type Role } from './catalog';
import { createOwner, ownerExists, takeWriteSlot } from './store';

export const MAX_BODY_BYTES = 20 * 1024;
const COOKIE = 'as_uid';

type Ctx = { ownerId: string; role: Role; body: unknown };
type Result = { status?: number; body: unknown };

/**
 * Shared request pipeline: owner cookie, request-scoped role, size cap, write rate limit,
 * optional admin gate. The owner id is only ever accepted if the server issued it.
 */
export function route(opts: { write?: boolean; admin?: boolean }, fn: (ctx: Ctx, req: NextRequest, params: Record<string, string>) => Result | Promise<Result>) {
  return async (req: NextRequest, extra?: { params: Promise<Record<string, string>> }) => {
    const existing = req.cookies.get(COOKIE)?.value;
    const fresh = !existing || !(await ownerExists(existing));
    const ownerId = fresh ? await createOwner() : existing!;
    const finish = (status: number, body: unknown) => {
      const res = NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
      if (fresh) res.cookies.set(COOKIE, ownerId, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
      return res;
    };

    const role = req.headers.get('x-as-role') ?? new URL(req.url).searchParams.get('role');
    if (!isRole(role)) return finish(400, { error: 'Missing or unknown role (x-as-role header).' });

    let body: unknown = undefined;
    if (opts.write) {
      const text = await req.text();
      if (Buffer.byteLength(text) > MAX_BODY_BYTES) return finish(413, { error: 'Request body exceeds 20KB.' });
      if (text) {
        try { body = JSON.parse(text); } catch { return finish(400, { error: 'Invalid JSON.' }); }
      }
    }
    if (opts.admin && role !== 'admin') {
      return finish(403, { error: 'Restricted for this role. Only Practice admin can use this endpoint.', restricted: true });
    }
    if (opts.write && !(await takeWriteSlot(ownerId))) return finish(429, { error: 'Write limit reached (120 per hour per owner).' });

    const r = await fn({ ownerId, role, body }, req, extra ? await extra.params : {});
    return finish(r.status ?? 200, r.body);
  };
}
