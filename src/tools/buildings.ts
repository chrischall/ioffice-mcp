import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';

export function registerBuildingTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool('io_list_buildings', {
    description: 'List iOffice buildings. Supports search, pagination, and sorting.',
    inputSchema: {
      search: z.string().describe('Filter by name or description').optional(),
      limit: z.number().describe('Max results (default 50, max 100)').optional(),
      startAt: z.number().describe('Pagination offset (default 0)').optional(),
      orderBy: z.string().describe('Property to sort by (default: id)').optional(),
      orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
    },
    annotations: { readOnlyHint: true },
  }, async ({ search, limit, startAt, orderBy, orderByType }) => {
    const qs = buildQueryString({ search, limit, startAt, orderBy, orderByType });
    const data = await client.request('GET', `/buildings${qs}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_get_building', {
    description: 'Get a single iOffice building by ID.',
    inputSchema: {
      id: z.number().describe('Building ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ id }) => {
    const data = await client.request('GET', `/buildings/${id}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_create_building', {
    description: 'Create a new iOffice building.',
    inputSchema: {
      name: z.string().describe('Building name'),
      description: z.string().describe('Building description').optional(),
      address1: z.string().describe('Street address line 1').optional(),
      address2: z.string().describe('Street address line 2').optional(),
      city: z.string().describe('City').optional(),
      state: z.string().describe('State or province').optional(),
      postalCode: z.string().describe('Postal/ZIP code').optional(),
      country: z.string().describe('Country code').optional(),
      phone: z.string().describe('Building phone number').optional(),
      totalSquareFootage: z.number().describe('Total square footage').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async (args) => {
    const data = await client.request('POST', '/buildings', args);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_update_building', {
    description: 'Update an existing iOffice building. Only provide fields to change.',
    inputSchema: {
      id: z.number().describe('Building ID'),
      name: z.string().describe('Building name').optional(),
      description: z.string().describe('Building description').optional(),
      address1: z.string().describe('Street address line 1').optional(),
      address2: z.string().describe('Street address line 2').optional(),
      city: z.string().describe('City').optional(),
      state: z.string().describe('State or province').optional(),
      postalCode: z.string().describe('Postal/ZIP code').optional(),
      country: z.string().describe('Country code').optional(),
      phone: z.string().describe('Building phone number').optional(),
      totalSquareFootage: z.number().describe('Total square footage').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id, ...body }) => {
    const data = await client.request('PUT', `/buildings/${id}`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_delete_building', {
    description: 'Delete an iOffice building by ID.',
    inputSchema: {
      id: z.number().describe('Building ID'),
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id }) => {
    const data = await client.request('DELETE', `/buildings/${id}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });
}
