// readWriteSubject: what a destructive write's preview shows about its target
// (chrischall/fleet-audit#1031).
import { describe, it, expect, vi } from 'vitest';
import { readWriteSubject, subjectSummary } from '../src/tools/_confirm.js';

const read = (record: unknown) => readWriteSubject({ request: vi.fn(async () => record) }, '/x/1');

describe('readWriteSubject', () => {
  it('keeps identifying scalars and the name of a nested object, and drops the rest', async () => {
    const s = await read({
      name: 'Room 4',
      status: { id: 2, name: 'Open' },
      company: { id: 9 },
      startDate: 1700000000000,
      code: true,
      email: '',
      description: 'free text that is not shown',
    });
    expect(s.current).toEqual({
      name: 'Room 4',
      status: 'Open',
      startDate: 1700000000000,
      code: true,
    });
  });

  it('truncates long values so a preview never carries a wall of record text', async () => {
    const s = await read({ title: 't'.repeat(300) });
    expect(String(s.current.title)).toHaveLength(121);
    expect(String(s.current.title).endsWith('…')).toBe(true);
  });

  it.each([
    [{ name: 'HQ', firstName: 'A' }, 'HQ'],
    [{ firstName: 'Alice', lastName: 'Smith' }, 'Alice Smith'],
    [{ lastName: 'Smith' }, 'Smith'],
    [{ title: 'Leak in 4F' }, 'Leak in 4F'],
    [{ email: 'a@b.c' }, 'a@b.c'],
    [{ code: 'HQ1' }, 'HQ1'],
    [{ trackingNumber: '1Z' }, ''],
    [null, ''],
  ])('labels %j as %j', async (record, label) => {
    expect((await read(record)).label).toBe(label);
  });

  it.each([
    [{ dateModified: 5 }, '5'],
    [{ modifiedDate: '2026-01-01' }, '2026-01-01'],
    [{ updatedAt: null, lastModified: 'L' }, 'L'],
    [{}, null],
  ])('binds %j as revision %j', async (record, revision) => {
    expect((await read(record)).revision).toBe(revision);
  });
});

describe('subjectSummary', () => {
  it('names the record when it has a label, and always keeps the id', () => {
    const base = { current: {}, revision: null };
    expect(subjectSummary('Delete iOffice user', 4, { ...base, label: 'Alice' })).toBe(
      'Delete iOffice user 4 (Alice)',
    );
    expect(subjectSummary('Delete iOffice user', 4, { ...base, label: '' })).toBe(
      'Delete iOffice user 4',
    );
  });
});
