import { route } from '@/lib/api';
import { FIELDS, ROLES } from '@/lib/catalog';
import { accessFor, minimumNecessary } from '@/lib/policy';
import { applyPatch, getConfig, validatePatch } from '@/lib/store';

function view(cfg: Awaited<ReturnType<typeof getConfig>>) {
  return {
    fields: FIELDS,
    roles: ROLES,
    config: cfg,
    minimumNecessary: Object.fromEntries(ROLES.map((r) => [r.key, minimumNecessary(accessFor(r.key, cfg))])),
  };
}

export const GET = route({ admin: true }, async ({ ownerId }) => ({ body: view(await getConfig(ownerId)) }));

export const PUT = route({ admin: true, write: true }, async ({ ownerId, role, body }) => {
  const v = validatePatch(body);
  if ('error' in v) return { status: 400, body: { error: v.error } };
  return { body: view(await applyPatch(ownerId, v.patch, role)) };
});
