import { describe, it, expect, vi, afterEach } from 'vitest';
import { toolDefinitions, handleTool } from '../../src/tools/maintenance.js';
import type { IOfficeClient } from '../../src/client.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

afterEach(() => vi.clearAllMocks());

describe('toolDefinitions', () => {
  it('has all 8 maintenance tools', () => {
    const names = toolDefinitions.map((t) => t.name);
    expect(names).toContain('io_list_maintenance_requests');
    expect(names).toContain('io_get_maintenance_request');
    expect(names).toContain('io_create_maintenance_request');
    expect(names).toContain('io_update_maintenance_request');
    expect(names).toContain('io_accept_maintenance_request');
    expect(names).toContain('io_start_maintenance_request');
    expect(names).toContain('io_complete_maintenance_request');
    expect(names).toContain('io_archive_maintenance_request');
  });
});

describe('io_list_maintenance_requests', () => {
  it('calls GET /maintenanceRequests with no params', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_maintenance_requests', {}, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/maintenanceRequests');
  });

  it('appends filter params', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_maintenance_requests', { status: 'pending', buildingId: 2 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/maintenanceRequests?status=pending&buildingId=2');
  });
});

describe('io_get_maintenance_request', () => {
  it('calls GET /maintenanceRequests/{id}', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 300 });
    await handleTool('io_get_maintenance_request', { id: 300 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/maintenanceRequests/300');
  });
});

describe('io_create_maintenance_request', () => {
  it('calls POST /maintenanceRequests with args', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 301 });
    const args = { title: 'Broken light', description: 'Light is out in room 101' };
    await handleTool('io_create_maintenance_request', args, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/maintenanceRequests', args);
  });
});

describe('io_update_maintenance_request', () => {
  it('calls PUT /maintenanceRequests/{id} without id in body', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 301 });
    await handleTool('io_update_maintenance_request', { id: 301, priorityId: 2 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/maintenanceRequests/301', { priorityId: 2 });
  });
});

describe('io_accept_maintenance_request', () => {
  it('calls POST /maintenanceRequests/{id}/accept', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'accepted' });
    await handleTool('io_accept_maintenance_request', { id: 301 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/maintenanceRequests/301/accept');
  });
});

describe('io_start_maintenance_request', () => {
  it('calls POST /maintenanceRequests/{id}/start', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'started' });
    await handleTool('io_start_maintenance_request', { id: 301 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/maintenanceRequests/301/start');
  });
});

describe('io_complete_maintenance_request', () => {
  it('calls POST /maintenanceRequests/{id}/complete without body when no resolution', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'completed' });
    await handleTool('io_complete_maintenance_request', { id: 301 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/maintenanceRequests/301/complete', undefined);
  });

  it('calls POST with resolution body when provided', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'completed' });
    await handleTool('io_complete_maintenance_request', { id: 301, resolution: 'Replaced bulb' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/maintenanceRequests/301/complete', { resolution: 'Replaced bulb' });
  });
});

describe('io_archive_maintenance_request', () => {
  it('calls POST /maintenanceRequests/{id}/archive', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'archived' });
    await handleTool('io_archive_maintenance_request', { id: 301 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/maintenanceRequests/301/archive');
  });
});

describe('unknown tool', () => {
  it('throws for unknown tool name', async () => {
    await expect(handleTool('io_unknown', {}, mockClient)).rejects.toThrow('Unknown tool: io_unknown');
  });
});
