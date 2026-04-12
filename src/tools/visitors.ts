import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';

export function registerVisitorTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool('io_list_visitors', {
    description: 'List iOffice visitors. Supports search, date filtering, and pagination.',
    inputSchema: {
      search: z.string().describe('Filter by visitor name or email').optional(),
      startDate: z.string().describe('Filter visitors expected on or after this date (ISO 8601)').optional(),
      endDate: z.string().describe('Filter visitors expected on or before this date (ISO 8601)').optional(),
      buildingId: z.number().describe('Filter by building ID').optional(),
      limit: z.number().describe('Max results (default 50, max 100)').optional(),
      startAt: z.number().describe('Pagination offset (default 0)').optional(),
      orderBy: z.string().describe('Property to sort by (default: id)').optional(),
      orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
    },
    annotations: { readOnlyHint: true },
  }, async ({ search, startDate, endDate, buildingId, limit, startAt, orderBy, orderByType }) => {
    const qs = buildQueryString({ search, startDate, endDate, buildingId, limit, startAt, orderBy, orderByType });
    const data = await client.request('GET', `/visitors${qs}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_get_visitor', {
    description: 'Get a single iOffice visitor by ID.',
    inputSchema: {
      id: z.number().describe('Visitor ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ id }) => {
    const data = await client.request('GET', `/visitors/${id}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_create_visitor', {
    description: 'Pre-register a visitor in iOffice.',
    inputSchema: {
      firstName: z.string().describe('Visitor first name'),
      lastName: z.string().describe('Visitor last name'),
      email: z.string().describe('Visitor email address').optional(),
      company: z.string().describe('Visitor company/organization').optional(),
      phone: z.string().describe('Visitor phone number').optional(),
      hostId: z.number().describe('Host user ID (iOffice user they are visiting)').optional(),
      buildingId: z.number().describe('Building ID for the visit').optional(),
      expectedArrival: z.string().describe('Expected arrival date/time (ISO 8601)').optional(),
      expectedDeparture: z.string().describe('Expected departure date/time (ISO 8601)').optional(),
      purpose: z.string().describe('Purpose of visit').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async (args) => {
    const data = await client.request('POST', '/visitors', args);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_update_visitor', {
    description: 'Update an existing iOffice visitor record. Only provide fields to change.',
    inputSchema: {
      id: z.number().describe('Visitor ID'),
      firstName: z.string().describe('Visitor first name').optional(),
      lastName: z.string().describe('Visitor last name').optional(),
      email: z.string().describe('Visitor email address').optional(),
      company: z.string().describe('Visitor company/organization').optional(),
      phone: z.string().describe('Visitor phone number').optional(),
      expectedArrival: z.string().describe('Expected arrival date/time (ISO 8601)').optional(),
      expectedDeparture: z.string().describe('Expected departure date/time (ISO 8601)').optional(),
      purpose: z.string().describe('Purpose of visit').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id, ...body }) => {
    const data = await client.request('PUT', `/visitors/${id}`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_checkin_visitor', {
    description: 'Check in a visitor upon arrival at the building.',
    inputSchema: {
      id: z.number().describe('Visitor ID'),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id }) => {
    const data = await client.request('POST', `/visitors/${id}/checkIn`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_checkout_visitor', {
    description: 'Check out a visitor upon departure from the building.',
    inputSchema: {
      id: z.number().describe('Visitor ID'),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id }) => {
    const data = await client.request('POST', `/visitors/${id}/checkOut`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });
}
