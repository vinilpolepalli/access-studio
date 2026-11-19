import { route } from '@/lib/api';
import { deploy } from '@/lib/store';

export const POST = route({ admin: true, write: true }, async ({ ownerId, role }) => ({ status: 201, body: { version: await deploy(ownerId, role) } }));
