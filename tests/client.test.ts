import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.IOFFICE_HOST = 'test.ioffice.com';
process.env.IOFFICE_USERNAME = 'testuser';
process.env.IOFFICE_PASSWORD = 'testpass';

const { IOfficeClient, buildQueryString } = await import('../src/client.js');

describe('IOfficeClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.IOFFICE_TOKEN;
  });

  // Constructor stays silent so the server can boot and respond to the host's
  // install-time smoke test before the user has filled in env vars. The same
  // error surfaces at request time instead.
  async function expectDeferred(missing: 'host' | 'auth' | 'partial-auth', message: RegExp | string) {
    const orig = {
      IOFFICE_HOST: process.env.IOFFICE_HOST,
      IOFFICE_TOKEN: process.env.IOFFICE_TOKEN,
      IOFFICE_USERNAME: process.env.IOFFICE_USERNAME,
      IOFFICE_PASSWORD: process.env.IOFFICE_PASSWORD,
    };
    try {
      if (missing === 'host') process.env.IOFFICE_HOST = '';
      else if (missing === 'auth') {
        process.env.IOFFICE_USERNAME = '';
        process.env.IOFFICE_PASSWORD = '';
        delete process.env.IOFFICE_TOKEN;
      } else if (missing === 'partial-auth') {
        process.env.IOFFICE_PASSWORD = '';
        delete process.env.IOFFICE_TOKEN;
      }
      const client = new IOfficeClient();
      await expect(client.request('GET', '/anything')).rejects.toThrow(message);
    } finally {
      Object.assign(process.env, orig);
    }
  }

  it('defers the missing-host error until request time', async () => {
    await expectDeferred('host', 'IOFFICE_HOST environment variable is required');
  });

  it('defers "no auth configured" until request time', async () => {
    await expectDeferred('auth', 'Authentication required');
  });

  it('defers "partial auth (username without password)" until request time', async () => {
    await expectDeferred('partial-auth', 'Authentication required');
  });

  it('sends x-auth-username and x-auth-password headers when using username/password auth', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new IOfficeClient();
    await client.request('GET', '/buildings');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://test.ioffice.com/external/api/rest/v2/buildings',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-auth-username': 'testuser',
          'x-auth-password': 'testpass',
        }),
      })
    );
  });

  it('sends x-auth-token header when IOFFICE_TOKEN is set', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    process.env.IOFFICE_TOKEN = 'my-api-token';
    const client = new IOfficeClient();
    await client.request('GET', '/buildings');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-auth-token': 'my-api-token' }),
      })
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.not.objectContaining({ 'x-auth-username': expect.anything() }),
      })
    );
  });

  it('prefers IOFFICE_TOKEN over username/password when both are set', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    process.env.IOFFICE_TOKEN = 'token-takes-priority';
    const client = new IOfficeClient();
    await client.request('GET', '/buildings');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-auth-token': 'token-takes-priority' }),
      })
    );
  });

  it('throws on 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    }));

    const client = new IOfficeClient();
    await expect(client.request('GET', '/buildings')).rejects.toThrow(
      'iOffice credentials are invalid'
    );
  });

  it('retries once on 429 then succeeds', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ results: [] }) });
    vi.stubGlobal('fetch', mockFetch);
    vi.useFakeTimers();

    const client = new IOfficeClient();
    const promise = client.request('GET', '/buildings');
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ results: [] });
    vi.useRealTimers();
  });

  it('throws after two 429 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    }));
    vi.useFakeTimers();

    const client = new IOfficeClient();
    const promise = client.request('GET', '/buildings');
    const assertion = expect(promise).rejects.toThrow('Rate limited by iOffice API');
    await vi.advanceTimersByTimeAsync(2000);
    await assertion;
    vi.useRealTimers();
  });

  it('throws on other non-2xx errors with the redacted formatApiError message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'upstream exploded',
    }));

    const client = new IOfficeClient();
    // formatApiError (from @chrischall/mcp-utils) formats as
    // "{service} error {status} for {METHOD} {path}: {body}" with the
    // upstream body run through token-redaction + truncation first.
    await expect(client.request('GET', '/buildings')).rejects.toThrow(
      'iOffice error 500 for GET /buildings: upstream exploded'
    );
  });

  it('drops the body from the error when the upstream sends an empty body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => '',
    }));

    const client = new IOfficeClient();
    await expect(client.request('GET', '/buildings')).rejects.toThrow(
      'iOffice error 500 for GET /buildings'
    );
  });

  it('falls back to an empty body when reading the error body fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      text: async () => {
        throw new Error('stream already consumed');
      },
    }));

    const client = new IOfficeClient();
    await expect(client.request('GET', '/buildings')).rejects.toThrow(
      'iOffice error 503 for GET /buildings'
    );
  });

  it('aborts the request after a 30s timeout', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new IOfficeClient();
    await client.request('GET', '/buildings');

    const opts = mockFetch.mock.calls[0][1];
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it('sends POST body as JSON', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 1, name: 'HQ' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new IOfficeClient();
    await client.request('POST', '/buildings', { name: 'HQ' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'HQ' }),
      })
    );
  });

  it('does not send body for GET requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', mockFetch);

    const client = new IOfficeClient();
    await client.request('GET', '/buildings');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.not.objectContaining({ body: expect.anything() })
    );
  });
});

describe('buildQueryString', () => {
  it('returns empty string when no params', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('builds query string from params', () => {
    expect(buildQueryString({ limit: 10, startAt: 0 })).toBe('?limit=10&startAt=0');
  });

  it('omits undefined values', () => {
    expect(buildQueryString({ search: undefined, limit: 50 })).toBe('?limit=50');
  });

  it('omits null values', () => {
    expect(buildQueryString({ search: null, limit: 50 })).toBe('?limit=50');
  });

  it('omits empty string values', () => {
    expect(buildQueryString({ search: '', limit: 50 })).toBe('?limit=50');
  });

  it('encodes special characters', () => {
    const qs = buildQueryString({ search: 'floor & lobby' });
    expect(qs).toBe('?search=floor%20%26%20lobby');
  });
});
