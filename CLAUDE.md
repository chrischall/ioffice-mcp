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
3. `src/index.ts` → `McpServer` constructor `version` field
4. `manifest.json` → `"version"`
5. `server.json` → `"version"` and `packages[].version`
6. `.claude-plugin/plugin.json` → `"version"`
7. `.claude-plugin/marketplace.json` → outer `metadata.version`, `plugins[].version`, and `plugins[].source.version`

Note: `package.json` / `manifest.json` / `server.json` are currently at `2.0.2`; the `.claude-plugin/*` files lag at `1.1.0` because they were added to release-please's `extra-files` set after the earlier bumps and have not yet been carried forward by a release PR.

### Release flow

Commits land on `main` via PR. release-please (`.github/workflows/release-please.yml`) opens or updates a `chore(main): release X.Y.Z` PR whenever Conventional-Commit messages (`feat:`, `fix:`, etc.) accumulate. Merging the release PR (arm `ready-to-merge`) creates the tag and a GitHub Release; the `publish` job then packs `.mcpb` + `.skill`, publishes to npm with provenance, and pushes to the MCP Registry.

### Important

Do NOT manually bump versions or create tags unless the user explicitly asks. release-please owns versioning.

## Gotchas

- **ESM + NodeNext**: imports must use `.js` extensions even for `.ts` source files (e.g. `import { IOfficeClient } from './client.js'`).
- **Rate limiting**: 429 responses are retried once after 2 s; a second 429 throws.
- **Auth errors**: 401 throws a fixed message — credentials are never logged.
- **API base**: all requests go to `https://<IOFFICE_HOST>/external/api/rest/v2`.
- **Build before run**: `dist/` must exist before `npm run dev` or running the server manually. `npm run build` runs `tsc` and then bundles `src/index.ts` with esbuild into `dist/bundle.js`.
- **stdio transport**: stdout is reserved for JSON-RPC. The startup banner in `src/index.ts` goes to **stderr** via `console.error`. Keep it that way for any logging.
- **dotenv is optional at runtime**: `client.ts` imports it inside a try/catch so the mcpb bundle (which externalizes `dotenv`) still works — credentials come from `process.env` in that path.
- **Plugin files**: `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are for Claude Code plugin distribution — not part of the MCP runtime.

<!-- pr-workflow:v2 -->
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

The **PR title MUST be a Conventional Commit**, written user-facing (`fix(scope): …`, `feat(scope): …`), not internal shorthand. Because the repo squash-merges, the PR title *becomes the squash commit's subject line* — the only thing release-please parses to pick the version bump and changelog section. Only `feat` (minor), `fix` (patch), and `!`/`BREAKING CHANGE` (major) cut a release; `perf`/`refactor`/`docs` show in the changelog without bumping; `ci`/`test`/`build`/`chore` are recognised but hidden (see `release-please-config.json` → `changelog-sections`). A title without a conventional type is invisible to release-please — no bump, no changelog line. Prefixes in *individual commits* don't help; squash keeps only the title.

### How PRs merge

**Don't run `gh pr merge` yourself.** The automation does it:

1. `pr-auto-review.yml` runs a Claude review on every PR **except** the release-please release PR (which it deliberately skips). On a `pass` verdict it adds the `ready-to-merge` label.
2. `auto-merge.yml`, on the `ready-to-merge` label (or on a dependabot PR), arms `gh pr merge --auto --squash`. The moment CI is green the PR squash-merges itself.

For ordinary feature/fix PRs, opening with `gh pr create --label <label>` (or `--label ignore-for-release` for chores not worth a release-notes line) is the whole job. If Claude's verdict was `warn`/`fail` but you've decided to ship anyway, add the label yourself: `gh pr edit <num> --add-label ready-to-merge`.

### PR timing — only open when the feature is done

Because PRs auto-merge as soon as auto-review passes, **do not open a PR until the feature is genuinely complete**. There's no draft-PR safety net here:

- Don't open a PR to "stage" work while live verification, follow-up fixes, or final passes are still pending — by the time you finish those, the half-baked PR may already be in `main`.
- Push commits to the branch first; only run `gh pr create` once tests pass, live verification (if applicable) is green, and you'd be comfortable with the change shipping as-is.
- If follow-ups land after a PR is already open, they need to land on the same branch *before* auto-review flips to `pass`. Once the PR squash-merges, late commits orphan onto a stale branch and become their own follow-up PR.
- If you genuinely need a checkpoint review without shipping, open the PR as a GitHub draft (`gh pr create --draft …`) — auto-review skips drafts. Mark it ready-for-review only when the feature is truly done.

**Release PRs are the one manual touch.** release-please opens its own release PR and leaves it open as your staging artifact — `pr-auto-review.yml` skips it on purpose, so it sits there accumulating changes until you decide to ship. When you're ready, add `ready-to-merge` to it the same way: `gh pr edit <num> --add-label ready-to-merge`. The `auto-merge.yml` arm then takes over and the publish job fires the moment the release PR lands.

The repo allows squash-merge only — `--merge` and `--rebase` are blocked at the branch-protection ruleset level.
