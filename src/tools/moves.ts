import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';

export function registerMoveTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool('io_list_moves', {
    description: 'List iOffice move requests. Supports filtering by status, building, or assignee.',
    inputSchema: {
      search: z.string().describe('Filter by name or description').optional(),
      status: z.string().describe('Filter by status (e.g. pending, approved, completed)').optional(),
      buildingId: z.number().describe('Filter by building ID').optional(),
      requesterId: z.number().describe('Filter by requester user ID').optional(),
      startDate: z.string().describe('Filter moves on or after this date (ISO 8601)').optional(),
      endDate: z.string().describe('Filter moves on or before this date (ISO 8601)').optional(),
      limit: z.number().describe('Max results (default 50, max 100)').optional(),
      startAt: z.number().describe('Pagination offset (default 0)').optional(),
      orderBy: z.string().describe('Property to sort by (default: id)').optional(),
      orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
    },
    annotations: { readOnlyHint: true },
  }, async ({ search, status, buildingId, requesterId, startDate, endDate, limit, startAt, orderBy, orderByType }) => {
    const qs = buildQueryString({ search, status, buildingId, requesterId, startDate, endDate, limit, startAt, orderBy, orderByType });
    const data = await client.request('GET', `/moves${qs}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_get_move', {
    description: 'Get a single iOffice move request by ID.',
    inputSchema: {
      id: z.number().describe('Move request ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ id }) => {
    const data = await client.request('GET', `/moves/${id}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_create_move', {
    description: 'Create a new iOffice move request.',
    inputSchema: {
      name: z.string().describe('Move request name/title'),
      description: z.string().describe('Description of the move').optional(),
      requesterId: z.number().describe('User ID of the person requesting the move').optional(),
      fromSpaceId: z.number().describe('Source space/room ID').optional(),
      toSpaceId: z.number().describe('Destination space/room ID').optional(),
      scheduledDate: z.string().describe('Scheduled move date (ISO 8601)').optional(),
      buildingId: z.number().describe('Building ID where the move takes place').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async (args) => {
    const data = await client.request('POST', '/moves', args);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_update_move', {
    description: 'Update an existing iOffice move request. Only provide fields to change.',
    inputSchema: {
      id: z.number().describe('Move request ID'),
      name: z.string().describe('Move request name/title').optional(),
      description: z.string().describe('Description of the move').optional(),
      scheduledDate: z.string().describe('Scheduled move date (ISO 8601)').optional(),
      fromSpaceId: z.number().describe('Source space/room ID').optional(),
      toSpaceId: z.number().describe('Destination space/room ID').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id, ...body }) => {
    const data = await client.request('PUT', `/moves/${id}`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_approve_move', {
    description: 'Approve an iOffice move request.',
    inputSchema: {
      id: z.number().describe('Move request ID'),
      notes: z.string().describe('Approval notes (optional)').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id, notes }) => {
    const body = notes !== undefined ? { notes } : undefined;
    const data = await client.request('POST', `/moves/${id}/approve`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_cancel_move', {
    description: 'Cancel an iOffice move request.',
    inputSchema: {
      id: z.number().describe('Move request ID'),
      reason: z.string().describe('Cancellation reason').optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id, reason }) => {
    const body = reason !== undefined ? { reason } : undefined;
    const data = await client.request('POST', `/moves/${id}/cancel`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });
}
