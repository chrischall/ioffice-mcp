import type { McpServer } from '@modelcontextprotocol/server';
import { createTestHarness, parseToolResult, type TestHarness } from '@chrischall/mcp-utils/test';

type Args = Record<string, unknown>;

/**
 * Drive a gated write the way a client that cannot be prompted does: call once for the
 * preview + confirmToken, then again with the token. A first call that is not a
 * confirmation request (a read, or a pre-gate refusal) is returned as-is.
 */
export async function callConfirmed(h: TestHarness, name: string, args: Args) {
  const first = await h.callTool(name, args);
  if (first.isError) return first;
  const body = parseToolResult<Args>(first);
  if (body?.status !== 'confirmation-required') return first;
  return h.callTool(name, { ...args, confirmToken: body.confirmToken });
}

/**
 * Per-call harnesses over the real MCP RPC path for one registrar: `call` makes a
 * single call (phase 1 for a gated write), `callConfirmed` completes the token flow.
 * Results are loosely typed so assertions can index into `content[0].text`.
 */
export function toolCallers(register: (server: McpServer) => void) {
  const run =
    (fn: (h: TestHarness, name: string, args: Args) => Promise<unknown>) =>
    async (name: string, args: Args = {}): Promise<any> => {
      const h = await createTestHarness(register);
      try {
        return await fn(h, name, args);
      } finally {
        await h.close();
      }
    };
  return {
    call: run((h, name, args) => h.callTool(name, args)),
    callConfirmed: run(callConfirmed),
  };
}
