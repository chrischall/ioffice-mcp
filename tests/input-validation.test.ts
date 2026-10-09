// Numeric inputs are validated before anything reaches the iOffice API, and an
// update with nothing to change never sends a PUT (chrischall/fleet-audit#517).
// Before: io_delete_user({ id: 1.5 }) previewed DELETE /users/1.5, a 0
// buildingId was read as "no filter" and listed every floor, and an update
// with only id + confirmToken sent PUT {}.
import { describe, it, expect, vi, afterEach } from 'vitest';
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

const request = vi.fn();
const mockClient = { request } as unknown as IOfficeClient;

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

async function withHarness<T>(
  fn: (h: Awaited<ReturnType<typeof createTestHarness>>) => Promise<T>,
) {
  const h = await createTestHarness(registerAll);
  try {
    return await fn(h);
  } finally {
    await h.close();
  }
}

type Prop = { type?: string; minimum?: number; maximum?: number; exclusiveMinimum?: number };

afterEach(() => vi.clearAllMocks());

describe('advertised schemas', () => {
  it('declares every id / *Id input as a positive integer', async () => {
    const tools = await withHarness(async (h) => (await h.client.listTools()).tools);
    const idProps = tools.flatMap((t) =>
      Object.entries((t.inputSchema.properties ?? {}) as Record<string, Prop>)
        .filter(([key]) => key === 'id' || key.endsWith('Id'))
        .map(([key, prop]) => ({ where: `${t.name}.${key}`, prop })),
    );
    expect(idProps.length).toBeGreaterThan(50);
    for (const { where, prop } of idProps) {
      expect({ where, type: prop.type }).toEqual({ where, type: 'integer' });
      expect({ where, exclusiveMinimum: prop.exclusiveMinimum }).toEqual({
        where,
        exclusiveMinimum: 0,
      });
    }
  });

  it('bounds limit to 1..100 and startAt to >= 0 on every list tool', async () => {
    const tools = await withHarness(async (h) => (await h.client.listTools()).tools);
    const lists = tools.filter((t) => t.name.startsWith('io_list_'));
    expect(lists).toHaveLength(9);
    for (const t of lists) {
      const props = t.inputSchema.properties as Record<string, Prop>;
      expect({ tool: t.name, ...props.limit }).toMatchObject({
        tool: t.name,
        type: 'integer',
        minimum: 1,
        maximum: 100,
      });
      expect({ tool: t.name, ...props.startAt }).toMatchObject({
        tool: t.name,
        type: 'integer',
        minimum: 0,
      });
    }
  });
});

describe('rejected before any request', () => {
  it.each([
    ['io_delete_user', { id: 1.5 }],
    ['io_delete_user', { id: 0 }],
    ['io_delete_user', { id: -3 }],
    ['io_get_building', { id: 1e21 }],
    ['io_list_floors', { buildingId: 0 }],
    ['io_list_spaces', { floorId: 2.5 }],
    ['io_list_users', { limit: 0 }],
    ['io_list_users', { limit: 101 }],
    ['io_list_users', { limit: 10.5 }],
    ['io_list_users', { startAt: -1 }],
  ])('%s %j', async (name, args) => {
    const result = await withHarness((h) => h.callTool(name, args));
    expect(result.isError).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });
});

describe('updates with nothing to change', () => {
  it.each([
    'io_update_building',
    'io_update_floor',
    'io_update_space',
    'io_update_user',
    'io_update_reservation',
    'io_update_visitor',
    'io_update_maintenance_request',
    'io_update_move',
  ])('%s with only an id is refused and sends no PUT', async (name) => {
    const result = await withHarness((h) => h.callTool(name, { id: 7 }));
    expect(result.isError).toBe(true);
    expect((result.content[0] as { text: string }).text).toMatch(/Nothing to update/);
    expect(request).not.toHaveBeenCalled();
  });
});
