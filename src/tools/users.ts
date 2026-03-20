import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';

export const toolDefinitions: Tool[] = [
  {
    name: 'io_list_users',
    description: 'List iOffice users. Supports search, pagination, and sorting.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Filter by name or email' },
        limit: { type: 'number', description: 'Max results (default 50, max 100)' },
        startAt: { type: 'number', description: 'Pagination offset (default 0)' },
        orderBy: { type: 'string', description: 'Property to sort by (default: id)' },
        orderByType: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction (default: asc)' },
      },
      required: [],
    },
  },
  {
    name: 'io_get_user',
    description: 'Get a single iOffice user by ID.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'User ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'io_create_user',
    description: 'Create a new iOffice user.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        firstName: { type: 'string', description: 'First name' },
        lastName: { type: 'string', description: 'Last name' },
        email: { type: 'string', description: 'Email address (used for login)' },
        username: { type: 'string', description: 'Username' },
        phone: { type: 'string', description: 'Phone number' },
        title: { type: 'string', description: 'Job title' },
        centerId: { type: 'number', description: 'Primary center/cost center ID' },
        buildingId: { type: 'number', description: 'Default building ID' },
      },
      required: ['firstName', 'lastName', 'email'],
    },
  },
  {
    name: 'io_update_user',
    description: 'Update an existing iOffice user. Only provide fields to change.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'User ID' },
        firstName: { type: 'string', description: 'First name' },
        lastName: { type: 'string', description: 'Last name' },
        email: { type: 'string', description: 'Email address' },
        phone: { type: 'string', description: 'Phone number' },
        title: { type: 'string', description: 'Job title' },
        centerId: { type: 'number', description: 'Primary center/cost center ID' },
        buildingId: { type: 'number', description: 'Default building ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'io_delete_user',
    description: 'Delete an iOffice user by ID.',
    annotations: { readOnlyHint: false, destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'User ID' },
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
    case 'io_list_users': {
      const { search, limit, startAt, orderBy, orderByType } = args as {
        search?: string; limit?: number; startAt?: number; orderBy?: string; orderByType?: string;
      };
      const qs = buildQueryString({ search, limit, startAt, orderBy, orderByType });
      const data = await client.request('GET', `/users${qs}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_get_user': {
      const { id } = args as { id: number };
      const data = await client.request('GET', `/users/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_create_user': {
      const data = await client.request('POST', '/users', args);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_update_user': {
      const { id, ...body } = args as { id: number } & Record<string, unknown>;
      const data = await client.request('PUT', `/users/${id}`, body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_delete_user': {
      const { id } = args as { id: number };
      const data = await client.request('DELETE', `/users/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
