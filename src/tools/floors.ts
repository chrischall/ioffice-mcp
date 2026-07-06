import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';
import { textResult } from '@chrischall/mcp-utils';
import { previewUnlessConfirmed, schemaConfirm } from './_confirm.js';

export function registerFloorTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool('io_list_floors', {
    description: 'List iOffice floors. Optionally filter by building ID.',
    inputSchema: {
      buildingId: z.number().describe('Filter floors by building ID').optional(),
      search: z.string().describe('Filter by name').optional(),
      limit: z.number().describe('Max results (default 50, max 100)').optional(),
      startAt: z.number().describe('Pagination offset (default 0)').optional(),
      orderBy: z.string().describe('Property to sort by (default: id)').optional(),
      orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
    },
    annotations: { readOnlyHint: true },
  }, async ({ buildingId, search, limit, startAt, orderBy, orderByType }) => {
    const qs = buildQueryString({ search, limit, startAt, orderBy, orderByType });
    const path = buildingId ? `/buildings/${buildingId}/floors${qs}` : `/floors${qs}`;
    const data = await client.request('GET', path);
    return textResult(data);
  });

  server.registerTool('io_get_floor', {
    description: 'Get a single iOffice floor by ID.',
    inputSchema: {
      id: z.number().describe('Floor ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ id }) => {
    const data = await client.request('GET', `/floors/${id}`);
    return textResult(data);
  });

  server.registerTool('io_create_floor', {
    description: 'Create a new iOffice floor within a building. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      name: z.string().describe('Floor name'),
      buildingId: z.number().describe('ID of the building this floor belongs to'),
      description: z.string().describe('Floor description').optional(),
      totalSquareFootage: z.number().describe('Total square footage of the floor').optional(),
      floorNumber: z.number().describe('Physical floor number').optional(),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ confirm, ...args }) => {
    const gate = previewUnlessConfirmed(confirm, 'Create iOffice floor', 'POST', '/floors', args);
    if (gate) return gate;
    const data = await client.request('POST', '/floors', args);
    return textResult(data);
  });

  server.registerTool('io_update_floor', {
    description: 'Update an existing iOffice floor. Only provide fields to change. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      id: z.number().describe('Floor ID'),
      name: z.string().describe('Floor name').optional(),
      description: z.string().describe('Floor description').optional(),
      totalSquareFootage: z.number().describe('Total square footage').optional(),
      floorNumber: z.number().describe('Physical floor number').optional(),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id, confirm, ...body }) => {
    const gate = previewUnlessConfirmed(confirm, `Update iOffice floor ${id}`, 'PUT', `/floors/${id}`, body);
    if (gate) return gate;
    const data = await client.request('PUT', `/floors/${id}`, body);
    return textResult(data);
  });

  server.registerTool('io_delete_floor', {
    description: 'Delete an iOffice floor by ID. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      id: z.number().describe('Floor ID'),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id, confirm }) => {
    const gate = previewUnlessConfirmed(confirm, `Delete iOffice floor ${id}`, 'DELETE', `/floors/${id}`);
    if (gate) return gate;
    const data = await client.request('DELETE', `/floors/${id}`);
    // iOffice DELETEs return 204 No Content; the client resolves that to
    // undefined, so synthesize a small success payload for the tool result.
    return textResult(data ?? { success: true });
  });
}
