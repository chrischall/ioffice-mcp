import { buildQueryString } from '../client.js';
export const toolDefinitions = [
    {
        name: 'io_list_floors',
        description: 'List iOffice floors. Optionally filter by building ID.',
        annotations: { readOnlyHint: true },
        inputSchema: {
            type: 'object',
            properties: {
                buildingId: { type: 'number', description: 'Filter floors by building ID' },
                search: { type: 'string', description: 'Filter by name' },
                limit: { type: 'number', description: 'Max results (default 50, max 100)' },
                startAt: { type: 'number', description: 'Pagination offset (default 0)' },
                orderBy: { type: 'string', description: 'Property to sort by (default: id)' },
                orderByType: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction (default: asc)' },
            },
            required: [],
        },
    },
    {
        name: 'io_get_floor',
        description: 'Get a single iOffice floor by ID.',
        annotations: { readOnlyHint: true },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Floor ID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'io_create_floor',
        description: 'Create a new iOffice floor within a building.',
        annotations: { readOnlyHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Floor name' },
                buildingId: { type: 'number', description: 'ID of the building this floor belongs to' },
                description: { type: 'string', description: 'Floor description' },
                totalSquareFootage: { type: 'number', description: 'Total square footage of the floor' },
                floorNumber: { type: 'number', description: 'Physical floor number' },
            },
            required: ['name', 'buildingId'],
        },
    },
    {
        name: 'io_update_floor',
        description: 'Update an existing iOffice floor. Only provide fields to change.',
        annotations: { readOnlyHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Floor ID' },
                name: { type: 'string', description: 'Floor name' },
                description: { type: 'string', description: 'Floor description' },
                totalSquareFootage: { type: 'number', description: 'Total square footage' },
                floorNumber: { type: 'number', description: 'Physical floor number' },
            },
            required: ['id'],
        },
    },
    {
        name: 'io_delete_floor',
        description: 'Delete an iOffice floor by ID.',
        annotations: { readOnlyHint: false, destructiveHint: true },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Floor ID' },
            },
            required: ['id'],
        },
    },
];
export async function handleTool(name, args, client) {
    switch (name) {
        case 'io_list_floors': {
            const { buildingId, search, limit, startAt, orderBy, orderByType } = args;
            const qs = buildQueryString({ search, limit, startAt, orderBy, orderByType });
            const path = buildingId ? `/buildings/${buildingId}/floors${qs}` : `/floors${qs}`;
            const data = await client.request('GET', path);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_get_floor': {
            const { id } = args;
            const data = await client.request('GET', `/floors/${id}`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_create_floor': {
            const data = await client.request('POST', '/floors', args);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_update_floor': {
            const { id, ...body } = args;
            const data = await client.request('PUT', `/floors/${id}`, body);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_delete_floor': {
            const { id } = args;
            const data = await client.request('DELETE', `/floors/${id}`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
