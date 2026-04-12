import { describe, it, expect, vi, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../../src/client.js';
import { registerBuildingTools } from '../../src/tools/buildings.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

function setup() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerBuildingTools(server, mockClient);
  const call = (name: string, args: Record<string, unknown> = {}) =>
    (server as any)._registeredTools[name].handler(args, {});
  return { server, call };
}

afterEach(() => vi.clearAllMocks());

describe('registration', () => {
  it('registers all 5 building tools', () => {
    const { server } = setup();
    const names = Object.keys((server as any)._registeredTools);
    expect(names).toContain('io_list_buildings');
    expect(names).toContain('io_get_building');
    expect(names).toContain('io_create_building');
    expect(names).toContain('io_update_building');
    expect(names).toContain('io_delete_building');
  });
});

describe('io_list_buildings', () => {
  it('calls GET /buildings with no params', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_buildings');
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/buildings');
  });

  it('appends query params when provided', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_buildings', { search: 'HQ', limit: 10 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/buildings?search=HQ&limit=10');
  });
});

describe('io_get_building', () => {
  it('calls GET /buildings/{id}', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 1, name: 'HQ' });
    await call('io_get_building', { id: 1 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/buildings/1');
  });
});

describe('io_create_building', () => {
  it('calls POST /buildings with body', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 2, name: 'Branch' });
    await call('io_create_building', { name: 'Branch', city: 'Austin' });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/buildings', { name: 'Branch', city: 'Austin' });
  });
});

describe('io_update_building', () => {
  it('calls PUT /buildings/{id} with body (excluding id)', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 1 });
    await call('io_update_building', { id: 1, name: 'New Name' });
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/buildings/1', { name: 'New Name' });
  });
});

describe('io_delete_building', () => {
  it('calls DELETE /buildings/{id}', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ success: true });
    const result = await call('io_delete_building', { id: 1 });
    expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/buildings/1');
    expect(result.content[0].text).toContain('true');
  });
});
