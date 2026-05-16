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
  index.ts          # MCP server entry — wires McpServer, registers all tool modules, stdio transport
  client.ts         # IOfficeClient (fetch wrapper) + buildQueryString helper
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

Each tool module exports a `register<Domain>Tools(server, client)` function that calls `server.registerTool(...)` with a zod input schema and a handler. `index.ts` constructs one `IOfficeClient` and passes it to every register call. Add new domains by mirroring this pattern.

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

`src/client.ts` calls `dotenv` inside a `try { await import('dotenv') }` so the mcpb bundle still works when dotenv isn't packaged (mcpb injects creds via `mcp_config.env` from `manifest.json`).

## Testing

Tests live in `tests/` (one file per tool module + `client.test.ts` + `index.test.ts`). Run with `npm test`. No real API calls — `fetch` is mocked via `vi.stubGlobal`. `vitest.config.ts` enforces 100% line/branch/function/statement coverage on `src/**` (excluding `src/index.ts`). Failing coverage fails CI.

## Plugin / Marketplace / Registry

```
.claude-plugin/
  plugin.json       # Claude Code plugin manifest
  marketplace.json  # Claude Code marketplace catalog entry
manifest.json       # MCPB (Anthropic desktop bundle) manifest — declares tools[], user_config, entry_point
server.json         # MCP Registry submission (io.github.chrischall/ioffice-mcp)
.mcp.json           # Local MCP client config
SKILL.md            # Claude Code skill — teaches Claude when/how to use the tools
```

The MCPB entry point is `dist/bundle.js` (esbuild output), not `dist/index.js`. `npm run build` produces both.

## Versioning

Version appears in MANY places — all must match. The **Tag & Bump** GitHub Action handles them automatically; if updating manually, hit each one:

1. `package.json` → `"version"`
2. `package-lock.json` → run `npm install --package-lock-only` after changing package.json (`npm version` does this)
3. `src/index.ts` → `McpServer` constructor `version` field
4. `manifest.json` → `"version"`
5. `server.json` → `"version"` and `packages[].version`
6. `.claude-plugin/plugin.json` → `"version"`
7. `.claude-plugin/marketplace.json` → outer `metadata.version`, `plugins[].version`, and `plugins[].source.version`

Note: `package.json` / `manifest.json` / `server.json` are currently at `2.0.2`; the `.claude-plugin/*` files lag at `1.1.0` because the Tag & Bump bumper only rewrites them when `o.version` exists at the top level of each object it touches.

### Important

Do NOT manually bump versions or create tags unless the user explicitly asks. Versioning is handled by the **Tag & Bump** GitHub Action (`.github/workflows/tag-and-bump.yml`).

### Release workflow

Main is always one version ahead of the latest tag. To release, run the **Tag & Bump** workflow (`workflow_dispatch`) which:

1. Runs CI (build + test) via the reusable `ci.yml`
2. Tags the current commit `vX.Y.Z` with the current `package.json` version
3. Bumps patch via `npm version patch --no-git-tag-version` plus a node script that walks every JSON version field (and `sed` for `src/index.ts`)
4. Rebuilds (`npm run build`), commits, and pushes main + tag
5. The tag push triggers `.github/workflows/release.yml` (npm publish + GitHub release with auto-generated notes per `.github/release.yml`)

## Gotchas

- **ESM + NodeNext**: imports must use `.js` extensions even for `.ts` source files (e.g. `import { IOfficeClient } from './client.js'`).
- **Rate limiting**: 429 responses are retried once after 2 s; a second 429 throws.
- **Auth errors**: 401 throws a fixed message — credentials are never logged.
- **API base**: all requests go to `https://<IOFFICE_HOST>/external/api/rest/v2`.
- **Build before run**: `dist/` must exist before `npm run dev` or running the server manually. `npm run build` runs `tsc` and then bundles `src/index.ts` with esbuild into `dist/bundle.js`.
- **stdio transport**: stdout is reserved for JSON-RPC. The startup banner in `src/index.ts` goes to **stderr** via `console.error`. Keep it that way for any logging.
- **dotenv is optional at runtime**: `client.ts` imports it inside a try/catch so the mcpb bundle (which externalizes `dotenv`) still works — credentials come from `process.env` in that path.
- **Plugin files**: `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are for Claude Code plugin distribution — not part of the MCP runtime.

<!-- pr-workflow:v1 -->
## Pull requests & release notes

**Default workflow: branch + PR, even for solo work.** Direct pushes to `main` skip review *and* skip auto-generated release notes — GitHub's `generate_release_notes` (configured in `.github/release.yml`) only picks up merged PRs. Push directly to `main` only when the user explicitly asks for it (e.g. emergency hotfix).

For every PR, apply exactly one label so it lands in the right release-notes section:

| Label                | Section in release notes |
|----------------------|--------------------------|
| `enhancement`        | Features                 |
| `bug`                | Bug Fixes                |
| `security`           | Security                 |
| `refactor`           | Refactor                 |
| `documentation`      | Documentation            |
| `test`               | Tests                    |
| `dependencies`       | Dependencies             |
| `ci` / `github_actions` | CI & Build            |
| *(none / unmatched)* | Other Changes            |
| `ignore-for-release` | Hidden from notes        |

The **PR title** becomes the bullet — write it like a user-facing changelog entry, not internal shorthand. Conventional-commit prefixes are still fine in commit messages, but the PR title should read clean.

Open with `gh pr create --label <label>` (or `--label ignore-for-release` for chores not worth a line), then **immediately** run `gh pr merge <num> --auto --merge` so the PR merges as soon as CI passes. The repo allows merge commits only (no squash, no rebase) — don't pass `--squash`/`--rebase` or the call will fail.
