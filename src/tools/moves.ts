import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';

export const toolDefinitions: Tool[] = [
  {
    name: 'io_list_moves',
    description: 'List iOffice move requests. Supports filtering by status, building, or assignee.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Filter by name or description' },
        status: { type: 'string', description: 'Filter by status (e.g. pending, approved, completed)' },
        buildingId: { type: 'number', description: 'Filter by building ID' },
        requesterId: { type: 'number', description: 'Filter by requester user ID' },
        startDate: { type: 'string', description: 'Filter moves on or after this date (ISO 8601)' },
        endDate: { type: 'string', description: 'Filter moves on or before this date (ISO 8601)' },
        limit: { type: 'number', description: 'Max results (default 50, max 100)' },
        startAt: { type: 'number', description: 'Pagination offset (default 0)' },
        orderBy: { type: 'string', description: 'Property to sort by (default: id)' },
        orderByType: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction (default: asc)' },
      },
      required: [],
    },
  },
  {
    name: 'io_get_move',
    description: 'Get a single iOffice move request by ID.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Move request ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'io_create_move',
    description: 'Create a new iOffice move request.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Move request name/title' },
        description: { type: 'string', description: 'Description of the move' },
        requesterId: { type: 'number', description: 'User ID of the person requesting the move' },
        fromSpaceId: { type: 'number', description: 'Source space/room ID' },
        toSpaceId: { type: 'number', description: 'Destination space/room ID' },
        scheduledDate: { type: 'string', description: 'Scheduled move date (ISO 8601)' },
        buildingId: { type: 'number', description: 'Building ID where the move takes place' },
      },
      required: ['name'],
    },
  },
  {
    name: 'io_update_move',
    description: 'Update an existing iOffice move request. Only provide fields to change.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Move request ID' },
        name: { type: 'string', description: 'Move request name/title' },
        description: { type: 'string', description: 'Description of the move' },
        scheduledDate: { type: 'string', description: 'Scheduled move date (ISO 8601)' },
        fromSpaceId: { type: 'number', description: 'Source space/room ID' },
        toSpaceId: { type: 'number', description: 'Destination space/room ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'io_approve_move',
    description: 'Approve an iOffice move request.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Move request ID' },
        notes: { type: 'string', description: 'Approval notes (optional)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'io_cancel_move',
    description: 'Cancel an iOffice move request.',
    annotations: { readOnlyHint: false, destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Move request ID' },
        reason: { type: 'string', description: 'Cancellation reason' },
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
    case 'io_list_moves': {
      const { search, status, buildingId, requesterId, startDate, endDate, limit, startAt, orderBy, orderByType } = args as {
        search?: string; status?: string; buildingId?: number; requesterId?: number;
        startDate?: string; endDate?: string; limit?: number; startAt?: number;
        orderBy?: string; orderByType?: string;
      };
      const qs = buildQueryString({ search, status, buildingId, requesterId, startDate, endDate, limit, startAt, orderBy, orderByType });
      const data = await client.request('GET', `/moves${qs}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_get_move': {
      const { id } = args as { id: number };
      const data = await client.request('GET', `/moves/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_create_move': {
      const data = await client.request('POST', '/moves', args);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_update_move': {
      const { id, ...body } = args as { id: number } & Record<string, unknown>;
      const data = await client.request('PUT', `/moves/${id}`, body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_approve_move': {
      const { id, notes } = args as { id: number; notes?: string };
      const body = notes !== undefined ? { notes } : undefined;
      const data = await client.request('POST', `/moves/${id}/approve`, body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_cancel_move': {
      const { id, reason } = args as { id: number; reason?: string };
      const body = reason !== undefined ? { reason } : undefined;
      const data = await client.request('POST', `/moves/${id}/cancel`, body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
