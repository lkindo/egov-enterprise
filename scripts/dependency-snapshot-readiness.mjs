#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export function buildRetryDelays(maxWaitSeconds, { initialSeconds = 10, capSeconds = 60 } = {}) {
  if (!Number.isInteger(maxWaitSeconds) || maxWaitSeconds < 0 || maxWaitSeconds > 3600) {
    throw new Error('SNAPSHOT_WAIT_SECONDS must be an integer between 0 and 3600');
  }
  if (!Number.isInteger(initialSeconds) || initialSeconds <= 0 || !Number.isInteger(capSeconds) || capSeconds <= 0) {
    throw new Error('retry delays must be positive integers');
  }

  const delays = [0];
  let remaining = maxWaitSeconds;
  let next = initialSeconds;
  while (remaining > 0) {
    const delay = Math.min(next, capSeconds, remaining);
    delays.push(delay);
    remaining -= delay;
    next = Math.min(next * 2, capSeconds);
  }
  return delays;
}

export function validateSnapshotInputs({ repository, baseSha, headSha, token, apiUrl }) {
  if (!/^[^/\s]+\/[^/\s]+$/.test(repository ?? '')) {
    throw new Error('GITHUB_REPOSITORY must have owner/repository form');
  }
  if (!SHA_PATTERN.test(baseSha ?? '')) {
    throw new Error('BASE_SHA must be a full 40-hex commit SHA');
  }
  if (!SHA_PATTERN.test(headSha ?? '')) {
    throw new Error('HEAD_SHA must be a full 40-hex commit SHA');
  }
  if (!token) {
    throw new Error('GITHUB_TOKEN is required');
  }
  if (!/^https:\/\//i.test(apiUrl ?? '')) {
    throw new Error('GITHUB_API_URL must be an HTTPS URL');
  }
}

export function comparisonUrl({ apiUrl, repository, baseSha, headSha }) {
  const [owner, repo] = repository.split('/').map(encodeURIComponent);
  return `${apiUrl.replace(/\/$/, '')}/repos/${owner}/${repo}/dependency-graph/compare/${baseSha}...${headSha}`;
}

export function decodeSnapshotWarning(rawWarning) {
  if (!rawWarning) return '';
  try {
    return Buffer.from(rawWarning, 'base64').toString('utf8').trim() || rawWarning;
  } catch {
    return rawWarning;
  }
}

export async function fetchSnapshotWarning({ fetchImpl = fetch, ...inputs }) {
  const response = await fetchImpl(comparisonUrl(inputs), {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${inputs.token}`,
      'X-GitHub-Api-Version': '2026-03-10',
    },
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    const error = new Error(`dependency review API returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    error.status = response.status;
    throw error;
  }

  const rawWarning = response.headers.get('x-github-dependency-graph-snapshot-warnings')?.trim() ?? '';
  await response.body?.cancel();
  return decodeSnapshotWarning(rawWarning);
}

export async function isPublisherConfiguredOnBase({ apiUrl, repository, baseSha, token, fetchImpl = fetch }) {
  const [owner, repo] = repository.split('/').map(encodeURIComponent);
  const url = `${apiUrl.replace(/\/$/, '')}/repos/${owner}/${repo}/contents/.github/workflows/dependency-submission-publish.yml?ref=${encodeURIComponent(baseSha)}`;
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2026-03-10',
      },
    });
    if (response.status === 404) {
      await response.body?.cancel();
      return false;
    }
    await response.body?.cancel();
    return true;
  } catch {
    return true;
  }
}

export async function waitForCompleteSnapshots(inputs, {
  maxWaitSeconds = 600,
  fetchImpl = fetch,
  sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
  log = console.log,
} = {}) {
  validateSnapshotInputs(inputs);

  const publisherActive = await isPublisherConfiguredOnBase({ ...inputs, fetchImpl });
  if (!publisherActive) {
    log(`ℹ️ dependency-submission-publish.yml is not present on base branch (${inputs.baseSha}) — bootstrap phase allows proceeding.`);
    return;
  }

  const delays = buildRetryDelays(maxWaitSeconds);
  let lastWarning = '';
  let lastError = null;

  for (let index = 0; index < delays.length; index += 1) {
    const delaySeconds = delays[index];
    if (delaySeconds > 0) await sleep(delaySeconds * 1000);

    try {
      const warning = await fetchSnapshotWarning({ ...inputs, fetchImpl });
      if (!warning) {
        log(`✅ dependency snapshots are complete for ${inputs.baseSha}...${inputs.headSha}`);
        return;
      }
      lastWarning = warning;
      lastError = null;
      log(`⏳ dependency snapshot is not complete yet (${index + 1}/${delays.length})`);
    } catch (error) {
      lastError = error;
      const retryable = error.status === undefined || RETRYABLE_STATUS.has(error.status);
      if (!retryable || index === delays.length - 1) throw error;
      const cause = error.status === undefined ? 'network error' : `HTTP ${error.status}`;
      log(`⏳ dependency review API is temporarily unavailable (${cause})`);
    }
  }

  const diagnostic = (lastWarning || lastError?.message || 'snapshot warning remained present')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 500);
  throw new Error(
    `dependency snapshot completeness was not proven within ${maxWaitSeconds}s: ${diagnostic}`,
  );
}

export async function main(env = process.env) {
  const maxWaitSeconds = Number(env.SNAPSHOT_WAIT_SECONDS ?? '600');
  await waitForCompleteSnapshots({
    repository: env.GITHUB_REPOSITORY,
    baseSha: env.BASE_SHA,
    headSha: env.HEAD_SHA,
    token: env.GITHUB_TOKEN,
    apiUrl: env.GITHUB_API_URL ?? 'https://api.github.com',
  }, { maxWaitSeconds });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  });
}
