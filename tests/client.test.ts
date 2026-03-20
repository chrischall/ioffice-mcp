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

  it('throws at construction if IOFFICE_HOST is not set', () => {
    expect(() => {
      const orig = process.env.IOFFICE_HOST;
      process.env.IOFFICE_HOST = '';
      try {
        new IOfficeClient();
      } finally {
        process.env.IOFFICE_HOST = orig;
      }
    }).toThrow('IOFFICE_HOST environment variable is required');
  });

  it('throws at construction if no auth credentials are set', () => {
    expect(() => {
      const origU = process.env.IOFFICE_USERNAME;
      const origP = process.env.IOFFICE_PASSWORD;
      process.env.IOFFICE_USERNAME = '';
      process.env.IOFFICE_PASSWORD = '';
      try {
        new IOfficeClient();
      } finally {
        process.env.IOFFICE_USERNAME = origU;
        process.env.IOFFICE_PASSWORD = origP;
      }
    }).toThrow('Authentication required');
  });

  it('throws at construction if only username is set (no password, no token)', () => {
    expect(() => {
      const origP = process.env.IOFFICE_PASSWORD;
      process.env.IOFFICE_PASSWORD = '';
      try {
        new IOfficeClient();
      } finally {
        process.env.IOFFICE_PASSWORD = origP;
      }
    }).toThrow('Authentication required');
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

  it('throws on other non-2xx errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    }));

    const client = new IOfficeClient();
    await expect(client.request('GET', '/buildings')).rejects.toThrow(
      'iOffice API error: 500 Internal Server Error for GET /buildings'
    );
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
