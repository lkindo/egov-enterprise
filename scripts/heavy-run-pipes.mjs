/**
 * [DEC-OPS-413] Named-pipe names of the heavy-run queue (scripts/heavy-run-queue.mjs). The queue's lock is a Windows named
 * pipe whose listener is the holder, so the OS releases it when the holder dies; a waiting supervisor opens its own waiter
 * pipe, which the OS likewise removes. The verification recorder reads the waiter names to leave waiting supervisors out of
 * its overlap samples. Windows only — elsewhere there are no pipes and the lists are empty.
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';

export const PIPE_ROOT = '\\\\.\\pipe\\';
export const PIPE_PREFIX = 'egov-heavy-run-';
const WAITER = /^egov-heavy-run-([0-9a-f]{16})-w-(\d{13})-([1-9]\d*)$/;

/** First 16 hex digits of the SHA-256 of the normalized Git common dir (lower case, `/` separators, no trailing slash). */
export function repositoryHash(commonDir) {
  const normalized = String(commonDir).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

export const lockPipeName = (hash) => `${PIPE_PREFIX}${hash}`;
export const waiterPipeName = (hash, startedMs, pid) => `${PIPE_PREFIX}${hash}-w-${String(startedMs).padStart(13, '0')}-${pid}`;
export const pipePath = (name) => `${PIPE_ROOT}${name}`;

/** {hash, startedMs, pid} of a waiter pipe name, or null for any other name. */
export function parseWaiterPipe(name) {
  const match = WAITER.exec(name);
  return match ? { hash: match[1], startedMs: Number(match[2]), pid: Number(match[3]), name } : null;
}

/** PIDs of supervisors that hold a waiter pipe (any repository on this machine). */
export function waitingSupervisorPids(names) {
  return new Set(names.map(parseWaiterPipe).filter(Boolean).map((waiter) => waiter.pid));
}

/** Queue pipe names on this machine; throws when the pipe namespace cannot be listed (callers decide what that means). */
export function listQueuePipeNamesSync({ platform = process.platform, readdir = fs.readdirSync } = {}) {
  if (platform !== 'win32') return [];
  return readdir(PIPE_ROOT).filter((name) => name.startsWith(PIPE_PREFIX));
}
