import { describe, it, expect, vi, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../../src/client.js';
import { registerVisitorTools } from '../../src/tools/visitors.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

function setup() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerVisitorTools(server, mockClient);
  const call = (name: string, args: Record<string, unknown> = {}) =>
    (server as any)._registeredTools[name].handler(args, {});
  return { server, call };
}

afterEach(() => vi.clearAllMocks());

describe('registration', () => {
  it('registers all 6 visitor tools', () => {
    const { server } = setup();
    const names = Object.keys((server as any)._registeredTools);
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
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_visitors');
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/visitors');
  });

  it('appends filter params', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_visitors', { buildingId: 1, startDate: '2026-03-20' });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/visitors?startDate=2026-03-20&buildingId=1');
  });
});

describe('io_get_visitor', () => {
  it('calls GET /visitors/{id}', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 200 });
    await call('io_get_visitor', { id: 200 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/visitors/200');
  });
});

describe('io_create_visitor', () => {
  it('calls POST /visitors with args', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 201 });
    const args = { firstName: 'Bob', lastName: 'Jones', email: 'bob@example.com' };
    await call('io_create_visitor', args);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/visitors', args);
  });
});

describe('io_update_visitor', () => {
  it('calls PUT /visitors/{id} without id in body', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 201 });
    await call('io_update_visitor', { id: 201, company: 'Acme' });
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/visitors/201', { company: 'Acme' });
  });
});

describe('io_checkin_visitor', () => {
  it('calls POST /visitors/{id}/checkIn', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'checked_in' });
    await call('io_checkin_visitor', { id: 201 });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/visitors/201/checkIn');
  });
});

describe('io_checkout_visitor', () => {
  it('calls POST /visitors/{id}/checkOut', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'checked_out' });
    await call('io_checkout_visitor', { id: 201 });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/visitors/201/checkOut');
  });
});
