# ioffice-mcp

[![CI](https://github.com/chrischall/ioffice-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/chrischall/ioffice-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/ioffice-mcp)](https://www.npmjs.com/package/ioffice-mcp)
[![license](https://img.shields.io/npm/l/ioffice-mcp)](LICENSE)

iOffice MCP server for Claude — developed and maintained by AI (Claude Code)

## Confirmations

Every write and state-changing tool (34 of them) asks the user to confirm first.
A client that can show a confirmation prompt (Claude Code) gets the real prompt
unless `MCP_CONFIRM_ELICITATION=off`.
On one that cannot (claude.ai, Claude Desktop), the first call writes nothing and
returns a preview — the method, path and exact body that would be sent — plus a
single-use `confirmToken`; only a repeat call with that token performs the write,
and a token is refused if any argument changed in between.

An update, delete, `io_cancel_move` or `io_return_mail` first reads the record it
targets, so its preview (and prompt) names what will change — `Delete iOffice
user 42 (Alice Smith)` with her email, not just the id — and a token is also
refused if that record was modified after the preview. An id that does not exist
fails at that read, before anything is previewed.

| variable | default | |
|---|---|---|
| `MCP_CONFIRM_MODE` | `ask-user` | What a write does on a client that cannot show a confirmation prompt (claude.ai, Claude Desktop). `ask-user`: two steps — the first call writes nothing and returns a preview plus a token, and the model must get your approval in chat before calling again with it. `auto`: the same two steps, but the model may use the token after reviewing the preview itself. `refuse`: writes are refused on such clients. A client that can show prompts (Claude Code) always gets the real prompt, unless `MCP_CONFIRM_ELICITATION=off`. An unrecognised value is treated as `refuse`. |
| `MCP_CONFIRM_ELICITATION` | `on` | `off` never shows a confirmation prompt, so every client gets the `MCP_CONFIRM_MODE` behaviour. Set it for a client that says it can show prompts but never does (the write hangs — opencode 2.0.x). Any other value is treated as `on`, with a warning on stderr. |
| `MCP_CONFIRM_TTL_SECONDS` | `600` | How long a token stays valid. |
| `MCP_CONFIRM_SECRET` | random per process | Signing key; set it only if tokens must survive a server restart. |
