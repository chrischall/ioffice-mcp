import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';

export function registerUserTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool('io_list_users', {
    description: 'List iOffice users. Supports search, pagination, and sorting.',
    inputSchema: {
      search: z.string().describe('Filter by name or email').optional(),
      limit: z.number().describe('Max results (default 50, max 100)').optional(),
      startAt: z.number().describe('Pagination offset (default 0)').optional(),
      orderBy: z.string().describe('Property to sort by (default: id)').optional(),
      orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
    },
    annotations: { readOnlyHint: true },
  }, async ({ search, limit, startAt, orderBy, orderByType }) => {
    const qs = buildQueryString({ search, limit, startAt, orderBy, orderByType });
    const data = await client.request('GET', `/users${qs}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_get_user', {
    description: 'Get a single iOffice user by ID.',
    inputSchema: {
      id: z.number().describe('User ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ id }) => {
    const data = await client.request('GET', `/users/${id}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_create_user', {
    description: 'Create a new iOffice user.',
    inputSchema: {
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().describe('Email address (used for login)'),
      username: z.string().describe('Username').optional(),
      phone: z.string().describe('Phone number').optional(),
      title: z.string().describe('Job title').optional(),
      centerId: z.number().describe('Primary center/cost center ID').optional(),
      buildingId: z.number().describe('Default building ID').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async (args) => {
    const data = await client.request('POST', '/users', args);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_update_user', {
    description: 'Update an existing iOffice user. Only provide fields to change.',
    inputSchema: {
      id: z.number().describe('User ID'),
      firstName: z.string().describe('First name').optional(),
      lastName: z.string().describe('Last name').optional(),
      email: z.string().describe('Email address').optional(),
      phone: z.string().describe('Phone number').optional(),
      title: z.string().describe('Job title').optional(),
      centerId: z.number().describe('Primary center/cost center ID').optional(),
      buildingId: z.number().describe('Default building ID').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id, ...body }) => {
    const data = await client.request('PUT', `/users/${id}`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_delete_user', {
    description: 'Delete an iOffice user by ID.',
    inputSchema: {
      id: z.number().describe('User ID'),
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id }) => {
    const data = await client.request('DELETE', `/users/${id}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });
}
