import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';

export function registerReservationTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool('io_list_reservations', {
    description: 'List iOffice reservations. Supports filtering by date range, space, or user.',
    inputSchema: {
      search: z.string().describe('Filter by title or description').optional(),
      startDate: z.string().describe('Filter reservations starting on or after this date (ISO 8601)').optional(),
      endDate: z.string().describe('Filter reservations ending on or before this date (ISO 8601)').optional(),
      spaceId: z.number().describe('Filter by space/room ID').optional(),
      userId: z.number().describe('Filter by organizer user ID').optional(),
      limit: z.number().describe('Max results (default 50, max 100)').optional(),
      startAt: z.number().describe('Pagination offset (default 0)').optional(),
      orderBy: z.string().describe('Property to sort by (default: id)').optional(),
      orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
    },
    annotations: { readOnlyHint: true },
  }, async ({ search, startDate, endDate, spaceId, userId, limit, startAt, orderBy, orderByType }) => {
    const qs = buildQueryString({ search, startDate, endDate, spaceId, userId, limit, startAt, orderBy, orderByType });
    const data = await client.request('GET', `/reservations${qs}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_get_reservation', {
    description: 'Get a single iOffice reservation by ID.',
    inputSchema: {
      id: z.number().describe('Reservation ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ id }) => {
    const data = await client.request('GET', `/reservations/${id}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_create_reservation', {
    description: 'Create a new iOffice room/space reservation.',
    inputSchema: {
      title: z.string().describe('Reservation title/name'),
      spaceId: z.number().describe('Space/room ID to reserve'),
      startDate: z.string().describe('Start date/time (ISO 8601, e.g. 2026-03-20T09:00:00)'),
      endDate: z.string().describe('End date/time (ISO 8601, e.g. 2026-03-20T10:00:00)'),
      description: z.string().describe('Reservation notes or description').optional(),
      attendeeCount: z.number().describe('Expected number of attendees').optional(),
      userId: z.number().describe('Organizer user ID (defaults to authenticated user)').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async (args) => {
    const data = await client.request('POST', '/reservations', args);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_update_reservation', {
    description: 'Update an existing iOffice reservation. Only provide fields to change.',
    inputSchema: {
      id: z.number().describe('Reservation ID'),
      title: z.string().describe('Reservation title').optional(),
      startDate: z.string().describe('New start date/time (ISO 8601)').optional(),
      endDate: z.string().describe('New end date/time (ISO 8601)').optional(),
      description: z.string().describe('Notes or description').optional(),
      attendeeCount: z.number().describe('Expected number of attendees').optional(),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id, ...body }) => {
    const data = await client.request('PUT', `/reservations/${id}`, body);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_delete_reservation', {
    description: 'Delete/cancel an iOffice reservation by ID.',
    inputSchema: {
      id: z.number().describe('Reservation ID'),
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id }) => {
    const data = await client.request('DELETE', `/reservations/${id}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_checkin_reservation', {
    description: 'Check in to an iOffice reservation, confirming room usage.',
    inputSchema: {
      id: z.number().describe('Reservation ID'),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id }) => {
    const data = await client.request('POST', `/reservations/${id}/checkIn`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('io_checkout_reservation', {
    description: 'Check out of an iOffice reservation, releasing the room early if needed.',
    inputSchema: {
      id: z.number().describe('Reservation ID'),
    },
    annotations: { readOnlyHint: false },
  }, async ({ id }) => {
    const data = await client.request('POST', `/reservations/${id}/checkOut`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });
}
