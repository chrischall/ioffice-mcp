# ioffice-mcp

MCP server exposing iOffice workspace/facility management APIs to Claude. Uses stdio transport.

## Commands

```bash
npm run build            # tsc + esbuild bundle → dist/index.js + dist/bundle.js
npm test                 # Run tests (vitest)
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report (100% thresholds enforced)
npm run dev              # node --env-file=.env dist/index.js (requires built dist)
```

Run locally (requires built dist):
```bash
IOFFICE_HOST=tenant.ioffice.com IOFFICE_TOKEN=xxx node dist/index.js
```

## Tool naming

All tools are prefixed `io_` (e.g. `io_list_buildings`, `io_create_reservation`, `io_checkin_visitor`).

## Architecture

```
src/
  index.ts          # MCP server entry — runMcp() from @chrischall/mcp-utils, registers all tool modules, stdio transport
  client.ts         # IOfficeClient (thin wrapper over createApiClient from @chrischall/mcp-utils) + re-exported buildQueryString/buildOptionalBody + local optionalBody helper
  tools/
    buildings.ts    # io_{list,get,create,update,delete}_building
    floors.ts       # io_{list,get,create,update,delete}_floor
    spaces.ts       # io_{list,get,create,update,delete}_space
    users.ts        # io_{list,get,create,update,delete}_user
    reservations.ts # io_{list,get,create,update,delete,checkin,checkout}_reservation
    visitors.ts     # io_{list,get,create,update,checkin,checkout}_visitor
    maintenance.ts  # io_{list,get,create,update,accept,start,complete,archive}_maintenance_request
    mail.ts         # io_{list,get,create,deliver,return}_mail
    moves.ts        # io_{list,get,create,update,approve,cancel}_move
```

Each tool module exports a `register<Domain>Tools(server, client)` function that calls `server.registerTool(...)` with a zod input schema and a handler. `index.ts` constructs one `IOfficeClient` and hands it to `runMcp({ deps: client, tools: [...] })`, which passes it to every register call. Add new domains by mirroring this pattern (and add them to the `tools` array in `index.ts`).

## Environment

Create a `.env` file (never commit it) — `IOfficeClient` reads these at construction and throws if missing:

```
IOFFICE_HOST=your-tenant.ioffice.com

# Option 1: token auth (preferred) — sent as x-auth-token
IOFFICE_TOKEN=your-token

# Option 2: username/password — sent as x-auth-username / x-auth-password
IOFFICE_USERNAME=you@example.com
IOFFICE_PASSWORD=secret
```

`src/client.ts` calls `loadDotenvSafely()` (from `@chrischall/mcp-utils`) so the mcpb bundle still works when dotenv isn't packaged (mcpb injects creds via `mcp_config.env` from `manifest.json`). Env vars are read via `readEnvVar()` from the same package.

## Testing

Tests live in `tests/` (one file per tool module under `tests/tools/` + `client.test.ts` + `index.test.ts` + `version-sync.test.ts`). Run with `npm test`. No real API calls — `fetch` is mocked via `vi.stubGlobal`. `vitest.config.ts` enforces 100% line/branch/function/statement coverage on `src/**` (excluding `src/index.ts`). Failing coverage fails CI.

