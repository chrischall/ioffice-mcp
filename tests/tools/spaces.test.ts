import { describe, it, expect, vi, afterEach } from 'vitest';
import { toolDefinitions, handleTool } from '../../src/tools/spaces.js';
import type { IOfficeClient } from '../../src/client.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

afterEach(() => vi.clearAllMocks());

describe('toolDefinitions', () => {
  it('has all 5 space tools', () => {
    const names = toolDefinitions.map((t) => t.name);
    expect(names).toContain('io_list_spaces');
    expect(names).toContain('io_get_space');
    expect(names).toContain('io_create_space');
    expect(names).toContain('io_update_space');
    expect(names).toContain('io_delete_space');
  });
});

describe('io_list_spaces', () => {
  it('calls GET /spaces with no params', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_spaces', {}, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/spaces');
  });

  it('calls GET /floors/{id}/spaces when floorId provided', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_spaces', { floorId: 7 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/floors/7/spaces');
  });

  it('appends query params with floorId', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_spaces', { floorId: 7, search: 'conf' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/floors/7/spaces?search=conf');
  });
});

describe('io_get_space', () => {
  it('calls GET /spaces/{id}', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 10 });
    await handleTool('io_get_space', { id: 10 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/spaces/10');
  });
});

describe('io_create_space', () => {
  it('calls POST /spaces with args', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 11 });
    await handleTool('io_create_space', { name: 'Conf A', floorId: 3, capacity: 10 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/spaces', { name: 'Conf A', floorId: 3, capacity: 10 });
  });
});

describe('io_update_space', () => {
  it('calls PUT /spaces/{id} without id in body', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 11 });
    await handleTool('io_update_space', { id: 11, capacity: 20 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/spaces/11', { capacity: 20 });
  });
});

describe('io_delete_space', () => {
  it('calls DELETE /spaces/{id}', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ success: true });
    await handleTool('io_delete_space', { id: 11 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/spaces/11');
  });
});

describe('unknown tool', () => {
  it('throws for unknown tool name', async () => {
    await expect(handleTool('io_unknown', {}, mockClient)).rejects.toThrow('Unknown tool: io_unknown');
  });
});
