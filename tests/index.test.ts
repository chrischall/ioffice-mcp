import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

function createServerWithAllTools(): McpServer {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerBuildingTools(server, mockClient);
  registerFloorTools(server, mockClient);
  registerSpaceTools(server, mockClient);
  registerUserTools(server, mockClient);
  registerReservationTools(server, mockClient);
  registerVisitorTools(server, mockClient);
  registerMaintenanceTools(server, mockClient);
  registerMailTools(server, mockClient);
  registerMoveTools(server, mockClient);
  return server;
}

describe('tool registry', () => {
  it('registers all 52 tools without error', () => {
    // If any tool name collides or registration fails, this will throw
    const server = createServerWithAllTools();
    expect(server).toBeDefined();
  });

  it('includes all expected tool names', () => {
    const server = createServerWithAllTools();
    const names = Object.keys((server as any)._registeredTools);

    const expected = [
      // buildings
      'io_list_buildings', 'io_get_building', 'io_create_building', 'io_update_building', 'io_delete_building',
      // floors
      'io_list_floors', 'io_get_floor', 'io_create_floor', 'io_update_floor', 'io_delete_floor',
      // spaces
      'io_list_spaces', 'io_get_space', 'io_create_space', 'io_update_space', 'io_delete_space',
      // users
      'io_list_users', 'io_get_user', 'io_create_user', 'io_update_user', 'io_delete_user',
      // reservations
      'io_list_reservations', 'io_get_reservation', 'io_create_reservation',
      'io_update_reservation', 'io_delete_reservation', 'io_checkin_reservation', 'io_checkout_reservation',
      // visitors
      'io_list_visitors', 'io_get_visitor', 'io_create_visitor',
      'io_update_visitor', 'io_checkin_visitor', 'io_checkout_visitor',
      // maintenance
      'io_list_maintenance_requests', 'io_get_maintenance_request', 'io_create_maintenance_request',
      'io_update_maintenance_request', 'io_accept_maintenance_request', 'io_start_maintenance_request',
      'io_complete_maintenance_request', 'io_archive_maintenance_request',
      // mail
      'io_list_mail', 'io_get_mail', 'io_create_mail', 'io_deliver_mail', 'io_return_mail',
      // moves
      'io_list_moves', 'io_get_move', 'io_create_move', 'io_update_move', 'io_approve_move', 'io_cancel_move',
    ];

    for (const name of expected) {
      expect(names).toContain(name);
    }
    expect(names).toHaveLength(52);
  });
});
