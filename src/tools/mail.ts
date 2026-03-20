import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';

export const toolDefinitions: Tool[] = [
  {
    name: 'io_list_mail',
    description: 'List iOffice mail items (packages and letters). Supports filtering and pagination.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Filter by recipient name, tracking number, or sender' },
        status: { type: 'string', description: 'Filter by status (e.g. received, delivered, returned)' },
        buildingId: { type: 'number', description: 'Filter by building ID' },
        recipientId: { type: 'number', description: 'Filter by recipient user ID' },
        startDate: { type: 'string', description: 'Filter mail received on or after this date (ISO 8601)' },
        endDate: { type: 'string', description: 'Filter mail received on or before this date (ISO 8601)' },
        limit: { type: 'number', description: 'Max results (default 50, max 100)' },
        startAt: { type: 'number', description: 'Pagination offset (default 0)' },
        orderBy: { type: 'string', description: 'Property to sort by (default: id)' },
        orderByType: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction (default: asc)' },
      },
      required: [],
    },
  },
  {
    name: 'io_get_mail',
    description: 'Get a single iOffice mail item by ID.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Mail item ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'io_create_mail',
    description: 'Log a new mail item (package or letter) received in iOffice.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        recipientId: { type: 'number', description: 'Recipient user ID' },
        buildingId: { type: 'number', description: 'Building where mail was received' },
        trackingNumber: { type: 'string', description: 'Package tracking number' },
        carrier: { type: 'string', description: 'Shipping carrier (e.g. UPS, FedEx, USPS)' },
        description: { type: 'string', description: 'Description of the mail item' },
        mailTypeId: { type: 'number', description: 'Mail type ID' },
        receivedDate: { type: 'string', description: 'Date/time received (ISO 8601, defaults to now)' },
      },
      required: ['recipientId', 'buildingId'],
    },
  },
  {
    name: 'io_deliver_mail',
    description: 'Mark an iOffice mail item as delivered to the recipient.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Mail item ID' },
        deliveredDate: { type: 'string', description: 'Delivery date/time (ISO 8601, defaults to now)' },
        signature: { type: 'string', description: 'Recipient signature or name confirmation' },
      },
      required: ['id'],
    },
  },
  {
    name: 'io_return_mail',
    description: 'Mark an iOffice mail item as returned to sender.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Mail item ID' },
        reason: { type: 'string', description: 'Reason for return' },
      },
      required: ['id'],
    },
  },
];

export async function handleTool(
  name: string,
  args: Record<string, unknown>,
  client: IOfficeClient
): Promise<CallToolResult> {
  switch (name) {
    case 'io_list_mail': {
      const { search, status, buildingId, recipientId, startDate, endDate, limit, startAt, orderBy, orderByType } = args as {
        search?: string; status?: string; buildingId?: number; recipientId?: number;
        startDate?: string; endDate?: string; limit?: number; startAt?: number;
        orderBy?: string; orderByType?: string;
      };
      const qs = buildQueryString({ search, status, buildingId, recipientId, startDate, endDate, limit, startAt, orderBy, orderByType });
      const data = await client.request('GET', `/mail${qs}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_get_mail': {
      const { id } = args as { id: number };
      const data = await client.request('GET', `/mail/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_create_mail': {
      const data = await client.request('POST', '/mail', args);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_deliver_mail': {
      const { id, ...body } = args as { id: number } & Record<string, unknown>;
      const data = await client.request('POST', `/mail/${id}/deliver`, Object.keys(body).length > 0 ? body : undefined);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_return_mail': {
      const { id, ...body } = args as { id: number } & Record<string, unknown>;
      const data = await client.request('POST', `/mail/${id}/return`, Object.keys(body).length > 0 ? body : undefined);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
