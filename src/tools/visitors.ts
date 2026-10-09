import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import type { IOfficeClient } from '../client.js';
import { buildQueryString } from '../client.js';
import { minifiedResult } from '@chrischall/mcp-utils';
import { viewArg, viewResponse } from '../view.js';
import {
  CONFIRM_DESCRIPTION,
  CONFIRM_PREVIEW,
  confirmTokenParam,
  confirmWrite,
  readWriteSubject,
  subjectSummary,
} from './_confirm.js';
import { ADVANCE, CREATE_PERMANENT, READ, UPDATE } from './_annotations.js';
import { requireUpdateFields } from './_inputs.js';

export function registerVisitorTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool(
    'io_list_visitors',
    {
      description: 'List iOffice visitors. Supports search, date filtering, and pagination.',
      inputSchema: z.object({
        view: viewArg(),
        search: z.string().describe('Filter by visitor name or email').optional(),
        startDate: z
          .string()
          .describe('Filter visitors expected on or after this date (ISO 8601)')
          .optional(),
        endDate: z
          .string()
          .describe('Filter visitors expected on or before this date (ISO 8601)')
          .optional(),
        buildingId: z.number().int().positive().describe('Filter by building ID').optional(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .describe('Max results (default 50, max 100)')
          .optional(),
        startAt: z.number().int().min(0).describe('Pagination offset (default 0)').optional(),
        orderBy: z.string().describe('Property to sort by (default: id)').optional(),
        orderByType: z.enum(['asc', 'desc']).describe('Sort direction (default: asc)').optional(),
      }),
      annotations: READ,
    },
    async ({
      search,
      startDate,
      endDate,
      buildingId,
      limit,
      startAt,
      orderBy,
      orderByType,
      view,
    }) => {
      const qs = buildQueryString({
        search,
        startDate,
        endDate,
        buildingId,
        limit,
        startAt,
        orderBy,
        orderByType,
      });
      const data = await client.request('GET', `/visitors${qs}`);
      return viewResponse(view, data);
    },
  );

  server.registerTool(
    'io_get_visitor',
    {
      description: 'Get a single iOffice visitor by ID.',
      inputSchema: z.object({
        view: viewArg(),
        id: z.number().int().positive().describe('Visitor ID'),
      }),
      annotations: READ,
    },
    async ({ id, view }) => {
      const data = await client.request('GET', `/visitors/${id}`);
      return viewResponse(view, data);
    },
  );

  server.registerTool(
    'io_create_visitor',
    {
      description: 'Pre-register a visitor in iOffice. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        firstName: z.string().describe('Visitor first name'),
        lastName: z.string().describe('Visitor last name'),
        email: z.string().describe('Visitor email address').optional(),
        company: z.string().describe('Visitor company/organization').optional(),
        phone: z.string().describe('Visitor phone number').optional(),
        hostId: z
          .number()
          .int()
          .positive()
          .describe('Host user ID (iOffice user they are visiting)')
          .optional(),
        buildingId: z.number().int().positive().describe('Building ID for the visit').optional(),
        expectedArrival: z.string().describe('Expected arrival date/time (ISO 8601)').optional(),
        expectedDeparture: z
          .string()
          .describe('Expected departure date/time (ISO 8601)')
          .optional(),
        purpose: z.string().describe('Purpose of visit').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: CREATE_PERMANENT,
    },
    async ({ confirmToken, ...args }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_create_visitor',
        action: 'visitor.create',
        summary: 'Create iOffice visitor',
        account: undefined,
        request: { method: 'POST', path: '/visitors', body: args },
        preview: CONFIRM_PREVIEW,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', '/visitors', args);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_update_visitor',
    {
      description:
        'Update an existing iOffice visitor record. Only provide fields to change. ' +
        CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().int().positive().describe('Visitor ID'),
        firstName: z.string().describe('Visitor first name').optional(),
        lastName: z.string().describe('Visitor last name').optional(),
        email: z.string().describe('Visitor email address').optional(),
        company: z.string().describe('Visitor company/organization').optional(),
        phone: z.string().describe('Visitor phone number').optional(),
        expectedArrival: z.string().describe('Expected arrival date/time (ISO 8601)').optional(),
        expectedDeparture: z
          .string()
          .describe('Expected departure date/time (ISO 8601)')
          .optional(),
        purpose: z.string().describe('Purpose of visit').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: UPDATE,
    },
    async ({ id, confirmToken, ...body }, ctx) => {
      requireUpdateFields(body);
      const subject = await readWriteSubject(client, `/visitors/${id}`);
      const gate = await confirmWrite(ctx, {
        tool: 'io_update_visitor',
        action: 'visitor.update',
        summary: subjectSummary('Update iOffice visitor', id, subject),
        account: undefined,
        request: { method: 'PUT', path: `/visitors/${id}`, body },
        target: id,
        revision: subject.revision,
        preview: { ...CONFIRM_PREVIEW, current: subject.current },
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('PUT', `/visitors/${id}`, body);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_checkin_visitor',
    {
      description: 'Check in a visitor upon arrival at the building. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().int().positive().describe('Visitor ID'),
        confirmToken: confirmTokenParam,
      }),
      annotations: ADVANCE,
    },
    async ({ id, confirmToken }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_checkin_visitor',
        action: 'visitor.checkin',
        summary: `Check in iOffice visitor ${id}`,
        account: undefined,
        request: { method: 'POST', path: `/visitors/${id}/checkIn` },
        target: id,
        preview: CONFIRM_PREVIEW,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', `/visitors/${id}/checkIn`);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_checkout_visitor',
    {
      description: 'Check out a visitor upon departure from the building. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().int().positive().describe('Visitor ID'),
        confirmToken: confirmTokenParam,
      }),
      annotations: ADVANCE,
    },
    async ({ id, confirmToken }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_checkout_visitor',
        action: 'visitor.checkout',
        summary: `Check out iOffice visitor ${id}`,
        account: undefined,
        request: { method: 'POST', path: `/visitors/${id}/checkOut` },
        target: id,
        preview: CONFIRM_PREVIEW,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', `/visitors/${id}/checkOut`);
      return minifiedResult(data);
    },
  );
}
