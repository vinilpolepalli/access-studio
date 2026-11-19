import { route } from '@/lib/api';
import { isRole, ROLES } from '@/lib/catalog';
import { audit } from '@/lib/store';

// Record a role switch. x-as-role is the role being left; body.to is the role being entered.
export const POST = route({ write: true }, async ({ ownerId, role, body }) => {
  const to = (body as { to?: unknown } | undefined)?.to;
  if (!isRole(to)) return { status: 400, body: { error: 'Body must be {"to": <role>}.' } };
  const label = (r: string) => ROLES.find((x) => x.key === r)!.label;
  await audit(ownerId, role, 'role_switch', `${label(role)} -> ${label(to)}`);
  return { body: { ok: true, role: to } };
});
