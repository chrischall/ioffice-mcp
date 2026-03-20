import { describe, it, expect, vi, afterEach } from 'vitest';
import { toolDefinitions, handleTool } from '../../src/tools/moves.js';
import type { IOfficeClient } from '../../src/client.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

afterEach(() => vi.clearAllMocks());

describe('toolDefinitions', () => {
  it('has all 6 move tools', () => {
    const names = toolDefinitions.map((t) => t.name);
    expect(names).toContain('io_list_moves');
    expect(names).toContain('io_get_move');
    expect(names).toContain('io_create_move');
    expect(names).toContain('io_update_move');
    expect(names).toContain('io_approve_move');
    expect(names).toContain('io_cancel_move');
  });
});

describe('io_list_moves', () => {
  it('calls GET /moves with no params', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_moves', {}, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/moves');
  });

  it('appends filter params', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_moves', { status: 'pending', buildingId: 1 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/moves?status=pending&buildingId=1');
  });
});

describe('io_get_move', () => {
  it('calls GET /moves/{id}', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 500 });
    await handleTool('io_get_move', { id: 500 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/moves/500');
  });
});

describe('io_create_move', () => {
  it('calls POST /moves with args', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 501 });
    const args = { name: 'Office Relocation', fromSpaceId: 10, toSpaceId: 20 };
    await handleTool('io_create_move', args, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/moves', args);
  });
});

describe('io_update_move', () => {
  it('calls PUT /moves/{id} without id in body', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 501 });
    await handleTool('io_update_move', { id: 501, name: 'Updated Move' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/moves/501', { name: 'Updated Move' });
  });
});

describe('io_approve_move', () => {
  it('calls POST /moves/{id}/approve without body when no notes', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'approved' });
    await handleTool('io_approve_move', { id: 501 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/moves/501/approve', undefined);
  });

  it('calls POST /moves/{id}/approve with notes body', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'approved' });
    await handleTool('io_approve_move', { id: 501, notes: 'Approved by facilities' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/moves/501/approve', { notes: 'Approved by facilities' });
  });
});

describe('io_cancel_move', () => {
  it('calls POST /moves/{id}/cancel without body when no reason', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'cancelled' });
    await handleTool('io_cancel_move', { id: 501 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/moves/501/cancel', undefined);
  });

  it('calls POST /moves/{id}/cancel with reason body', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'cancelled' });
    await handleTool('io_cancel_move', { id: 501, reason: 'Project cancelled' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/moves/501/cancel', { reason: 'Project cancelled' });
  });
});

describe('unknown tool', () => {
  it('throws for unknown tool name', async () => {
    await expect(handleTool('io_unknown', {}, mockClient)).rejects.toThrow('Unknown tool: io_unknown');
  });
});
