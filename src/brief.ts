import { minifiedResult, untrustedEnvelope } from '@chrischall/mcp-utils';
import { z } from 'zod';
import { NOTE, UNTRUSTED_NOTE } from './view.js';

/**
 * `view: "brief"` for the two canonical reads (reservations, mail): one line
 * per item, `title — <ISO date | no date> — <status>`, at most 120 chars,
 * inside the untrusted-data envelope as `data: string[]` because titles are
 * text people outside this conversation wrote. A line starting `-- ` is a
 * note, not an item: `-- none`, `-- N of M shown`, `-- more`, `-- error: …`.
 *
 * **The field names are a best reading, not a verified shape.** This repo has
 * no captured iOffice payload (see view.ts), so each line reads the likeliest
 * fields in order and falls back to the record id, `no date` and `no status`
 * rather than dropping the item. A payload that is neither an array nor an
 * object carrying one is reported as an error note — never an empty answer.
 */

export const BRIEF_VIEWS = ['compact', 'full', 'brief'] as const;

const BRIEF_MAX = 120;
/** iOffice's page size when no `limit` is given (the list tools' own description). */
const DEFAULT_LIMIT = 50;

export const briefViewArg = () =>
  z
    .enum(BRIEF_VIEWS)
    .optional()
    .describe(
      `Response shape. ${NOTE} "brief" returns one line per item — title — <ISO date or "no date"> — <status> — ` +
        'with "-- " note lines for an empty or partial page.',
    );

type Rec = Record<string, unknown>;

const str = (v: unknown): string | undefined => {
  if (typeof v === 'string' && v.trim() !== '') return v.replace(/\s+/g, ' ').trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (v && typeof v === 'object') return str((v as Rec).name);
  return undefined;
};

const ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/;

function isoDate(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v)) return new Date(v).toISOString();
  if (typeof v === 'string') {
    const s = v.trim();
    if (ISO.test(s)) return s;
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  return 'no date';
}

const first = (it: Rec, keys: string[]): unknown => {
  for (const k of keys) if (it[k] !== undefined && it[k] !== null) return it[k];
  return undefined;
};

/** The shortest a title is cut to before the status gives way too. */
const TITLE_FLOOR = 24;

const cut = (s: string, n: number): string =>
  s.length > n ? `${s.slice(0, Math.max(n - 1, 0))}…` : s;

/**
 * One brief line, cut to ≤ 120 chars as a WHOLE, title first: the title
 * shortens until the line fits; if the status alone would still overflow
 * once the title is at its floor, the status is cut as well. A title that
 * starts with `-- ` is escaped with one `\` so it never reads as a note.
 */
function line(rawTitle: string, date: string, rawStatus: string): string {
  const title = rawTitle.startsWith('-- ') ? `\\${rawTitle}` : rawTitle;
  const sep = ` — ${date} — `;
  const room = BRIEF_MAX - sep.length;
  if (title.length + rawStatus.length <= room) return `${title}${sep}${rawStatus}`;
  const titleRoom = Math.max(room - rawStatus.length, Math.min(title.length, TITLE_FLOOR));
  const shownTitle = cut(title, titleRoom);
  return `${shownTitle}${sep}${cut(rawStatus, room - shownTitle.length)}`;
}

export type BriefKind = 'reservation' | 'mail';

function reservationLine(it: Rec): string {
  const title = str(first(it, ['name', 'title', 'subject'])) ?? `Reservation ${str(it.id) ?? '?'}`;
  const date = isoDate(first(it, ['startDate', 'start', 'startTime']));
  const status =
    str(it.status) ??
    (it.checkedOut === true ? 'checked out' : it.checkedIn === true ? 'checked in' : 'no status');
  return line(title, date, status);
}

function mailLine(it: Rec): string {
  const title =
    str(first(it, ['name', 'trackingNumber', 'description'])) ?? `Mail ${str(it.id) ?? '?'}`;
  const date = isoDate(first(it, ['receivedDate', 'createdDate', 'dateCreated', 'date']));
  return line(title, date, str(it.status) ?? 'no status');
}

const LIST_KEYS = ['data', 'items', 'results', 'records'];
const TOTAL_KEYS = ['total', 'totalCount', 'count'];

/** The lines for one page of iOffice records, notes included. */
export function briefLines(data: unknown, kind: BriefKind, limit?: number): string[] {
  let items: unknown[] | undefined;
  let total: number | undefined;
  if (Array.isArray(data)) items = data;
  else if (data && typeof data === 'object') {
    const obj = data as Rec;
    const key = LIST_KEYS.find((k) => Array.isArray(obj[k]));
    if (key) items = obj[key] as unknown[];
    const t = TOTAL_KEYS.map((k) => obj[k]).find((v) => typeof v === 'number');
    if (typeof t === 'number') total = t;
  }
  if (!items) {
    return [
      '-- error: iOffice answered in a shape this brief view does not read; ask with view "full"',
    ];
  }
  if (items.length === 0) return ['-- none'];
  const toLine = kind === 'reservation' ? reservationLine : mailLine;
  const lines = items.map((it) => toLine((it && typeof it === 'object' ? it : {}) as Rec));
  if (total !== undefined) {
    if (total > items.length) lines.push(`-- ${items.length} of ${total} shown`);
  } else if (items.length >= (limit ?? DEFAULT_LIMIT)) {
    lines.push('-- more');
  }
  return lines;
}

/** The brief answer, fenced like every other read in this server. */
export function briefResponse(
  data: unknown,
  kind: BriefKind,
  limit?: number,
): ReturnType<typeof minifiedResult> {
  return minifiedResult(untrustedEnvelope(briefLines(data, kind, limit), { note: UNTRUSTED_NOTE }));
}
