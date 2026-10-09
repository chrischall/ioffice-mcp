import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';
import { minifiedResult } from '@chrischall/mcp-utils';
import { viewArg, viewResponse } from '../view.js';
import {
  CONFIRM_DESCRIPTION,
  CONFIRM_PREVIEW,
  confirmTokenParam,
  confirmWrite,
} from './_confirm.js';
import { requireUpdateFields } from './_inputs.js';

export function registerFloorTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool(
    'io_list_floors',
    {
      description: 'List iOffice floors. Optionally filter by building ID.',
      inputSchema: z.object({
        view: viewArg(),
        buildingId: z.number().int().positive().describe('Filter floors by building ID').optional(),
        search: z.string().describe('Filter by name').optional(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .describe('Max results (default 50, max 100)')
          .optional(),
        startAt: z.number().int().min(0).describe('Pagination offset (default 0)').optional(),
        orderBy: z.string().describe('Property to sort by (default: id)').optional(),
        orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ buildingId, search, limit, startAt, orderBy, orderByType, view }) => {
      const qs = buildQueryString({
        search,
        limit,
        startAt,
        orderBy,
        orderByType,
      });
      const path =
        buildingId !== undefined ? `/buildings/${buildingId}/floors${qs}` : `/floors${qs}`;
      const data = await client.request('GET', path);
      return viewResponse(view, data);
    },
  );

  server.registerTool(
    'io_get_floor',
    {
      description: 'Get a single iOffice floor by ID.',
      inputSchema: z.object({
        view: viewArg(),
        id: z.number().int().positive().describe('Floor ID'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ id, view }) => {
      const data = await client.request('GET', `/floors/${id}`);
      return viewResponse(view, data);
    },
  );

  server.registerTool(
    'io_create_floor',
    {
      description: 'Create a new iOffice floor within a building. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        name: z.string().describe('Floor name'),
        buildingId: z
          .number()
          .int()
          .positive()
          .describe('ID of the building this floor belongs to'),
        description: z.string().describe('Floor description').optional(),
        totalSquareFootage: z.number().describe('Total square footage of the floor').optional(),
        floorNumber: z.number().describe('Physical floor number').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ confirmToken, ...args }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_create_floor',
        action: 'floor.create',
        summary: 'Create iOffice floor',
        account: undefined,
        request: { method: 'POST', path: '/floors', body: args },
        preview: CONFIRM_PREVIEW,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', '/floors', args);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_update_floor',
    {
      description:
        'Update an existing iOffice floor. Only provide fields to change. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().int().positive().describe('Floor ID'),
        name: z.string().describe('Floor name').optional(),
        description: z.string().describe('Floor description').optional(),
        totalSquareFootage: z.number().describe('Total square footage').optional(),
        floorNumber: z.number().describe('Physical floor number').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id, confirmToken, ...body }, ctx) => {
      requireUpdateFields(body);
      const gate = await confirmWrite(ctx, {
        tool: 'io_update_floor',
        action: 'floor.update',
        summary: `Update iOffice floor ${id}`,
        account: undefined,
        request: { method: 'PUT', path: `/floors/${id}`, body },
        target: id,
        preview: CONFIRM_PREVIEW,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('PUT', `/floors/${id}`, body);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_delete_floor',
    {
      description: 'Delete an iOffice floor by ID. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().int().positive().describe('Floor ID'),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id, confirmToken }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_delete_floor',
        action: 'floor.delete',
        summary: `Delete iOffice floor ${id}`,
        account: undefined,
        request: { method: 'DELETE', path: `/floors/${id}` },
        target: id,
        preview: CONFIRM_PREVIEW,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('DELETE', `/floors/${id}`);
      // iOffice DELETEs return 204 No Content; the client resolves that to
      // undefined, so synthesize a small success payload for the tool result.
      return minifiedResult(data ?? { success: true });
    },
  );
}
