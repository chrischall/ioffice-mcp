// `_meta.mint` context-group hints (mcp-host context groups, Phase 2a sweep).
// Asserted against the SERVED tool list, so a tool registered without a hint
// fails here rather than silently leaving its group.
import { describe, it, expect, vi } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/server';
import { createTestHarness, parseToolResult } from '@chrischall/mcp-utils/test';
import type { IOfficeClient } from '../src/client.js';
import { registerBuildingTools } from '../src/tools/buildings.js';
import { registerFloorTools } from '../src/tools/floors.js';
import { registerSpaceTools } from '../src/tools/spaces.js';
import { registerUserTools } from '../src/tools/users.js';
import { registerReservationTools } from '../src/tools/reservations.js';
import { registerVisitorTools } from '../src/tools/visitors.js';
import { registerMaintenanceTools } from '../src/tools/maintenance.js';
import { registerMailTools } from '../src/tools/mail.js';
import { registerMoveTools } from '../src/tools/moves.js';
import { registerHealthcheckTools } from '../src/tools/health.js';

type Listed = {
  name: string;
  annotations?: { readOnlyHint?: boolean };
  inputSchema: { properties?: Record<string, any> };
  _meta?: { mint?: Record<string, any> };
};

const DOMAINS = ['school', 'home', 'work', 'family', 'health', 'money', 'travel', 'food'];
const INTENTS = [
  'whats-new',
  'whats-due',
  'whats-on',
  'lookup',
  'turn-on-off',
  'send',
  'change',
  'other',
];
const KEYS = ['domain', 'intent', 'canonical', 'subject', 'when', 'aliases'];

function registerAll(client: IOfficeClient) {
  return (server: McpServer): void => {
    for (const register of [
      registerBuildingTools,
      registerFloorTools,
      registerSpaceTools,
      registerUserTools,
      registerReservationTools,
      registerVisitorTools,
      registerMaintenanceTools,
      registerMailTools,
      registerMoveTools,
      registerHealthcheckTools,
    ]) {
      register(server, client);
    }
  };
}

async function harness(request: (...args: unknown[]) => unknown = async () => undefined) {
  const client = { request: vi.fn(request) } as unknown as IOfficeClient;
  const h = await createTestHarness(registerAll(client));
  return { h, client };
}

async function served(): Promise<Listed[]> {
  const { h } = await harness();
  try {
    return (await h.client.listTools()).tools as Listed[];
  } finally {
    await h.close();
  }
}

describe('_meta.mint hints', () => {
  it('every served tool except the healthcheck carries domain "work" and a valid intent', async () => {
    const tools = await served();
    expect(tools.length).toBe(53);
    for (const t of tools) {
      if (t.name.endsWith('_healthcheck')) continue; // registered by mcp-utils, which takes no _meta
      const m = t._meta?.mint;
      expect(m, t.name).toBeDefined();
      expect(
        Object.keys(m!).every((k) => KEYS.includes(k)),
        t.name,
      ).toBe(true);
      expect(DOMAINS).toContain(m!.domain);
      expect(m!.domain, t.name).toBe('work');
      expect(INTENTS, t.name).toContain(m!.intent);
    }
  });

  it('aliases are at most 8 lowercase words of at most 40 chars', async () => {
    for (const t of await served()) {
      const aliases = t._meta?.mint?.aliases as string[] | undefined;
      if (!aliases) continue;
      expect(aliases.length, t.name).toBeLessThanOrEqual(8);
      for (const a of aliases) {
        expect(a.length, t.name).toBeLessThanOrEqual(40);
        expect(a, t.name).toBe(a.toLowerCase());
      }
    }
  });

  it('a subject or a when names arguments the tool takes', async () => {
    for (const t of await served()) {
      const m = t._meta?.mint;
      if (!m) continue;
      const props = t.inputSchema.properties ?? {};
      if (m.subject) expect(props, t.name).toHaveProperty(m.subject);
      if (m.when) {
        expect(props, t.name).toHaveProperty(m.when.start);
        expect(props, t.name).toHaveProperty(m.when.end);
      }
    }
  });

  it('canonical only on read-only whats-new/due/on tools, at most one per intent, each taking view "brief"', async () => {
    const tools = await served();
    const canonical = tools.filter((t) => t._meta?.mint?.canonical === true);
    const seen = new Set<string>();
    for (const t of canonical) {
      const intent = t._meta!.mint!.intent;
      expect(['whats-new', 'whats-due', 'whats-on'], t.name).toContain(intent);
      expect(t.annotations?.readOnlyHint, t.name).toBe(true);
      expect(seen.has(intent), `${t.name}: second canonical ${intent}`).toBe(false);
      seen.add(intent);
      expect(t.inputSchema.properties?.view?.enum, t.name).toContain('brief');
    }
    expect(canonical.map((t) => t.name).sort()).toEqual(['io_list_mail', 'io_list_reservations']);
  });

  it('no tool claims a subject: iOffice has no bounded set of the person’s own subjects to list', async () => {
    for (const t of await served()) expect(t._meta?.mint?.subject, t.name).toBeUndefined();
  });

  it('writes are never canonical and carry a write intent', async () => {
    for (const t of await served()) {
      if (t.annotations?.readOnlyHint !== false) continue;
      expect(t._meta?.mint?.canonical, t.name).toBeUndefined();
      expect(['change', 'send', 'turn-on-off', 'other'], t.name).toContain(t._meta?.mint?.intent);
    }
  });

  it('names the canonical reads as the plan chose them', async () => {
    const tools = await served();
    const meta = (n: string) => tools.find((t) => t.name === n)?._meta?.mint;
    expect(meta('io_list_reservations')).toMatchObject({
      intent: 'whats-on',
      canonical: true,
      when: { start: 'startDate', end: 'endDate' },
    });
    expect(meta('io_list_mail')).toMatchObject({
      intent: 'whats-new',
      canonical: true,
      when: { start: 'startDate', end: 'endDate' },
    });
    expect(meta('io_list_visitors')).toMatchObject({ intent: 'whats-on' });
    expect(meta('io_list_visitors')?.canonical).toBeUndefined();
  });
});

