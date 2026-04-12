import { describe, it, expect, vi, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../../src/client.js';
import { registerFloorTools } from '../../src/tools/floors.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

function setup() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerFloorTools(server, mockClient);
  const call = (name: string, args: Record<string, unknown> = {}) =>
    (server as any)._registeredTools[name].handler(args, {});
  return { server, call };
}

afterEach(() => vi.clearAllMocks());

describe('registration', () => {
  it('registers all 5 floor tools', () => {
    const { server } = setup();
    const names = Object.keys((server as any)._registeredTools);
    expect(names).toContain('io_list_floors');
    expect(names).toContain('io_get_floor');
    expect(names).toContain('io_create_floor');
    expect(names).toContain('io_update_floor');
    expect(names).toContain('io_delete_floor');
  });
});

describe('io_list_floors', () => {
  it('calls GET /floors when no buildingId', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_floors');
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/floors');
  });

  it('calls GET /buildings/{id}/floors when buildingId provided', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_floors', { buildingId: 5 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/buildings/5/floors');
  });

  it('appends query params', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_floors', { buildingId: 5, limit: 20 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/buildings/5/floors?limit=20');
  });
});

describe('io_get_floor', () => {
  it('calls GET /floors/{id}', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 3 });
    await call('io_get_floor', { id: 3 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/floors/3');
  });
});

describe('io_create_floor', () => {
  it('calls POST /floors with full args', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 4 });
    await call('io_create_floor', { name: 'Level 1', buildingId: 2 });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/floors', { name: 'Level 1', buildingId: 2 });
  });
});

describe('io_update_floor', () => {
  it('calls PUT /floors/{id} without id in body', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 4 });
    await call('io_update_floor', { id: 4, name: 'Updated' });
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/floors/4', { name: 'Updated' });
  });
});

describe('io_delete_floor', () => {
  it('calls DELETE /floors/{id}', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ success: true });
    await call('io_delete_floor', { id: 4 });
    expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/floors/4');
  });
});
