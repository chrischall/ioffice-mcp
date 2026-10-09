/**
 * The annotation sets every iOffice tool uses (chrischall/fleet-audit#519).
 *
 * All tools reach an external SaaS, so every set is `openWorldHint: true`.
 * Writes are split by what they can lose, so a host that weighs hints gives
 * deletes and cancellations more scrutiny than a booking or a check-in.
 */
import type { ToolAnnotations } from '@modelcontextprotocol/server';

/** list / get. */
export const READ: ToolAnnotations = { readOnlyHint: true, openWorldHint: true };

/** Adds a new record; nothing existing changes. */
export const CREATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

/** PUT over an existing record's fields: the old values are lost, but a repeat is a no-op. */
export const UPDATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true,
};

/** Removes a record. */
export const DELETE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true,
};

/** Moves a record forward in its workflow (accept, check in, deliver…) without losing data. */
export const ADVANCE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

/** Ends a workflow in a way that cannot be resumed (cancel a move, return mail). */
export const TERMINATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};
