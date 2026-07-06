import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString, optionalBody } from '../client.js';
import { textResult } from '@chrischall/mcp-utils';
import { previewUnlessConfirmed, schemaConfirm } from './_confirm.js';

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
    return textResult(data);
  });

  server.registerTool('io_get_move', {
    description: 'Get a single iOffice move request by ID.',
    inputSchema: {
      id: z.number().describe('Move request ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ id }) => {
    const data = await client.request('GET', `/moves/${id}`);
    return textResult(data);
  });

  server.registerTool('io_create_move', {
    description: 'Create a new iOffice move request. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      name: z.string().describe('Move request name/title'),
      description: z.string().describe('Description of the move').optional(),
      requesterId: z.number().describe('User ID of the person requesting the move').optional(),
      fromSpaceId: z.number().describe('Source space/room ID').optional(),
      toSpaceId: z.number().describe('Destination space/room ID').optional(),
      scheduledDate: z.string().describe('Scheduled move date (ISO 8601)').optional(),
      buildingId: z.number().describe('Building ID where the move takes place').optional(),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ confirm, ...args }) => {
    const gate = previewUnlessConfirmed(confirm, 'Create iOffice move request', 'POST', '/moves', args);
    if (gate) return gate;
    const data = await client.request('POST', '/moves', args);
    return textResult(data);
  });

  server.registerTool('io_update_move', {
    description: 'Update an existing iOffice move request. Only provide fields to change. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      id: z.number().describe('Move request ID'),
      name: z.string().describe('Move request name/title').optional(),
      description: z.string().describe('Description of the move').optional(),
      scheduledDate: z.string().describe('Scheduled move date (ISO 8601)').optional(),
      fromSpaceId: z.number().describe('Source space/room ID').optional(),
      toSpaceId: z.number().describe('Destination space/room ID').optional(),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id, confirm, ...body }) => {
    const gate = previewUnlessConfirmed(confirm, `Update iOffice move request ${id}`, 'PUT', `/moves/${id}`, body);
    if (gate) return gate;
    const data = await client.request('PUT', `/moves/${id}`, body);
    return textResult(data);
  });

  server.registerTool('io_approve_move', {
    description: 'Approve an iOffice move request. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      id: z.number().describe('Move request ID'),
      notes: z.string().describe('Approval notes (optional)').optional(),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id, confirm, notes }) => {
    const body = optionalBody({ notes }, ['notes']);
    const gate = previewUnlessConfirmed(confirm, `Approve iOffice move request ${id}`, 'POST', `/moves/${id}/approve`, body);
    if (gate) return gate;
    const data = await client.request('POST', `/moves/${id}/approve`, body);
    return textResult(data);
  });

  server.registerTool('io_cancel_move', {
    description: 'Cancel an iOffice move request. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      id: z.number().describe('Move request ID'),
      reason: z.string().describe('Cancellation reason').optional(),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id, confirm, reason }) => {
    const body = optionalBody({ reason }, ['reason']);
    const gate = previewUnlessConfirmed(confirm, `Cancel iOffice move request ${id}`, 'POST', `/moves/${id}/cancel`, body);
    if (gate) return gate;
    const data = await client.request('POST', `/moves/${id}/cancel`, body);
    return textResult(data);
  });
}
