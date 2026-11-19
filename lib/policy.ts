import { FIELDS, ROLES, TASK_LIST_NEEDS, type FieldKey, type Role, type ToolConfig } from './catalog';

export type Access = {
  /** Fields the role may receive, in catalog order. */
  visible: FieldKey[];
  /** Fields that exist in the tool but are not granted to this role. */
  restricted: FieldKey[];
  /** Fields switched off in the tool config; they do not exist for anyone. */
  disabled: FieldKey[];
};

const roleLabel = (r: Role) => ROLES.find((x) => x.key === r)!.label;

export function accessFor(role: Role, config: ToolConfig): Access {
  const visible: FieldKey[] = [];
  const restricted: FieldKey[] = [];
  const disabled: FieldKey[] = [];
  for (const f of FIELDS) {
    const rule = config[f.key];
    if (!rule.enabled) disabled.push(f.key);
    else if (rule.roles.includes(role)) visible.push(f.key);
    else restricted.push(f.key);
  }
  return { visible, restricted, disabled };
}

/** Project a raw row down to permitted values. Unauthorized fields are never copied. */
export function projectRow(access: Access, row: Record<FieldKey, string>): Partial<Record<FieldKey, string>> {
  const out: Partial<Record<FieldKey, string>> = {};
  for (const k of access.visible) out[k] = row[k];
  return out;
}

/** Marker descriptors carry a label and explanation only: no key, no value. */
export function restrictedMarkers(role: Role, access: Access) {
  return access.restricted.map((k) => {
    const label = FIELDS.find((f) => f.key === k)!.label;
    return {
      label,
      explanation: `${label} is switched on in this tool but not granted to ${roleLabel(role)}. The server does not send it.`,
    };
  });
}

/** Simplified minimum-necessary rule: anything visible beyond TASK_LIST_NEEDS is flagged. */
export function minimumNecessary(access: Access) {
  const needed = TASK_LIST_NEEDS.map((k) => FIELDS.find((f) => f.key === k)!.label);
  const extras = access.visible
    .filter((k) => !TASK_LIST_NEEDS.includes(k))
    .map((k) => FIELDS.find((f) => f.key === k)!.label);
  return { needed, extras };
}
