import { route } from '@/lib/api';
import { FIELDS } from '@/lib/catalog';
import { accessFor, projectRow, restrictedMarkers } from '@/lib/policy';
import { audit, getConfig, getPatient } from '@/lib/store';

export const GET = route({}, async ({ ownerId, role }, _req, params) => {
  const p = await getPatient(ownerId, params.id);
  if (!p) return { status: 404, body: { error: 'Record not found.' } };
  const access = accessFor(role, await getConfig(ownerId));
  await audit(ownerId, role, 'record_view', p.code);
  return {
    body: {
      synthetic: true,
      role,
      id: p.id,
      code: p.code,
      fields: access.visible.map((k) => ({ key: k, label: FIELDS.find((f) => f.key === k)!.label })),
      restricted: restrictedMarkers(role, access),
      values: projectRow(access, p),
    },
  };
});
