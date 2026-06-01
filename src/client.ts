import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { formatApiError, loadDotenvSafely } from '@chrischall/mcp-utils';

// Load .env for local dev; silently skip when the file or dotenv is absent
// (e.g. the mcpb bundle, which sets credentials via mcp_config.env).
const __dirname = dirname(fileURLToPath(import.meta.url));
await loadDotenvSafely({ path: join(__dirname, '..', '.env'), override: false });

// Re-exported from @chrischall/mcp-utils so tool modules keep importing these
// from '../client.js' while the implementation lives in the shared package.
export { buildQueryString, buildOptionalBody } from '@chrischall/mcp-utils';

export class IOfficeClient {
  private readonly baseUrl: string | null;
  private readonly authHeaders: Record<string, string> | null;
  private readonly configError: Error | null;

  /**
   * Defer config errors so the server can still start (and respond to the
   * host's install-time smoke test) when env vars are missing. Tool calls
   * re-raise the error at request time.
   */
  constructor() {
    const host = process.env.IOFFICE_HOST;
    const token = process.env.IOFFICE_TOKEN;
    const username = process.env.IOFFICE_USERNAME;
    const password = process.env.IOFFICE_PASSWORD;

    if (!host) {
      this.baseUrl = null;
      this.authHeaders = null;
      this.configError = new Error('IOFFICE_HOST environment variable is required');
    } else if (token) {
      this.baseUrl = `https://${host}/external/api/rest/v2`;
      this.authHeaders = { 'x-auth-token': token };
      this.configError = null;
    } else if (username && password) {
      this.baseUrl = `https://${host}/external/api/rest/v2`;
      this.authHeaders = { 'x-auth-username': username, 'x-auth-password': password };
      this.configError = null;
    } else {
      this.baseUrl = null;
      this.authHeaders = null;
      this.configError = new Error(
        'Authentication required: set IOFFICE_TOKEN, or both IOFFICE_USERNAME and IOFFICE_PASSWORD',
      );
    }
  }

  private requireConfig(): { baseUrl: string; authHeaders: Record<string, string> } {
    if (this.configError) throw this.configError;
    return { baseUrl: this.baseUrl!, authHeaders: this.authHeaders! };
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    return this.doRequest<T>(method, path, body, false);
  }

  private async doRequest<T>(
    method: string,
    path: string,
    body: unknown,
    isRetry: boolean
  ): Promise<T> {
    const { baseUrl, authHeaders } = this.requireConfig();
    const headers: Record<string, string> = {
      ...authHeaders,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30000),
    });

    if (response.status === 401) {
      throw new Error('iOffice credentials are invalid (check IOFFICE_TOKEN or IOFFICE_USERNAME/IOFFICE_PASSWORD)');
    }

    if (response.status === 429) {
      if (!isRetry) {
        await new Promise<void>((r) => setTimeout(r, 2000));
        return this.doRequest<T>(method, path, body, true);
      }
      throw new Error('Rate limited by iOffice API');
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(formatApiError(response.status, method, path, errorText, { service: 'iOffice' }));
    }

    return response.json() as Promise<T>;
  }
}
