# Access Studio — SPEC

Independent demo inspired by the problem space of Floracene (YC S26). Not affiliated. Fictional clinic, 100% synthetic patients, no real PHI.

## Goal
Interactive demo of role-controlled internal tooling: a patient callback list with live field-level access rules, an audit trail, and a mini tool-config view.

## Features
1. **Callback list tool** — ~10 synthetic patients ("Test Patient A"…). Fields: name, callback reason, phone, clinical note, medication, risk flag, assigned clinician, last visit.
2. **Role switcher** — Front desk / Nurse / Practice admin.
   - Front desk: name + callback reason.
   - Nurse: + clinical note, medication, risk flag.
   - Admin: all fields + audit trail panel.
   - Disallowed fields render "Restricted for this role" (never silently hidden).
3. **Audit log** — every role switch, record view (select), and config change appends a synthetic entry (time, role, action, target). Panel visible to admin only; other roles see an explanatory restricted notice. Entries are still recorded.
4. **Tool config** — checkboxes toggle which fields exist in the tool (columns/detail). Effective visibility = field enabled AND role permitted. Config changes are audited.
5. **Honesty** — header badge "Synthetic data - demo"; copy says all data is synthetic and rules are a simplified illustration, not HIPAA compliance advice; footer: "Independent demo built by Vinil Polepalli. Not affiliated with or endorsed by Floracene."

## UI
Dark, sleek, violet accent (no indigo/emerald/amber/sky/rose/lime). Responsive, keyboard accessible (buttons, aria-pressed, labels).

## Tech
Next.js (App Router, TypeScript), `output: 'export'`, no runtime external calls (no remote fonts/APIs), plain CSS. `npm run build` must pass. No git commit, no deploy.

## Structure
- `app/{layout,page}.tsx`, `app/globals.css`
- `lib/data.ts` (fields, roles, patients, rules)
- `components/` RoleSwitcher, CallbackTable, DetailPanel, AuditPanel, ToolConfig
