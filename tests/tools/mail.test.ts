import { describe, it, expect, vi, afterEach } from 'vitest';
import { toolDefinitions, handleTool } from '../../src/tools/mail.js';
import type { IOfficeClient } from '../../src/client.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

afterEach(() => vi.clearAllMocks());

describe('toolDefinitions', () => {
  it('has all 5 mail tools', () => {
    const names = toolDefinitions.map((t) => t.name);
    expect(names).toContain('io_list_mail');
    expect(names).toContain('io_get_mail');
    expect(names).toContain('io_create_mail');
    expect(names).toContain('io_deliver_mail');
    expect(names).toContain('io_return_mail');
  });
});

describe('io_list_mail', () => {
  it('calls GET /mail with no params', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_mail', {}, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/mail');
  });

  it('appends filter params', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await handleTool('io_list_mail', { status: 'received', buildingId: 1 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/mail?status=received&buildingId=1');
  });
});

describe('io_get_mail', () => {
  it('calls GET /mail/{id}', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 400 });
    await handleTool('io_get_mail', { id: 400 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/mail/400');
  });
});

describe('io_create_mail', () => {
  it('calls POST /mail with args', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ id: 401 });
    const args = { recipientId: 42, buildingId: 1, trackingNumber: '1Z999AA1' };
    await handleTool('io_create_mail', args, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/mail', args);
  });
});

describe('io_deliver_mail', () => {
  it('calls POST /mail/{id}/deliver with no body when only id provided', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'delivered' });
    await handleTool('io_deliver_mail', { id: 401 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/mail/401/deliver', undefined);
  });

  it('calls POST /mail/{id}/deliver with body when extra fields provided', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'delivered' });
    await handleTool('io_deliver_mail', { id: 401, signature: 'John Doe' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/mail/401/deliver', { signature: 'John Doe' });
  });
});

describe('io_return_mail', () => {
  it('calls POST /mail/{id}/return with no body when only id provided', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'returned' });
    await handleTool('io_return_mail', { id: 401 }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/mail/401/return', undefined);
  });

  it('calls POST /mail/{id}/return with reason body', async () => {
    mockClient.request = vi.fn().mockResolvedValue({ status: 'returned' });
    await handleTool('io_return_mail', { id: 401, reason: 'Unknown recipient' }, mockClient);
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/mail/401/return', { reason: 'Unknown recipient' });
  });
});

describe('unknown tool', () => {
  it('throws for unknown tool name', async () => {
    await expect(handleTool('io_unknown', {}, mockClient)).rejects.toThrow('Unknown tool: io_unknown');
  });
});
