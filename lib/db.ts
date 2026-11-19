import { sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import * as pgSchema from './schema.pg';

export type Schema = typeof schema;
type Orm = BetterSQLite3Database<Schema>;

/**
 * Data-layer handle. SQLite (accessstudio.db) is the default; Postgres is used when DATABASE_URL is a postgres URL.
 * The Postgres tables/ORM are typed as their SQLite twins: both builders share the awaited API the store
 * uses (never .all/.get/.run). Always query through `t` (driver-specific tables), and `await` every query.
 */
export interface Db {
  kind: 'sqlite' | 'postgres';
  orm: Orm;
  t: Schema;
  /** Runs fn atomically (SQLite: serialized manual BEGIN/COMMIT on the single connection). Nested calls join. */
  tx<T>(fn: (c: Db) => Promise<T>): Promise<T>;
}

const DDL = `
CREATE TABLE IF NOT EXISTS owners (id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL,
  reason TEXT NOT NULL, phone TEXT NOT NULL, note TEXT NOT NULL, medication TEXT NOT NULL,
  risk TEXT NOT NULL, clinician TEXT NOT NULL, last_visit TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS patients_owner ON patients(owner_id);
CREATE TABLE IF NOT EXISTS tool_configs (owner_id TEXT PRIMARY KEY, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS config_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id TEXT NOT NULL, version INTEGER NOT NULL,
  snapshot TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id TEXT NOT NULL, ts TEXT NOT NULL,
  actor_role TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS audit_owner ON audit_log(owner_id, id);
CREATE TABLE IF NOT EXISTS write_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, owner_id TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS write_owner ON write_log(owner_id, ts);
`;

const PG_DDL = [
  `CREATE TABLE IF NOT EXISTS owners (id TEXT PRIMARY KEY, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL,
    reason TEXT NOT NULL, phone TEXT NOT NULL, note TEXT NOT NULL, medication TEXT NOT NULL,
    risk TEXT NOT NULL, clinician TEXT NOT NULL, last_visit TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS patients_owner ON patients(owner_id)`,
  `CREATE TABLE IF NOT EXISTS tool_configs (owner_id TEXT PRIMARY KEY, json TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS config_versions (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, owner_id TEXT NOT NULL, version INTEGER NOT NULL,
    snapshot TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, owner_id TEXT NOT NULL, ts TEXT NOT NULL,
    actor_role TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS audit_owner ON audit_log(owner_id, id)`,
  `CREATE TABLE IF NOT EXISTS write_log (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, owner_id TEXT NOT NULL, ts BIGINT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS write_owner ON write_log(owner_id, ts)`,
];

const PG_URL = /^postgres(ql)?:\/\//i;
const g = globalThis as unknown as { __asDb?: Promise<Db> };

async function openSqlite(file: string): Promise<Db> {
  const [{ default: Database }, { drizzle }] = await Promise.all([import('better-sqlite3'), import('drizzle-orm/better-sqlite3')]);
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(DDL);
  const orm = drizzle(sqlite, { schema });
  let chain: Promise<unknown> = Promise.resolve();
  const c: Db = {
    kind: 'sqlite', orm, t: schema,
    tx(fn) {
      const run = chain.then(async () => {
        orm.run(sql`BEGIN`);
        try { const r = await fn(inner); orm.run(sql`COMMIT`); return r; } catch (e) { orm.run(sql`ROLLBACK`); throw e; }
      });
      chain = run.catch(() => undefined);
      return run;
    },
  };
  const inner: Db = { ...c, tx: (fn) => fn(inner) }; // already inside the transaction
  return c;
}

async function openPg(url: string): Promise<Db> {
  const [{ default: postgres }, { drizzle }] = await Promise.all([import('postgres'), import('drizzle-orm/postgres-js')]);
  const client = postgres(url, { max: 5, onnotice: () => {} });
  try {
    // Advisory lock so concurrently starting instances don't race on CREATE TABLE IF NOT EXISTS.
    await client.begin(async (q) => {
      await q`SELECT pg_advisory_xact_lock(7316403)`;
      for (const stmt of PG_DDL) await q.unsafe(stmt);
    });
  } catch (e) { await client.end({ timeout: 1 }).catch(() => {}); throw e; }
  const mk = (orm: Orm, nested: boolean): Db => {
    const d: Db = {
      kind: 'postgres', orm, t: pgSchema as unknown as Schema,
      tx: (fn) => nested ? fn(d) : (orm as unknown as { transaction: (f: (tx: Orm) => Promise<never>) => Promise<never> })
        .transaction((tx) => fn(mk(tx, true)) as Promise<never>),
    };
    return d;
  };
  return mk(drizzle(client, { schema: pgSchema }) as unknown as Orm, false);
}

export function getDb(): Promise<Db> {
  if (!g.__asDb) {
    const url = process.env.DATABASE_URL;
    g.__asDb = (url && PG_URL.test(url) ? openPg(url) : openSqlite(process.env.DB_PATH ?? 'accessstudio.db'))
      .catch((e) => { g.__asDb = undefined; throw e; }); // allow retry after a failed open
  }
  return g.__asDb;
}
export { schema };
