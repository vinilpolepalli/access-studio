import { describe, expect, it } from 'vitest';
import { FIELD_KEYS, SYNTHETIC_PATIENTS, defaultConfig, type FieldKey } from '../lib/catalog';
import { accessFor, minimumNecessary, projectRow, restrictedMarkers } from '../lib/policy';
import { validatePatch } from '../lib/store';

const row = SYNTHETIC_PATIENTS[0];

describe('policy', () => {
  it('front desk gets only name and reason', () => {
    const a = accessFor('frontdesk', defaultConfig());
    expect(a.visible).toEqual(['name', 'reason']);
    const out = projectRow(a, row);
    expect(Object.keys(out)).toEqual(['name', 'reason']);
    expect(JSON.stringify(out)).not.toContain(row.note);
    expect(JSON.stringify(out)).not.toContain(row.medication);
  });
  it('nurse gets clinical fields but not contact/admin fields', () => {
    expect(accessFor('nurse', defaultConfig()).visible).toEqual(['name', 'reason', 'note', 'medication', 'risk']);
  });
  it('admin gets everything enabled', () => {
    expect(accessFor('admin', defaultConfig()).visible).toEqual(FIELD_KEYS);
  });
  it('disabled fields exist for no role and are not marked restricted', () => {
    const c = defaultConfig();
    c.note.enabled = false;
    for (const r of ['frontdesk', 'nurse', 'admin'] as const) {
      const a = accessFor(r, c);
      expect(a.visible).not.toContain('note');
      expect(a.restricted).not.toContain('note');
      expect(a.disabled).toContain('note');
    }
  });
  it('granting a role a field makes it visible to that role only', () => {
    const c = defaultConfig();
    c.note.roles = ['frontdesk', 'nurse', 'admin'];
    expect(accessFor('frontdesk', c).visible).toContain('note');
    c.note.roles = ['admin'];
    expect(accessFor('nurse', c).visible).not.toContain('note');
  });
  it('restricted markers carry no key and no value', () => {
    const a = accessFor('frontdesk', defaultConfig());
    const m = restrictedMarkers('frontdesk', a);
    expect(m.length).toBe(a.restricted.length);
    const s = JSON.stringify(m);
    for (const k of FIELD_KEYS) expect(s).not.toContain(row[k as FieldKey]);
    expect(m.every((x) => Object.keys(x).sort().join() === 'explanation,label')).toBe(true);
  });
  it('minimum-necessary lists extras beyond name + reason', () => {
    expect(minimumNecessary(accessFor('frontdesk', defaultConfig())).extras).toEqual([]);
    expect(minimumNecessary(accessFor('nurse', defaultConfig())).extras).toEqual(['Clinical note', 'Medication', 'Risk flag']);
  });
});

describe('config validation', () => {
  it('accepts a valid patch', () => {
    expect(validatePatch({ field: 'note', roles: ['admin'] })).toEqual({ patch: { field: 'note', roles: ['admin'] } });
  });
  it.each([
    [{ field: 'ssn', enabled: true }],
    [{ field: 'note', roles: ['root'] }],
    [{ field: 'note', enabled: 'yes' }],
    [{ field: 'note', extra: 1 }],
    [{ field: 'note' }],
    [{ field: 'name', enabled: false }],
    [null],
    [[]],
  ])('rejects %j', (b) => {
    expect('error' in validatePatch(b)).toBe(true);
  });
});
