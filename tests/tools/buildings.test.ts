import { describe, it, expect, vi, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/server';
import type { IOfficeClient } from '../../src/client.js';
import { toolCallers } from '../confirm-helpers.js';
import { registerBuildingTools } from '../../src/tools/buildings.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

function setup() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerBuildingTools(server, mockClient);
  return { server, ...toolCallers((s) => registerBuildingTools(s, mockClient)) };
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
    const { callConfirmed } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 2, name: 'Branch' });
    await callConfirmed('io_create_building', {
      name: 'Branch',
      city: 'Austin',
    });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/buildings', {
      name: 'Branch',
      city: 'Austin',
    });
  });
});

describe('io_update_building', () => {
  it('calls PUT /buildings/{id} with body (excluding id)', async () => {
    const { callConfirmed } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 1 });
    await callConfirmed('io_update_building', {
      id: 1,
      name: 'New Name',
    });
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/buildings/1', {
      name: 'New Name',
    });
  });
});

describe('io_delete_building', () => {
  it('calls DELETE /buildings/{id}', async () => {
    const { callConfirmed } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ success: true });
    const result = await callConfirmed('io_delete_building', { id: 1 });
    expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/buildings/1');
    expect(result.content[0].text).toContain('true');
  });

  it('returns a success result when the API responds 204 No Content', async () => {
    const { callConfirmed } = setup();
    mockClient.request = vi.fn().mockResolvedValue(undefined);
    const result = await callConfirmed('io_delete_building', { id: 1 });
    expect(JSON.parse(result.content[0].text)).toEqual({ success: true });
  });
});

describe('confirm gate - buildings', () => {
  it('io_create_building without confirmToken returns a preview and makes NO request', async () => {
    const { call } = setup();
    mockClient.request = vi.fn();
    const result = await call('io_create_building', {
      name: 'Branch',
      city: 'Austin',
    });
    expect(mockClient.request).not.toHaveBeenCalled();
    const payload = JSON.parse(result.content[0].text as string);
    expect(payload.status).toBe('confirmation-required');
    expect(payload.preview.willSend).not.toHaveProperty('confirmToken');
  });

  it('io_update_building without confirmToken returns a preview and makes NO request', async () => {
    const { call } = setup();
    mockClient.request = vi.fn();
    const result = await call('io_update_building', {
      id: 1,
      name: 'New Name',
    });
    expect(mockClient.request).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text as string).status).toBe('confirmation-required');
  });

  it('io_delete_building without confirmToken returns a preview and makes NO request', async () => {
    const { call } = setup();
    mockClient.request = vi.fn();
    const result = await call('io_delete_building', { id: 1 });
    expect(mockClient.request).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text as string).status).toBe('confirmation-required');
  });
});
