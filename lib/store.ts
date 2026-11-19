import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, gt, lt, sql } from 'drizzle-orm';
import { getDb, type Db } from './db';
import {
  FIELD_KEYS, FIELDS, SYNTHETIC_PATIENTS, defaultConfig, isFieldKey, isRole,
  type AuditAction, type FieldKey, type Role, type ToolConfig,
} from './catalog';

const now = () => new Date().toISOString();

export const WRITE_LIMIT = 120;
export const WRITE_WINDOW_MS = 3600_000;
const AUDIT_KEEP = 1000;

export async function ownerExists(id: string) {
  const { orm, t } = await getDb();
  const rows = await orm.select().from(t.owners).where(eq(t.owners.id, id)).limit(1);
  return rows.length > 0;
}

/** Create an owner with a synthetic seed set and default config. */
export async function createOwner(): Promise<string> {
  const id = randomUUID();
  await (await getDb()).tx(async ({ orm, t }) => {
    await orm.insert(t.owners).values({ id, createdAt: now() });
    for (const [i, p] of SYNTHETIC_PATIENTS.entries()) {
      await orm.insert(t.patients).values({ id: randomUUID(), ownerId: id, code: `SYN-${String(i + 1).padStart(3, '0')}`, ...p });
    }
    await orm.insert(t.toolConfigs).values({ ownerId: id, json: JSON.stringify(defaultConfig()) });
  });
  return id;
}

export async function listPatients(ownerId: string) {
  const { orm, t } = await getDb();
  return await orm.select().from(t.patients).where(eq(t.patients.ownerId, ownerId)).orderBy(asc(t.patients.code));
}

export async function getPatient(ownerId: string, id: string) {
  const { orm, t } = await getDb();
  const rows = await orm.select().from(t.patients).where(and(eq(t.patients.ownerId, ownerId), eq(t.patients.id, id))).limit(1);
  return rows[0];
}

export async function getConfig(ownerId: string, c?: Db): Promise<ToolConfig> {
  const { orm, t } = c ?? await getDb();
  const rows = await orm.select().from(t.toolConfigs).where(eq(t.toolConfigs.ownerId, ownerId)).limit(1);
  return rows[0] ? (JSON.parse(rows[0].json) as ToolConfig) : defaultConfig();
}

export type ConfigPatch = { field: FieldKey; enabled?: boolean; roles?: Role[] };

/** Validate against the fixed catalog. Returns an error string or a clean patch. */
export function validatePatch(body: unknown): { error: string } | { patch: ConfigPatch } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Body must be a JSON object.' };
  const b = body as Record<string, unknown>;
  for (const k of Object.keys(b)) if (!['field', 'enabled', 'roles'].includes(k)) return { error: `Unknown property: ${k}` };
  if (!isFieldKey(b.field)) return { error: 'Unknown field. Must be one of the catalog fields.' };
  const patch: ConfigPatch = { field: b.field };
  if (b.enabled !== undefined) {
    if (typeof b.enabled !== 'boolean') return { error: 'enabled must be boolean.' };
    patch.enabled = b.enabled;
  }
  if (b.roles !== undefined) {
    if (!Array.isArray(b.roles) || !b.roles.every(isRole)) return { error: 'roles must be an array of known roles.' };
    patch.roles = [...new Set(b.roles)] as Role[];
  }
  if (patch.enabled === undefined && patch.roles === undefined) return { error: 'Nothing to change.' };
  if (FIELDS.find((f) => f.key === patch.field)?.locked) return { error: 'Patient name is locked: every tool needs an identifier.' };
  return { patch };
}

export async function applyPatch(ownerId: string, patch: ConfigPatch, actor: Role) {
  return (await getDb()).tx(async (c) => {
    const { orm, t } = c;
    const cfg = await getConfig(ownerId, c);
    const before = cfg[patch.field];
    const after = { enabled: patch.enabled ?? before.enabled, roles: patch.roles ?? before.roles };
    cfg[patch.field] = after;
    await orm.update(t.toolConfigs).set({ json: JSON.stringify(cfg) }).where(eq(t.toolConfigs.ownerId, ownerId));
    const fmt = (r: { enabled: boolean; roles: Role[] }) => `${r.enabled ? 'on' : 'off'} [${r.roles.join(',') || 'none'}]`;
    await audit(ownerId, actor, 'config_change', `${patch.field}: ${fmt(before)} -> ${fmt(after)}`, c);
    return cfg;
  });
}

export async function audit(ownerId: string, actor: Role, action: AuditAction, target: string, c?: Db) {
  const run = async ({ orm, t }: Db) => {
    await orm.insert(t.auditLog).values({ ownerId, ts: now(), actorRole: actor, action, target });
    // Bound growth: keep the newest AUDIT_KEEP entries per owner.
    const cut = await orm.select({ id: t.auditLog.id }).from(t.auditLog).where(eq(t.auditLog.ownerId, ownerId))
      .orderBy(desc(t.auditLog.id)).limit(1).offset(AUDIT_KEEP);
    if (cut[0]) await orm.delete(t.auditLog).where(and(eq(t.auditLog.ownerId, ownerId), lt(t.auditLog.id, cut[0].id + 1)));
  };
  return c ? run(c) : (await getDb()).tx(run);
}

export async function listAudit(ownerId: string, action?: string) {
  const { orm, t } = await getDb();
  const where = action ? and(eq(t.auditLog.ownerId, ownerId), eq(t.auditLog.action, action)) : eq(t.auditLog.ownerId, ownerId);
  return await orm.select().from(t.auditLog).where(where).orderBy(desc(t.auditLog.id)).limit(200);
}

export async function deploy(ownerId: string, actor: Role) {
  return (await getDb()).tx(async (c) => {
    const { orm, t } = c;
    const last = await orm.select({ v: sql<number>`coalesce(max(${t.configVersions.version}), 0)`.mapWith(Number) }).from(t.configVersions)
      .where(eq(t.configVersions.ownerId, ownerId));
    const version = (last[0]?.v ?? 0) + 1;
    await orm.insert(t.configVersions).values({ ownerId, version, snapshot: JSON.stringify(await getConfig(ownerId, c)), createdAt: now() });
    await audit(ownerId, actor, 'deploy', `published v${version}`, c);
    return version;
  });
}

export async function listVersions(ownerId: string) {
  const { orm, t } = await getDb();
  const rows = await orm.select().from(t.configVersions).where(eq(t.configVersions.ownerId, ownerId)).orderBy(desc(t.configVersions.version));
  const draft = JSON.stringify(await getConfig(ownerId));
  return {
    versions: rows.map((r) => ({ version: r.version, createdAt: r.createdAt, config: JSON.parse(r.snapshot) as ToolConfig })),
    draftDiffersFromPublished: rows.length === 0 || rows[0].snapshot !== draft,
  };
}

/** Sliding-window write limiter. Returns false when the owner is over the limit. */
export async function takeWriteSlot(ownerId: string): Promise<boolean> {
  const now_ = Date.now();
  return (await getDb()).tx(async ({ orm, t }) => {
    await orm.delete(t.writeLog).where(and(eq(t.writeLog.ownerId, ownerId), lt(t.writeLog.ts, now_ - WRITE_WINDOW_MS)));
    const c = await orm.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(t.writeLog)
      .where(and(eq(t.writeLog.ownerId, ownerId), gt(t.writeLog.ts, now_ - WRITE_WINDOW_MS)));
    if ((c[0]?.n ?? 0) >= WRITE_LIMIT) return false;
    await orm.insert(t.writeLog).values({ ownerId, ts: now_ });
    return true;
  });
}

export { FIELD_KEYS };
