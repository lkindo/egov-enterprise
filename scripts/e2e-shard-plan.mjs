import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE_PATH = path.join(REPO_ROOT, 'frontend', 'e2e', 'shard-duration-profile.json');
const SPEC_ROOT = path.join(REPO_ROOT, 'frontend', 'e2e');
const ISO_CAPTURED_AT = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/;
/** 재측정 주기다. 노후화는 보고하며 실제 spec/provenance 오류는 계속 차단한다. */
export const MAX_PROFILE_AGE_DAYS = 120;

export function durationProfileFreshness(profile, nowMs = Date.now()) {
  const errors = validateSourceEvidence(profile?.source, nowMs);
  if (errors.length) throw new Error(errors.join('\n'));
  const remeasureAt = Date.parse(profile.source.capturedAt) + MAX_PROFILE_AGE_DAYS * 86_400_000;
  return { source: 'frontend/e2e/shard-duration-profile.json', capturedAt: profile.source.capturedAt,
    remeasureAt: new Date(remeasureAt).toISOString(),
    freshness: nowMs > remeasureAt ? 'overdue' : remeasureAt - nowMs <= 30 * 86_400_000 ? 'due-soon' : 'scheduled',
    blocksSourceBuild: false, actualRuntimeBalanceVerified: false };
}

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

// Shadow analysis only: these explicit ownership rules never reduce CI execution.
// Shared inputs and any unrecognized dependency deliberately select the full population.
export const IMPACT_RULES = [
  { prefixes: ['frontend/src/app/polls/', 'frontend/src/app/admin/polls/'], specs: ['journeys/online-polls.spec.ts'] },
  { prefixes: ['frontend/src/app/approvals/'], specs: ['journeys/approvals.spec.ts', 'journeys/workflow-demo.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/workflow/'], specs: ['journeys/workflow-demo.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/collaboration/address-book/'], specs: ['journeys/address-book.spec.ts', 'contracts/address-book-ownership.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/community/boards/', 'frontend/src/app/boards/'], specs: ['journeys/board-masters.spec.ts', 'journeys/board-articles.spec.ts', 'journeys/community-navigation.spec.ts', 'quality/board-draft-recovery.spec.ts', 'quality/stored-xss.spec.ts', 'quality/error-recovery.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/help/', 'frontend/src/app/help/', 'frontend/src/app/admin/uss/olh/online-manual/'], specs: ['journeys/help-content.spec.ts', 'journeys/public-navigation.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/operation/rewards/'], specs: ['journeys/rewards.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/operation/events/'], specs: ['journeys/event-administration.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/notifications/'], specs: ['journeys/notifications.spec.ts'] },
  { prefixes: ['frontend/src/app/smart-toolkit/schedule/'], specs: ['contracts/schedules.spec.ts', 'journeys/schedules.spec.ts', 'journeys/approvals.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/system/common-code/'], specs: ['journeys/common-codes.spec.ts', 'quality/visual-baselines.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/user/'], specs: ['journeys/user-administration.spec.ts', 'journeys/organization-policy.spec.ts', 'journeys/department-hierarchy.spec.ts', 'journeys/authorization.spec.ts', 'journeys/security-administration.spec.ts'] },
];

export function buildImpactShadowPlan(changes, specs = discoverSpecs(), rules = IMPACT_RULES) {
  if (!Array.isArray(specs) || !specs.length || new Set(specs).size !== specs.length) throw new Error('invalid E2E population');
  for (const rule of rules) {
    if (!rule.prefixes?.length || !rule.specs?.length || rule.specs.some(spec => !specs.includes(spec))) {
      throw new Error('impact rule must own existing nonempty specs');
    }
  }
  const all = [...specs].sort();
  const full = reason => ({ mode: 'shadow', executes: 'full', fullFallback: true, reasons: [reason], selectedSpecs: all });
  if (!Array.isArray(changes) || !changes.length) return full('empty or unavailable comparison');
  const selected = new Set();
  const reasons = [];
  for (const change of changes) {
    const file = change?.path;
    if (change?.status !== 'M') return full('added, removed, renamed or unknown file status');
    if (typeof file !== 'string' || file.includes('\\') || file.split('/').some(part => !part || part === '..' || part === '.')) return full('invalid changed path');
    if (file.startsWith('frontend/e2e/') && specs.includes(file.slice('frontend/e2e/'.length))) {
      selected.add(file.slice('frontend/e2e/'.length));
      reasons.push(`changed spec: ${file}`);
      continue;
    }
    const matching = rules.filter(rule => rule.prefixes.some(prefix => file.startsWith(prefix)));
    if (!matching.length) return full(`shared or unmapped input: ${file}`);
    for (const rule of matching) for (const spec of rule.specs) selected.add(spec);
    reasons.push(`owned route: ${file}`);
  }
  // The shell and quality consumers can observe changes across route boundaries.
  for (const spec of specs.filter(spec => spec.startsWith('quality/') || spec === 'journeys/application-shell.spec.ts')) selected.add(spec);
  if (!selected.size) return full('empty candidate selection');
  return { mode: 'shadow', executes: 'full', fullFallback: false, reasons, selectedSpecs: [...selected].sort() };
}

