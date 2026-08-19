import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE_PATH = path.join(REPO_ROOT, 'frontend', 'e2e', 'shard-duration-profile.json');
const SPEC_ROOT = path.join(REPO_ROOT, 'frontend', 'e2e');
const ISO_CAPTURED_AT = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/;

function toPosix(value) {
  return value.split(path.sep).join('/');
}

export function discoverSpecs(specRoot = SPEC_ROOT) {
  const discovered = [];

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
        discovered.push(toPosix(path.relative(specRoot, absolute)));
      }
    }
  }

  visit(specRoot);
  return discovered.sort();
}

export function loadDurationProfile(profilePath = PROFILE_PATH) {
  return JSON.parse(fs.readFileSync(profilePath, 'utf8'));
}

function validateSourceEvidence(source, nowMs) {
  const errors = [];
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return ['source evidence is required'];
  }

  const workflowRunId = source.workflowRunId;
  const validWorkflowRunId = (typeof workflowRunId === 'string' && /^[1-9]\d*$/.test(workflowRunId))
    || (Number.isSafeInteger(workflowRunId) && workflowRunId > 0);
  if (!validWorkflowRunId) errors.push('source.workflowRunId must be a positive integer');

  if (typeof source.commit !== 'string' || !/^[0-9a-f]{40}$/i.test(source.commit)) {
    errors.push('source.commit must be a 40-hex commit SHA');
  }

  const capturedAtMs = typeof source.capturedAt === 'string'
    && ISO_CAPTURED_AT.test(source.capturedAt)
    ? Date.parse(source.capturedAt)
    : Number.NaN;
  const validCalendarDate = Number.isFinite(capturedAtMs)
    && (source.capturedAt.length !== 10
      || new Date(capturedAtMs).toISOString().slice(0, 10) === source.capturedAt);
  if (!Number.isFinite(capturedAtMs) || !validCalendarDate) {
    errors.push('source.capturedAt must be a valid ISO date or timestamp');
  } else if (capturedAtMs > nowMs) {
    errors.push('source.capturedAt must not be in the future');
  }

  if (typeof source.runner !== 'string' || source.runner.trim().length === 0) {
    errors.push('source.runner must be a nonempty string');
  }
  if (!Number.isInteger(source.workers) || source.workers <= 0) {
    errors.push('source.workers must be a positive integer');
  }
  return errors;
}

export function validateDurationProfile(profile, specs = discoverSpecs(), nowMs = Date.now()) {
  const errors = [];
  if (profile?.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  errors.push(...validateSourceEvidence(profile?.source, nowMs));

  const durations = profile?.durationsMs;
  if (!durations || typeof durations !== 'object' || Array.isArray(durations)) {
    errors.push('durationsMs must be an object');
    return errors;
  }

  const recorded = Object.keys(durations).sort();
  const missing = specs.filter(spec => !recorded.includes(spec));
  const stale = recorded.filter(spec => !specs.includes(spec));
  if (missing.length > 0) errors.push(`missing duration profile: ${missing.join(', ')}`);
  if (stale.length > 0) errors.push(`stale duration profile: ${stale.join(', ')}`);

  for (const [spec, duration] of Object.entries(durations)) {
    const segments = spec.split('/');
    if (!spec.endsWith('.spec.ts')
      || spec.startsWith('/')
      || spec.includes('\\')
      || spec.includes('\0')
      || segments.some(segment => segment === '' || segment === '.' || segment === '..')) {
      errors.push(`invalid spec key: ${spec}`);
    }
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isInteger(duration)) {
      errors.push(`duration must be a positive integer for ${spec}`);
    }
  }
  return errors;
}

export function buildDurationBalancedPlan(profile, shardCount) {
  if (!Number.isInteger(shardCount) || shardCount < 1) {
    throw new Error(`shardCount must be a positive integer: ${shardCount}`);
  }
  const errors = validateDurationProfile(profile);
  if (errors.length > 0) throw new Error(errors.join('\n'));

  const shards = Array.from({ length: shardCount }, (_, index) => ({
    index: index + 1,
    estimatedMs: 0,
    specs: [],
  }));
  const weightedSpecs = Object.entries(profile.durationsMs)
    .sort(([leftName, leftMs], [rightName, rightMs]) => rightMs - leftMs || leftName.localeCompare(rightName));

  for (const [spec, durationMs] of weightedSpecs) {
    const target = [...shards].sort((left, right) => left.estimatedMs - right.estimatedMs || left.index - right.index)[0];
    target.specs.push(spec);
    target.estimatedMs += durationMs;
  }
  for (const shard of shards) shard.specs.sort();
  return shards;
}

export function parseShard(value) {
  const match = /^(\d+)\/(\d+)$/.exec(value ?? '');
  if (!match) throw new Error(`--shard must use current/total format: ${value}`);
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isInteger(current) || !Number.isInteger(total) || current < 1 || current > total) {
    throw new Error(`invalid shard: ${value}`);
  }
  return { current, total };
}

function cli() {
  const argumentIndex = process.argv.indexOf('--shard');
  if (argumentIndex < 0 || !process.argv[argumentIndex + 1]) {
    throw new Error('usage: node scripts/e2e-shard-plan.mjs --shard current/total');
  }
  const { current, total } = parseShard(process.argv[argumentIndex + 1]);
  const plan = buildDurationBalancedPlan(loadDurationProfile(), total);
  const selected = plan[current - 1];
  const summary = plan.map(shard => `${shard.index}/${total}=${(shard.estimatedMs / 1000).toFixed(1)}s`).join(', ');
  process.stderr.write(`Duration-balanced E2E plan: ${summary}\n`);
  for (const spec of selected.specs) process.stdout.write(`${toPosix(path.join('e2e', spec))}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    cli();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
