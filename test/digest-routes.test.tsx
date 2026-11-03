import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const line = (o: Record<string, unknown>) => JSON.stringify(o);

// Written out of order on purpose: rows must come back sorted by job.
const normal = [
  line({ at: '2026-10-28T23:10:00+01:00', job: 'zeta/prune', status: 'ok', owner: 'rook' }),
  line({ at: '2026-10-28T23:00:00+01:00', job: 'alpha/backup', status: 'retry', owner: 'lane-07', error: 'timeout' }),
  line({ at: '2026-10-28T23:05:00+01:00', job: 'alpha/backup', status: 'retry', owner: 'lane-07', error: 'timeout' }),
  line({ at: '2026-10-28T23:10:00+01:00', job: 'alpha/backup', status: 'ok', owner: 'lane-07' }),
  line({ at: '2026-10-28T23:20:00+01:00', job: 'mid/sync', status: 'ok', owner: null }),
];
const jobs = ['alpha/backup', 'mid/sync', 'zeta/prune'];

let tmp: string;
const app = () =>
  createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: tmp });

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-runs-'));
  fs.writeFileSync(path.join(tmp, '2026-10-28.jsonl'), normal.join('\n') + '\n');
  fs.writeFileSync(path.join(tmp, '2026-10-30.jsonl'), '');
  fs.writeFileSync(
    path.join(tmp, '2026-10-31.jsonl'),
    [normal[0], 'this is not json {', normal[4]].join('\n') + '\n',
  );
});

afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('GET /digest/:night', () => {
  it('renders every job', async () => {
    const res = await app().request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const job of jobs) expect(html).toContain(job);
  });

  it('404s when the night has no file', async () => {
    const res = await app().request('/digest/2026-01-01');
    expect(res.status).toBe(404);
  });

  it('says "nothing ran" for an empty file', async () => {
    const res = await app().request('/digest/2026-10-30');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('still renders the good jobs when a line is bad', async () => {
    const res = await app().request('/digest/2026-10-31');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('zeta/prune');
    expect(html).toContain('mid/sync');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns rows sorted by job', async () => {
    const res = await app().request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.night).toBe('2026-10-28');
    expect(body.badLines).toBe(0);
    expect(body.rows.map((r) => r.job)).toEqual(jobs);
    const backup = body.rows.find((r) => r.job === 'alpha/backup');
    expect(backup?.runs).toBe(3);
    expect(backup?.retries).toBe(2);
  });

  it('404s when the night has no file', async () => {
    const res = await app().request('/api/digest/2026-01-01');
    expect(res.status).toBe(404);
  });

  it('returns no rows and no bad lines for an empty file', async () => {
    const res = await app().request('/api/digest/2026-10-30');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-10-30', rows: [], badLines: 0 });
  });

  it('counts a bad line and keeps the good rows', async () => {
    const res = await app().request('/api/digest/2026-10-31');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['mid/sync', 'zeta/prune']);
  });
});

describe('page and JSON agree', () => {
  it('lists the jobs in the same order', async () => {
    const html = await (await app().request('/digest/2026-10-28')).text();
    const body = (await (await app().request('/api/digest/2026-10-28')).json()) as Night;
    const positions = body.rows.map((r) => html.indexOf(r.job));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
