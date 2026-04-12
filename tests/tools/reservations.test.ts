import { describe, it, expect, vi, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../../src/client.js';
import { registerReservationTools } from '../../src/tools/reservations.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

function setup() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerReservationTools(server, mockClient);
  const call = (name: string, args: Record<string, unknown> = {}) =>
    (server as any)._registeredTools[name].handler(args, {});
  return { server, call };
}

afterEach(() => vi.clearAllMocks());

describe('registration', () => {
  it('registers all 7 reservation tools', () => {
    const { server } = setup();
    const names = Object.keys((server as any)._registeredTools);
    expect(names).toContain('io_list_reservations');
    expect(names).toContain('io_get_reservation');
    expect(names).toContain('io_create_reservation');
    expect(names).toContain('io_update_reservation');
    expect(names).toContain('io_delete_reservation');
    expect(names).toContain('io_checkin_reservation');
    expect(names).toContain('io_checkout_reservation');
  });
});

describe('io_list_reservations', () => {
  it('calls GET /reservations with no params', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_reservations');
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/reservations');
  });

  it('appends filter params', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_reservations', { spaceId: 5, startDate: '2026-03-20' });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/reservations?startDate=2026-03-20&spaceId=5');
  });
});

describe('io_get_reservation', () => {
  it('calls GET /reservations/{id}', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 100 });
    await call('io_get_reservation', { id: 100 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/reservations/100');
  });
});

describe('io_create_reservation', () => {
  it('calls POST /reservations with args', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 101 });
    const args = { title: 'Team Sync', spaceId: 5, startDate: '2026-03-20T09:00:00', endDate: '2026-03-20T10:00:00' };
    await call('io_create_reservation', args);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/reservations', args);
  });
});

describe('io_update_reservation', () => {
  it('calls PUT /reservations/{id} without id in body', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 101 });
    await call('io_update_reservation', { id: 101, title: 'Updated' });
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/reservations/101', { title: 'Updated' });
  });
});

describe('io_delete_reservation', () => {
  it('calls DELETE /reservations/{id}', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ success: true });
    await call('io_delete_reservation', { id: 101 });
    expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/reservations/101');
  });
});

describe('io_checkin_reservation', () => {
  it('calls POST /reservations/{id}/checkIn', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'checked_in' });
    await call('io_checkin_reservation', { id: 101 });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/reservations/101/checkIn');
  });
});

describe('io_checkout_reservation', () => {
  it('calls POST /reservations/{id}/checkOut', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'checked_out' });
    await call('io_checkout_reservation', { id: 101 });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/reservations/101/checkOut');
  });
});
