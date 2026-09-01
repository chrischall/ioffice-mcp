import { describe, it, expect, vi, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IOfficeClient as RealIOfficeClient, type IOfficeClient } from '../../src/client.js';
import { registerHealthcheckTools } from '../../src/tools/health.js';

function setup(env: Record<string, string | undefined>, probe?: () => Promise<unknown>) {
  const request = vi.fn(probe ?? (async () => ({ data: [] })));
  // Mirrors IOfficeClient.describeCredential()'s own precedence, driven from
  // the same env shape the old test used.
  const describeCredential = () => ({
    source: env.IOFFICE_TOKEN
      ? ('IOFFICE_TOKEN' as const)
      : env.IOFFICE_USERNAME && env.IOFFICE_PASSWORD
        ? ('IOFFICE_USERNAME+IOFFICE_PASSWORD' as const)
        : null,
    host: env.IOFFICE_HOST ?? null,
  });
  const client = { request, describeCredential } as unknown as IOfficeClient;
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  registerHealthcheckTools(server, client);
  const call = async () =>
    JSON.parse((await (server as any)._registeredTools.io_healthcheck.handler({}, {})).content[0].text);
  return { server, call, request };
}

const FULL = { IOFFICE_HOST: 'acme.iofficeconnect.com', IOFFICE_TOKEN: 'TKN' };

afterEach(() => vi.clearAllMocks());

describe('io_healthcheck', () => {
  it('registers under the repo tool prefix', () => {
    const { server } = setup(FULL);
    expect(Object.keys((server as any)._registeredTools)).toEqual(['io_healthcheck']);
  });

  it('reports ok when the credential resolves and the probe succeeds', async () => {
    const out = await setup(FULL).call();
    expect(out.ok).toBe(true);
    expect(out.credential.resolved).toBe(true);
  });

  it('probes a cheap read rather than listing everything', async () => {
    const { call, request } = setup(FULL);
    await call();
    expect(request).toHaveBeenCalledWith('GET', '/buildings?limit=1');
  });

  it('names the token as the credential source', async () => {
    expect((await setup(FULL).call()).credential.source).toBe('IOFFICE_TOKEN');
  });

  it('names the username/password pair as the credential source', async () => {
    const out = await setup({ IOFFICE_HOST: 'h', IOFFICE_USERNAME: 'u', IOFFICE_PASSWORD: 'p' }).call();
    expect(out.credential.source).toBe('IOFFICE_USERNAME+IOFFICE_PASSWORD');
  });

  it('never echoes the credential itself', async () => {
    const out = await setup({ IOFFICE_HOST: 'h', IOFFICE_TOKEN: 'SUPER-SECRET' }).call();
    expect(JSON.stringify(out)).not.toContain('SUPER-SECRET');
  });

  it('reports the host, which is half the configuration', async () => {
    expect((await setup(FULL).call()).credential.detail.host).toBe('acme.iofficeconnect.com');
  });

  // A missing host is not a missing credential: the credential can be perfect
  // and the server still has nowhere to send it.
  it('distinguishes a missing host from a missing credential', async () => {
    const out = await setup({ IOFFICE_TOKEN: 'TKN' }).call();
    expect(out.ok).toBe(false);
    expect(out.error.kind).toBe('no_host');
    expect(out.hint).toMatch(/IOFFICE_HOST/);
  });

  it('reports missing auth as no_credential', async () => {
    const out = await setup({ IOFFICE_HOST: 'h' }).call();
    expect(out.ok).toBe(false);
    expect(out.error.kind).toBe('no_credential');
  });

  it('treats a half-configured pair as missing, not as a rejected credential', async () => {
    const out = await setup({ IOFFICE_HOST: 'h', IOFFICE_USERNAME: 'u' }).call();
    expect(out.error.kind).toBe('no_credential');
  });

  it('reports invalid credentials as credential_rejected', async () => {
    const out = await setup(FULL, async () => {
      throw new Error('iOffice credentials are invalid (check IOFFICE_TOKEN or IOFFICE_USERNAME/IOFFICE_PASSWORD)');
    }).call();
    expect(out.ok).toBe(false);
    expect(out.error.kind).toBe('credential_rejected');
  });

  // Rate limiting is the far side working correctly and saying "not now".
  // Called a rejected credential, it sends someone to rotate a good token.
  it('separates rate limiting from a rejected credential', async () => {
    const out = await setup(FULL, async () => { throw new Error('Rate limited by iOffice API'); }).call();
    expect(out.error.kind).toBe('rate_limited');
    expect(out.error.kind).not.toBe('credential_rejected');
  });

  it('leaves an unrecognised failure to the helper defaults', async () => {
    const out = await setup(FULL, async () => { throw new Error('socket hang up'); }).call();
    expect(out.ok).toBe(false);
    expect(out.error.kind).not.toBe('rate_limited');
  });

  // Drives a REAL IOfficeClient so the healthcheck is verified against the
  // precedence the client actually applies, not a restatement of it.
  it('reports what a real client resolved, without echoing the credential', async () => {
    vi.stubEnv('IOFFICE_HOST', 'real.iofficeconnect.com');
    vi.stubEnv('IOFFICE_TOKEN', 'REAL-TKN');
    const real = new RealIOfficeClient();
    (real as unknown as { api: unknown }).api = { fetchJson: async () => ({ data: [] }) };
    const server = new McpServer({ name: 'test', version: '0.0.0' });
    registerHealthcheckTools(server, real);
    const out = JSON.parse(
      (await (server as any)._registeredTools.io_healthcheck.handler({}, {})).content[0].text,
    );
    expect(out.credential.source).toBe('IOFFICE_TOKEN');
    expect(out.credential.detail.host).toBe('real.iofficeconnect.com');
    expect(JSON.stringify(out)).not.toContain('REAL-TKN');
    vi.unstubAllEnvs();
  });

  it('prefers the token over a username/password pair, as the client does', async () => {
    vi.stubEnv('IOFFICE_HOST', 'h');
    vi.stubEnv('IOFFICE_TOKEN', 'T');
    vi.stubEnv('IOFFICE_USERNAME', 'u');
    vi.stubEnv('IOFFICE_PASSWORD', 'p');
    expect(new RealIOfficeClient().describeCredential().source).toBe('IOFFICE_TOKEN');
    vi.unstubAllEnvs();
  });

  it('classifies a non-Error throw without crashing', async () => {
    const out = await setup(FULL, async () => { throw 'Rate limited by iOffice API'; }).call();
    expect(out.error.kind).toBe('rate_limited');
  });
});
