import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import type { IOfficeClient } from '../client.js';
import { buildQueryString, optionalBody } from '../client.js';
import { minifiedResult } from '@chrischall/mcp-utils';
import { viewArg, viewResponse } from '../view.js';
import { CONFIRM_DESCRIPTION, confirmTokenParam, confirmWrite } from './_confirm.js';

export function registerMoveTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool(
    'io_list_moves',
    {
      description:
        'List iOffice move requests. Supports filtering by status, building, or assignee.',
      inputSchema: z.object({
        view: viewArg(),
        search: z.string().describe('Filter by name or description').optional(),
        status: z
          .string()
          .describe('Filter by status (e.g. pending, approved, completed)')
          .optional(),
        buildingId: z.number().describe('Filter by building ID').optional(),
        requesterId: z.number().describe('Filter by requester user ID').optional(),
        startDate: z.string().describe('Filter moves on or after this date (ISO 8601)').optional(),
        endDate: z.string().describe('Filter moves on or before this date (ISO 8601)').optional(),
        limit: z.number().describe('Max results (default 50, max 100)').optional(),
        startAt: z.number().describe('Pagination offset (default 0)').optional(),
        orderBy: z.string().describe('Property to sort by (default: id)').optional(),
        orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({
      search,
      status,
      buildingId,
      requesterId,
      startDate,
      endDate,
      limit,
      startAt,
      orderBy,
      orderByType,
      view,
    }) => {
      const qs = buildQueryString({
        search,
        status,
        buildingId,
        requesterId,
        startDate,
        endDate,
        limit,
        startAt,
        orderBy,
        orderByType,
      });
      const data = await client.request('GET', `/moves${qs}`);
      return viewResponse(view, data);
    },
  );

  server.registerTool(
    'io_get_move',
    {
      description: 'Get a single iOffice move request by ID.',
      inputSchema: z.object({
        view: viewArg(),
        id: z.number().describe('Move request ID'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ id, view }) => {
      const data = await client.request('GET', `/moves/${id}`);
      return viewResponse(view, data);
    },
  );

  server.registerTool(
    'io_create_move',
    {
      description: 'Create a new iOffice move request. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        name: z.string().describe('Move request name/title'),
        description: z.string().describe('Description of the move').optional(),
        requesterId: z.number().describe('User ID of the person requesting the move').optional(),
        fromSpaceId: z.number().describe('Source space/room ID').optional(),
        toSpaceId: z.number().describe('Destination space/room ID').optional(),
        scheduledDate: z.string().describe('Scheduled move date (ISO 8601)').optional(),
        buildingId: z.number().describe('Building ID where the move takes place').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ confirmToken, ...args }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_create_move',
        action: 'move.create',
        summary: 'Create iOffice move request',
        method: 'POST',
        path: '/moves',
        body: args,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', '/moves', args);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_update_move',
    {
      description:
        'Update an existing iOffice move request. Only provide fields to change. ' +
        CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().describe('Move request ID'),
        name: z.string().describe('Move request name/title').optional(),
        description: z.string().describe('Description of the move').optional(),
        scheduledDate: z.string().describe('Scheduled move date (ISO 8601)').optional(),
        fromSpaceId: z.number().describe('Source space/room ID').optional(),
        toSpaceId: z.number().describe('Destination space/room ID').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id, confirmToken, ...body }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_update_move',
        action: 'move.update',
        summary: `Update iOffice move request ${id}`,
        method: 'PUT',
        path: `/moves/${id}`,
        body: body,
        target: id,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('PUT', `/moves/${id}`, body);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_approve_move',
    {
      description: 'Approve an iOffice move request. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().describe('Move request ID'),
        notes: z.string().describe('Approval notes (optional)').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id, confirmToken, notes }, ctx) => {
      const body = optionalBody({ notes }, ['notes']);
      const gate = await confirmWrite(ctx, {
        tool: 'io_approve_move',
        action: 'move.approve',
        summary: `Approve iOffice move request ${id}`,
        method: 'POST',
        path: `/moves/${id}/approve`,
        body: body,
        target: id,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', `/moves/${id}/approve`, body);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_cancel_move',
    {
      description: 'Cancel an iOffice move request. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().describe('Move request ID'),
        reason: z.string().describe('Cancellation reason').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id, confirmToken, reason }, ctx) => {
      const body = optionalBody({ reason }, ['reason']);
      const gate = await confirmWrite(ctx, {
        tool: 'io_cancel_move',
        action: 'move.cancel',
        summary: `Cancel iOffice move request ${id}`,
        method: 'POST',
        path: `/moves/${id}/cancel`,
        body: body,
        target: id,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', `/moves/${id}/cancel`, body);
      return minifiedResult(data);
    },
  );
}
