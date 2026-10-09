// Invariant: the command CI runs enforces the 100% coverage thresholds in
// vitest.config.ts. Those thresholds only apply under `--coverage`, and CI's
// test-command was `npm test` (no coverage), so untested tool code passed CI
// despite CLAUDE.md saying "Failing coverage fails CI"
// (chrischall/fleet-audit#520).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

describe('CI test command', () => {
  it('runs vitest with --coverage so the thresholds gate the build', () => {
    const match = read('.github/workflows/ci.yml').match(/test-command:\s*npm (?:run )?(\S+)/);
    expect(match).not.toBeNull();
    const script: string = JSON.parse(read('package.json')).scripts[match![1]];
    expect(script).toMatch(/vitest run --coverage/);
  });
});
