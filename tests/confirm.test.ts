// The confirm gate on every iOffice write: a client that cannot be prompted gets a
// no-network preview and a single-use confirmToken bound to the exact request; one that
// can be prompted gets the real prompt. Asserted on what reaches the iOffice client.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createTestHarness,
  parseToolResult,
  type TestHarness,
  type TestHarnessOptions,
} from '@chrischall/mcp-utils/test';
import type { IOfficeClient } from '../src/client.js';
import { registerBuildingTools } from '../src/tools/buildings.js';
import { registerFloorTools } from '../src/tools/floors.js';
import { registerSpaceTools } from '../src/tools/spaces.js';
import { registerUserTools } from '../src/tools/users.js';
import { registerReservationTools } from '../src/tools/reservations.js';
import { registerVisitorTools } from '../src/tools/visitors.js';
import { registerMaintenanceTools } from '../src/tools/maintenance.js';
import { registerMailTools } from '../src/tools/mail.js';
import { registerMoveTools } from '../src/tools/moves.js';
import { CONFIRM_RULE } from '../src/tools/_confirm.js';

type Row = [
  tool: string,
  args: Record<string, unknown>,
  method: string,
  path: string,
  body?: unknown,
];

const WRITES: Row[] = [
  ['io_create_building', { name: 'HQ' }, 'POST', '/buildings', { name: 'HQ' }],
  ['io_update_building', { id: 1, city: 'Austin' }, 'PUT', '/buildings/1', { city: 'Austin' }],
  ['io_delete_building', { id: 1 }, 'DELETE', '/buildings/1'],
  [
    'io_create_floor',
    { name: 'L2', buildingId: 1 },
    'POST',
    '/floors',
    { name: 'L2', buildingId: 1 },
  ],
  ['io_update_floor', { id: 2, name: 'L3' }, 'PUT', '/floors/2', { name: 'L3' }],
  ['io_delete_floor', { id: 2 }, 'DELETE', '/floors/2'],
  ['io_create_space', { name: 'R1', floorId: 2 }, 'POST', '/spaces', { name: 'R1', floorId: 2 }],
  ['io_update_space', { id: 3, name: 'R2' }, 'PUT', '/spaces/3', { name: 'R2' }],
  ['io_delete_space', { id: 3 }, 'DELETE', '/spaces/3'],
  [
    'io_create_user',
    { firstName: 'A', lastName: 'B', email: 'a@b.c' },
    'POST',
    '/users',
    { firstName: 'A', lastName: 'B', email: 'a@b.c' },
  ],
  ['io_update_user', { id: 4, title: 'Eng' }, 'PUT', '/users/4', { title: 'Eng' }],
  ['io_delete_user', { id: 4 }, 'DELETE', '/users/4'],
  [
    'io_create_reservation',
    { title: 'Sync', spaceId: 3, startDate: '2026-03-20T09:00', endDate: '2026-03-20T10:00' },
    'POST',
    '/reservations',
    { title: 'Sync', spaceId: 3, startDate: '2026-03-20T09:00', endDate: '2026-03-20T10:00' },
  ],
  ['io_update_reservation', { id: 5, title: 'X' }, 'PUT', '/reservations/5', { title: 'X' }],
  ['io_delete_reservation', { id: 5 }, 'DELETE', '/reservations/5'],
  ['io_checkin_reservation', { id: 5 }, 'POST', '/reservations/5/checkIn'],
  ['io_checkout_reservation', { id: 5 }, 'POST', '/reservations/5/checkOut'],
  [
    'io_create_visitor',
    { firstName: 'V', lastName: 'W' },
    'POST',
    '/visitors',
    { firstName: 'V', lastName: 'W' },
  ],
  ['io_update_visitor', { id: 6, company: 'Co' }, 'PUT', '/visitors/6', { company: 'Co' }],
  ['io_checkin_visitor', { id: 6 }, 'POST', '/visitors/6/checkIn'],
  ['io_checkout_visitor', { id: 6 }, 'POST', '/visitors/6/checkOut'],
  [
    'io_create_maintenance_request',
    { title: 'Leak' },
    'POST',
    '/maintenanceRequests',
    { title: 'Leak' },
  ],
  [
    'io_update_maintenance_request',
    { id: 7, priorityId: 2 },
    'PUT',
    '/maintenanceRequests/7',
    { priorityId: 2 },
  ],
  ['io_accept_maintenance_request', { id: 7 }, 'POST', '/maintenanceRequests/7/accept'],
  ['io_start_maintenance_request', { id: 7 }, 'POST', '/maintenanceRequests/7/start'],
  [
    'io_complete_maintenance_request',
    { id: 7, resolution: 'Fixed' },
    'POST',
    '/maintenanceRequests/7/complete',
    { resolution: 'Fixed' },
  ],
  ['io_archive_maintenance_request', { id: 7 }, 'POST', '/maintenanceRequests/7/archive'],
  [
    'io_create_mail',
    { recipientId: 4, buildingId: 1 },
    'POST',
    '/mail',
    { recipientId: 4, buildingId: 1 },
  ],
  ['io_deliver_mail', { id: 8, signature: 'AB' }, 'POST', '/mail/8/deliver', { signature: 'AB' }],
  ['io_return_mail', { id: 8, reason: 'Moved' }, 'POST', '/mail/8/return', { reason: 'Moved' }],
  ['io_create_move', { name: 'Desk' }, 'POST', '/moves', { name: 'Desk' }],
  ['io_update_move', { id: 9, toSpaceId: 3 }, 'PUT', '/moves/9', { toSpaceId: 3 }],
  ['io_approve_move', { id: 9, notes: 'OK' }, 'POST', '/moves/9/approve', { notes: 'OK' }],
  ['io_cancel_move', { id: 9 }, 'POST', '/moves/9/cancel'],
];

