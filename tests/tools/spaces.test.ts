import { describe, it, expect, vi, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../../src/client.js';
import { registerSpaceTools } from '../../src/tools/spaces.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

function setup() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerSpaceTools(server, mockClient);
  const call = (name: string, args: Record<string, unknown> = {}) =>
    (server as any)._registeredTools[name].handler(args, {});
  return { server, call };
}

afterEach(() => vi.clearAllMocks());

describe('registration', () => {
  it('registers all 5 space tools', () => {
    const { server } = setup();
    const names = Object.keys((server as any)._registeredTools);
    expect(names).toContain('io_list_spaces');
    expect(names).toContain('io_get_space');
    expect(names).toContain('io_create_space');
    expect(names).toContain('io_update_space');
    expect(names).toContain('io_delete_space');
  });
});

describe('io_list_spaces', () => {
  it('calls GET /spaces with no params', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_spaces');
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/spaces');
  });

  it('calls GET /floors/{id}/spaces when floorId provided', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_spaces', { floorId: 7 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/floors/7/spaces');
  });

  it('appends query params with floorId', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_spaces', { floorId: 7, search: 'conf' });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/floors/7/spaces?search=conf');
  });
});

describe('io_get_space', () => {
  it('calls GET /spaces/{id}', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 10 });
    await call('io_get_space', { id: 10 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/spaces/10');
  });
});

describe('io_create_space', () => {
  it('calls POST /spaces with args', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 11 });
    await call('io_create_space', { name: 'Conf A', floorId: 3, capacity: 10 });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/spaces', { name: 'Conf A', floorId: 3, capacity: 10 });
  });
});

describe('io_update_space', () => {
  it('calls PUT /spaces/{id} without id in body', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 11 });
    await call('io_update_space', { id: 11, capacity: 20 });
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/spaces/11', { capacity: 20 });
  });
});

describe('io_delete_space', () => {
  it('calls DELETE /spaces/{id}', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ success: true });
    await call('io_delete_space', { id: 11 });
    expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/spaces/11');
  });
});
