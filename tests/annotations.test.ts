// Every tool carries a full, accurate annotation set (chrischall/fleet-audit#519).
// Before: every write — io_create_reservation and io_checkin_visitor as much as
// io_delete_user — was `destructiveHint: true`, so hosts that act on hints
// prompted for all writes alike and the irreversible ones got no extra weight;
// no tool set openWorldHint or idempotentHint.
import { describe, it, expect } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/server';
import { createTestHarness } from '@chrischall/mcp-utils/test';
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

const mockClient = { request: async () => undefined } as unknown as IOfficeClient;

function registerAll(server: McpServer): void {
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
    register(server, mockClient);
  }
}

const READ = { readOnlyHint: true, openWorldHint: true };
/** Adds a record that a delete/cancel tool in this set can take back. */
const CREATE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};
/** Adds a record that no tool in this set can remove (no inverse). */
const CREATE_PERMANENT = { ...CREATE, destructiveHint: true };
/** Overwrites fields of an existing record; repeating it changes nothing more. */
const UPDATE = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true,
};
/** Removes or voids a record. */
const DELETE = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true,
};
/** Moves a record forward in its workflow; no tool in this set moves it back. */
const ADVANCE = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};
/** Ends a workflow in a way that cannot be resumed. */
const TERMINATE = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};

const EXPECTED: Record<string, object> = {};
for (const domain of ['building', 'floor', 'space', 'user', 'reservation']) {
  Object.assign(EXPECTED, {
    [`io_get_${domain}`]: READ,
    [`io_create_${domain}`]: CREATE,
    [`io_update_${domain}`]: UPDATE,
    [`io_delete_${domain}`]: DELETE,
  });
}
Object.assign(EXPECTED, {
  io_list_buildings: READ,
  io_list_floors: READ,
  io_list_spaces: READ,
  io_list_users: READ,
  io_list_reservations: READ,
  io_checkin_reservation: ADVANCE,
  io_checkout_reservation: ADVANCE,

  io_list_visitors: READ,
  io_get_visitor: READ,
  io_create_visitor: CREATE_PERMANENT,
  io_update_visitor: UPDATE,
  io_checkin_visitor: ADVANCE,
  io_checkout_visitor: ADVANCE,

  io_list_maintenance_requests: READ,
  io_get_maintenance_request: READ,
  io_create_maintenance_request: CREATE_PERMANENT,
  io_update_maintenance_request: UPDATE,
  io_accept_maintenance_request: ADVANCE,
  io_start_maintenance_request: ADVANCE,
  io_complete_maintenance_request: ADVANCE,
  io_archive_maintenance_request: { ...ADVANCE, idempotentHint: true },

  io_list_mail: READ,
  io_get_mail: READ,
  io_create_mail: CREATE_PERMANENT,
  io_deliver_mail: ADVANCE,
  io_return_mail: TERMINATE,

  io_list_moves: READ,
  io_get_move: READ,
  io_create_move: CREATE,
  io_update_move: UPDATE,
  io_approve_move: ADVANCE,
  io_cancel_move: TERMINATE,
});

describe('tool annotations', () => {
  it('cover every registered tool', async () => {
    const h = await createTestHarness(registerAll);
    try {
      const { tools } = await h.client.listTools();
      expect(tools.map((t) => t.name).sort()).toEqual(Object.keys(EXPECTED).sort());
      for (const t of tools) {
        expect({ tool: t.name, ...t.annotations }).toEqual({ tool: t.name, ...EXPECTED[t.name] });
      }
    } finally {
      await h.close();
    }
  });
});
