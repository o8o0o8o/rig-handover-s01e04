// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

/** One row per job for one night. Times keep the offset from the log. */
export type DigestRow = {
  job: string;
  /** `null` when the log says so; views render it as `—`. */
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  /** Most recent error seen for this job, or `null`. */
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  /** Rows sorted by job. */
  rows: DigestRow[];
  /** Lines that did not parse as a run line. Counted, never thrown. */
  badLines: number;
};

/** Reads `<runsDir>/<night>.jsonl`. Returns `null` when the night has no file. */
export type ReadNight = (runsDir: string, night: string) => Night | null;
