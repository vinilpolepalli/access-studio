import { route } from '@/lib/api';
import { AUDIT_ACTIONS } from '@/lib/catalog';
import { listAudit } from '@/lib/store';

export const GET = route({ admin: true }, async ({ ownerId }, req) => {
  const action = new URL(req.url).searchParams.get('action') ?? undefined;
  if (action && !(AUDIT_ACTIONS as readonly string[]).includes(action)) return { status: 400, body: { error: 'Unknown action filter.' } };
  return { body: { actions: AUDIT_ACTIONS, entries: await listAudit(ownerId, action) } };
});
