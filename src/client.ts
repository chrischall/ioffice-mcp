import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  createApiClient,
  loadDotenvSafely,
  readEnvVar,
  requireEnvVar,
  type ApiClient,
} from '@chrischall/mcp-utils';

// Load .env for local dev; silently skip when the file or dotenv is absent
// (e.g. the mcpb bundle, which sets credentials via mcp_config.env).
const __dirname = dirname(fileURLToPath(import.meta.url));
await loadDotenvSafely({ path: join(__dirname, '..', '.env'), override: false });

// Re-exported from @chrischall/mcp-utils so tool modules keep importing these
// from '../client.js' while the implementation lives in the shared package.
import { buildOptionalBody } from '@chrischall/mcp-utils';
export { buildQueryString, buildOptionalBody } from '@chrischall/mcp-utils';

/**
 * Like `buildOptionalBody`, but returns `undefined` for an all-absent body so
 * callers pass `undefined` (no JSON body) instead of `{}` to `client.request`.
 * Local convenience wrapper — collapses the `Object.keys(...).length` ternary
 * that every optional-body tool call site would otherwise repeat.
 */
export function optionalBody(
  values: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> | undefined {
  const body = buildOptionalBody(values, keys);
  return Object.keys(body).length > 0 ? body : undefined;
}

/**
 * Reduce IOFFICE_HOST to the bare `host[:port]` the base URL needs. People
 * paste the tenant URL from the browser (`https://acme.iofficeconnect.com/app/`),
 * which used to build `https://https://...` and fail as an unclassified network
 * error (chrischall/fleet-audit#516). A scheme, path, query or fragment is
 * dropped; anything that is not an http(s) host returns `null`.
 */
export function normalizeHost(raw: string): string | null {
  const value = raw.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  return url.host;
}

/** What resolved from the env — never the credential value itself. */
export interface CredentialDescription {
  /** Which env var supplied the credential, or `null` when none did. */
  source: 'IOFFICE_TOKEN' | 'IOFFICE_USERNAME+IOFFICE_PASSWORD' | null;
  /** The configured tenant host, or `null` when IOFFICE_HOST is unset. */
  host: string | null;
}

export class IOfficeClient {
  private readonly api: ApiClient | null;
  private readonly configError: Error | null;
  private readonly credential: CredentialDescription;

  /**
   * Defer config errors so the server can still start (and respond to the
   * host's install-time smoke test) when env vars are missing. Tool calls
   * re-raise the error at request time.
   */
  constructor() {
    // IOFFICE_HOST is required — no tool call can work without it — but the
    // error is deferred to request time (see above), so catch requireEnvVar's
    // throw instead of letting it abort construction.
    let rawHost: string | undefined;
    let hostError: Error | null = null;
    try {
      rawHost = requireEnvVar('IOFFICE_HOST', {
        hint: 'Set it to your iOffice tenant hostname (e.g. acme.iofficeconnect.com).',
      });
    } catch (err) {
      hostError = err as Error;
    }
    const host = rawHost ? normalizeHost(rawHost) : undefined;
    const token = readEnvVar('IOFFICE_TOKEN');
    const username = readEnvVar('IOFFICE_USERNAME');
    const password = readEnvVar('IOFFICE_PASSWORD');

    let authHeaders: Record<string, string> | null = null;
    if (hostError) {
      this.configError = hostError;
    } else if (!host) {
      this.configError = new Error(
        `IOFFICE_HOST is not a valid iOffice hostname: ${JSON.stringify(rawHost)} ` +
          '(expected e.g. acme.iofficeconnect.com)',
      );
    } else if (token) {
      authHeaders = { 'x-auth-token': token };
      this.configError = null;
    } else if (username && password) {
      authHeaders = { 'x-auth-username': username, 'x-auth-password': password };
      this.configError = null;
    } else {
      this.configError = new Error(
        'Authentication required: set IOFFICE_TOKEN, or both IOFFICE_USERNAME and IOFFICE_PASSWORD',
      );
    }

    // Recorded from the SAME values the precedence above consumed, so
    // `io_healthcheck` reports what this client actually did rather than
    // re-deriving it from the env and drifting when the order changes.
    this.credential = {
      source: token
        ? 'IOFFICE_TOKEN'
        : username && password
          ? 'IOFFICE_USERNAME+IOFFICE_PASSWORD'
          : null,
      host: host ?? rawHost ?? null,
    };

    // Shared bearer-client kit, configured for iOffice's static header auth
    // (x-auth-token or x-auth-username/x-auth-password — no Bearer token, so
    // baseHeaders instead of getToken). Defaults give the fleet-standard
    // one-shot 429 retry (2 s); 204/empty bodies resolve to `undefined`
    // instead of throwing on `response.json()`.
    this.api = authHeaders
      ? createApiClient({
          baseUrl: `https://${host}/external/api/rest/v2`,
          baseHeaders: authHeaders,
          serviceName: 'iOffice',
          timeout: 30_000,
          onUnauthorized: () =>
            new Error(
              'iOffice credentials are invalid (check IOFFICE_TOKEN or IOFFICE_USERNAME/IOFFICE_PASSWORD)',
            ),
          onRateLimited: () => new Error('Rate limited by iOffice API'),
        })
      : null;
  }

  /** Which credential this client resolved, for healthcheck reporting. */
  describeCredential(): CredentialDescription {
    return this.credential;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.configError) throw this.configError;
    return this.api!.fetchJson<T>(method, path, body !== undefined ? { body } : {});
  }
}
