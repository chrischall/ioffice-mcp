import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import type { IOfficeClient } from '../client.js';
import { buildQueryString, optionalBody } from '../client.js';
import { minifiedResult } from '@chrischall/mcp-utils';
import { viewArg, viewResponse } from '../view.js';
import { CONFIRM_DESCRIPTION, confirmTokenParam, confirmWrite } from './_confirm.js';

export function registerMaintenanceTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool(
    'io_list_maintenance_requests',
    {
      description:
        'List iOffice maintenance requests. Supports filtering by status, space, or building.',
      inputSchema: z.object({
        view: viewArg(),
        search: z.string().describe('Filter by title or description').optional(),
        status: z
          .string()
          .describe('Filter by status (e.g. pending, accepted, started, completed, archived)')
          .optional(),
        spaceId: z.number().describe('Filter by space/room ID').optional(),
        buildingId: z.number().describe('Filter by building ID').optional(),
        assignedUserId: z.number().describe('Filter by assigned technician user ID').optional(),
        limit: z.number().describe('Max results (default 50, max 100)').optional(),
        startAt: z.number().describe('Pagination offset (default 0)').optional(),
        orderBy: z.string().describe('Property to sort by (default: id)').optional(),
        orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({
      search,
      status,
      spaceId,
      buildingId,
      assignedUserId,
      limit,
      startAt,
      orderBy,
      orderByType,
      view,
    }) => {
      const qs = buildQueryString({
        search,
        status,
        spaceId,
        buildingId,
        assignedUserId,
        limit,
        startAt,
        orderBy,
        orderByType,
      });
      const data = await client.request('GET', `/maintenanceRequests${qs}`);
      return viewResponse(view, data);
    },
  );

  server.registerTool(
    'io_get_maintenance_request',
    {
      description: 'Get a single iOffice maintenance request by ID.',
      inputSchema: z.object({
        view: viewArg(),
        id: z.number().describe('Maintenance request ID'),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ id, view }) => {
      const data = await client.request('GET', `/maintenanceRequests/${id}`);
      return viewResponse(view, data);
    },
  );

  server.registerTool(
    'io_create_maintenance_request',
    {
      description: 'Create a new iOffice maintenance request. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        title: z.string().describe('Request title/summary'),
        description: z.string().describe('Detailed description of the issue').optional(),
        spaceId: z.number().describe('Space/room ID where the issue is located').optional(),
        buildingId: z.number().describe('Building ID where the issue is located').optional(),
        priorityId: z.number().describe('Priority level ID').optional(),
        typeId: z.number().describe('Maintenance type/category ID').optional(),
        assignedUserId: z.number().describe('Technician user ID to assign').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ confirmToken, ...args }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_create_maintenance_request',
        action: 'maintenance_request.create',
        summary: 'Create iOffice maintenance request',
        method: 'POST',
        path: '/maintenanceRequests',
        body: args,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', '/maintenanceRequests', args);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_update_maintenance_request',
    {
      description:
        'Update an existing iOffice maintenance request. Only provide fields to change. ' +
        CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().describe('Maintenance request ID'),
        title: z.string().describe('Request title/summary').optional(),
        description: z.string().describe('Detailed description').optional(),
        priorityId: z.number().describe('Priority level ID').optional(),
        assignedUserId: z.number().describe('Assigned technician user ID').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id, confirmToken, ...body }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_update_maintenance_request',
        action: 'maintenance_request.update',
        summary: `Update iOffice maintenance request ${id}`,
        method: 'PUT',
        path: `/maintenanceRequests/${id}`,
        body: body,
        target: id,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('PUT', `/maintenanceRequests/${id}`, body);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_accept_maintenance_request',
    {
      description:
        'Accept an iOffice maintenance request (transition from pending to accepted). ' +
        CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().describe('Maintenance request ID'),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id, confirmToken }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_accept_maintenance_request',
        action: 'maintenance_request.accept',
        summary: `Accept iOffice maintenance request ${id}`,
        method: 'POST',
        path: `/maintenanceRequests/${id}/accept`,
        target: id,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', `/maintenanceRequests/${id}/accept`);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_start_maintenance_request',
    {
      description:
        'Start work on an iOffice maintenance request (transition to started/in-progress). ' +
        CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().describe('Maintenance request ID'),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id, confirmToken }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_start_maintenance_request',
        action: 'maintenance_request.start',
        summary: `Start iOffice maintenance request ${id}`,
        method: 'POST',
        path: `/maintenanceRequests/${id}/start`,
        target: id,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', `/maintenanceRequests/${id}/start`);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_complete_maintenance_request',
    {
      description: 'Mark an iOffice maintenance request as complete. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().describe('Maintenance request ID'),
        resolution: z.string().describe('Resolution notes describing what was done').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id, confirmToken, resolution }, ctx) => {
      const body = optionalBody({ resolution }, ['resolution']);
      const gate = await confirmWrite(ctx, {
        tool: 'io_complete_maintenance_request',
        action: 'maintenance_request.complete',
        summary: `Complete iOffice maintenance request ${id}`,
        method: 'POST',
        path: `/maintenanceRequests/${id}/complete`,
        body: body,
        target: id,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', `/maintenanceRequests/${id}/complete`, body);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_archive_maintenance_request',
    {
      description: 'Archive a completed iOffice maintenance request. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().describe('Maintenance request ID'),
        confirmToken: confirmTokenParam,
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async ({ id, confirmToken }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_archive_maintenance_request',
        action: 'maintenance_request.archive',
        summary: `Archive iOffice maintenance request ${id}`,
        method: 'POST',
        path: `/maintenanceRequests/${id}/archive`,
        target: id,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', `/maintenanceRequests/${id}/archive`);
      return minifiedResult(data);
    },
  );
}
