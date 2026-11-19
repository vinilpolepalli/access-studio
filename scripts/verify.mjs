// End-to-end checks against a running server. Usage: BASE=http://localhost:3100 node scripts/verify.mjs [phase]
// phase "seed" runs everything and stores the owner cookie in $COOKIE_FILE; phase "persist" re-checks after a restart.
import fs from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:3100';
const COOKIE_FILE = process.env.COOKIE_FILE ?? '/tmp/as-cookie.txt';
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) failed++; };

function client(cookie = '') {
  const call = async (path, role, method = 'GET', body, rawBody) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'x-as-role': role, ...(cookie ? { cookie } : {}), ...(body || rawBody ? { 'content-type': 'application/json' } : {}) },
      body: rawBody ?? (body ? JSON.stringify(body) : undefined),
    });
    const sc = res.headers.get('set-cookie');
    if (sc && !cookie) cookie = sc.split(';')[0];
    const text = await res.text();
    return { status: res.status, text, json: JSON.parse(text), setCookie: sc };
  };
  return { call, get cookie() { return cookie; } };
}
const keysDeep = (o, acc = new Set()) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { acc.add(k); keysDeep(v, acc); } return acc; };

if (process.argv[2] === 'persist') {
  const c = client(fs.readFileSync(COOKIE_FILE, 'utf8').trim());
  const a = await c.call('/api/audit', 'admin');
  const v = await c.call('/api/versions', 'admin');
  const cfg = await c.call('/api/config', 'admin');
  check('persist: audit entries survive restart', a.json.entries.length > 5, `(${a.json.entries.length})`);
  check('persist: deployed version survives restart', v.json.versions.length >= 1);
  check('persist: config change survives restart', cfg.json.config.note.roles.includes('frontdesk') === false && cfg.json.config.phone.roles.includes('nurse'));
  process.exit(failed ? 1 : 0);
}

const A = client();
const first = await A.call('/api/patients', 'frontdesk');
check('owner cookie issued httpOnly', /as_uid=/.test(first.setCookie ?? '') && /httponly/i.test(first.setCookie ?? ''));
fs.writeFileSync(COOKIE_FILE, A.cookie);

// Field scoping per role
const note = 'Synthetic note';
const fd = first;
const fdKeys = keysDeep(fd.json);
check('front desk: only name+reason fields', JSON.stringify(fd.json.fields.map((f) => f.key)) === '["name","reason"]');
check('front desk: no note/medication/risk/phone keys anywhere', !['note', 'medication', 'risk', 'phone', 'clinician', 'lastVisit'].some((k) => fdKeys.has(k)));
check('front desk: no clinical text in response', !fd.text.includes(note) && !fd.text.includes('Exampledrine') && !fd.text.includes('555-01'));
check('front desk: restricted markers present', fd.json.restricted.length === 6 && fd.json.restricted.every((m) => m.explanation));
check('front desk: minimum-necessary extras empty', fd.json.minimumNecessary.extras.length === 0);
const nurse = await A.call('/api/patients', 'nurse');
check('nurse: has note, medication, risk; no phone', ['note', 'medication', 'risk'].every((k) => k in nurse.json.rows[0].values) && !('phone' in nurse.json.rows[0].values));
check('nurse: minimum-necessary hint lists extras', nurse.json.minimumNecessary.extras.length === 3);
const admin = await A.call('/api/patients', 'admin');
check('admin: all 8 fields', Object.keys(admin.json.rows[0].values).length === 8);
const id = fd.json.rows[0].id;
const fdDetail = await A.call(`/api/patients/${id}`, 'frontdesk');
check('front desk detail: no clinical keys or text', !fdDetail.text.includes(note) && !keysDeep(fdDetail.json).has('note'));

// Admin gates
check('front desk cannot read audit (403)', (await A.call('/api/audit', 'frontdesk')).status === 403);
check('nurse cannot read config (403)', (await A.call('/api/config', 'nurse')).status === 403);
check('front desk cannot change config (403)', (await A.call('/api/config', 'frontdesk', 'PUT', { field: 'note', roles: ['frontdesk'] })).status === 403);
check('missing role rejected (400)', (await fetch(BASE + '/api/patients', { headers: { cookie: A.cookie } })).status === 400);

// Role switch + audit
await A.call('/api/role', 'frontdesk', 'POST', { to: 'nurse' });
await A.call('/api/patients/' + id, 'nurse');

