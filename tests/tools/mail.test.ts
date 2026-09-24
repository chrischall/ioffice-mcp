import { describe, it, expect, vi, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/server';
import type { IOfficeClient } from '../../src/client.js';
import { toolCallers } from '../confirm-helpers.js';
import { registerMailTools } from '../../src/tools/mail.js';

const mockClient = { request: vi.fn() } as unknown as IOfficeClient;

function setup() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerMailTools(server, mockClient);
  return { server, ...toolCallers((s) => registerMailTools(s, mockClient)) };
}

afterEach(() => vi.clearAllMocks());

describe('registration', () => {
  it('registers all 5 mail tools', () => {
    const { server } = setup();
    const names = Object.keys((server as any)._registeredTools);
    expect(names).toContain('io_list_mail');
    expect(names).toContain('io_get_mail');
    expect(names).toContain('io_create_mail');
    expect(names).toContain('io_deliver_mail');
    expect(names).toContain('io_return_mail');
  });
});

describe('io_list_mail', () => {
  it('calls GET /mail with no params', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_mail');
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/mail');
  });

  it('appends filter params', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ results: [] });
    await call('io_list_mail', { status: 'received', buildingId: 1 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/mail?status=received&buildingId=1');
  });
});

describe('io_get_mail', () => {
  it('calls GET /mail/{id}', async () => {
    const { call } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 400 });
    await call('io_get_mail', { id: 400 });
    expect(mockClient.request).toHaveBeenCalledWith('GET', '/mail/400');
  });
});

describe('io_create_mail', () => {
  it('calls POST /mail with args', async () => {
    const { callConfirmed } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ id: 401 });
    const args = { recipientId: 42, buildingId: 1, trackingNumber: '1Z999AA1' };
    await callConfirmed('io_create_mail', { ...args });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/mail', args);
  });
});

describe('io_deliver_mail', () => {
  it('calls POST /mail/{id}/deliver with no body when only id provided', async () => {
    const { callConfirmed } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'delivered' });
    await callConfirmed('io_deliver_mail', { id: 401 });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/mail/401/deliver', undefined);
  });

  it('calls POST /mail/{id}/deliver with body when extra fields provided', async () => {
    const { callConfirmed } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'delivered' });
    await callConfirmed('io_deliver_mail', {
      id: 401,
      signature: 'John Doe',
    });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/mail/401/deliver', {
      signature: 'John Doe',
    });
  });
});

describe('io_return_mail', () => {
  it('calls POST /mail/{id}/return with no body when only id provided', async () => {
    const { callConfirmed } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'returned' });
    await callConfirmed('io_return_mail', { id: 401 });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/mail/401/return', undefined);
  });

  it('calls POST /mail/{id}/return with reason body', async () => {
    const { callConfirmed } = setup();
    mockClient.request = vi.fn().mockResolvedValue({ status: 'returned' });
    await callConfirmed('io_return_mail', {
      id: 401,
      reason: 'Unknown recipient',
    });
    expect(mockClient.request).toHaveBeenCalledWith('POST', '/mail/401/return', {
      reason: 'Unknown recipient',
    });
  });
});

describe('confirm gate - mail', () => {
  it('io_create_mail without confirmToken returns a preview and makes NO request', async () => {
    const { call } = setup();
    mockClient.request = vi.fn();
    const result = await call('io_create_mail', {
      recipientId: 42,
      buildingId: 1,
      trackingNumber: '1Z999AA1',
    });
    expect(mockClient.request).not.toHaveBeenCalled();
    const payload = JSON.parse(result.content[0].text as string);
    expect(payload.status).toBe('confirmation-required');
    expect(payload.preview.willSend).not.toHaveProperty('confirmToken');
  });

  it('io_deliver_mail without confirmToken returns a preview and makes NO request', async () => {
    const { call } = setup();
    mockClient.request = vi.fn();
    const result = await call('io_deliver_mail', {
      id: 401,
      signature: 'John Doe',
    });
    expect(mockClient.request).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text as string).status).toBe('confirmation-required');
  });

  it('io_return_mail without confirmToken returns a preview and makes NO request', async () => {
    const { call } = setup();
    mockClient.request = vi.fn();
    const result = await call('io_return_mail', { id: 401 });
    expect(mockClient.request).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text as string).status).toBe('confirmation-required');
  });
});
