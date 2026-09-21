import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { classifyChangedFiles } from './ci-change-scope.mjs';

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

// Audited route owners. Shared inputs and unrecognized dependencies remain full.
// admin/user is deliberately excluded: identity/organization changes retain full execution.
export const IMPACT_RULES = [
  { prefixes: ['frontend/src/app/admin/survey/'], specs: ['journeys/online-polls.spec.ts'] },
  { prefixes: ['frontend/src/app/approvals/'], specs: ['journeys/approvals.spec.ts', 'journeys/public-navigation.spec.ts', 'journeys/workflow-demo.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/workflow/'], specs: ['journeys/workflow-demo.spec.ts', 'journeys/community-navigation.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/collaboration/address-book/'], specs: ['journeys/address-book.spec.ts', 'contracts/address-book-ownership.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/community/boards/'], specs: ['journeys/board-masters.spec.ts', 'journeys/board-articles.spec.ts', 'journeys/community-navigation.spec.ts', 'journeys/help-content.spec.ts', 'journeys/authentication.spec.ts', 'journeys/authorization.spec.ts', 'quality/board-draft-recovery.spec.ts', 'quality/stored-xss.spec.ts', 'quality/error-recovery.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/help/', 'frontend/src/app/help/', 'frontend/src/app/admin/uss/olh/online-manual/'], specs: ['journeys/help-content.spec.ts', 'journeys/public-navigation.spec.ts', 'journeys/community-navigation.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/operation/rewards/'], specs: ['journeys/rewards.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/operation/events/'], specs: ['journeys/event-administration.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/notifications/'], specs: ['journeys/notifications.spec.ts'] },
  { prefixes: ['frontend/src/app/smart-toolkit/schedule/'], specs: ['contracts/schedules.spec.ts', 'journeys/schedules.spec.ts', 'journeys/approvals.spec.ts'] },
  { prefixes: ['frontend/src/app/admin/system/common-code/'], specs: ['journeys/common-codes.spec.ts', 'quality/visual-baselines.spec.ts'] },
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
    if (typeof file !== 'string' || file.includes('\\') || file.split('/').some(part => !part || part === '..' || part === '.')) return full('invalid changed path');
    // Reuse the existing policy-aware documentation boundary; do not maintain a
    // second exemption list. Documentation alone never selects just the shell.
    if (classifyChangedFiles([file]).docsOnly) continue;
    if (change?.status !== 'M') return full('added, removed, renamed or unknown file status');
    // Tests, CSS and Next boundary files can affect more than one owner. New or
    // changed contracts themselves also keep the complete regression population.
    if (!/\.(?:ts|tsx)$/.test(file) || /(?:^|\/)(?:layout|template|loading|error|not-found|global-error|route)\.[^/]+$/.test(file)) return full('shared route boundary or non-source input');
    const matching = rules.filter(rule => rule.prefixes.some(prefix => file.startsWith(prefix)));
    if (!matching.length) return full(`shared or unmapped input: ${file}`);
    for (const rule of matching) for (const spec of rule.specs) selected.add(spec);
    reasons.push(`owned route: ${file}`);
  }
  if (!selected.size) return full('empty candidate selection');
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

function gitRead(repoRoot, args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

// Use the already-installed compiler to inspect imports, rather than guessing
// with a regex that can miss multiline exports or mistake comments for code.
// The E2E job installs frontend dependencies. Other callers without them use full.
export function routeBoundaryRisk(changes, { repoRoot = REPO_ROOT, rules = IMPACT_RULES } = {}) {
  try {
    const ts = createRequire(path.join(REPO_ROOT, 'frontend/package.json'))('typescript');
    const config = ts.readConfigFile(path.join(repoRoot, 'frontend/tsconfig.json'), ts.sys.readFile);
    // Even baseUrl:"" enables bare local imports; inherited options can also
    // introduce aliases that this deliberately narrow boundary cannot resolve.
    if (config.error || Object.hasOwn(config.config ?? {}, 'extends')
      || Object.hasOwn(config.config?.compilerOptions ?? {}, 'baseUrl')
      || JSON.stringify(config.config?.compilerOptions?.paths) !== JSON.stringify({ '@/*': ['./src/*'] })) return 'unrecognized source import configuration';
    if (gitRead(repoRoot, ['diff', '--name-only', 'HEAD', '--', 'frontend/src', 'frontend/tsconfig.json'])) return 'source inputs differ from the checked-out commit';
    if (gitRead(repoRoot, ['ls-files', '--others', '--exclude-standard', '--', 'frontend/src'])) return 'untracked source input';
    const activeRules = rules.filter(rule => changes.some(change => rule.prefixes.some(prefix => change.path.startsWith(prefix))));
    const files = gitRead(repoRoot, ['ls-files', '-z', '--', 'frontend/src']).split('\0').filter(file => /\.[cm]?[jt]sx?$/.test(file)
      && !/(?:^|\/)__tests__\/|\.(?:test|spec)\.[^/]+$/.test(file));
    for (const file of files) {
      const absolute = path.join(repoRoot, file);
      if (fs.lstatSync(absolute).isSymbolicLink()) return 'symbolic source dependency';
      const source = ts.createSourceFile(file, fs.readFileSync(absolute, 'utf8'), ts.ScriptTarget.Latest, true);
      if (source.parseDiagnostics.length) return 'source import analysis failed';
      let risk = null;
      const inspect = module => {
        if (!module || !ts.isStringLiteralLike(module)) { risk = 'computed source import'; return; }
        const name = module.text;
        const target = name.startsWith('@/') ? path.posix.normalize(`frontend/src/${name.slice(2)}`)
          : name.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), name)) : null;
        if (!target) return;
        for (const rule of activeRules) {
          const owns = value => rule.prefixes.some(prefix => value.startsWith(prefix) || value === prefix.slice(0, -1));
          if (owns(target) && !owns(file)) risk = `route has an external source consumer: ${file}`;
        }
      };
      const visit = node => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
          if (node.moduleSpecifier) inspect(node.moduleSpecifier);
        } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
          inspect(node.moduleReference.expression);
        } else if (ts.isImportTypeNode(node)) {
          inspect(ts.isLiteralTypeNode(node.argument) ? node.argument.literal : null);
        } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
          || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) inspect(node.arguments[0]);
        ts.forEachChild(node, visit);
      };
      visit(source);
      if (risk) return risk;
    }
    return null;
  } catch { return 'source import evidence unavailable'; }
}

