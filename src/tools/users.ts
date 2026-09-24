import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';
import { minifiedResult } from '@chrischall/mcp-utils';
import { viewArg, viewResponse } from '../view.js';
import { CONFIRM_DESCRIPTION, confirmTokenParam, confirmWrite } from './_confirm.js';

export function registerUserTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool(
    'io_list_users',
    {
      description: 'List iOffice users. Supports search, pagination, and sorting.',
      inputSchema: z.object({
        view: viewArg(),
        search: z.string().describe('Filter by name or email').optional(),
        limit: z.number().describe('Max results (default 50, max 100)').optional(),
        startAt: z.number().describe('Pagination offset (default 0)').optional(),
        orderBy: z.string().describe('Property to sort by (default: id)').optional(),
        orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ search, limit, startAt, orderBy, orderByType, view }) => {
      const qs = buildQueryString({
        search,
        limit,
        startAt,
        orderBy,
        orderByType,
      });
      const data = await client.request('GET', `/users${qs}`);
      return viewResponse(view, data);
    },
  );

  server.registerTool(
    'io_get_user',
    {
      description: 'Get a single iOffice user by ID.',
      inputSchema: z.object({
        view: viewArg(),
        id: z.number().describe('User ID'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ id, view }) => {
      const data = await client.request('GET', `/users/${id}`);
      return viewResponse(view, data);
    },
  );

  server.registerTool(
    'io_create_user',
    {
      description: 'Create a new iOffice user. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        firstName: z.string().describe('First name'),
        lastName: z.string().describe('Last name'),
        email: z.string().describe('Email address (used for login)'),
        username: z.string().describe('Username').optional(),
        phone: z.string().describe('Phone number').optional(),
        title: z.string().describe('Job title').optional(),
        centerId: z.number().describe('Primary center/cost center ID').optional(),
        buildingId: z.number().describe('Default building ID').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ confirmToken, ...args }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_create_user',
        action: 'user.create',
        summary: 'Create iOffice user',
        method: 'POST',
        path: '/users',
        body: args,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', '/users', args);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_update_user',
    {
      description:
        'Update an existing iOffice user. Only provide fields to change. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().describe('User ID'),
        firstName: z.string().describe('First name').optional(),
        lastName: z.string().describe('Last name').optional(),
        email: z.string().describe('Email address').optional(),
        phone: z.string().describe('Phone number').optional(),
        title: z.string().describe('Job title').optional(),
        centerId: z.number().describe('Primary center/cost center ID').optional(),
        buildingId: z.number().describe('Default building ID').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id, confirmToken, ...body }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_update_user',
        action: 'user.update',
        summary: `Update iOffice user ${id}`,
        method: 'PUT',
        path: `/users/${id}`,
        body: body,
        target: id,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('PUT', `/users/${id}`, body);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_delete_user',
    {
      description: 'Delete an iOffice user by ID. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().describe('User ID'),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id, confirmToken }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_delete_user',
        action: 'user.delete',
        summary: `Delete iOffice user ${id}`,
        method: 'DELETE',
        path: `/users/${id}`,
        target: id,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('DELETE', `/users/${id}`);
      // iOffice DELETEs return 204 No Content; the client resolves that to
      // undefined, so synthesize a small success payload for the tool result.
      return minifiedResult(data ?? { success: true });
    },
  );
}
