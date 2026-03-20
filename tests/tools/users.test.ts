import { describe, it, expect, vi, afterEach } from 'vitest';
import { toolDefinitions, handleTool } from '../../src/tools/users.js';
import type { IOfficeClient } from '../../src/client.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

afterEach(() => vi.clearAllMocks());

describe('toolDefinitions', () => {
  it('has all 5 user tools', () => {
    const names = toolDefinitions.map((t) => t.name);
    expect(names).toContain('io_list_users');
    expect(names).toContain('io_get_user');
    expect(names).toContain('io_create_user');
    expect(names).toContain('io_update_user');
    expect(names).toContain('io_delete_user');
  });
});

describe('io_list_users', () => {
  it('calls GET /users with no params', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_users', {}, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/users');
  });

  it('appends search param', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_users', { search: 'alice', limit: 25 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/users?search=alice&limit=25');
  });
});

describe('io_get_user', () => {
  it('calls GET /users/{id}', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 42 });
    await handleTool('io_get_user', { id: 42 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/users/42');
  });
});

describe('io_create_user', () => {
  it('calls POST /users with args', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 43 });
    await handleTool('io_create_user', { firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/users', {
      firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com',
    });
  });
});

describe('io_update_user', () => {
  it('calls PUT /users/{id} without id in body', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 43 });
    await handleTool('io_update_user', { id: 43, title: 'Engineer' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/users/43', { title: 'Engineer' });
  });
});

describe('io_delete_user', () => {
  it('calls DELETE /users/{id}', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ success: true });
    await handleTool('io_delete_user', { id: 43 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/users/43');
  });
});

describe('unknown tool', () => {
  it('throws for unknown tool name', async () => {
    await expect(handleTool('io_unknown', {}, mockClient)).rejects.toThrow('Unknown tool: io_unknown');
  });
});
