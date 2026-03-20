import { describe, it, expect, vi, afterEach } from 'vitest';
import { toolDefinitions, handleTool } from '../../src/tools/visitors.js';
import type { IOfficeClient } from '../../src/client.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

afterEach(() => vi.clearAllMocks());

describe('toolDefinitions', () => {
  it('has all 6 visitor tools', () => {
    const names = toolDefinitions.map((t) => t.name);
    expect(names).toContain('io_list_visitors');
    expect(names).toContain('io_get_visitor');
    expect(names).toContain('io_create_visitor');
    expect(names).toContain('io_update_visitor');
    expect(names).toContain('io_checkin_visitor');
    expect(names).toContain('io_checkout_visitor');
  });
});

describe('io_list_visitors', () => {
  it('calls GET /visitors with no params', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_visitors', {}, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/visitors');
  });

  it('appends filter params', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_visitors', { buildingId: 1, startDate: '2026-03-20' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/visitors?startDate=2026-03-20&buildingId=1');
  });
});

describe('io_get_visitor', () => {
  it('calls GET /visitors/{id}', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 200 });
    await handleTool('io_get_visitor', { id: 200 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/visitors/200');
  });
});

describe('io_create_visitor', () => {
  it('calls POST /visitors with args', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 201 });
    const args = { firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' };
    await handleTool('io_create_visitor', args, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/visitors', args);
  });
});

describe('io_update_visitor', () => {
  it('calls PUT /visitors/{id} without id in body', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 201 });
    await handleTool('io_update_visitor', { id: 201, company: 'Acme' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/visitors/201', { company: 'Acme' });
  });
});

describe('io_checkin_visitor', () => {
  it('calls POST /visitors/{id}/checkIn', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'checked_in' });
    await handleTool('io_checkin_visitor', { id: 201 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/visitors/201/checkIn');
  });
});

describe('io_checkout_visitor', () => {
  it('calls POST /visitors/{id}/checkOut', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'checked_out' });
    await handleTool('io_checkout_visitor', { id: 201 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/visitors/201/checkOut');
  });
});

describe('unknown tool', () => {
  it('throws for unknown tool name', async () => {
    await expect(handleTool('io_unknown', {}, mockClient)).rejects.toThrow('Unknown tool: io_unknown');
  });
});
