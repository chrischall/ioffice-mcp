import { describe, it, expect, vi, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IOfficeClient } from '../../src/client.js';
import { registerMaintenanceTools } from '../../src/tools/maintenance.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

function setup() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerMaintenanceTools(server, mockClient);
  const call = (name: string, args: Record<string, unknown> = {}) =>
    (server as any)._registeredTools[name].handler(args, {});
  return { server, call };
}

afterEach(() => vi.clearAllMocks());

describe('registration', () => {
  it('registers all 8 maintenance tools', () => {
    const { server } = setup();
    const names = Object.keys((server as any)._registeredTools);
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
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_maintenance_requests');
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/maintenanceRequests');
  });

  it('appends filter params', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_maintenance_requests', { status: 'pending', buildingId: 2 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/maintenanceRequests?status=pending&buildingId=2');
  });
});

describe('io_get_maintenance_request', () => {
  it('calls GET /maintenanceRequests/{id}', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 300 });
    await call('io_get_maintenance_request', { id: 300 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/maintenanceRequests/300');
  });
});

describe('io_create_maintenance_request', () => {
  it('calls POST /maintenanceRequests with args', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 301 });
    const args = { title: 'Broken light', description: 'Light is out in room 101' };
    await call('io_create_maintenance_request', args);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/maintenanceRequests', args);
  });
});

describe('io_update_maintenance_request', () => {
  it('calls PUT /maintenanceRequests/{id} without id in body', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 301 });
    await call('io_update_maintenance_request', { id: 301, priorityId: 2 });
    expect(mockClient.request).toHaveBeenCalledWith('PUT', '/maintenanceRequests/301', { priorityId: 2 });
  });
});

describe('io_accept_maintenance_request', () => {
  it('calls POST /maintenanceRequests/{id}/accept', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'accepted' });
    await call('io_accept_maintenance_request', { id: 301 });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/maintenanceRequests/301/accept');
  });
});

describe('io_start_maintenance_request', () => {
  it('calls POST /maintenanceRequests/{id}/start', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'started' });
    await call('io_start_maintenance_request', { id: 301 });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/maintenanceRequests/301/start');
  });
});

describe('io_complete_maintenance_request', () => {
  it('calls POST /maintenanceRequests/{id}/complete without body when no resolution', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'completed' });
    await call('io_complete_maintenance_request', { id: 301 });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/maintenanceRequests/301/complete', undefined);
  });

  it('calls POST with resolution body when provided', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'completed' });
    await call('io_complete_maintenance_request', { id: 301, resolution: 'Replaced bulb' });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/maintenanceRequests/301/complete', { resolution: 'Replaced bulb' });
  });
});

describe('io_archive_maintenance_request', () => {
  it('calls POST /maintenanceRequests/{id}/archive', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'archived' });
    await call('io_archive_maintenance_request', { id: 301 });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/maintenanceRequests/301/archive');
  });
});
