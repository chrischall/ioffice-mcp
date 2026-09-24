import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';
import { minifiedResult } from '@chrischall/mcp-utils';
import { viewArg, viewResponse } from '../view.js';
import { CONFIRM_DESCRIPTION, confirmTokenParam, confirmWrite } from './_confirm.js';

export function registerSpaceTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool(
    'io_list_spaces',
    {
      description: 'List iOffice spaces (rooms). Optionally filter by floor ID.',
      inputSchema: z.object({
        view: viewArg(),
        floorId: z.number().describe('Filter spaces by floor ID').optional(),
        search: z.string().describe('Filter by name or description').optional(),
        limit: z.number().describe('Max results (default 50, max 100)').optional(),
        startAt: z.number().describe('Pagination offset (default 0)').optional(),
        orderBy: z.string().describe('Property to sort by (default: id)').optional(),
        orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ floorId, search, limit, startAt, orderBy, orderByType, view }) => {
      const qs = buildQueryString({
        search,
        limit,
        startAt,
        orderBy,
        orderByType,
      });
      const path = floorId ? `/floors/${floorId}/spaces${qs}` : `/spaces${qs}`;
      const data = await client.request('GET', path);
      return viewResponse(view, data);
    },
  );

  server.registerTool(
    'io_get_space',
    {
      description: 'Get a single iOffice space (room) by ID.',
      inputSchema: z.object({
        view: viewArg(),
        id: z.number().describe('Space ID'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ id, view }) => {
      const data = await client.request('GET', `/spaces/${id}`);
      return viewResponse(view, data);
    },
  );

  server.registerTool(
    'io_create_space',
    {
      description: 'Create a new iOffice space (room) on a floor. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        name: z.string().describe('Space name'),
        floorId: z.number().describe('Floor ID this space belongs to'),
        description: z.string().describe('Space description').optional(),
        capacity: z.number().describe('Maximum occupancy').optional(),
        squareFootage: z.number().describe('Square footage of the space').optional(),
        typeId: z.number().describe('Space type ID').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ confirmToken, ...args }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_create_space',
        action: 'space.create',
        summary: 'Create iOffice space',
        method: 'POST',
        path: '/spaces',
        body: args,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', '/spaces', args);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_update_space',
    {
      description:
        'Update an existing iOffice space. Only provide fields to change. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().describe('Space ID'),
        name: z.string().describe('Space name').optional(),
        description: z.string().describe('Space description').optional(),
        capacity: z.number().describe('Maximum occupancy').optional(),
        squareFootage: z.number().describe('Square footage').optional(),
        typeId: z.number().describe('Space type ID').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id, confirmToken, ...body }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_update_space',
        action: 'space.update',
        summary: `Update iOffice space ${id}`,
        method: 'PUT',
        path: `/spaces/${id}`,
        body: body,
        target: id,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('PUT', `/spaces/${id}`, body);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_delete_space',
    {
      description: 'Delete an iOffice space by ID. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().describe('Space ID'),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id, confirmToken }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_delete_space',
        action: 'space.delete',
        summary: `Delete iOffice space ${id}`,
        method: 'DELETE',
        path: `/spaces/${id}`,
        target: id,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('DELETE', `/spaces/${id}`);
      // iOffice DELETEs return 204 No Content; the client resolves that to
      // undefined, so synthesize a small success payload for the tool result.
      return minifiedResult(data ?? { success: true });
    },
  );
}
