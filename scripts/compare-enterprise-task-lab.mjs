#!/usr/bin/env node
// Exploratory before/after task evidence; the frozen r13 release population remains unchanged.
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createEnterpriseTaskLabBuildReceipt } from './run-isolated-e2e.mjs';

export const TASKS = Object.freeze(['user-management', 'department-hierarchy', 'board-article', 'approvals', 'survey', 'work-report', 'schedule']);
const METRICS = Object.freeze({ lcpMs: 2500, cls: 0.1, observedLabInteractionMs: 200 });
const PROFILE = { viewport: { width: 1280, height: 800 }, timezoneId: 'Asia/Seoul', locale: 'ko-KR', colorScheme: 'light',
  reducedMotion: 'reduce', deviceScaleFactor: 1, serviceWorkers: 'block', cpuRate: 4, rttMs: 150,
  downloadBytesPerSecond: 200000, uploadBytesPerSecond: 93750, repetitionsPerCache: 3 };
const SCOPE = { lcp: 'landing-navigation', cls: 'maximum-session-per-document', interaction: 'observed-lab-interactions',
  action: 'task-action-to-authoritative-readback-proxy' };
export const TASK_SEEDS = Object.freeze({ 'user-management': { departments: 1 }, 'department-hierarchy': { departments: 2 },
  'board-article': { existingProtectedBoards: 1, ownedInitialPosts: 0 }, approvals: { taskCodes: 1, approvers: 1 },
  survey: { ordinaryRespondents: 1, templates: 1, surveys: 1, questions: 2, items: 4 },
  'work-report': { ownedInitialReports: 0 }, schedule: { ownedInitialSchedules: 0 } });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const numeric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export function summarizeTaskNumbers(values) {
  if (values.some(value => !numeric(value))) throw new Error('Task metrics must be observed nonnegative finite numbers.');
  const sorted = [...values].sort((a, b) => a - b);
  const median = rows => rows.length % 2 ? rows[Math.floor(rows.length / 2)] : (rows[rows.length / 2 - 1] + rows[rows.length / 2]) / 2;
  const center = median(sorted);
  return { samples: values.length, median: center, min: sorted[0], max: sorted.at(-1),
    mad: median(sorted.map(value => Math.abs(value - center)).sort((a, b) => a - b)) };
}

