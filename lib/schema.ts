import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const owners = sqliteTable('owners', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
});

export const patients = sqliteTable('patients', {
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
});

export const toolConfigs = sqliteTable('tool_configs', {
  ownerId: text('owner_id').primaryKey(),
  json: text('json').notNull(),
});

export const configVersions = sqliteTable('config_versions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: text('owner_id').notNull(),
  version: integer('version').notNull(),
  snapshot: text('snapshot').notNull(),
  createdAt: text('created_at').notNull(),
});

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: text('owner_id').notNull(),
  ts: text('ts').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
});

export const writeLog = sqliteTable('write_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerId: text('owner_id').notNull(),
  ts: integer('ts').notNull(),
});
