/**
 * The annotation sets every iOffice tool uses (chrischall/fleet-audit#519).
 *
 * All tools reach an external SaaS, so every set is `openWorldHint: true`.
 * `destructiveHint` follows the fleet inverse test: a write is non-destructive
 * only when a later call in this same tool set restores the prior state.
 */
import type { ToolAnnotations } from '@modelcontextprotocol/server';

/** list / get. */
export const READ: ToolAnnotations = { readOnlyHint: true, openWorldHint: true };

/** Adds a new record that a delete/cancel tool in this set can take back. */
export const CREATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

/** Adds a new record that no tool in this set can remove (mail, visitors, maintenance). */
export const CREATE_PERMANENT: ToolAnnotations = { ...CREATE, destructiveHint: true };

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

/**
 * Moves a record forward in its workflow (accept, check in, deliver…). No tool
 * in this set moves it back, so it fails the inverse test.
 */
export const ADVANCE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
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