/** Compare actual numeric records rather than trusting the collector's cached summaries. */
export function compareEnterpriseTaskRuns(before, after) {
  const errors = []; const rows = [];
  const issue = (condition, code) => { if (!condition) errors.push(code); return condition; };
  for (const [side, run] of [['before', before], ['after', after]]) {
    try {
      const expected = createEnterpriseTaskLabBuildReceipt({ ...run.receipt, inputSha256: run.receipt.inputSha256,
        frontendBuildSha256: run.receipt.frontendBuildSha256 });
      issue(isDeepStrictEqual(expected, run.receipt), `${side}:build-receipt`);
    } catch { errors.push(`${side}:build-receipt`); }
    issue(/^[a-f0-9]{64}$/u.test(run.receiptSha256 ?? ''), `${side}:receipt-hash`);
    issue(isDeepStrictEqual(Object.keys(run.tasks ?? {}).sort(), [...TASKS].sort()), `${side}:complete-task-population`);
  }
  issue(isDeepStrictEqual(before.receipt?.inputSha256, after.receipt?.inputSha256), 'comparison:identical-collector-inputs');
  issue(before.receipt?.source?.revision === after.receipt?.source?.revision, 'comparison:same-starting-revision');
  issue(before.receipt?.runId !== after.receipt?.runId, 'comparison:independent-runtimes');
  issue(before.receipt?.source?.sourceTreeSha256 !== after.receipt?.source?.sourceTreeSha256, 'comparison:different-product-source');
  let referenceRuntime;
  for (const task of TASKS) {
    const taskRuns = [];
    for (const [side, run] of [['before', before], ['after', after]]) {
      const data = run.tasks?.[task];
      if (!issue(data?.schemaVersion === 1 && data.evidenceKind === 'enterprise-task-lab-measurements' && data.task === task,
        `${side}:${task}:measurement-kind`)) continue;
      issue(data.buildReceiptSha256 === run.receiptSha256, `${side}:${task}:build-binding`);
      issue(isDeepStrictEqual(data.profile, PROFILE), `${side}:${task}:fixed-profile`);
      issue(isDeepStrictEqual(data.metricScope, SCOPE), `${side}:${task}:metric-meaning`);
      const samples = data.measurements;
      if (!issue(Array.isArray(samples) && samples.length === 6 && new Set(samples.map(record => `${record.cache}:${record.iteration}`)).size === 6,
        `${side}:${task}:six-independent-samples`)) continue;
      for (const cache of ['cold', 'warm']) for (let iteration = 1; iteration <= 3; iteration++) {
        const sample = samples.find(record => record.cache === cache && record.iteration === iteration);
        if (!issue(!!sample, `${side}:${task}:${cache}:${iteration}:missing-sample`)) continue;
        const label = `${side}:${task}:${cache}:${iteration}`;
        issue(sample.outcome === 'passed' || sample.outcome === 'failed', `${label}:outcome`);
        issue(sample.runtime && ['browserVersion', 'nodeVersion', 'playwrightVersion'].every(key => typeof sample.runtime[key] === 'string'
          && sample.runtime[key].length > 0), `${label}:runtime`);
        referenceRuntime ??= sample.runtime;
        issue(isDeepStrictEqual(sample.runtime, referenceRuntime), `${label}:same-runtime-versions`);
        issue(sample.fixture && sample.fixture.primaryActor === (task === 'survey' ? 'ordinary-user' : 'administrator')
          && sample.fixture.secondaryActors === (task === 'approvals' ? 2 : task === 'survey' ? 1 : 0)
          && isDeepStrictEqual(sample.fixture.ownedSeedCounts, TASK_SEEDS[task]), `${label}:fixture`);
        const verifyCdp = (value, prefix) => issue(value?.actualPage === true && value.cpuApplied === true && value.networkApplied === true
          && value.cacheDisabled === (cache === 'cold') && Number.isInteger(value.cacheHits)
          && (cache === 'cold' ? value.cacheHits === 0 : value.cacheHits > 0), `${prefix}:actual-page-cache-cpu-network`);
        verifyCdp(sample.cdp, label);
        for (const metric of Object.keys(METRICS)) issue(numeric(sample[metric]), `${label}:${metric}:observed`);
        issue(Number.isInteger(sample.observedInteractionCount) && sample.observedInteractionCount > 0, `${label}:real-interactions`);
        if (side === 'after') {
          issue(sample.outcome === 'passed' && sample.complete === true && sample.failureStage === null, `${label}:completed-workflow`);
          issue(Array.isArray(sample.taskActionToAuthoritativeReadbackMs) && sample.taskActionToAuthoritativeReadbackMs.length > 0
            && sample.taskActionToAuthoritativeReadbackMs.every(value => numeric(value.milliseconds)), `${label}:authoritative-mutations`);
          issue(sample.keyboard?.tabs > 0 && sample.keyboard.enters > 0 && sample.keyboard.escapes > 0
            && sample.keyboard.checks?.length > 0 && sample.keyboard.checks.every(value => value.passed === true), `${label}:keyboard`);
          issue(sample.accessibility?.observed === true && sample.accessibility.violations?.length === 0, `${label}:separate-axe`);
        }
        if (side === 'after' || sample.complete === true) {
          issue(sample.actorPages?.length === sample.fixture?.secondaryActors, `${label}:all-actors`);
          for (const [index, actor] of (sample.actorPages ?? []).entries()) {
            verifyCdp(actor.cdp, `${label}:actor${index}`);
            issue(numeric(actor.observedLabInteractionMs) && actor.observedInteractionCount > 0, `${label}:actor${index}:real-interactions`);
            issue(actor.accessibility?.observed === true && actor.accessibility.violations?.length === 0, `${label}:actor${index}:separate-axe`);
          }
        }
      }
      taskRuns.push(data);
    }
    if (taskRuns.length !== 2) continue;
    for (const cache of ['cold', 'warm']) {
      const prior = taskRuns[0].measurements.filter(sample => sample.cache === cache);
      const current = taskRuns[1].measurements.filter(sample => sample.cache === cache);
      issue(prior.length === 3 && current.length === 3, `${task}:${cache}:three-samples`);
      for (const sample of [...prior, ...current]) issue(isDeepStrictEqual(sample.fixture, prior[0]?.fixture), `${task}:${cache}:same-fixture-shape`);
      const metrics = {};
      for (const [metric, target] of Object.entries(METRICS)) {
        if (![...prior, ...current].every(sample => numeric(sample[metric]))) continue;
        const baseline = summarizeTaskNumbers(prior.map(sample => sample[metric]));
        const improved = summarizeTaskNumbers(current.map(sample => sample[metric]));
        // The median is the declared repeated lab goal. Every sample and its spread remain visible.
        issue(improved.median <= target, `${task}:${cache}:${metric}:median-target`);
        const comparable = metric === 'lcpMs' || [...prior, ...current].every(sample => sample.complete === true);
        metrics[metric] = { before: baseline, after: improved, comparable,
          medianChange: comparable ? improved.median - baseline.median : null, target,
          ...(comparable ? {} : { limitation: 'Baseline workflow stopped; its partial task observations cannot establish a task improvement.' }) };
      }
      rows.push({ task, cache, beforePassed: prior.filter(sample => sample.outcome === 'passed').length,
        afterPassed: current.filter(sample => sample.outcome === 'passed').length, metrics });
    }
  }
  return { schemaVersion: 1, evidenceKind: 'enterprise-task-lab-comparison', passed: errors.length === 0, errors,
    before: { receiptSha256: before.receiptSha256, build: before.receipt }, after: { receiptSha256: after.receiptSha256, build: after.receipt },
    runtime: referenceRuntime, rows, metricScope: SCOPE, fieldInpMeasured: false, operationalValidation: false };
}

export function readEnterpriseTaskRun(directory) {
  const read = file => { const target = path.join(directory, file); const stat = lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8 * 1024 * 1024) throw new Error('Task evidence must be a bounded regular file.');
    return readFileSync(target); };
  const receipt = read('enterprise-task-lab-build.json');
  return { receipt: JSON.parse(receipt), receiptSha256: sha(receipt),
    tasks: Object.fromEntries(TASKS.map(task => [task, JSON.parse(read(`enterprise-task-lab/${task}.json`))])) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [before, after, output, ...extra] = process.argv.slice(2);
    if (!before || !after || !output || extra.length) throw new Error('Use <before-run-directory> <after-run-directory> <new-report.json>.');
    const result = compareEnterpriseTaskRuns(readEnterpriseTaskRun(path.resolve(before)), readEnterpriseTaskRun(path.resolve(after)));
    writeFileSync(path.resolve(output), JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(`Enterprise task comparison: ${result.rows.length} task/cache pairs, ${result.errors.length} failed evidence checks.`);
    if (!result.passed) process.exitCode = 1;
  } catch { console.error('Enterprise task comparison failed; inspect the bounded local evidence.'); process.exitCode = 1; }
}
