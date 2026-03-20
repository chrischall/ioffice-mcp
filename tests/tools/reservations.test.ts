import { describe, it, expect, vi, afterEach } from 'vitest';
import { toolDefinitions, handleTool } from '../../src/tools/reservations.js';
import type { IOfficeClient } from '../../src/client.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

afterEach(() => vi.clearAllMocks());

describe('toolDefinitions', () => {
  it('has all 7 reservation tools', () => {
    const names = toolDefinitions.map((t) => t.name);
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
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_reservations', {}, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/reservations');
  });

  it('appends filter params', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_reservations', { spaceId: 5, startDate: '2026-03-20' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/reservations?startDate=2026-03-20&spaceId=5');
  });
});

describe('io_get_reservation', () => {
  it('calls GET /reservations/{id}', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 100 });
    await handleTool('io_get_reservation', { id: 100 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/reservations/100');
  });
});

describe('io_create_reservation', () => {
  it('calls POST /reservations with args', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 101 });
    const args = { title: 'Team Sync', spaceId: 5, startDate: '2026-03-20T09:00:00', endDate: '2026-03-20T10:00:00' };
    await handleTool('io_create_reservation', args, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/reservations', args);
  });
});

describe('io_update_reservation', () => {
  it('calls PUT /reservations/{id} without id in body', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 101 });
    await handleTool('io_update_reservation', { id: 101, title: 'Updated' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/reservations/101', { title: 'Updated' });
  });
});

describe('io_delete_reservation', () => {
  it('calls DELETE /reservations/{id}', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ success: true });
    await handleTool('io_delete_reservation', { id: 101 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/reservations/101');
  });
});

describe('io_checkin_reservation', () => {
  it('calls POST /reservations/{id}/checkIn', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'checked_in' });
    await handleTool('io_checkin_reservation', { id: 101 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/reservations/101/checkIn');
  });
});

describe('io_checkout_reservation', () => {
  it('calls POST /reservations/{id}/checkOut', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'checked_out' });
    await handleTool('io_checkout_reservation', { id: 101 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/reservations/101/checkOut');
  });
});

describe('unknown tool', () => {
  it('throws for unknown tool name', async () => {
    await expect(handleTool('io_unknown', {}, mockClient)).rejects.toThrow('Unknown tool: io_unknown');
  });
});
