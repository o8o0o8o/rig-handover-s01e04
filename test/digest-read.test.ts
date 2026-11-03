import { describe, expect, it } from 'vitest';
import { readNight, summarize } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    const n = readNight('runs', '2026-10-28')!;
    expect(n.badLines).toBe(1);
    expect(n.rows.map((r) => r.job)).toEqual([
      'digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs',
    ]);
    const f = n.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(f).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: 'upstream 503', owner: 'rook' });
    expect(f.firstAt).toBe('2026-10-29T01:30:00+01:00');
    expect(f.lastAt).toBe('2026-10-29T01:37:00+01:00');
    expect(n.rows.find((r) => r.job === 'notes/backup')).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
    expect(n.rows.find((r) => r.job === 'digest/render')!.owner).toBeNull();
  });

  it('returns null for a night with no file, or a bad night name', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
    expect(readNight('runs', '../etc')).toBeNull();
  });

  it('an empty file has no rows', () => {
    expect(summarize('x', '')).toEqual({ night: 'x', rows: [], badLines: 0 });
  });
});
