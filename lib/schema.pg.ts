import { bigint, index, integer, pgTable, text } from 'drizzle-orm/pg-core';

// Postgres twin of schema.ts: identical table/column names so the store layer is shared.
const idCol = () => integer('id').primaryKey().generatedAlwaysAsIdentity();

export const owners = pgTable('owners', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
});

export const patients = pgTable('patients', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  reason: text('reason').notNull(),
  phone: text('phone').notNull(),
  note: text('note').notNull(),
  medication: text('medication').notNull(),
  risk: text('risk').notNull(),
  clinician: text('clinician').notNull(),
  lastVisit: text('last_visit').notNull(),
}, (t) => [index('patients_owner').on(t.ownerId)]);

export const toolConfigs = pgTable('tool_configs', {
  ownerId: text('owner_id').primaryKey(),
  json: text('json').notNull(),
});

export const configVersions = pgTable('config_versions', {
  id: idCol(),
  ownerId: text('owner_id').notNull(),
  version: integer('version').notNull(),
  snapshot: text('snapshot').notNull(),
  createdAt: text('created_at').notNull(),
});

export const auditLog = pgTable('audit_log', {
  id: idCol(),
  ownerId: text('owner_id').notNull(),
  ts: text('ts').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
}, (t) => [index('audit_owner').on(t.ownerId, t.id)]);

export const writeLog = pgTable('write_log', {
  id: idCol(),
  ownerId: text('owner_id').notNull(),
  ts: bigint('ts', { mode: 'number' }).notNull(),
}, (t) => [index('write_owner').on(t.ownerId, t.ts)]);
