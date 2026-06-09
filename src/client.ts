import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  createApiClient,
  loadDotenvSafely,
  readEnvVar,
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

export class IOfficeClient {
  private readonly api: ApiClient | null;
  private readonly configError: Error | null;

  /**
   * Defer config errors so the server can still start (and respond to the
   * host's install-time smoke test) when env vars are missing. Tool calls
   * re-raise the error at request time.
   */
  constructor() {
    const host = readEnvVar('IOFFICE_HOST');
    const token = readEnvVar('IOFFICE_TOKEN');
    const username = readEnvVar('IOFFICE_USERNAME');
    const password = readEnvVar('IOFFICE_PASSWORD');

    let authHeaders: Record<string, string> | null = null;
    if (!host) {
      this.configError = new Error('IOFFICE_HOST environment variable is required');
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

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.configError) throw this.configError;
    return this.api!.fetchJson<T>(method, path, body !== undefined ? { body } : {});
  }
}
