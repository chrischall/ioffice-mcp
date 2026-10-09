// Invariant: every shipped MCP client config can actually launch the server
// with every credential the server accepts.
//
// The Claude Code plugin once forwarded only IOFFICE_HOST and IOFFICE_TOKEN, so
// a username/password user got "Authentication required" on every call
// (chrischall/fleet-audit#515). And `.mcp.json` ships in the npm tarball, so a
// cwd-relative `dist/index.js` only resolved from the repo root
// (chrischall/fleet-audit#521).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel: string) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

const ENV_VARS = ['IOFFICE_HOST', 'IOFFICE_TOKEN', 'IOFFICE_USERNAME', 'IOFFICE_PASSWORD'];

const CONFIGS: Record<string, { command: string; args: string[]; env: Record<string, string> }> = {
  '.claude-plugin/plugin.json': readJson('.claude-plugin/plugin.json').mcpServers.ioffice,
  '.mcp.json': readJson('.mcp.json').mcpServers.ioffice,
};

describe.each(Object.entries(CONFIGS))('%s', (_file, server) => {
  it('forwards every credential env var the server reads', () => {
    for (const name of ENV_VARS) expect(server.env[name]).toBe(`\${${name}}`);
  });

  it('launches without depending on the client working directory', () => {
    for (const arg of server.args) expect(arg).not.toMatch(/^(\.\/)?dist\//);
  });
});