const request = vi.fn();
const client = { request } as unknown as IOfficeClient;

function harness(options?: TestHarnessOptions): Promise<TestHarness> {
  return createTestHarness((s) => {
    for (const register of [
      registerBuildingTools,
      registerFloorTools,
      registerSpaceTools,
      registerUserTools,
      registerReservationTools,
      registerVisitorTools,
      registerMaintenanceTools,
      registerMailTools,
      registerMoveTools,
    ]) {
      register(s, client);
    }
  }, options);
}

type Body = Record<string, unknown>;
const body = (r: Awaited<ReturnType<TestHarness['callTool']>>) => parseToolResult<Body>(r);

let savedEnv: NodeJS.ProcessEnv;
let h: TestHarness | undefined;

beforeEach(() => {
  savedEnv = { ...process.env };
  delete process.env.MCP_CONFIRM_MODE;
  request.mockReset();
  request.mockResolvedValue({ id: 1 });
});

afterEach(async () => {
  process.env = savedEnv;
  await h?.close();
  h = undefined;
});

describe('every gated write (client cannot be prompted)', () => {
  it('covers every tool that advertises confirmToken', async () => {
    h = await harness();
    const { tools } = await h.client.listTools();
    const gated = tools
      .filter((t) => (t.inputSchema.properties as Body | undefined)?.confirmToken)
      .map((t) => t.name)
      .sort();
    expect(gated).toEqual(WRITES.map(([t]) => t).sort());
    for (const t of tools) {
      expect((t.inputSchema.properties as Body | undefined)?.confirm, t.name).toBeUndefined();
    }
  });

  it.each(WRITES)(
    '%s: phase 1 previews without a request; phase 2 writes once',
    async (tool, args, method, path, sent) => {
      h = await harness();
      const first = await h.callTool(tool, args);
      expect(first.isError).toBeFalsy();
      const p1 = body(first);
      expect(p1.status).toBe('confirmation-required');
      expect(p1.preview).toMatchObject({
        method,
        path,
        ...(sent !== undefined ? { willSend: sent } : {}),
      });
      if (sent === undefined) expect(p1.preview).not.toHaveProperty('willSend');
      expect(typeof p1.confirmToken).toBe('string');
      expect(request).not.toHaveBeenCalled();

      const second = await h.callTool(tool, { ...args, confirmToken: p1.confirmToken });
      expect(second.isError).toBeFalsy();
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0][0]).toBe(method);
      expect(request.mock.calls[0][1]).toBe(path);
      expect(request.mock.calls[0][2]).toEqual(sent);
    },
  );
});

describe('token rules', () => {
  it('refuses a replayed token as TOKEN_REUSED without writing again', async () => {
    h = await harness();
    const args = { id: 4 };
    const p1 = body(await h.callTool('io_delete_user', args));
    await h.callTool('io_delete_user', { ...args, confirmToken: p1.confirmToken });
    expect(request).toHaveBeenCalledTimes(1);
    const replay = await h.callTool('io_delete_user', { ...args, confirmToken: p1.confirmToken });
    expect(JSON.stringify(replay)).toContain('TOKEN_REUSED');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('refuses a token when an argument changed between phases (DRAFT_CHANGED)', async () => {
    h = await harness();
    const p1 = body(await h.callTool('io_update_building', { id: 1, city: 'Austin' }));
    const changed = await h.callTool('io_update_building', {
      id: 1,
      city: 'Dallas',
      confirmToken: p1.confirmToken,
    });
    expect(JSON.stringify(changed)).toContain('DRAFT_CHANGED');
    expect(request).not.toHaveBeenCalled();
  });

  it('refuses a token minted for a different record (TOKEN_INVALID)', async () => {
    h = await harness();
    const p1 = body(await h.callTool('io_delete_space', { id: 3 }));
    const other = await h.callTool('io_delete_space', { id: 4, confirmToken: p1.confirmToken });
    expect(JSON.stringify(other)).toContain('TOKEN_INVALID');
    expect(request).not.toHaveBeenCalled();
  });

  it('the preview repeats the rule against obeying record text', async () => {
    h = await harness();
    const p1 = body(await h.callTool('io_delete_user', { id: 4 }));
    expect(p1.preview).toMatchObject({ note: CONFIRM_RULE, action: 'Delete iOffice user 4' });
  });
});

describe('client that can be prompted', () => {
  it('writes once the user accepts the prompt', async () => {
    h = await harness({
      elicitation: async () => ({ action: 'accept', content: { confirmed: true } }),
    });
    const r = await h.callTool('io_cancel_move', { id: 9, reason: 'Dup' });
    expect(r.isError).toBeFalsy();
    expect(request).toHaveBeenCalledWith('POST', '/moves/9/cancel', { reason: 'Dup' });
  });

  it('does not write when the user declines', async () => {
    h = await harness({ elicitation: async () => ({ action: 'decline' }) });
    await h.callTool('io_cancel_move', { id: 9 });
    expect(request).not.toHaveBeenCalled();
  });
});

describe('MCP_CONFIRM_MODE', () => {
  it('refuse: a client that cannot be prompted is refused and nothing is written', async () => {
    process.env.MCP_CONFIRM_MODE = 'refuse';
    h = await harness();
    const r = await h.callTool('io_create_building', { name: 'HQ' });
    expect(JSON.stringify(r)).toContain('confirmation-unsupported');
    expect(request).not.toHaveBeenCalled();
  });
});
