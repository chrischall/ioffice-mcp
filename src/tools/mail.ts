import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';

export function registerMailTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool('io_list_mail', {
    description: 'List iOffice mail items (packages and letters). Supports filtering and pagination.',
    inputSchema: {
      search: z.string().describe('Filter by recipient name, tracking number, or sender').optional(),
      status: z.string().describe('Filter by status (e.g. received, delivered, returned)').optional(),
      buildingId: z.number().describe('Filter by building ID').optional(),
      recipientId: z.number().describe('Filter by recipient user ID').optional(),
      startDate: z.string().describe('Filter mail received on or after this date (ISO 8601)').optional(),
      endDate: z.string().describe('Filter mail received on or before this date (ISO 8601)').optional(),
      limit: z.number().describe('Max results (default 50, max 100)').optional(),
      startAt: z.number().describe('Pagination offset (default 0)').optional(),
      orderBy: z.string().describe('Property to sort by (default: id)').optional(),
      orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
    },
    annotations: { readOnlyHint: true },
  }, async ({ search, status, buildingId, recipientId, startDate, endDate, limit, startAt, orderBy, orderByType }) => {
    const qs = buildQueryString({ search, status, buildingId, recipientId, startDate, endDate, limit, startAt, orderBy, orderByType });
    const data = await client.request('GET', `/mail${qs}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_get_mail', {
    description: 'Get a single iOffice mail item by ID.',
    inputSchema: {
      id: z.number().describe('Mail item ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ id }) => {
    const data = await client.request('GET', `/mail/${id}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_create_mail', {
    description: 'Log a new mail item (package or letter) received in iOffice.',
    inputSchema: {
      recipientId: z.number().describe('Recipient user ID'),
      buildingId: z.number().describe('Building where mail was received'),
      trackingNumber: z.string().describe('Package tracking number').optional(),
      carrier: z.string().describe('Shipping carrier (e.g. UPS, FedEx, USPS)').optional(),
      description: z.string().describe('Description of the mail item').optional(),
      mailTypeId: z.number().describe('Mail type ID').optional(),
      receivedDate: z.string().describe('Date/time received (ISO 8601, defaults to now)').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async (args) => {
    const data = await client.request('POST', '/mail', args);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_deliver_mail', {
    description: 'Mark an iOffice mail item as delivered to the recipient.',
    inputSchema: {
      id: z.number().describe('Mail item ID'),
      deliveredDate: z.string().describe('Delivery date/time (ISO 8601, defaults to now)').optional(),
      signature: z.string().describe('Recipient signature or name confirmation').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id, ...body }) => {
    const data = await client.request('POST', `/mail/${id}/deliver`, Object.keys(body).length > 0 ? body : undefined);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_return_mail', {
    description: 'Mark an iOffice mail item as returned to sender.',
    inputSchema: {
      id: z.number().describe('Mail item ID'),
      reason: z.string().describe('Reason for return').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id, ...body }) => {
    const data = await client.request('POST', `/mail/${id}/return`, Object.keys(body).length > 0 ? body : undefined);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });
}
