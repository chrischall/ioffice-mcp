import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString, optionalBody } from '../client.js';
import { textResult } from '@chrischall/mcp-utils';
import { previewUnlessConfirmed, schemaConfirm } from './_confirm.js';

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
    return textResult(data);
  });

  server.registerTool('io_get_maintenance_request', {
    description: 'Get a single iOffice maintenance request by ID.',
    inputSchema: {
      id: z.number().describe('Maintenance request ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ id }) => {
    const data = await client.request('GET', `/maintenanceRequests/${id}`);
    return textResult(data);
  });

  server.registerTool('io_create_maintenance_request', {
    description: 'Create a new iOffice maintenance request. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      title: z.string().describe('Request title/summary'),
      description: z.string().describe('Detailed description of the issue').optional(),
      spaceId: z.number().describe('Space/room ID where the issue is located').optional(),
      buildingId: z.number().describe('Building ID where the issue is located').optional(),
      priorityId: z.number().describe('Priority level ID').optional(),
      typeId: z.number().describe('Maintenance type/category ID').optional(),
      assignedUserId: z.number().describe('Technician user ID to assign').optional(),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ confirm, ...args }) => {
    const gate = previewUnlessConfirmed(confirm, 'Create iOffice maintenance request', 'POST', '/maintenanceRequests', args);
    if (gate) return gate;
    const data = await client.request('POST', '/maintenanceRequests', args);
    return textResult(data);
  });

  server.registerTool('io_update_maintenance_request', {
    description: 'Update an existing iOffice maintenance request. Only provide fields to change. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      id: z.number().describe('Maintenance request ID'),
      title: z.string().describe('Request title/summary').optional(),
      description: z.string().describe('Detailed description').optional(),
      priorityId: z.number().describe('Priority level ID').optional(),
      assignedUserId: z.number().describe('Assigned technician user ID').optional(),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id, confirm, ...body }) => {
    const gate = previewUnlessConfirmed(confirm, `Update iOffice maintenance request ${id}`, 'PUT', `/maintenanceRequests/${id}`, body);
    if (gate) return gate;
    const data = await client.request('PUT', `/maintenanceRequests/${id}`, body);
    return textResult(data);
  });

  server.registerTool('io_accept_maintenance_request', {
    description: 'Accept an iOffice maintenance request (transition from pending to accepted). Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      id: z.number().describe('Maintenance request ID'),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id, confirm }) => {
    const gate = previewUnlessConfirmed(confirm, `Accept iOffice maintenance request ${id}`, 'POST', `/maintenanceRequests/${id}/accept`);
    if (gate) return gate;
    const data = await client.request('POST', `/maintenanceRequests/${id}/accept`);
    return textResult(data);
  });

  server.registerTool('io_start_maintenance_request', {
    description: 'Start work on an iOffice maintenance request (transition to started/in-progress). Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      id: z.number().describe('Maintenance request ID'),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id, confirm }) => {
    const gate = previewUnlessConfirmed(confirm, `Start iOffice maintenance request ${id}`, 'POST', `/maintenanceRequests/${id}/start`);
    if (gate) return gate;
    const data = await client.request('POST', `/maintenanceRequests/${id}/start`);
    return textResult(data);
  });

  server.registerTool('io_complete_maintenance_request', {
    description: 'Mark an iOffice maintenance request as complete. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      id: z.number().describe('Maintenance request ID'),
      resolution: z.string().describe('Resolution notes describing what was done').optional(),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id, confirm, resolution }) => {
    const body = optionalBody({ resolution }, ['resolution']);
    const gate = previewUnlessConfirmed(confirm, `Complete iOffice maintenance request ${id}`, 'POST', `/maintenanceRequests/${id}/complete`, body);
    if (gate) return gate;
    const data = await client.request('POST', `/maintenanceRequests/${id}/complete`, body);
    return textResult(data);
  });

  server.registerTool('io_archive_maintenance_request', {
    description: 'Archive a completed iOffice maintenance request. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      id: z.number().describe('Maintenance request ID'),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id, confirm }) => {
    const gate = previewUnlessConfirmed(confirm, `Archive iOffice maintenance request ${id}`, 'POST', `/maintenanceRequests/${id}/archive`);
    if (gate) return gate;
    const data = await client.request('POST', `/maintenanceRequests/${id}/archive`);
    return textResult(data);
  });
}
