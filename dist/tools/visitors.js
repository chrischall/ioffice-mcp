import { buildQueryString } from '../client.js';
export const toolDefinitions = [
    {
        name: 'io_list_visitors',
        description: 'List iOffice visitors. Supports search, date filtering, and pagination.',
        annotations: { readOnlyHint: true },
        inputSchema: {
            type: 'object',
            properties: {
                search: { type: 'string', description: 'Filter by visitor name or email' },
                startDate: { type: 'string', description: 'Filter visitors expected on or after this date (ISO 8601)' },
                endDate: { type: 'string', description: 'Filter visitors expected on or before this date (ISO 8601)' },
                buildingId: { type: 'number', description: 'Filter by building ID' },
                limit: { type: 'number', description: 'Max results (default 50, max 100)' },
                startAt: { type: 'number', description: 'Pagination offset (default 0)' },
                orderBy: { type: 'string', description: 'Property to sort by (default: id)' },
                orderByType: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction (default: asc)' },
            },
            required: [],
        },
    },
    {
        name: 'io_get_visitor',
        description: 'Get a single iOffice visitor by ID.',
        annotations: { readOnlyHint: true },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Visitor ID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'io_create_visitor',
        description: 'Pre-register a visitor in iOffice.',
        annotations: { readOnlyHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                firstName: { type: 'string', description: 'Visitor first name' },
                lastName: { type: 'string', description: 'Visitor last name' },
                email: { type: 'string', description: 'Visitor email address' },
                company: { type: 'string', description: 'Visitor company/organization' },
                phone: { type: 'string', description: 'Visitor phone number' },
                hostId: { type: 'number', description: 'Host user ID (iOffice user they are visiting)' },
                buildingId: { type: 'number', description: 'Building ID for the visit' },
                expectedArrival: { type: 'string', description: 'Expected arrival date/time (ISO 8601)' },
                expectedDeparture: { type: 'string', description: 'Expected departure date/time (ISO 8601)' },
                purpose: { type: 'string', description: 'Purpose of visit' },
            },
            required: ['firstName', 'lastName'],
        },
    },
    {
        name: 'io_update_visitor',
        description: 'Update an existing iOffice visitor record. Only provide fields to change.',
        annotations: { readOnlyHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Visitor ID' },
                firstName: { type: 'string', description: 'Visitor first name' },
                lastName: { type: 'string', description: 'Visitor last name' },
                email: { type: 'string', description: 'Visitor email address' },
                company: { type: 'string', description: 'Visitor company/organization' },
                phone: { type: 'string', description: 'Visitor phone number' },
                expectedArrival: { type: 'string', description: 'Expected arrival date/time (ISO 8601)' },
                expectedDeparture: { type: 'string', description: 'Expected departure date/time (ISO 8601)' },
                purpose: { type: 'string', description: 'Purpose of visit' },
            },
            required: ['id'],
        },
    },
    {
        name: 'io_checkin_visitor',
        description: 'Check in a visitor upon arrival at the building.',
        annotations: { readOnlyHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Visitor ID' },
            },
            required: ['id'],
        },
    },
    {
        name: 'io_checkout_visitor',
        description: 'Check out a visitor upon departure from the building.',
        annotations: { readOnlyHint: false },
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'number', description: 'Visitor ID' },
            },
            required: ['id'],
        },
    },
];
export async function handleTool(name, args, client) {
    switch (name) {
        case 'io_list_visitors': {
            const { search, startDate, endDate, buildingId, limit, startAt, orderBy, orderByType } = args;
            const qs = buildQueryString({ search, startDate, endDate, buildingId, limit, startAt, orderBy, orderByType });
            const data = await client.request('GET', `/visitors${qs}`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_get_visitor': {
            const { id } = args;
            const data = await client.request('GET', `/visitors/${id}`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_create_visitor': {
            const data = await client.request('POST', '/visitors', args);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_update_visitor': {
            const { id, ...body } = args;
            const data = await client.request('PUT', `/visitors/${id}`, body);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_checkin_visitor': {
            const { id } = args;
            const data = await client.request('POST', `/visitors/${id}/checkIn`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        case 'io_checkout_visitor': {
            const { id } = args;
            const data = await client.request('POST', `/visitors/${id}/checkOut`);
            return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
        }
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