// Config change takes effect immediately for the role's API response
const put1 = await A.call('/api/config', 'admin', 'PUT', { field: 'note', roles: ['admin'] });
check('config PUT ok', put1.status === 200);
const nurse2 = await A.call('/api/patients', 'nurse');
check('toggle: nurse loses note immediately', !('note' in nurse2.json.rows[0].values) && !nurse2.text.includes(note));
check('toggle: nurse sees restricted marker for note', nurse2.json.restricted.some((m) => m.label === 'Clinical note'));
await A.call('/api/config', 'admin', 'PUT', { field: 'phone', roles: ['nurse', 'admin'] });
const nurse3 = await A.call('/api/patients', 'nurse');
check('toggle: nurse gains phone immediately', 'phone' in nurse3.json.rows[0].values);
await A.call('/api/config', 'admin', 'PUT', { field: 'medication', enabled: false });
const admin2 = await A.call('/api/patients', 'admin');
check('disable: field absent for admin too', !('medication' in admin2.json.rows[0].values) && !admin2.json.restricted.some((m) => m.label === 'Medication'));
await A.call('/api/config', 'admin', 'PUT', { field: 'medication', enabled: true });

// Validation
check('invalid field rejected', (await A.call('/api/config', 'admin', 'PUT', { field: 'ssn', enabled: true })).status === 400);
check('invalid role rejected', (await A.call('/api/config', 'admin', 'PUT', { field: 'note', roles: ['root'] })).status === 400);
check('locked name rejected', (await A.call('/api/config', 'admin', 'PUT', { field: 'name', enabled: false })).status === 400);
check('oversize body -> 413', (await A.call('/api/config', 'admin', 'PUT', undefined, JSON.stringify({ field: 'note', pad: 'x'.repeat(21000) }))).status === 413);

// Deploy
const d1 = await A.call('/api/deploy', 'admin', 'POST');
const d2 = await A.call('/api/deploy', 'admin', 'POST');
const vers = await A.call('/api/versions', 'admin');
check('deploy snapshots versions v1,v2', d1.json.version === 1 && d2.json.version === 2 && vers.json.versions.length === 2);
check('version snapshot captures config', JSON.stringify(vers.json.versions[0].config.note.roles) === '["admin"]');
// Leave persisted state for restart check: nurse gets phone, note admin-only
await A.call('/api/config', 'admin', 'PUT', { field: 'note', roles: ['admin'] });

// Audit
const aud = await A.call('/api/audit', 'admin');
const acts = new Set(aud.json.entries.map((e) => e.action));
check('audit has role_switch, list_view, record_view, config_change, deploy', ['role_switch', 'list_view', 'record_view', 'config_change', 'deploy'].every((a) => acts.has(a)), [...acts].join(','));
check('audit entry shape', aud.json.entries.every((e) => e.ts && e.actorRole && e.action && e.target));
check('audit records config diff', aud.json.entries.some((e) => e.action === 'config_change' && e.target.startsWith('note:')));
const filt = await A.call('/api/audit?action=deploy', 'admin');
check('audit filter by action', filt.json.entries.length === 2 && filt.json.entries.every((e) => e.action === 'deploy'));
check('audit filter rejects unknown action', (await A.call('/api/audit?action=zzz', 'admin')).status === 400);

// Owner isolation
const B = client();
const bList = await B.call('/api/patients', 'admin');
check('owner B gets a different cookie', B.cookie && B.cookie !== A.cookie);
check('owner B cannot open owner A record (404)', (await B.call(`/api/patients/${id}`, 'admin')).status === 404);
check('owner B config is default (isolated)', (await B.call('/api/config', 'admin')).json.config.note.roles.includes('nurse'));
check('owner B audit does not contain A entries', !(await B.call('/api/audit', 'admin')).json.entries.some((e) => e.action === 'deploy'));
check('owner B record ids disjoint', !bList.json.rows.some((r) => r.id === id));
const forged = client('as_uid=00000000-0000-0000-0000-000000000000');
const fr = await forged.call('/api/patients', 'admin');
check('forged cookie replaced with server-issued owner', /as_uid=/.test(fr.setCookie ?? '') && !fr.setCookie.includes('0000-0000-0000'));

// Rate limit: fresh owner, 120 writes then 429
const C = client();
await C.call('/api/patients', 'admin');
let ok = 0, limited = 0;
for (let i = 0; i < 125; i++) {
  const r = await C.call('/api/role', 'admin', 'POST', { to: 'nurse' });
  if (r.status === 200) ok++; else if (r.status === 429) limited++;
}
check('rate limit: 120 writes allowed then 429', ok === 120 && limited === 5, `(ok=${ok}, 429=${limited})`);
check('rate limit is per owner (A unaffected)', (await A.call('/api/role', 'admin', 'POST', { to: 'admin' })).status === 200);

console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