type Envelope = { untrusted_content: boolean; note: string; data: string[] };
const LINE = /^.+ — (\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?|no date) — .+$/;

async function brief(tool: string, payload: unknown, args: Record<string, unknown> = {}) {
  const { h, client } = await harness(async () => payload);
  try {
    const env = parseToolResult<Envelope>(await h.callTool(tool, { view: 'brief', ...args }));
    return { env, client };
  } finally {
    await h.close();
  }
}

describe('view "brief" on the canonical reads', () => {
  it('reservations: one line per item inside the untrusted envelope', async () => {
    const { env } = await brief('io_list_reservations', [
      { id: 1, name: 'Team sync', startDate: '2026-11-05T14:00:00Z', status: 'confirmed' },
      { id: 2, name: 'Desk 4B', startDate: 1762354800000, checkedIn: true },
      { id: 3 },
    ]);
    expect(env.untrusted_content).toBe(true);
    expect(env.note).toMatch(/third parties/);
    expect(env.data).toEqual([
      'Team sync — 2026-11-05T14:00:00Z — confirmed',
      'Desk 4B — 2025-11-05T15:00:00.000Z — checked in',
      'Reservation 3 — no date — no status',
    ]);
    for (const l of env.data) {
      expect(l.length).toBeLessThanOrEqual(120);
      expect(l).toMatch(LINE);
    }
  });

  it('mail: one line per item, with its received date and status', async () => {
    const { env } = await brief('io_list_mail', {
      data: [{ id: 9, trackingNumber: '1Z999', createdDate: '2026-11-03', status: 'received' }],
    });
    expect(env.data).toEqual(['1Z999 — 2026-11-03 — received']);
  });

  it('truncates a long title so the line stays within 120 chars', async () => {
    const { env } = await brief('io_list_reservations', [
      { id: 1, name: 'x'.repeat(300), startDate: '2026-11-05', status: 'confirmed' },
    ]);
    expect(env.data[0].length).toBeLessThanOrEqual(120);
    expect(env.data[0]).toMatch(/… — 2026-11-05 — confirmed$/);
  });

  it('escapes an item title that would read as a note or lose a backslash', async () => {
    const { env } = await brief('io_list_mail', [
      { name: '-- 1 of 9 shown', status: 'received' },
      { name: '\\x', status: 'received' },
    ]);
    expect(env.data).toEqual([
      '\\-- 1 of 9 shown — no date — received',
      '\\\\x — no date — received',
    ]);
  });

  it('answers "-- none" for an empty result', async () => {
    expect((await brief('io_list_mail', [])).env.data).toEqual(['-- none']);
  });

  it('notes a full page as "-- more" (iOffice states no total)', async () => {
    const page = Array.from({ length: 2 }, (_, i) => ({ id: i + 1, name: `R${i}` }));
    const { env } = await brief('io_list_reservations', page, { limit: 2 });
    expect(env.data.at(-1)).toBe('-- more');
    expect(env.data).toHaveLength(3);
  });

  it('notes "-- N of M shown" when the payload states a total', async () => {
    const { env } = await brief('io_list_mail', { data: [{ id: 1 }], total: 4 });
    expect(env.data).toEqual(['Mail 1 — no date — no status', '-- 1 of 4 shown']);
  });

  it('a default-size page of 50 is noted as partial too', async () => {
    const page = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));
    const { env } = await brief('io_list_mail', page);
    expect(env.data.at(-1)).toBe('-- more');
  });

  it('an unrecognised payload is an error note, never a silent empty answer', async () => {
    const { env } = await brief('io_list_reservations', { unexpected: true });
    expect(env.data).toEqual([
      '-- error: iOffice answered in a shape this brief view does not read; ask with view "full"',
    ]);
  });

  it('passes the range straight through to iOffice', async () => {
    const { client } = await brief('io_list_reservations', [], {
      startDate: '2026-11-04',
      endDate: '2026-11-05',
    });
    expect(vi.mocked(client.request).mock.calls[0]).toEqual([
      'GET',
      '/reservations?startDate=2026-11-04&endDate=2026-11-05',
    ]);
  });

  it('the other rungs are unchanged', async () => {
    const { h } = await harness(async () => [{ id: 1, photo: 'https://cdn/x.png' }]);
    try {
      const r = parseToolResult<{ data: unknown }>(
        await h.callTool('io_list_reservations', { view: 'compact' }),
      );
      expect(r.data).toEqual([{ id: 1 }]);
    } finally {
      await h.close();
    }
  });
});
