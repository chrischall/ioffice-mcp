import { describe, it, expect } from 'vitest';
import { briefLines } from '../src/brief.js';

// The field fallbacks in src/brief.ts, one by one. iOffice's payload shape is
// unverified in this repo, so every fallback is load-bearing: an item is
// never dropped for a missing field.
describe('briefLines', () => {
  it('reads a status object by its name and a numeric title', () => {
    expect(
      briefLines([{ title: 42, start: '2026-11-05', status: { name: 'Booked' } }], 'reservation'),
    ).toEqual(['42 — 2026-11-05 — Booked']);
  });

  it('collapses whitespace in a title so a line stays one line', () => {
    expect(briefLines([{ subject: ' Board\n  review ', startTime: null }], 'reservation')).toEqual([
      'Board review — no date — no status',
    ]);
  });

  it('normalises a parseable non-ISO date and refuses an unparseable one', () => {
    expect(
      briefLines(
        [
          { id: 1, startDate: 'Thu, 05 Nov 2026 14:00:00 GMT' },
          { id: 2, startDate: 'someday' },
          { id: 3, startDate: true },
        ],
        'reservation',
      ),
    ).toEqual([
      'Reservation 1 — 2026-11-05T14:00:00.000Z — no status',
      'Reservation 2 — no date — no status',
      'Reservation 3 — no date — no status',
    ]);
  });

  it('reports a checked-out reservation, and an item with no id or no object at all', () => {
    expect(
      briefLines([{ name: 'Desk', checkedOut: true }, 'junk', { name: '' }], 'reservation'),
    ).toEqual([
      'Desk — no date — checked out',
      'Reservation ? — no date — no status',
      'Reservation ? — no date — no status',
    ]);
  });

  it('mail falls back through its title and date fields', () => {
    expect(
      briefLines(
        {
          items: [
            { description: 'Box', dateCreated: '2026-11-01' },
            { name: 'Letter', receivedDate: '2026-11-02', status: 'delivered' },
            7,
          ],
          total: 3,
        },
        'mail',
      ),
    ).toEqual([
      'Box — 2026-11-01 — no status',
      'Letter — 2026-11-02 — delivered',
      'Mail ? — no date — no status',
    ]);
  });

  it('a stated total equal to the page is no note; a short page with no total is no note', () => {
    expect(briefLines({ results: [{ id: 1 }], totalCount: 1 }, 'mail')).toEqual([
      'Mail 1 — no date — no status',
    ]);
    expect(briefLines({ records: [{ id: 1 }] }, 'mail', 5)).toEqual([
      'Mail 1 — no date — no status',
    ]);
  });

  it('an empty page is "-- none" whatever total it states; a non-object is an error note', () => {
    expect(briefLines({ data: [], count: 0 }, 'mail')).toEqual(['-- none']);
    expect(briefLines(null, 'mail')[0]).toMatch(/^-- error: /);
  });
});