export function compareImpactShadow(plan, report) {
  if (plan?.mode !== 'shadow' || plan.executes !== 'full' || !Array.isArray(plan.selectedSpecs) || !plan.selectedSpecs.length) throw new Error('invalid shadow plan');
  const failures = new Set();
  function visit(suites) {
    if (!Array.isArray(suites)) throw new Error('invalid shadow report');
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        if (spec.tests?.some(test => test.status === 'unexpected' || test.status === 'flaky')) {
          const file = path.isAbsolute(spec.file) ? path.relative(report.config.rootDir, spec.file) : spec.file;
          failures.add(file.replaceAll('\\', '/'));
        }
      }
      if (suite.suites) visit(suite.suites);
    }
  }
  visit(report?.suites);
  const missedFailures = [...failures].filter(file => file.endsWith('.spec.ts') && !plan.selectedSpecs.includes(file)).sort();
  return { ...plan, failedSpecs: [...failures].sort(), missedFailures, detectionMissObserved: missedFailures.length > 0,
    selectionReady: false, reason: 'Full execution remains authoritative; green shadow runs do not prove dependency completeness.' };
}

function shadowChanges(base, head) {
  if (!/^[0-9a-f]{40}$/i.test(base ?? '') || !/^[0-9a-f]{40}$/i.test(head ?? '')) return [];
  try {
    const fields = execFileSync('git', ['diff', '--no-renames', '--name-status', '-z', base, head, '--'], { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).split('\0');
    const changes = [];
    while (fields.length > 1) changes.push({ status: fields.shift(), path: fields.shift() });
    return changes;
  } catch { return []; }
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
    && new Date(`${source.capturedAt.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) === source.capturedAt.slice(0, 10)
    && (source.capturedAt.length === 10 || Number(source.capturedAt.slice(11, 13)) < 24);
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
  const argument = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
  if (process.argv.includes('--shadow-output')) {
    const output = argument('--shadow-output');
    if (!output) throw new Error('--shadow-output requires a path');
    const plan = buildImpactShadowPlan(shadowChanges(argument('--shadow-base'), argument('--shadow-head')));
    fs.writeFileSync(output, JSON.stringify(plan, null, 2) + '\n');
    process.stderr.write(`Shadow E2E candidate: ${plan.selectedSpecs.length}/${discoverSpecs().length}; execution remains full.\n`);
    return;
  }
  if (process.argv.includes('--shadow-report')) {
    const plan = JSON.parse(fs.readFileSync(argument('--shadow-plan'), 'utf8'));
    const report = JSON.parse(fs.readFileSync(argument('--shadow-report'), 'utf8'));
    const result = compareImpactShadow(plan, report);
    fs.writeFileSync(argument('--shadow-plan'), JSON.stringify(result, null, 2) + '\n');
    if (result.detectionMissObserved) process.stderr.write(`Shadow selection missed ${result.missedFailures.length} failing specs; full execution preserved the failures.\n`);
    return;
  }
  const argumentIndex = process.argv.indexOf('--shard');
  if (argumentIndex < 0 || !process.argv[argumentIndex + 1]) {
    throw new Error('usage: node scripts/e2e-shard-plan.mjs --shard current/total');
  }
  const { current, total } = parseShard(process.argv[argumentIndex + 1]);
  const profile = loadDurationProfile();
  const plan = buildDurationBalancedPlan(profile, total);
  if (durationProfileFreshness(profile).freshness === 'overdue') {
    process.stderr.write('E2E duration evidence requires remeasurement; the plan remains an estimate.\n');
  }
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
