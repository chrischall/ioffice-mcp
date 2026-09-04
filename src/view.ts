import { minifiedResult, resolveView, stripMediaUrls, viewParam, type View } from '@chrischall/mcp-utils';

/**
 * The rungs this server honours (`@chrischall/mcp-utils`' `view` vocabulary;
 * `chrischall/workflows` `docs/fleet-conventions.md`, "Response shape").
 *
 * **What compact does here, and what it deliberately does NOT do.**
 *
 * Every read tool in this server hands back iOffice's payload verbatim —
 * `const data = await client.request(...); return textResult(data)`, 47 times.
 * There is no schema, no captured fixture and no documented shape anywhere in
 * the repo, and no live tenant to call, so there is nothing here that could
 * honestly say which of iOffice's fields matter and which do not.
 *
 * So compact does the one projection that needs no such knowledge: it strips
 * image and avatar URLs. That is subtractive, so it cannot lose a field nobody
 * knew about — the failure mode an invented field list would have, where a
 * record comes back with holes in it and reads like a verified answer.
 *
 * When someone with a live tenant can capture real `/reservations`,
 * `/users` and `/spaces` payloads, a field projection belongs here beside this
 * one and will save considerably more. Until then this is the honest ceiling,
 * and the docblock says so rather than implying a shape was verified.
 */
export const IO_VIEWS = ['compact', 'full'] as const;

export const NOTE =
  'compact strips image/avatar URLs from the response; "full" returns iOffice\'s payload untouched. ' +
  'No field projection: this server has no verified record of which iOffice fields matter, and inventing one ' +
  'would risk dropping a field a caller needs.';

/** The `view` parameter every read tool in this server takes. */
export const viewArg = (): ReturnType<typeof viewParam> => viewParam(IO_VIEWS, { note: NOTE });

/**
 * Answer in the requested rung.
 *
 * Only ever called from a READ tool. A write's response is a receipt — an id,
 * a status — with nothing to strip and everything to keep.
 */
export function viewResponse(view: string | undefined, data: unknown): ReturnType<typeof minifiedResult> {
  const rung: View = resolveView(view, IO_VIEWS);
  return minifiedResult(rung === 'compact' ? stripMediaUrls(data) : data);
}
