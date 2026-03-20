---
name: ioffice-mcp
description: Access iOffice facility management data via MCP. Use when the user asks about iOffice buildings, floors, spaces, rooms, reservations, visitors, maintenance requests, mail, or moves. Triggers on phrases like "check iOffice", "reserve a room", "list buildings", "visitor check-in", "maintenance request", "mail tracking", "move request", or any request involving facility management. Requires ioffice-mcp installed and the ioffice server registered (see Setup below).
---

# ioffice-mcp

MCP server for iOffice — provides full read/write access to buildings, floors, spaces, users, reservations, visitors, maintenance requests, mail, and moves.

## Setup

### Option A — Claude Code (direct MCP, no mcporter)

Add to `.mcp.json` in your project or `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "ioffice": {
      "command": "npx",
      "args": ["-y", "ioffice-mcp"],
      "env": {
        "IOFFICE_HOST": "yourcompany.ioffice.com",
        "IOFFICE_USERNAME": "your-username",
        "IOFFICE_PASSWORD": "your-password"
      }
    }
  }
}
```

### Option B — from source

```bash
git clone https://github.com/chrischall/ioffice-mcp
cd ioffice-mcp
npm install && npm run build
cp .env.example .env
# Edit .env: set IOFFICE_HOST, IOFFICE_USERNAME, IOFFICE_PASSWORD
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `IOFFICE_HOST` | Always | Your iOffice hostname (e.g. `company.ioffice.com`) |
| `IOFFICE_TOKEN` | Option A | API token — used as `x-auth-token` header (preferred) |
| `IOFFICE_USERNAME` | Option B | iOffice username (used with `IOFFICE_PASSWORD`) |
| `IOFFICE_PASSWORD` | Option B | iOffice password (used with `IOFFICE_USERNAME`) |

Either `IOFFICE_TOKEN` **or** `IOFFICE_USERNAME` + `IOFFICE_PASSWORD` must be set. If both are present, the token takes precedence.

## Tools

### Buildings
| Tool | Description |
|------|-------------|
| `io_list_buildings` | List buildings (search, pagination, sort) |
| `io_get_building(id)` | Get a building by ID |
| `io_create_building(name, ...)` | Create a new building |
| `io_update_building(id, ...)` | Update a building |
| `io_delete_building(id)` | Delete a building |

### Floors
| Tool | Description |
|------|-------------|
| `io_list_floors(buildingId?)` | List floors; filter by building if buildingId provided |
| `io_get_floor(id)` | Get a floor by ID |
| `io_create_floor(name, buildingId)` | Create a floor in a building |
| `io_update_floor(id, ...)` | Update a floor |
| `io_delete_floor(id)` | Delete a floor |

### Spaces (Rooms)
| Tool | Description |
|------|-------------|
| `io_list_spaces(floorId?)` | List spaces; filter by floor if floorId provided |
| `io_get_space(id)` | Get a space by ID |
| `io_create_space(name, floorId, ...)` | Create a space on a floor |
| `io_update_space(id, ...)` | Update a space |
| `io_delete_space(id)` | Delete a space |

### Users
| Tool | Description |
|------|-------------|
| `io_list_users` | List users (search, pagination) |
| `io_get_user(id)` | Get a user by ID |
| `io_create_user(firstName, lastName, email)` | Create a user |
| `io_update_user(id, ...)` | Update a user |
| `io_delete_user(id)` | Delete a user |

### Reservations
| Tool | Notes |
|------|-------|
| `io_list_reservations(spaceId?, userId?, startDate?, endDate?)` | List reservations with optional filters |
| `io_get_reservation(id)` | Get a reservation |
| `io_create_reservation(title, spaceId, startDate, endDate)` | Book a room |
| `io_update_reservation(id, ...)` | Update a reservation |
| `io_delete_reservation(id)` | Cancel a reservation |
| `io_checkin_reservation(id)` | Check in to a reservation |
| `io_checkout_reservation(id)` | Check out / release a room early |

### Visitors
| Tool | Notes |
|------|-------|
| `io_list_visitors(buildingId?, startDate?, endDate?)` | List visitors |
| `io_get_visitor(id)` | Get a visitor record |
| `io_create_visitor(firstName, lastName, ...)` | Pre-register a visitor |
| `io_update_visitor(id, ...)` | Update visitor info |
| `io_checkin_visitor(id)` | Check in visitor on arrival |
| `io_checkout_visitor(id)` | Check out visitor on departure |

### Maintenance Requests
| Tool | Notes |
|------|-------|
| `io_list_maintenance_requests(status?, spaceId?, buildingId?)` | List requests with filters |
| `io_get_maintenance_request(id)` | Get a request |
| `io_create_maintenance_request(title, ...)` | Submit a new request |
| `io_update_maintenance_request(id, ...)` | Update a request |
| `io_accept_maintenance_request(id)` | Accept (pending → accepted) |
| `io_start_maintenance_request(id)` | Start work (accepted → started) |
| `io_complete_maintenance_request(id, resolution?)` | Complete with optional resolution notes |
| `io_archive_maintenance_request(id)` | Archive a completed request |

### Mail
| Tool | Notes |
|------|-------|
| `io_list_mail(status?, buildingId?, recipientId?)` | List mail items |
| `io_get_mail(id)` | Get a mail item |
| `io_create_mail(recipientId, buildingId, ...)` | Log received mail |
| `io_deliver_mail(id, signature?)` | Mark as delivered |
| `io_return_mail(id, reason?)` | Mark as returned to sender |

### Moves
| Tool | Notes |
|------|-------|
| `io_list_moves(status?, buildingId?)` | List move requests |
| `io_get_move(id)` | Get a move request |
| `io_create_move(name, ...)` | Create a move request |
| `io_update_move(id, ...)` | Update a move request |
| `io_approve_move(id, notes?)` | Approve a move |
| `io_cancel_move(id, reason?)` | Cancel a move |

## Workflows

**Find and book a room:**
1. `io_list_buildings` → find building ID
2. `io_list_floors(buildingId)` → find floor ID
3. `io_list_spaces(floorId)` → find available room
4. `io_create_reservation(title, spaceId, startDate, endDate)` → book it

**Register and check in a visitor:**
1. `io_create_visitor(firstName, lastName, email, hostId, buildingId, expectedArrival)` → pre-register
2. When they arrive: `io_checkin_visitor(id)`
3. When they leave: `io_checkout_visitor(id)`

**Handle a maintenance issue:**
1. `io_create_maintenance_request(title, description, spaceId)` → submit
2. `io_accept_maintenance_request(id)` → acknowledge
3. `io_start_maintenance_request(id)` → begin work
4. `io_complete_maintenance_request(id, resolution)` → finish
5. `io_archive_maintenance_request(id)` → archive

**Track incoming mail:**
1. `io_create_mail(recipientId, buildingId, trackingNumber, carrier)` → log receipt
2. When delivered: `io_deliver_mail(id, signature)` → mark delivered

## Notes

- All list tools support `search`, `limit` (max 100), `startAt`, `orderBy`, and `orderByType` params.
- Dates use ISO 8601 format (e.g. `2026-03-20T09:00:00`).
- The API enforces sequential access (avoid parallel requests to prevent rate limiting).
