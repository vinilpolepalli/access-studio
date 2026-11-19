# Implementation

Next.js 16 App Router + TypeScript + Tailwind 3, server runtime. Drizzle ORM over SQLite (better-sqlite3).

## Known gap
Postgres via `DATABASE_URL` (spec) is not implemented: only the SQLite driver exists (`lib/db.ts`, `lib/schema.ts` use `drizzle-orm/sqlite-core`). Tables are created with `CREATE TABLE IF NOT EXISTS` at startup; there are no drizzle-kit migrations. `npm run build` also opens/creates `accessstudio.db` as a side effect of page-data collection (gitignored).

## Data model
- `owners(id, created_at)`: id issued by server, stored in httpOnly cookie `as_uid`.
- `patients(id uuid, owner_id, code SYN-001.., name, reason, phone, note, medication, risk, clinician, last_visit)`: 10 synthetic rows seeded per owner.
- `tool_configs(owner_id, json)`: per field `{enabled, roles[]}`.
- `config_versions(id, owner_id, version, snapshot, created_at)`.
- `audit_log(id, owner_id, ts, actor_role, action, target)`: newest 1000 kept per owner.
- `write_log(id, owner_id, ts)`: sliding-window rate limiter.

## Policy (`lib/policy.ts`)
Effective visibility = field enabled in config AND role listed for the field. Disabled fields exist for nobody (omitted entirely). Enabled-but-not-granted fields appear only as `restricted` markers `{label, explanation}`: no field key, no value. Rows are built by projecting only visible keys, so unauthorized values are never copied into the response. Minimum-necessary rule (fixed, illustrative): the task list needs name + callback reason; any other visible field is listed as an extra.

## Endpoints
Role is sent per request in the `x-as-role` header (or `?role=`); missing/unknown is 400.
| Endpoint | Role | Notes |
|---|---|---|
| GET /api/patients | any | scoped list; audits `list_view` |
| GET /api/patients/:id | any | scoped record; audits `record_view`; 404 for other owners |
| POST /api/role `{to}` | any | audits `role_switch` (header role = role left) |
| GET /api/audit?action= | admin | 403 otherwise; 200 newest entries |
| GET/PUT /api/config | admin | PUT `{field, enabled?, roles?}` validated against catalog; audits `config_change` with before/after; `name` locked |
| POST /api/deploy | admin | snapshots config as next version; audits `deploy` |
| GET /api/versions | admin | version list + whether live config differs from latest |

Writes (POST/PUT): 413 over 20KB, 429 after 120 per hour per owner. Cookie value is only accepted if the server issued it; otherwise a new owner is created.

Limitation: role is request-scoped and self-selected, so admin endpoints are gated by that selection, not an identity. This is a demonstration of policy enforcement, not authentication.

## Verification results (run against the production build, `npm start`)
- `npm run build`: passes. `npm test`: 16/16 pass.
- `scripts/verify.mjs`: 38/38 checks pass, including: front desk response has no note/medication/risk/phone/clinician/lastVisit keys and no clinical text; nurse gains/loses fields immediately after config PUTs; disabled field absent for admin too; audit contains role_switch, list_view, record_view, config_change, deploy; deploy creates v1, v2 with snapshots; owner B gets 404 on owner A's record and default config; forged cookie replaced; 120 writes then 429; 413 at >20KB.
- Persistence: server killed and restarted on the same DB; `verify.mjs persist` passes (audit entries, versions, config change retained).
- `python3 ~/unslop/devibe_scan.py .`: 0 high, 1 medium (pill chips, which the spec mandates for role/status chips); no unslop-ignore comments.
- Screenshots from the running app: /tmp/as2-desk.png, as2-audit.png, as2-config.png, as2-mobile.png (390px).
