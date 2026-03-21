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

## Gotchas

- **ESM + NodeNext**: imports must use `.js` extensions even for `.ts` source files (e.g. `import { IOfficeClient } from './client.js'`).
- **Rate limiting**: 429 responses are retried once after 2 s; second 429 throws.
- **API base**: all requests go to `https://<IOFFICE_HOST>/external/api/rest/v2`.
- **Build before run**: `dist/` must exist before `npm run dev` or running the server manually.
- **Plugin files**: `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are for Claude Code plugin distribution — not part of the MCP runtime.
