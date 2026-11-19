import { route } from '@/lib/api';
import { FIELDS } from '@/lib/catalog';
import { accessFor, minimumNecessary, projectRow, restrictedMarkers } from '@/lib/policy';
import { audit, getConfig, listPatients } from '@/lib/store';

export const GET = route({}, async ({ ownerId, role }) => {
  const access = accessFor(role, await getConfig(ownerId));
  const rows = (await listPatients(ownerId)).map((p) => ({ id: p.id, code: p.code, values: projectRow(access, p) }));
  await audit(ownerId, role, 'list_view', `callback list (${rows.length} rows, ${access.visible.length} fields)`);
  return {
    body: {
      synthetic: true,
      role,
      fields: access.visible.map((k) => ({ key: k, label: FIELDS.find((f) => f.key === k)!.label })),
      restricted: restrictedMarkers(role, access),
      minimumNecessary: minimumNecessary(access),
      rows,
    },
  };
});
