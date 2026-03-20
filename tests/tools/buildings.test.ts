import { describe, it, expect, vi, afterEach } from 'vitest';
import { toolDefinitions, handleTool } from '../../src/tools/buildings.js';
import type { IOfficeClient } from '../../src/client.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

afterEach(() => vi.clearAllMocks());

describe('toolDefinitions', () => {
  const names = toolDefinitions.map((t) => t.name);
  it('has all 5 building tools', () => {
    expect(names).toContain('io_list_buildings');
    expect(names).toContain('io_get_building');
    expect(names).toContain('io_create_building');
    expect(names).toContain('io_update_building');
    expect(names).toContain('io_delete_building');
  });
});

describe('io_list_buildings', () => {
  it('calls GET /buildings with no params', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_buildings', {}, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/buildings');
  });

  it('appends query params when provided', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_buildings', { search: 'HQ', limit: 10 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/buildings?search=HQ&limit=10');
  });
});

describe('io_get_building', () => {
  it('calls GET /buildings/{id}', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 1, name: 'HQ' });
    await handleTool('io_get_building', { id: 1 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/buildings/1');
  });
});

describe('io_create_building', () => {
  it('calls POST /buildings with body', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 2, name: 'Branch' });
    await handleTool('io_create_building', { name: 'Branch', city: 'Austin' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/buildings', { name: 'Branch', city: 'Austin' });
  });
});

describe('io_update_building', () => {
  it('calls PUT /buildings/{id} with body (excluding id)', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 1 });
    await handleTool('io_update_building', { id: 1, name: 'New Name' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/buildings/1', { name: 'New Name' });
  });
});

describe('io_delete_building', () => {
  it('calls DELETE /buildings/{id}', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ success: true });
    const result = await handleTool('io_delete_building', { id: 1 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('DELETE', '/buildings/1');
    expect(result.content[0].text).toContain('true');
  });
});

describe('unknown tool', () => {
  it('throws for unknown tool name', async () => {
    await expect(handleTool('io_unknown', {}, mockClient)).rejects.toThrow('Unknown tool: io_unknown');
  });
});
