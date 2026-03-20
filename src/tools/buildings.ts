import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';

export const toolDefinitions: Tool[] = [
  {
    name: 'io_list_buildings',
    description: 'List iOffice buildings. Supports search, pagination, and sorting.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Filter by name or description' },
        limit: { type: 'number', description: 'Max results (default 50, max 100)' },
        startAt: { type: 'number', description: 'Pagination offset (default 0)' },
        orderBy: { type: 'string', description: 'Property to sort by (default: id)' },
        orderByType: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction (default: asc)' },
      },
      required: [],
    },
  },
  {
    name: 'io_get_building',
    description: 'Get a single iOffice building by ID.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Building ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'io_create_building',
    description: 'Create a new iOffice building.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Building name' },
        description: { type: 'string', description: 'Building description' },
        address1: { type: 'string', description: 'Street address line 1' },
        address2: { type: 'string', description: 'Street address line 2' },
        city: { type: 'string', description: 'City' },
        state: { type: 'string', description: 'State or province' },
        postalCode: { type: 'string', description: 'Postal/ZIP code' },
        country: { type: 'string', description: 'Country code' },
        phone: { type: 'string', description: 'Building phone number' },
        totalSquareFootage: { type: 'number', description: 'Total square footage' },
      },
      required: ['name'],
    },
  },
  {
    name: 'io_update_building',
    description: 'Update an existing iOffice building. Only provide fields to change.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Building ID' },
        name: { type: 'string', description: 'Building name' },
        description: { type: 'string', description: 'Building description' },
        address1: { type: 'string', description: 'Street address line 1' },
        address2: { type: 'string', description: 'Street address line 2' },
        city: { type: 'string', description: 'City' },
        state: { type: 'string', description: 'State or province' },
        postalCode: { type: 'string', description: 'Postal/ZIP code' },
        country: { type: 'string', description: 'Country code' },
        phone: { type: 'string', description: 'Building phone number' },
        totalSquareFootage: { type: 'number', description: 'Total square footage' },
      },
      required: ['id'],
    },
  },
  {
    name: 'io_delete_building',
    description: 'Delete an iOffice building by ID.',
    annotations: { readOnlyHint: false, destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Building ID' },
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
    case 'io_list_buildings': {
      const { search, limit, startAt, orderBy, orderByType } = args as {
        search?: string; limit?: number; startAt?: number; orderBy?: string; orderByType?: string;
      };
      const qs = buildQueryString({ search, limit, startAt, orderBy, orderByType });
      const data = await client.request('GET', `/buildings${qs}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_get_building': {
      const { id } = args as { id: number };
      const data = await client.request('GET', `/buildings/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_create_building': {
      const { id: _id, ...body } = args as Record<string, unknown>;
      const data = await client.request('POST', '/buildings', body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_update_building': {
      const { id, ...body } = args as { id: number } & Record<string, unknown>;
      const data = await client.request('PUT', `/buildings/${id}`, body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_delete_building': {
      const { id } = args as { id: number };
      const data = await client.request('DELETE', `/buildings/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
