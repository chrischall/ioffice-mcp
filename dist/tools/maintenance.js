import { buildQueryString } from '../client.js';
export const toolDefinitions = [
    {
        name: 'io_list_maintenance_requests',
        description: 'List iOffice maintenance requests. Supports filtering by status, space, or building.',
        annotations: { readOnlyHint: true },
        inputSchema: {
            type: 'object',
            properties: {
                search: { type: 'string', description: 'Filter by title or description' },
                status: { type: 'string', description: 'Filter by status (e.g. pending, accepted, started, completed, archived)' },
                spaceId: { type: 'number', description: 'Filter by space/room ID' },
                buildingId: { type: 'number', description: 'Filter by building ID' },
                assignedUserId: { type: 'number', description: 'Filter by assigned technician user ID' },
                limit: { type: 'number', description: 'Max results (default 50, max 100)' },
                startAt: { type: 'number', description: 'Pagination offset (default 0)' },
                orderBy: { type: 'string', description: 'Property to sort by (default: id)' },
                orderByType: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction (default: asc)' },
            },
            required: [],
        },
    },
    {
        name: 'io_get_maintenance_request',
        description: 'Get a single iOffice maintenance request by ID.',
        annotations: { readOnlyHint: true },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Maintenance request ID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'io_create_maintenance_request',
        description: 'Create a new iOffice maintenance request.',
        annotations: { readOnlyHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'Request title/summary' },
                description: { type: 'string', description: 'Detailed description of the issue' },
                spaceId: { type: 'number', description: 'Space/room ID where the issue is located' },
                buildingId: { type: 'number', description: 'Building ID where the issue is located' },
                priorityId: { type: 'number', description: 'Priority level ID' },
                typeId: { type: 'number', description: 'Maintenance type/category ID' },
                assignedUserId: { type: 'number', description: 'Technician user ID to assign' },
            },
            required: ['title'],
        },
    },
    {
        name: 'io_update_maintenance_request',
        description: 'Update an existing iOffice maintenance request. Only provide fields to change.',
        annotations: { readOnlyHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Maintenance request ID' },
                title: { type: 'string', description: 'Request title/summary' },
                description: { type: 'string', description: 'Detailed description' },
                priorityId: { type: 'number', description: 'Priority level ID' },
                assignedUserId: { type: 'number', description: 'Assigned technician user ID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'io_accept_maintenance_request',
        description: 'Accept an iOffice maintenance request (transition from pending to accepted).',
        annotations: { readOnlyHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Maintenance request ID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'io_start_maintenance_request',
        description: 'Start work on an iOffice maintenance request (transition to started/in-progress).',
        annotations: { readOnlyHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Maintenance request ID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'io_complete_maintenance_request',
        description: 'Mark an iOffice maintenance request as complete.',
        annotations: { readOnlyHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Maintenance request ID' },
                resolution: { type: 'string', description: 'Resolution notes describing what was done' },
            },
            required: ['id'],
        },
    },
    {
        name: 'io_archive_maintenance_request',
        description: 'Archive a completed iOffice maintenance request.',
        annotations: { readOnlyHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Maintenance request ID' },
            },
            required: ['id'],
        },
    },
];
export async function handleTool(name, args, client) {
    switch (name) {
        case 'io_list_maintenance_requests': {
            const { search, status, spaceId, buildingId, assignedUserId, limit, startAt, orderBy, orderByType } = args;
            const qs = buildQueryString({ search, status, spaceId, buildingId, assignedUserId, limit, startAt, orderBy, orderByType });
            const data = await client.request('GET', `/maintenanceRequests${qs}`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_get_maintenance_request': {
            const { id } = args;
            const data = await client.request('GET', `/maintenanceRequests/${id}`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_create_maintenance_request': {
            const data = await client.request('POST', '/maintenanceRequests', args);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_update_maintenance_request': {
            const { id, ...body } = args;
            const data = await client.request('PUT', `/maintenanceRequests/${id}`, body);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_accept_maintenance_request': {
            const { id } = args;
            const data = await client.request('POST', `/maintenanceRequests/${id}/accept`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_start_maintenance_request': {
            const { id } = args;
            const data = await client.request('POST', `/maintenanceRequests/${id}/start`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_complete_maintenance_request': {
            const { id, resolution } = args;
            const body = resolution !== undefined ? { resolution } : undefined;
            const data = await client.request('POST', `/maintenanceRequests/${id}/complete`, body);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_archive_maintenance_request': {
            const { id } = args;
            const data = await client.request('POST', `/maintenanceRequests/${id}/archive`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
