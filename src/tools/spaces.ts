import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';

export function registerSpaceTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool('io_list_spaces', {
    description: 'List iOffice spaces (rooms). Optionally filter by floor ID.',
    inputSchema: {
      floorId: z.number().describe('Filter spaces by floor ID').optional(),
      search: z.string().describe('Filter by name or description').optional(),
      limit: z.number().describe('Max results (default 50, max 100)').optional(),
      startAt: z.number().describe('Pagination offset (default 0)').optional(),
      orderBy: z.string().describe('Property to sort by (default: id)').optional(),
      orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
    },
    annotations: { readOnlyHint: true },
  }, async ({ floorId, search, limit, startAt, orderBy, orderByType }) => {
    const qs = buildQueryString({ search, limit, startAt, orderBy, orderByType });
    const path = floorId ? `/floors/${floorId}/spaces${qs}` : `/spaces${qs}`;
    const data = await client.request('GET', path);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_get_space', {
    description: 'Get a single iOffice space (room) by ID.',
    inputSchema: {
      id: z.number().describe('Space ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ id }) => {
    const data = await client.request('GET', `/spaces/${id}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_create_space', {
    description: 'Create a new iOffice space (room) on a floor.',
    inputSchema: {
      name: z.string().describe('Space name'),
      floorId: z.number().describe('Floor ID this space belongs to'),
      description: z.string().describe('Space description').optional(),
      capacity: z.number().describe('Maximum occupancy').optional(),
      squareFootage: z.number().describe('Square footage of the space').optional(),
      typeId: z.number().describe('Space type ID').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async (args) => {
    const data = await client.request('POST', '/spaces', args);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_update_space', {
    description: 'Update an existing iOffice space. Only provide fields to change.',
    inputSchema: {
      id: z.number().describe('Space ID'),
      name: z.string().describe('Space name').optional(),
      description: z.string().describe('Space description').optional(),
      capacity: z.number().describe('Maximum occupancy').optional(),
      squareFootage: z.number().describe('Square footage').optional(),
      typeId: z.number().describe('Space type ID').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id, ...body }) => {
    const data = await client.request('PUT', `/spaces/${id}`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_delete_space', {
    description: 'Delete an iOffice space by ID.',
    inputSchema: {
      id: z.number().describe('Space ID'),
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id }) => {
    const data = await client.request('DELETE', `/spaces/${id}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });
}
