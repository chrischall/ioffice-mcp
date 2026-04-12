import { describe, it, expect, vi, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../../src/client.js';
import { registerUserTools } from '../../src/tools/users.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

function setup() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerUserTools(server, mockClient);
  const call = (name: string, args: Record<string, unknown> = {}) =>
    (server as any)._registeredTools[name].handler(args, {});
  return { server, call };
}

afterEach(() => vi.clearAllMocks());

describe('registration', () => {
  it('registers all 5 user tools', () => {
    const { server } = setup();
    const names = Object.keys((server as any)._registeredTools);
    expect(names).toContain('io_list_users');
    expect(names).toContain('io_get_user');
    expect(names).toContain('io_create_user');
    expect(names).toContain('io_update_user');
    expect(names).toContain('io_delete_user');
  });
});

describe('io_list_users', () => {
  it('calls GET /users with no params', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_users');
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/users');
  });

  it('appends search param', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_users', { search: 'alice', limit: 25 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/users?search=alice&limit=25');
  });
});

describe('io_get_user', () => {
  it('calls GET /users/{id}', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 42 });
    await call('io_get_user', { id: 42 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/users/42');
  });
});

describe('io_create_user', () => {
  it('calls POST /users with args', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 43 });
    await call('io_create_user', { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/users', {
      firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com',
    });
  });
});

describe('io_update_user', () => {
  it('calls PUT /users/{id} without id in body', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 43 });
    await call('io_update_user', { id: 43, title: 'Engineer' });
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/users/43', { title: 'Engineer' });
  });
});

describe('io_delete_user', () => {
  it('calls DELETE /users/{id}', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ success: true });
    await call('io_delete_user', { id: 43 });
    expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/users/43');
  });
});
