# Access Studio

Independent demo built by Vinil Polepalli. Synthetic data; simplified illustration of access control, not compliance advice. Not affiliated with or endorsed by Floracene.

A role-scoped internal tool with a real backend: a fictional clinic's callback list where the **server** decides, per role, which fields leave the API. Includes a persisted audit trail, a tool-config surface (which fields exist, which roles see them), and a deploy action that snapshots the config as a published version.

All patients are 100% synthetic ("Test Patient A"...). No real PHI exists anywhere. The role is a selection in the demo; a real deployment binds role to an authenticated identity.

## Run

```
npm install
npm run build
npm start            # http://localhost:3000, data in ./accessstudio.db
npm test             # policy + validation unit tests
PORT=3100 DB_PATH=/tmp/x.db npm start   # then: BASE=http://localhost:3100 npm run verify
```

`DB_PATH` overrides the SQLite file. Postgres via `DATABASE_URL` is **not implemented** in this build (see IMPLEMENTATION.md).

## Using it
- Role switcher (top): Front desk / Nurse / Practice admin. Masked fields show "Restricted for this role" with an explanation.
- Desk: list + record detail. Opening a record is audited.
- Audit trail (drawer, admin only): filter by action.
- Tool config (admin only): toggle fields and per-role access; deploy a new version.
