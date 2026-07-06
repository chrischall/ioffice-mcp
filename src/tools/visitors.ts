import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';
import { textResult } from '@chrischall/mcp-utils';
import { previewUnlessConfirmed, schemaConfirm } from './_confirm.js';

export function registerVisitorTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool('io_list_visitors', {
    description: 'List iOffice visitors. Supports search, date filtering, and pagination.',
    inputSchema: {
      search: z.string().describe('Filter by visitor name or email').optional(),
      startDate: z.string().describe('Filter visitors expected on or after this date (ISO 8601)').optional(),
      endDate: z.string().describe('Filter visitors expected on or before this date (ISO 8601)').optional(),
      buildingId: z.number().describe('Filter by building ID').optional(),
      limit: z.number().describe('Max results (default 50, max 100)').optional(),
      startAt: z.number().describe('Pagination offset (default 0)').optional(),
      orderBy: z.string().describe('Property to sort by (default: id)').optional(),
      orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
    },
    annotations: { readOnlyHint: true },
  }, async ({ search, startDate, endDate, buildingId, limit, startAt, orderBy, orderByType }) => {
    const qs = buildQueryString({ search, startDate, endDate, buildingId, limit, startAt, orderBy, orderByType });
    const data = await client.request('GET', `/visitors${qs}`);
    return textResult(data);
  });

  server.registerTool('io_get_visitor', {
    description: 'Get a single iOffice visitor by ID.',
    inputSchema: {
      id: z.number().describe('Visitor ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ id }) => {
    const data = await client.request('GET', `/visitors/${id}`);
    return textResult(data);
  });

  server.registerTool('io_create_visitor', {
    description: 'Pre-register a visitor in iOffice. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      firstName: z.string().describe('Visitor first name'),
      lastName: z.string().describe('Visitor last name'),
      email: z.string().describe('Visitor email address').optional(),
      company: z.string().describe('Visitor company/organization').optional(),
      phone: z.string().describe('Visitor phone number').optional(),
      hostId: z.number().describe('Host user ID (iOffice user they are visiting)').optional(),
      buildingId: z.number().describe('Building ID for the visit').optional(),
      expectedArrival: z.string().describe('Expected arrival date/time (ISO 8601)').optional(),
      expectedDeparture: z.string().describe('Expected departure date/time (ISO 8601)').optional(),
      purpose: z.string().describe('Purpose of visit').optional(),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ confirm, ...args }) => {
    const gate = previewUnlessConfirmed(confirm, 'Create iOffice visitor', 'POST', '/visitors', args);
    if (gate) return gate;
    const data = await client.request('POST', '/visitors', args);
    return textResult(data);
  });

  server.registerTool('io_update_visitor', {
    description: 'Update an existing iOffice visitor record. Only provide fields to change. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      id: z.number().describe('Visitor ID'),
      firstName: z.string().describe('Visitor first name').optional(),
      lastName: z.string().describe('Visitor last name').optional(),
      email: z.string().describe('Visitor email address').optional(),
      company: z.string().describe('Visitor company/organization').optional(),
      phone: z.string().describe('Visitor phone number').optional(),
      expectedArrival: z.string().describe('Expected arrival date/time (ISO 8601)').optional(),
      expectedDeparture: z.string().describe('Expected departure date/time (ISO 8601)').optional(),
      purpose: z.string().describe('Purpose of visit').optional(),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id, confirm, ...body }) => {
    const gate = previewUnlessConfirmed(confirm, `Update iOffice visitor ${id}`, 'PUT', `/visitors/${id}`, body);
    if (gate) return gate;
    const data = await client.request('PUT', `/visitors/${id}`, body);
    return textResult(data);
  });

  server.registerTool('io_checkin_visitor', {
    description: 'Check in a visitor upon arrival at the building. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      id: z.number().describe('Visitor ID'),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id, confirm }) => {
    const gate = previewUnlessConfirmed(confirm, `Check in iOffice visitor ${id}`, 'POST', `/visitors/${id}/checkIn`);
    if (gate) return gate;
    const data = await client.request('POST', `/visitors/${id}/checkIn`);
    return textResult(data);
  });

  server.registerTool('io_checkout_visitor', {
    description: 'Check out a visitor upon departure from the building. Without confirm:true this returns a dry-run preview and makes NO network call; with confirm:true it executes.',
    inputSchema: {
      id: z.number().describe('Visitor ID'),
      confirm: schemaConfirm,
    },
    annotations: { readOnlyHint: false, destructiveHint: true },
  }, async ({ id, confirm }) => {
    const gate = previewUnlessConfirmed(confirm, `Check out iOffice visitor ${id}`, 'POST', `/visitors/${id}/checkOut`);
    if (gate) return gate;
    const data = await client.request('POST', `/visitors/${id}/checkOut`);
    return textResult(data);
  });
}
