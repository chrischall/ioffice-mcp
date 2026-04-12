import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';

export function registerMaintenanceTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool('io_list_maintenance_requests', {
    description: 'List iOffice maintenance requests. Supports filtering by status, space, or building.',
    inputSchema: {
      search: z.string().describe('Filter by title or description').optional(),
      status: z.string().describe('Filter by status (e.g. pending, accepted, started, completed, archived)').optional(),
      spaceId: z.number().describe('Filter by space/room ID').optional(),
      buildingId: z.number().describe('Filter by building ID').optional(),
      assignedUserId: z.number().describe('Filter by assigned technician user ID').optional(),
      limit: z.number().describe('Max results (default 50, max 100)').optional(),
      startAt: z.number().describe('Pagination offset (default 0)').optional(),
      orderBy: z.string().describe('Property to sort by (default: id)').optional(),
      orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
    },
    annotations: { readOnlyHint: true },
  }, async ({ search, status, spaceId, buildingId, assignedUserId, limit, startAt, orderBy, orderByType }) => {
    const qs = buildQueryString({ search, status, spaceId, buildingId, assignedUserId, limit, startAt, orderBy, orderByType });
    const data = await client.request('GET', `/maintenanceRequests${qs}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_get_maintenance_request', {
    description: 'Get a single iOffice maintenance request by ID.',
    inputSchema: {
      id: z.number().describe('Maintenance request ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ id }) => {
    const data = await client.request('GET', `/maintenanceRequests/${id}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_create_maintenance_request', {
    description: 'Create a new iOffice maintenance request.',
    inputSchema: {
      title: z.string().describe('Request title/summary'),
      description: z.string().describe('Detailed description of the issue').optional(),
      spaceId: z.number().describe('Space/room ID where the issue is located').optional(),
      buildingId: z.number().describe('Building ID where the issue is located').optional(),
      priorityId: z.number().describe('Priority level ID').optional(),
      typeId: z.number().describe('Maintenance type/category ID').optional(),
      assignedUserId: z.number().describe('Technician user ID to assign').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async (args) => {
    const data = await client.request('POST', '/maintenanceRequests', args);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_update_maintenance_request', {
    description: 'Update an existing iOffice maintenance request. Only provide fields to change.',
    inputSchema: {
      id: z.number().describe('Maintenance request ID'),
      title: z.string().describe('Request title/summary').optional(),
      description: z.string().describe('Detailed description').optional(),
      priorityId: z.number().describe('Priority level ID').optional(),
      assignedUserId: z.number().describe('Assigned technician user ID').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id, ...body }) => {
    const data = await client.request('PUT', `/maintenanceRequests/${id}`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_accept_maintenance_request', {
    description: 'Accept an iOffice maintenance request (transition from pending to accepted).',
    inputSchema: {
      id: z.number().describe('Maintenance request ID'),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id }) => {
    const data = await client.request('POST', `/maintenanceRequests/${id}/accept`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_start_maintenance_request', {
    description: 'Start work on an iOffice maintenance request (transition to started/in-progress).',
    inputSchema: {
      id: z.number().describe('Maintenance request ID'),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id }) => {
    const data = await client.request('POST', `/maintenanceRequests/${id}/start`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_complete_maintenance_request', {
    description: 'Mark an iOffice maintenance request as complete.',
    inputSchema: {
      id: z.number().describe('Maintenance request ID'),
      resolution: z.string().describe('Resolution notes describing what was done').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id, resolution }) => {
    const body = resolution !== undefined ? { resolution } : undefined;
    const data = await client.request('POST', `/maintenanceRequests/${id}/complete`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_archive_maintenance_request', {
    description: 'Archive a completed iOffice maintenance request.',
    inputSchema: {
      id: z.number().describe('Maintenance request ID'),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id }) => {
    const data = await client.request('POST', `/maintenanceRequests/${id}/archive`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });
}
