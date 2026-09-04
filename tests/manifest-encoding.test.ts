// Invariant: the JSON manifests store non-ASCII characters LITERALLY, never as
// a `\uXXXX` escape.
//
// Why this exists. The description in `package.json` was rewritten from
// `— developed and maintained by AI` to `— developed and maintained by AI`
// by a fleet rollout script — `json.dump(..., indent=2)` defaults to
// `ensure_ascii=True`, so every non-ASCII character in a file it rewrites comes
// back escaped. The JSON is valid and `JSON.parse` yields an identical string,
// so nothing broke and nothing failed: the only symptom was that one sentence
// was spelled two ways across five files, and every future reader of a
// description diff had to rule the encoding out before reading the words. The
// auto-review of #124 caught it (#125); #128 decoded it back.
//
// That fix was one character in one file, with nothing stopping the next script
// run from undoing it — which is what this test is for. It fails on the escape
// rather than on the em dash specifically, because the next character a script
// rewrites will not be an em dash.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Every JSON manifest a human writes and a release script rewrites.
// `package-lock.json` is excluded: npm owns its encoding, not us.
const MANIFESTS = [
  'package.json',
  'manifest.json',
  'server.json',
  '.claude-plugin/plugin.json',
  '.claude-plugin/marketplace.json',
];

/** `\uXXXX` in the raw text — but not `\\uXXXX`, which is a literal backslash. */
const UNICODE_ESCAPE = /(?<!\\)\\u[0-9a-fA-F]{4}/g;

const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

/** Every `description` in the file, at any depth — marketplace.json nests its. */
function descriptions(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(descriptions);
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([k, v]) =>
    k === 'description' && typeof v === 'string' ? [v] : descriptions(v),
  );
}

describe('manifest encoding', () => {
  it.each(MANIFESTS)('%s stores non-ASCII literally, not as a \\uXXXX escape', (rel) => {
    expect(read(rel).match(UNICODE_ESCAPE) ?? []).toEqual([]);
  });

  it('every em dash in a description is the real character', () => {
    // The specific regression from #125, named so a failure says what happened
    // and not only where.
    const checked: string[] = [];
    for (const rel of MANIFESTS) {
      const raw = read(rel);
      if (!descriptions(JSON.parse(raw)).some((d) => d.includes('—'))) continue;
      checked.push(rel);
      expect(raw, `${rel} escaped its em dash`).toContain('—');
    }
    // A guard on the guard: the loop skips a file whose descriptions carry no
    // em dash, so a stale path or a renamed field would let it pass having
    // checked nothing. All five carry one today.
    expect(checked).toEqual(MANIFESTS);
  });
});
