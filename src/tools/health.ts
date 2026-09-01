import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readEnvVar } from '@chrischall/mcp-utils';
import { registerCredentialHealthcheckTool } from '@chrischall/mcp-utils/healthcheck';
import type { IOfficeClient } from '../client.js';

/**
 * `io_healthcheck` — the one call that answers "is this connector working?",
 * and the only tool here that reports a failure as DATA rather than throwing.
 *
 * iOffice had none. All 52 tools are functional operations, so the closest
 * stand-in was `io_list_buildings` — a buildings query, which is the problem:
 * an empty or failed result reads as a data problem when the real cause is
 * that nothing ever authenticated.
 *
 * Two distinctions this makes that a failed read cannot:
 *
 *  - **Host vs credential.** `IOFFICE_HOST` and the credential are separate
 *    halves of the configuration. A perfect token with no host has nowhere to
 *    go, and telling someone to check their token is the wrong fix.
 *  - **Rate limit vs rejection.** The far side answering "not now" is not the
 *    far side rejecting the credential; conflating them sends someone to
 *    rotate a token that is fine.
 */

/** Non-secret read of the env: which credential is configured, never its value. */
type ReadEnv = (key: string) => string | undefined;

const NO_HOST = 'IOFFICE_HOST environment variable is required';

export function classifyIOfficeError(err: unknown): { kind: string; hint?: string } | undefined {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes(NO_HOST)) {
    return {
      kind: 'no_host',
      hint:
        'No iOffice host configured. Set IOFFICE_HOST to your tenant hostname (e.g. acme.iofficeconnect.com). ' +
        'The credential is a separate setting — this says nothing about whether it is valid.',
    };
  }
  if (msg.includes('credentials are invalid')) {
    return {
      kind: 'credential_rejected',
      hint: 'iOffice rejected the credential. Check IOFFICE_TOKEN, or IOFFICE_USERNAME and IOFFICE_PASSWORD.',
    };
  }
  // The far side working correctly and saying "not now".
  if (msg.includes('Rate limited')) {
    return {
      kind: 'rate_limited',
      hint: 'iOffice rate-limited the probe. The credential is fine — retry in a moment.',
    };
  }
  return undefined;
}

export function registerHealthcheckTools(
  server: McpServer,
  client: IOfficeClient,
  /** Seam: injectable so tests need no process env. */
  readEnv: ReadEnv = (k) => readEnvVar(k),
): void {
  registerCredentialHealthcheckTool({
    server,
    prefix: 'io',
    hostLabel: 'iOffice',
    probePath: '/buildings',
    resolveCredential: async () => {
      const host = readEnv('IOFFICE_HOST');
      // Ordered as the client orders it: no host is fatal regardless of
      // credential, so it is reported first rather than as "no credential".
      if (!host) throw new Error(NO_HOST);

      const source = readEnv('IOFFICE_TOKEN')
        ? 'IOFFICE_TOKEN'
        : readEnv('IOFFICE_USERNAME') && readEnv('IOFFICE_PASSWORD')
          ? 'IOFFICE_USERNAME+IOFFICE_PASSWORD'
          : null;
      // `source: null` short-circuits the probe: probing without a credential
      // returns a 401 that reads like a rejected one and points at the wrong fix.
      return { source, detail: { host } };
    },
    // The cheapest authenticated read in the API, capped to one row: it
    // proves auth without pulling a tenant's entire building list.
    probeFn: () => client.request('GET', '/buildings?limit=1'),
    classifyThrown: classifyIOfficeError,
  });
}
