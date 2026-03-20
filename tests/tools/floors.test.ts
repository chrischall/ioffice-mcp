import { describe, it, expect, vi, afterEach } from 'vitest';
import { toolDefinitions, handleTool } from '../../src/tools/floors.js';
import type { IOfficeClient } from '../../src/client.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

afterEach(() => vi.clearAllMocks());

describe('toolDefinitions', () => {
  it('has all 5 floor tools', () => {
    const names = toolDefinitions.map((t) => t.name);
    expect(names).toContain('io_list_floors');
    expect(names).toContain('io_get_floor');
    expect(names).toContain('io_create_floor');
    expect(names).toContain('io_update_floor');
    expect(names).toContain('io_delete_floor');
  });
});

describe('io_list_floors', () => {
  it('calls GET /floors when no buildingId', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_floors', {}, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/floors');
  });

  it('calls GET /buildings/{id}/floors when buildingId provided', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_floors', { buildingId: 5 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/buildings/5/floors');
  });

  it('appends query params', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_floors', { buildingId: 5, limit: 20 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/buildings/5/floors?limit=20');
  });
});

describe('io_get_floor', () => {
  it('calls GET /floors/{id}', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 3 });
    await handleTool('io_get_floor', { id: 3 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/floors/3');
  });
});

describe('io_create_floor', () => {
  it('calls POST /floors with full args', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 4 });
    await handleTool('io_create_floor', { name: 'Level 1', buildingId: 2 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/floors', { name: 'Level 1', buildingId: 2 });
  });
});

describe('io_update_floor', () => {
  it('calls PUT /floors/{id} without id in body', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 4 });
    await handleTool('io_update_floor', { id: 4, name: 'Updated' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/floors/4', { name: 'Updated' });
  });
});

describe('io_delete_floor', () => {
  it('calls DELETE /floors/{id}', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ success: true });
    await handleTool('io_delete_floor', { id: 4 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/floors/4');
  });
});

describe('unknown tool', () => {
  it('throws for unknown tool name', async () => {
    await expect(handleTool('io_unknown', {}, mockClient)).rejects.toThrow('Unknown tool: io_unknown');
  });
});
