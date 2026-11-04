/**
 * `_meta.mint` hints — the mcp-host context-groups contract: which canonical
 * group a tool belongs to, what kind of ask it answers, the argument names of
 * a date range, and the everyday words its name and description lack. Inert
 * data to every other client.
 *
 * **No `subject` anywhere, on purpose.** A subject is a bounded set of the
 * PERSON's own things the server can list at start (children, properties,
 * systems). iOffice's listable sets — buildings, floors, spaces, the whole
 * tenant's user directory — are the organisation's, not the person's, and a
 * tenant's directory is neither bounded nor short. Publishing one as an enum
 * would fan an ask out across every room in the company.
 */
const DOMAIN = 'work';

type Intent = 'whats-new' | 'whats-due' | 'whats-on' | 'lookup' | 'change';

interface MintHint {
  domain: typeof DOMAIN;
  intent: Intent;
  canonical?: true;
  when?: { start: string; end: string };
  aliases?: string[];
}

const meta = (hint: Omit<MintHint, 'domain'>): { mint: MintHint } => ({
  mint: { domain: DOMAIN, ...hint },
});

/** A read that looks a record up (list or get). */
export const LOOKUP_META = meta({ intent: 'lookup' });

/** A write: create, update, delete, or a workflow step (check in, deliver, approve…). */
export const CHANGE_META = meta({ intent: 'change' });

const RANGE = { start: 'startDate', end: 'endDate' };

/** "What's on at work?" — the person's room and desk bookings over a range. */
export const RESERVATIONS_META = meta({
  intent: 'whats-on',
  canonical: true,
  when: RANGE,
  aliases: ['room booking', 'desk booking', 'meeting room', 'desk', 'booking', 'reservation'],
});

/** "Anything new at work?" — mail and packages logged at the mailroom. */
export const MAIL_META = meta({
  intent: 'whats-new',
  canonical: true,
  when: RANGE,
  aliases: ['mail', 'package', 'packages', 'parcel', 'delivery', 'mailroom'],
});

/** Visitors expected over a range — a what's-on read, but not the canonical one. */
export const VISITORS_META = meta({
  intent: 'whats-on',
  when: RANGE,
  aliases: ['visitor', 'visitors', 'guest', 'guests'],
});