/** Recompute from GitHub's event and the checkout; a saved plan is never authority. */
export function resolveCiImpactPlan({ eventName = process.env.GITHUB_EVENT_NAME, eventPath = process.env.GITHUB_EVENT_PATH,
  githubSha = process.env.GITHUB_SHA, repoRoot = REPO_ROOT, specs = discoverSpecs(), rules = IMPACT_RULES } = {}) {
  if (!Array.isArray(specs) || !specs.length || new Set(specs).size !== specs.length) throw new Error('invalid E2E population');
  const all = [...specs].sort();
  const evidence = { schemaVersion: 1, eventName: eventName ?? '', baseSha: null, headSha: null, checkoutSha: null };
  const full = reason => ({ ...evidence, mode: 'full', executes: 'full', fullFallback: true, reasons: [reason], selectedSpecs: all });
  if (eventName !== 'pull_request') return full('only pull requests may select route owners');
  try {
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const pr = event.pull_request;
    const base = pr?.base?.sha, head = pr?.head?.sha, merge = pr?.merge_commit_sha;
    if (![base, head, merge].every(sha => /^[0-9a-f]{40}$/.test(sha ?? ''))) return full('invalid immutable pull request commits');
    evidence.baseSha = base; evidence.headSha = head;
    evidence.checkoutSha = gitRead(repoRoot, ['rev-parse', 'HEAD']);
    if (evidence.checkoutSha !== merge || (githubSha && githubSha !== merge)) return full('checkout is not the event merge commit');
    for (const sha of [base, head, merge]) gitRead(repoRoot, ['cat-file', '-e', `${sha}^{commit}`]);
    const parents = gitRead(repoRoot, ['rev-list', '--parents', '-n', '1', merge]).split(/\s+/).slice(1);
    if (JSON.stringify(parents) !== JSON.stringify([base, head])) return full('merge parents do not match the event base and head');
    for (const sha of [base, head]) gitRead(repoRoot, ['merge-base', '--is-ancestor', sha, merge]);
    const fields = gitRead(repoRoot, ['diff', '--no-renames', '--name-status', '-z', base, merge, '--']).split('\0');
    const changes = [];
    while (fields.length > 1) changes.push({ status: fields.shift(), path: fields.shift() });
    const candidate = buildImpactShadowPlan(changes, specs, rules);
    if (candidate.fullFallback) return full(candidate.reasons[0]);
    const risk = routeBoundaryRisk(changes, { repoRoot, rules });
    if (risk) return full(risk);
    return { ...evidence, mode: 'selected', executes: 'selected', fullFallback: false,
      reasons: candidate.reasons, selectedSpecs: candidate.selectedSpecs };
  } catch { return full('immutable pull request or Git evidence unavailable'); }
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

export function buildDurationBalancedPlan(profile, shardCount, selectedSpecs = discoverSpecs()) {
  if (!Number.isInteger(shardCount) || shardCount < 1) {
    throw new Error(`shardCount must be a positive integer: ${shardCount}`);
  }
  const errors = validateDurationProfile(profile);
  if (errors.length > 0) throw new Error(errors.join('\n'));
  if (!Array.isArray(selectedSpecs) || !selectedSpecs.length || new Set(selectedSpecs).size !== selectedSpecs.length
    || selectedSpecs.some(spec => !Object.hasOwn(profile.durationsMs, spec))) throw new Error('invalid selected E2E population');

  const shards = Array.from({ length: shardCount }, (_, index) => ({
    index: index + 1,
    estimatedMs: 0,
    specs: [],
  }));
  const weightedSpecs = Object.entries(profile.durationsMs).filter(([spec]) => selectedSpecs.includes(spec))
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
  const impact = process.argv.includes('--ci') ? resolveCiImpactPlan() : null;
  const plan = buildDurationBalancedPlan(profile, total, impact?.selectedSpecs);
  if (argument('--plan-output')) {
    if (!impact) throw new Error('--plan-output requires --ci');
    fs.writeFileSync(argument('--plan-output'), JSON.stringify({ ...impact, shards: plan }, null, 2) + '\n');
  }
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
