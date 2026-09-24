import { describe, it, expect, vi, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/server';
import type { IOfficeClient } from '../../src/client.js';
import { toolCallers } from '../confirm-helpers.js';
import { registerUserTools } from '../../src/tools/users.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

function setup() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerUserTools(server, mockClient);
  return { server, ...toolCallers((s) => registerUserTools(s, mockClient)) };
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
    const { callConfirmed } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 43 });
    await callConfirmed('io_create_user', {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
    });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/users', {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
    });
  });
});

describe('io_update_user', () => {
  it('calls PUT /users/{id} without id in body', async () => {
    const { callConfirmed } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 43 });
    await callConfirmed('io_update_user', { id: 43, title: 'Engineer' });
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/users/43', {
      title: 'Engineer',
    });
  });
});

describe('io_delete_user', () => {
  it('calls DELETE /users/{id}', async () => {
    const { callConfirmed } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ success: true });
    await callConfirmed('io_delete_user', { id: 43 });
    expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/users/43');
  });

  it('returns a success result when the API responds 204 No Content', async () => {
    const { callConfirmed } = setup();
    mockClient.request = vi.fn().mockResolvedValue(undefined);
    const result = await callConfirmed('io_delete_user', { id: 43 });
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true });
  });
});

describe('confirm gate - users', () => {
  it('io_create_user without confirmToken returns a preview and makes NO request', async () => {
    const { call } = setup();
    mockClient.request = vi.fn();
    const result = await call('io_create_user', {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
    });
    expect(mockClient.request).not.toHaveBeenCalled();
    const payload = JSON.parse(result.content[0].text as string);
    expect(payload.status).toBe('confirmation-required');
    expect(payload.preview.willSend).not.toHaveProperty('confirmToken');
  });

  it('io_update_user without confirmToken returns a preview and makes NO request', async () => {
    const { call } = setup();
    mockClient.request = vi.fn();
    const result = await call('io_update_user', { id: 43, title: 'Engineer' });
    expect(mockClient.request).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text as string).status).toBe('confirmation-required');
  });

  it('io_delete_user without confirmToken returns a preview and makes NO request', async () => {
    const { call } = setup();
    mockClient.request = vi.fn();
    const result = await call('io_delete_user', { id: 43 });
    expect(mockClient.request).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text as string).status).toBe('confirmation-required');
  });
});
