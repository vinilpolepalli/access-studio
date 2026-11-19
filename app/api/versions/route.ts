import { route } from '@/lib/api';
import { listVersions } from '@/lib/store';

export const GET = route({ admin: true }, async ({ ownerId }) => ({ body: await listVersions(ownerId) }));