`version-sync.test.ts` is a CI invariant: every `// x-release-please-version` annotation in `src/` (currently the `version` in `src/index.ts`'s `runMcp` call) must match `package.json`'s `version`. The walk/assert logic lives in `@chrischall/mcp-utils/test#versionSyncTest`. It catches the recurring bug where a `src/` version drifts because it was never registered as a release-please `extra-file`.

## Plugin / Marketplace / Registry

```
.claude-plugin/
  plugin.json       # Claude Code plugin manifest
  marketplace.json  # Claude Code marketplace catalog entry
manifest.json       # MCPB (Anthropic desktop bundle) manifest — declares tools[], user_config, entry_point
server.json         # MCP Registry submission (io.github.chrischall/ioffice-mcp)
.mcp.json           # Local MCP client config
skills/ioffice-mcp/
  SKILL.md          # Claude Code skill — teaches Claude when/how to use the tools
```

The MCPB entry point is `dist/bundle.js` (esbuild output), not `dist/index.js`. `npm run build` produces both.

## Publishing constraints

The MCP Registry's [server.schema.json](https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json) caps `server.json`'s `description` at **100 characters**. Values over that fail `mcp-publisher publish` with HTTP 422 (`validation failed: expected length <= 100, location: body.description`). The other description fields (`manifest.json`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`) have no published length constraint and can stay longer.

Sanity-check before committing a description change:

```bash
jq -r '.description | length' server.json
```

## Versioning

Version appears in MANY places — all must match. release-please bumps them automatically (registered as `extra-files` in its config); if updating manually, hit each one:

1. `package.json` → `"version"`
2. `package-lock.json` → run `npm install --package-lock-only` after changing package.json (`npm version` does this)
3. `src/index.ts` → the `version` field in the `runMcp({...})` call (carries the `// x-release-please-version` marker; `version-sync.test.ts` asserts it matches package.json)
4. `manifest.json` → `"version"`
5. `server.json` → `"version"` and `packages[].version`
6. `.claude-plugin/plugin.json` → `"version"`
7. `.claude-plugin/marketplace.json` → outer `metadata.version`, `plugins[].version`, and `plugins[].source.version`

Note: all of the above track release-please's automated bumps EXCEPT `.claude-plugin/marketplace.json` → `plugins[].source.version`, which is **not** in release-please's `extra-files` (only `plugins[*].version` and `metadata.version` are) and so drifts — it currently lags at `1.1.0` while everything else is in sync. Bump `source.version` by hand when it matters, or add it to `release-please-config.json`'s `extra-files`.

### Release flow

Commits land on `main` via PR. release-please (`.github/workflows/release-please.yml`) opens or updates a `chore(main): release X.Y.Z` PR whenever Conventional-Commit messages (`feat:`, `fix:`, etc.) accumulate. Merging the release PR (arm `ready-to-merge`) creates the tag and a GitHub Release; the `publish` job then packs `.mcpb` + `.skill`, publishes to npm with provenance, and pushes to the MCP Registry.

### Important

Do NOT manually bump versions or create tags unless the user explicitly asks. release-please owns versioning.

## Gotchas

- **ESM + NodeNext**: imports must use `.js` extensions even for `.ts` source files (e.g. `import { IOfficeClient } from './client.js'`).
- **HTTP behavior lives in `@chrischall/mcp-utils`**: `client.ts` delegates to `createApiClient`, which gives the fleet-standard one-shot 429 retry (2 s, then throws), 401 → fixed message via `onUnauthorized` (credentials never logged), 30 s timeout, and 204/empty-body → `undefined`. To change retry/timeout/error behavior, look at the `createApiClient({...})` options in `client.ts`, not a hand-rolled fetch wrapper.
- **API base**: all requests go to `https://<IOFFICE_HOST>/external/api/rest/v2`.
- **Build before run**: `dist/` must exist before `npm run dev` or running the server manually. `npm run build` runs `tsc` and then bundles `src/index.ts` with esbuild into `dist/bundle.js`.
- **stdio transport**: stdout is reserved for JSON-RPC. The startup banner is passed to `runMcp({ banner })` (which writes it to **stderr**), not `console.log`. Keep any logging off stdout.
- **dotenv is optional at runtime**: `client.ts` calls `loadDotenvSafely()` so the mcpb bundle (which externalizes `dotenv`) still works — credentials come from `process.env` in that path.
- **Plugin files**: `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are for Claude Code plugin distribution — not part of the MCP runtime.

<!-- pr-workflow:v3 -->
## Pull requests & release notes

Fleet policy — Conventional-Commit PR titles, labels, the auto-review /
auto-merge ladder, auto-review follow-up issues, PR timing, and release PRs —
lives in `~/.claude/CLAUDE.md`. Don't restate it here; the copies drifted.

Shared technical conventions (publishing, bundling, versioning guards,
write-verification, transport archetypes, testing traps) live in
[`chrischall/workflows`](https://github.com/chrischall/workflows):
`docs/fleet-conventions.md`, plus `README.md` for the CI pipeline contract.

