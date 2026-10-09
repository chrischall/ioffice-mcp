import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';
import type { IOfficeClient } from '../client.js';
import { buildQueryString, optionalBody } from '../client.js';
import { minifiedResult } from '@chrischall/mcp-utils';
import { viewArg, viewResponse } from '../view.js';
import {
  CONFIRM_DESCRIPTION,
  CONFIRM_PREVIEW,
  confirmTokenParam,
  confirmWrite,
} from './_confirm.js';
import { ADVANCE, CREATE, READ, TERMINATE } from './_annotations.js';

export function registerMailTools(server: McpServer, client: IOfficeClient): void {
  server.registerTool(
    'io_list_mail',
    {
      description:
        'List iOffice mail items (packages and letters). Supports filtering and pagination.',
      inputSchema: z.object({
        view: viewArg(),
        search: z
          .string()
          .describe('Filter by recipient name, tracking number, or sender')
          .optional(),
        status: z
          .string()
          .describe('Filter by status (e.g. received, delivered, returned)')
          .optional(),
        buildingId: z.number().int().positive().describe('Filter by building ID').optional(),
        recipientId: z.number().int().positive().describe('Filter by recipient user ID').optional(),
        startDate: z
          .string()
          .describe('Filter mail received on or after this date (ISO 8601)')
          .optional(),
        endDate: z
          .string()
          .describe('Filter mail received on or before this date (ISO 8601)')
          .optional(),
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
      status,
      buildingId,
      recipientId,
      startDate,
      endDate,
      limit,
      startAt,
      orderBy,
      orderByType,
      view,
    }) => {
      const qs = buildQueryString({
        search,
        status,
        buildingId,
        recipientId,
        startDate,
        endDate,
        limit,
        startAt,
        orderBy,
        orderByType,
      });
      const data = await client.request('GET', `/mail${qs}`);
      return viewResponse(view, data);
    },
  );

  server.registerTool(
    'io_get_mail',
    {
      description: 'Get a single iOffice mail item by ID.',
      inputSchema: z.object({
        view: viewArg(),
        id: z.number().int().positive().describe('Mail item ID'),
      }),
      annotations: READ,
    },
    async ({ id, view }) => {
      const data = await client.request('GET', `/mail/${id}`);
      return viewResponse(view, data);
    },
  );

  server.registerTool(
    'io_create_mail',
    {
      description:
        'Log a new mail item (package or letter) received in iOffice. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        recipientId: z.number().int().positive().describe('Recipient user ID'),
        buildingId: z.number().int().positive().describe('Building where mail was received'),
        trackingNumber: z.string().describe('Package tracking number').optional(),
        carrier: z.string().describe('Shipping carrier (e.g. UPS, FedEx, USPS)').optional(),
        description: z.string().describe('Description of the mail item').optional(),
        mailTypeId: z.number().int().positive().describe('Mail type ID').optional(),
        receivedDate: z
          .string()
          .describe('Date/time received (ISO 8601, defaults to now)')
          .optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: CREATE,
    },
    async ({ confirmToken, ...args }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'io_create_mail',
        action: 'mail.create',
        summary: 'Create iOffice mail item',
        account: undefined,
        request: { method: 'POST', path: '/mail', body: args },
        preview: CONFIRM_PREVIEW,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', '/mail', args);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_deliver_mail',
    {
      description:
        'Mark an iOffice mail item as delivered to the recipient. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().int().positive().describe('Mail item ID'),
        deliveredDate: z
          .string()
          .describe('Delivery date/time (ISO 8601, defaults to now)')
          .optional(),
        signature: z.string().describe('Recipient signature or name confirmation').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: ADVANCE,
    },
    async ({ id, confirmToken, deliveredDate, signature }, ctx) => {
      const body = optionalBody({ deliveredDate, signature }, ['deliveredDate', 'signature']);
      const gate = await confirmWrite(ctx, {
        tool: 'io_deliver_mail',
        action: 'mail.deliver',
        summary: `Deliver iOffice mail item ${id}`,
        account: undefined,
        request: { method: 'POST', path: `/mail/${id}/deliver`, body },
        target: id,
        preview: CONFIRM_PREVIEW,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', `/mail/${id}/deliver`, body);
      return minifiedResult(data);
    },
  );

  server.registerTool(
    'io_return_mail',
    {
      description: 'Mark an iOffice mail item as returned to sender. ' + CONFIRM_DESCRIPTION,
      inputSchema: z.object({
        id: z.number().int().positive().describe('Mail item ID'),
        reason: z.string().describe('Reason for return').optional(),
        confirmToken: confirmTokenParam,
      }),
      annotations: TERMINATE,
    },
    async ({ id, confirmToken, reason }, ctx) => {
      const body = optionalBody({ reason }, ['reason']);
      const gate = await confirmWrite(ctx, {
        tool: 'io_return_mail',
        action: 'mail.return',
        summary: `Return iOffice mail item ${id}`,
        account: undefined,
        request: { method: 'POST', path: `/mail/${id}/return`, body },
        target: id,
        preview: CONFIRM_PREVIEW,
        confirmToken,
      });
      if (gate) return gate;
      const data = await client.request('POST', `/mail/${id}/return`, body);
      return minifiedResult(data);
    },
  );
}
