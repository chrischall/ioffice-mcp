# ioffice-mcp

MCP server exposing iOffice workspace/facility management APIs to Claude. Uses stdio transport.

## Commands

```bash
npm run build            # Compile TypeScript → dist/
npm test                 # Run tests (vitest)
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

Run locally (requires built dist):
```bash
IOFFICE_HOST=tenant.ioffice.com IOFFICE_TOKEN=xxx node dist/index.js
```

## Environment

Create a `.env` file (never commit it):

```
IOFFICE_HOST=your-tenant.ioffice.com

# Option 1: token auth
IOFFICE_TOKEN=your-token

# Option 2: username/password auth
IOFFICE_USERNAME=you@example.com
IOFFICE_PASSWORD=secret
```

`IOfficeClient` (`src/client.ts`) reads these at startup and throws if missing.

## Architecture

```
src/
  index.ts          # MCP server entry — registers all tools, routes by name
  client.ts         # IOfficeClient (HTTP) + buildQueryString helper
  tools/
    buildings.ts    # io_list/get/create/update/delete_building
    floors.ts       # io_list/get/create/update/delete_floor
    spaces.ts       # io_list/get/create/update/delete_space
    users.ts        # io_list/get/create/update/delete_user
    reservations.ts # io_list/get/create/update/delete/checkin/checkout_reservation
    visitors.ts     # io_list/get/create/update/checkin/checkout_visitor
    maintenance.ts  # io_list/get/create/update/accept/start/complete/archive_maintenance_request
    mail.ts         # io_list/get/create/deliver/return_mail
    moves.ts        # io_list/get/create/update/approve/cancel_move
```

Each tool file exports `toolDefinitions: Tool[]` and `handleTool(name, args, client)`. Wire new domains in `src/index.ts` following the same pattern.

## Testing

Tests live in `tests/`. Run with `npm test`. No real API calls — `fetch` is mocked via `vi.stubGlobal`.

## Plugin / Marketplace

```
.claude-plugin/
  plugin.json       # Claude Code plugin manifest (MCP server config)
  marketplace.json  # Marketplace catalog entry
SKILL.md            # Claude Code skill — teaches Claude when/how to use the tools
```

## Versioning

Version appears in FOUR places — all must match:

1. `package.json` → `"version"`
2. `package-lock.json` → run `npm install --package-lock-only` after changing package.json
3. `src/index.ts` → `Server` constructor `version` field
4. `manifest.json` → `"version"`

### Important

Do NOT manually bump versions or create tags unless the user explicitly asks. Versioning is handled by the **Cut & Bump** GitHub Action.

### Release workflow

Main is always one version ahead of the latest tag. To release, run the **Cut & Bump** GitHub Action (`cut-and-bump.yml`) which:

1. Runs CI (build + test)
2. Tags the current commit with the current version
3. Bumps patch in all four files
4. Rebuilds, commits, and pushes main + tag
5. The tag push triggers the **Release** workflow (CI + npm publish + GitHub release)

## Gotchas

- **ESM + NodeNext**: imports must use `.js` extensions even for `.ts` source files (e.g. `import { IOfficeClient } from './client.js'`).
- **Rate limiting**: 429 responses are retried once after 2 s; second 429 throws.
- **API base**: all requests go to `https://<IOFFICE_HOST>/external/api/rest/v2`.
- **Build before run**: `dist/` must exist before `npm run dev` or running the server manually.
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
