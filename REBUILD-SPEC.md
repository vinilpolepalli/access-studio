# Access Studio v2 - high-fidelity rebuild spec

Rebuild this static demo into a real working product with a live backend. Maps to Floracene (floracene.com, YC S26): vibecode + deploy HIPAA-compliant internal tools with first-class authentication and permissioning, connected to production data, scoped per user. Access Studio demonstrates the permissioning core: role-scoped field access over a shared dataset, a real audit trail, and a tool-config surface that changes what the deployed tool exposes.

Do not deploy, do not git commit, do not push. No paid services, no API keys, no randomness in logic (ids/timestamps aside).

## Architecture
- Next.js App Router + TypeScript + Tailwind, SERVER runtime (remove output:'export').
- Drizzle ORM: SQLite (accessstudio.db) dev; Postgres via DATABASE_URL prod.
- ALL patients are 100% synthetic with obviously fake names (e.g. "Test Patient A"), seeded per owner, labeled SYNTHETIC everywhere.
- Access rules enforced SERVER-SIDE per role on every API response (fields never leave the server for unauthorized roles; masked fields return a restricted marker, not the value). Unit-test the policy function (npm test).

## Product workflow (fitted to THIS product)
1. Home = the callback list tool as the current role sees it: role switcher (Front desk / Nurse / Practice admin) as a first-class control; field-level masking applied live; "Restricted for this role" markers with explanations, never silent omission.
2. Record detail view per role; views are audit-logged.
3. Audit trail panel (admin role): every role switch, list view, record view, and config change appended as a persisted audit entry with timestamp, actor role, action, target. Filterable by action type. This is the operational meaning of controlled access - make it real, not decorative.
4. Tool config view (admin role): toggle which fields exist in the tool and which roles can see each field. Changes persist, apply immediately to all roles' API responses, and are themselves audit-logged. A "deploy" action snapshots the config as a new published version with a version list - demonstrating build -> deploy iteration.
5. Minimum-necessary hint: when a role's visible field set exceeds what the task list needs (a stated, deterministic rule: e.g. front desk needs only name + callback reason), show a hint listing the extra fields. Deterministic and labeled as a simplified illustration.

## Truthfulness bar
- SYNTHETIC labels on all patient data; copy states access rules are a simplified illustration, NOT HIPAA compliance advice, no real PHI anywhere.
- No claims of certification/compliance. Footer: "Independent demo built by Vinil Polepalli. Synthetic data; simplified illustration of access control, not compliance advice. Not affiliated with or endorsed by Floracene."

## Abuse and isolation controls
- Owner cookie (as_uid, httpOnly); patients/config/audit owner-scoped; cross-owner 403/404.
- Rate limits: 120 writes/hour/owner, 413 at 20KB; config values validated against a fixed field catalog.
- Role is a request-scoped selection (switcher), never a trust boundary claim in copy: the demo shows what server-side policy enforcement would do; note that a real deployment binds role to authenticated identity (one line in the about copy).

## UI bar
- Light theme, near-white ground, hairlines, small-caps labels, tabular nums, system stack; mono for audit entries where it aids scanning.
- Brand accent: deep clinical green #15803d (hover #166534). Deliberate: clinical/healthcare trust read, well separated from sibling accents (navy/teal/bronze/crimson/burnt-orange/olive - olive is yellow-green, this is a true green). Comment the rationale in tailwind.config.ts.
- Pills only for role/status chips; buttons 8px, cards 10px, inputs 8px; no gradients, no emoji icons, no hero+3-cards, no amber-50 fills.
- Layout fitted to a records-desk (list + detail + audit drawer), not a clone of sibling demos. Mobile: stacked, role switcher reachable at top.

## Definition of done
- npm run build + npm test pass.
- Real end-to-end: run server; verify via API that each role's responses contain ONLY its permitted fields (front desk response contains no clinical note keys at all, not even masked strings of the value); toggle a field's role access in config and verify the change in that role's API response; verify audit entries were written for role switch, record view, and config change; deploy snapshots a version; persistence across restart; owner isolation; rate limit.
- python3 ~/unslop/devibe_scan.py . - zero high or justified unslop-ignore comments.
- README + IMPLEMENTATION.md (data model, endpoints, verification results).
- Screenshots to /tmp: as2-desk.png, as2-audit.png, as2-config.png, as2-mobile.png (390px) from the RUNNING app.
