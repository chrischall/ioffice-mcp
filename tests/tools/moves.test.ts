import { describe, it, expect, vi, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../../src/client.js';
import { registerMoveTools } from '../../src/tools/moves.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

function setup() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerMoveTools(server, mockClient);
  const call = (name: string, args: Record<string, unknown> = {}) =>
    (server as any)._registeredTools[name].handler(args, {});
  return { server, call };
}

afterEach(() => vi.clearAllMocks());

describe('registration', () => {
  it('registers all 6 move tools', () => {
    const { server } = setup();
    const names = Object.keys((server as any)._registeredTools);
    expect(names).toContain('io_list_moves');
    expect(names).toContain('io_get_move');
    expect(names).toContain('io_create_move');
    expect(names).toContain('io_update_move');
    expect(names).toContain('io_approve_move');
    expect(names).toContain('io_cancel_move');
  });
});

describe('io_list_moves', () => {
  it('calls GET /moves with no params', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_moves');
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/moves');
  });

  it('appends filter params', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_moves', { status: 'pending', buildingId: 1 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/moves?status=pending&buildingId=1');
  });
});

describe('io_get_move', () => {
  it('calls GET /moves/{id}', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 500 });
    await call('io_get_move', { id: 500 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/moves/500');
  });
});

describe('io_create_move', () => {
  it('calls POST /moves with args', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 501 });
    const args = { name: 'Office Relocation', fromSpaceId: 10, toSpaceId: 20 };
    await call('io_create_move', { ...args, confirm: true });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/moves', args);
  });
});

describe('io_update_move', () => {
  it('calls PUT /moves/{id} without id in body', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 501 });
    await call('io_update_move', { id: 501, name: 'Updated Move', confirm: true });
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/moves/501', { name: 'Updated Move' });
  });
});

describe('io_approve_move', () => {
  it('calls POST /moves/{id}/approve without body when no notes', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'approved' });
    await call('io_approve_move', { id: 501, confirm: true });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/moves/501/approve', undefined);
  });

  it('calls POST /moves/{id}/approve with notes body', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'approved' });
    await call('io_approve_move', { id: 501, notes: 'Approved by facilities', confirm: true });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/moves/501/approve', { notes: 'Approved by facilities' });
  });
});

describe('io_cancel_move', () => {
  it('calls POST /moves/{id}/cancel without body when no reason', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'cancelled' });
    await call('io_cancel_move', { id: 501, confirm: true });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/moves/501/cancel', undefined);
  });

  it('calls POST /moves/{id}/cancel with reason body', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'cancelled' });
    await call('io_cancel_move', { id: 501, reason: 'Project cancelled', confirm: true });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/moves/501/cancel', { reason: 'Project cancelled' });
  });
});

describe('confirm-gate - moves', () => {
  it('io_create_move without confirm returns dry-run and makes NO request', async () => {
    const { call } = setup();
    mockClient.request = vi.fn();
    const result = await call('io_create_move', { name: 'Office Relocation', fromSpaceId: 10, toSpaceId: 20 });
    expect(mockClient.request).not.toHaveBeenCalled();
    const payload = JSON.parse(result.content[0].text as string);
    expect(payload.dryRun).toBe(true);
    expect(payload.willSend).not.toHaveProperty('confirm');
  });

  it('io_update_move without confirm returns dry-run and makes NO request', async () => {
    const { call } = setup();
    mockClient.request = vi.fn();
    const result = await call('io_update_move', { id: 501, name: 'Updated Move' });
    expect(mockClient.request).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text as string).dryRun).toBe(true);
  });

  it('io_approve_move without confirm returns dry-run and makes NO request', async () => {
    const { call } = setup();
    mockClient.request = vi.fn();
    const result = await call('io_approve_move', { id: 501, notes: 'ok' });
    expect(mockClient.request).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text as string).dryRun).toBe(true);
  });

  it('io_cancel_move without confirm returns dry-run and makes NO request', async () => {
    const { call } = setup();
    mockClient.request = vi.fn();
    const result = await call('io_cancel_move', { id: 501 });
    expect(mockClient.request).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text as string).dryRun).toBe(true);
  });
});
