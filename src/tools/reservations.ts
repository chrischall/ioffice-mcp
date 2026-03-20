import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';

export const toolDefinitions: Tool[] = [
  {
    name: 'io_list_reservations',
    description: 'List iOffice reservations. Supports filtering by date range, space, or user.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Filter by title or description' },
        startDate: { type: 'string', description: 'Filter reservations starting on or after this date (ISO 8601)' },
        endDate: { type: 'string', description: 'Filter reservations ending on or before this date (ISO 8601)' },
        spaceId: { type: 'number', description: 'Filter by space/room ID' },
        userId: { type: 'number', description: 'Filter by organizer user ID' },
        limit: { type: 'number', description: 'Max results (default 50, max 100)' },
        startAt: { type: 'number', description: 'Pagination offset (default 0)' },
        orderBy: { type: 'string', description: 'Property to sort by (default: id)' },
        orderByType: { type: 'string', enum: ['asc', 'desc'], description: 'Sort direction (default: asc)' },
      },
      required: [],
    },
  },
  {
    name: 'io_get_reservation',
    description: 'Get a single iOffice reservation by ID.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Reservation ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'io_create_reservation',
    description: 'Create a new iOffice room/space reservation.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Reservation title/name' },
        spaceId: { type: 'number', description: 'Space/room ID to reserve' },
        startDate: { type: 'string', description: 'Start date/time (ISO 8601, e.g. 2026-03-20T09:00:00)' },
        endDate: { type: 'string', description: 'End date/time (ISO 8601, e.g. 2026-03-20T10:00:00)' },
        description: { type: 'string', description: 'Reservation notes or description' },
        attendeeCount: { type: 'number', description: 'Expected number of attendees' },
        userId: { type: 'number', description: 'Organizer user ID (defaults to authenticated user)' },
      },
      required: ['title', 'spaceId', 'startDate', 'endDate'],
    },
  },
  {
    name: 'io_update_reservation',
    description: 'Update an existing iOffice reservation. Only provide fields to change.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Reservation ID' },
        title: { type: 'string', description: 'Reservation title' },
        startDate: { type: 'string', description: 'New start date/time (ISO 8601)' },
        endDate: { type: 'string', description: 'New end date/time (ISO 8601)' },
        description: { type: 'string', description: 'Notes or description' },
        attendeeCount: { type: 'number', description: 'Expected number of attendees' },
      },
      required: ['id'],
    },
  },
  {
    name: 'io_delete_reservation',
    description: 'Delete/cancel an iOffice reservation by ID.',
    annotations: { readOnlyHint: false, destructiveHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Reservation ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'io_checkin_reservation',
    description: 'Check in to an iOffice reservation, confirming room usage.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Reservation ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'io_checkout_reservation',
    description: 'Check out of an iOffice reservation, releasing the room early if needed.',
    annotations: { readOnlyHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Reservation ID' },
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
    case 'io_list_reservations': {
      const { search, startDate, endDate, spaceId, userId, limit, startAt, orderBy, orderByType } = args as {
        search?: string; startDate?: string; endDate?: string; spaceId?: number; userId?: number;
        limit?: number; startAt?: number; orderBy?: string; orderByType?: string;
      };
      const qs = buildQueryString({ search, startDate, endDate, spaceId, userId, limit, startAt, orderBy, orderByType });
      const data = await client.request('GET', `/reservations${qs}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_get_reservation': {
      const { id } = args as { id: number };
      const data = await client.request('GET', `/reservations/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_create_reservation': {
      const data = await client.request('POST', '/reservations', args);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_update_reservation': {
      const { id, ...body } = args as { id: number } & Record<string, unknown>;
      const data = await client.request('PUT', `/reservations/${id}`, body);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_delete_reservation': {
      const { id } = args as { id: number };
      const data = await client.request('DELETE', `/reservations/${id}`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_checkin_reservation': {
      const { id } = args as { id: number };
      const data = await client.request('POST', `/reservations/${id}/checkIn`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    case 'io_checkout_reservation': {
      const { id } = args as { id: number };
      const data = await client.request('POST', `/reservations/${id}/checkOut`);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
