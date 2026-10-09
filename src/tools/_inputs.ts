/**
 * Shared input guards (chrischall/fleet-audit#517).
 *
 * The numeric bounds live in each tool's zod schema (`.int().positive()` on
 * every id, `limit` 1..100, `startAt` >= 0) so they are advertised to the
 * client as well as enforced. This module holds the one rule a per-field schema
 * cannot express: an update must change something.
 */

/**
 * Throw when an update body has no fields set, before the confirm gate or any
 * request — otherwise the call previews, and then sends, `PUT {}`.
 */
export function requireUpdateFields(body: Record<string, unknown>): void {
  if (!Object.values(body).some((v) => v !== undefined)) {
    throw new Error('Nothing to update: provide at least one field to change.');
  }
}
