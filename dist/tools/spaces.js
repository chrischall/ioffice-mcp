import { buildQueryString } from '../client.js';
export const toolDefinitions = [
    {
        name: 'io_list_spaces',
        description: 'List iOffice spaces (rooms). Optionally filter by floor ID.',
        annotations: { readOnlyHint: true },
        inputSchema: {
            type: 'object',
            properties: {
                floorId: { type: 'number', description: 'Filter spaces by floor ID' },
                search: { type: 'string', description: 'Filter by name or description' },
                limit: { type: 'number', description: 'Max results (default 50, max 100)' },
                startAt: { type: 'number', description: 'Pagination offset (default 0)' },
                orderBy: { type: 'string', description: 'Property to sort by (default: id)' },
                orderByType: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction (default: asc)' },
            },
            required: [],
        },
    },
    {
        name: 'io_get_space',
        description: 'Get a single iOffice space (room) by ID.',
        annotations: { readOnlyHint: true },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Space ID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'io_create_space',
        description: 'Create a new iOffice space (room) on a floor.',
        annotations: { readOnlyHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Space name' },
                floorId: { type: 'number', description: 'Floor ID this space belongs to' },
                description: { type: 'string', description: 'Space description' },
                capacity: { type: 'number', description: 'Maximum occupancy' },
                squareFootage: { type: 'number', description: 'Square footage of the space' },
                typeId: { type: 'number', description: 'Space type ID' },
            },
            required: ['name', 'floorId'],
        },
    },
    {
        name: 'io_update_space',
        description: 'Update an existing iOffice space. Only provide fields to change.',
        annotations: { readOnlyHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Space ID' },
                name: { type: 'string', description: 'Space name' },
                description: { type: 'string', description: 'Space description' },
                capacity: { type: 'number', description: 'Maximum occupancy' },
                squareFootage: { type: 'number', description: 'Square footage' },
                typeId: { type: 'number', description: 'Space type ID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'io_delete_space',
        description: 'Delete an iOffice space by ID.',
        annotations: { readOnlyHint: false, destructiveHint: true },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Space ID' },
            },
            required: ['id'],
        },
    },
];
export async function handleTool(name, args, client) {
    switch (name) {
        case 'io_list_spaces': {
            const { floorId, search, limit, startAt, orderBy, orderByType } = args;
            const qs = buildQueryString({ search, limit, startAt, orderBy, orderByType });
            const path = floorId ? `/floors/${floorId}/spaces${qs}` : `/spaces${qs}`;
            const data = await client.request('GET', path);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_get_space': {
            const { id } = args;
            const data = await client.request('GET', `/spaces/${id}`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_create_space': {
            const data = await client.request('POST', '/spaces', args);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_update_space': {
            const { id, ...body } = args;
            const data = await client.request('PUT', `/spaces/${id}`, body);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_delete_space': {
            const { id } = args;
            const data = await client.request('DELETE', `/spaces/${id}`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
