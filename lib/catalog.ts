export type Role = 'frontdesk' | 'nurse' | 'admin';
export type FieldKey = 'name' | 'reason' | 'phone' | 'note' | 'medication' | 'risk' | 'clinician' | 'lastVisit';

export const ROLES: { key: Role; label: string; blurb: string }[] = [
  { key: 'frontdesk', label: 'Front desk', blurb: 'Schedules callbacks. Needs a name and a reason.' },
  { key: 'nurse', label: 'Nurse', blurb: 'Works the clinical side of each callback.' },
  { key: 'admin', label: 'Practice admin', blurb: 'Configures the tool and reviews the audit trail.' },
];

export const ROLE_KEYS: Role[] = ROLES.map((r) => r.key);

export const FIELDS: { key: FieldKey; label: string; locked?: boolean }[] = [
  { key: 'name', label: 'Patient name', locked: true },
  { key: 'reason', label: 'Callback reason' },
  { key: 'phone', label: 'Phone (fake)' },
  { key: 'note', label: 'Clinical note' },
  { key: 'medication', label: 'Medication' },
  { key: 'risk', label: 'Risk flag' },
  { key: 'clinician', label: 'Assigned clinician' },
  { key: 'lastVisit', label: 'Last visit' },
];

export const FIELD_KEYS: FieldKey[] = FIELDS.map((f) => f.key);

/** Simplified illustration: the callback task list only needs these to do its job. */
export const TASK_LIST_NEEDS: FieldKey[] = ['name', 'reason'];

export const AUDIT_ACTIONS = ['role_switch', 'list_view', 'record_view', 'config_change', 'deploy'] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type FieldRule = { enabled: boolean; roles: Role[] };
export type ToolConfig = Record<FieldKey, FieldRule>;

export function defaultConfig(): ToolConfig {
  const all: Role[] = ['frontdesk', 'nurse', 'admin'];
  const clinical: Role[] = ['nurse', 'admin'];
  return {
    name: { enabled: true, roles: all },
    reason: { enabled: true, roles: all },
    phone: { enabled: true, roles: ['admin'] },
    note: { enabled: true, roles: clinical },
    medication: { enabled: true, roles: clinical },
    risk: { enabled: true, roles: clinical },
    clinician: { enabled: true, roles: ['admin'] },
    lastVisit: { enabled: true, roles: ['admin'] },
  };
}

export const isRole = (v: unknown): v is Role => typeof v === 'string' && (ROLE_KEYS as string[]).includes(v);
export const isFieldKey = (v: unknown): v is FieldKey => typeof v === 'string' && (FIELD_KEYS as string[]).includes(v);

export const SYNTHETIC_PATIENTS: Record<FieldKey, string>[] = [
  ['Test Patient A', 'Reschedule follow-up', '555-0101', 'Synthetic note: BP trending down after dose change.', 'Exampledrine 10mg', 'Low', 'Dr. Placeholder', '2026-09-02'],
  ['Test Patient B', 'Lab results ready', '555-0102', 'Synthetic note: fasting panel within demo range.', 'Samplestatin 20mg', 'Low', 'Nurse Sample', '2026-09-14'],
  ['Test Patient C', 'Medication question', '555-0103', 'Synthetic note: reports mild dizziness, fictional.', 'Mockpril 5mg', 'Medium', 'Dr. Placeholder', '2026-10-01'],
  ['Test Patient D', 'Post-visit check-in', '555-0104', 'Synthetic note: recovering as expected.', 'None listed', 'Low', 'Nurse Sample', '2026-10-08'],
  ['Test Patient E', 'Referral status', '555-0105', 'Synthetic note: referral pending, fictional.', 'Demozole 40mg', 'Low', 'Dr. Fictional', '2026-10-15'],
  ['Test Patient F', 'Missed appointment', '555-0106', 'Synthetic note: two missed visits, outreach advised.', 'Faxamine 25mg', 'High', 'Dr. Fictional', '2026-08-20'],
  ['Test Patient G', 'Billing question', '555-0107', 'Synthetic note: no clinical concerns.', 'None listed', 'Low', 'Dr. Placeholder', '2026-10-22'],
  ['Test Patient H', 'Symptom follow-up', '555-0108', 'Synthetic note: persistent cough, fictional case.', 'Placebex 15mg', 'Medium', 'Nurse Sample', '2026-10-29'],
  ['Test Patient I', 'Vaccine reminder', '555-0109', 'Synthetic note: due for demo booster.', 'None listed', 'Low', 'Nurse Sample', '2026-11-03'],
  ['Test Patient J', 'Prescription renewal', '555-0110', 'Synthetic note: renewal request, fictional.', 'Exampledrine 20mg', 'Medium', 'Dr. Fictional', '2026-11-05'],
].map(([name, reason, phone, note, medication, risk, clinician, lastVisit]) => ({
  name, reason, phone, note, medication, risk, clinician, lastVisit,
}));
