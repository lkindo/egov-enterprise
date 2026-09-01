#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const OUTCOMES = ['expected', 'skipped', 'unexpected', 'flaky'];
const OUTCOME_SET = new Set(OUTCOMES);
const TEST_STATUSES = new Set(['passed', 'failed', 'timedOut', 'skipped', 'interrupted']);
const MAX_REPORT_BYTES = 64 * 1024 * 1024;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function canonicalAbsolute(value) {
  const normalized = path.resolve(value).replaceAll('\\', '/');
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function displayRelative(absolute, cwd) {
  return path.relative(cwd, absolute).replaceAll('\\', '/');
}

function plannedPath(value, cwd, errors, seen) {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('\0') || path.isAbsolute(value)) {
    errors.push(`invalid planned spec path: ${String(value)}`);
    return null;
  }
  const segments = value.split(/[\\/]/);
  if (segments[0] !== 'e2e'
    || segments.some((segment) => segment === '' || segment === '.' || segment === '..')
    || !segments.at(-1).endsWith('.spec.ts')) {
    errors.push(`planned spec must be a safe e2e/**/*.spec.ts path: ${value}`);
    return null;
  }
  const absolute = canonicalAbsolute(path.join(cwd, ...segments));
  if (seen.has(absolute)) errors.push(`duplicate planned spec: ${displayRelative(absolute, cwd)}`);
  seen.add(absolute);
  return absolute;
}

function reportPath(value, rootDir, expectedRoot, errors) {
  if (typeof value !== 'string' || value.trim() === '' || value.includes('\0')) {
    errors.push('report spec file must be a non-empty path');
    return null;
  }
  const segments = value.replaceAll('\\', '/').split('/');
  const absolute = canonicalAbsolute(path.isAbsolute(value)
    ? value
    : path.join(rootDir, ...segments));
  const relative = path.relative(expectedRoot, absolute);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    errors.push(`report spec path escapes configured rootDir: ${value}`);
    return null;
  }
  return absolute;
}

function collectSpecs(suites, visit, errors, trail = 'suites') {
  if (!Array.isArray(suites)) {
    errors.push(`${trail} must be an array`);
    return;
  }
  suites.forEach((suite, suiteIndex) => {
    const suiteTrail = `${trail}[${suiteIndex}]`;
    if (!isObject(suite) || !Array.isArray(suite.specs)) {
      errors.push(`${suiteTrail} must be a JSON reporter v2 suite with specs`);
      return;
    }
    suite.specs.forEach((spec, specIndex) => visit(spec, `${suiteTrail}.specs[${specIndex}]`));
    if (suite.suites !== undefined) collectSpecs(suite.suites, visit, errors, `${suiteTrail}.suites`);
  });
}

export function validatePlaywrightResult(report, plannedSpecs, options = {}) {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const expectedRoot = canonicalAbsolute(path.join(cwd, 'e2e'));
  const errors = [];
  const plannedSeen = new Set();
  const planned = new Map();

  if (!Array.isArray(plannedSpecs) || plannedSpecs.length === 0) {
    errors.push('at least one planned E2E spec is required');
  }
  for (const value of plannedSpecs ?? []) {
    const absolute = plannedPath(value, cwd, errors, plannedSeen);
    if (absolute) planned.set(absolute, displayRelative(absolute, cwd));
  }

  if (!isObject(report)) {
    errors.push('report must be an object');
    return { errors, summary: null };
  }
  if (!isObject(report.config)) errors.push('config must be an object');
  const rawRoot = report.config?.rootDir;
  const rootDir = typeof rawRoot === 'string' && rawRoot.trim() !== ''
    ? canonicalAbsolute(rawRoot)
    : null;
  if (!rootDir) {
    errors.push('config.rootDir must be a non-empty path');
  } else if (rootDir !== expectedRoot) {
    errors.push(`config.rootDir must equal ${path.join(cwd, 'e2e')}`);
  }
  if (!Array.isArray(report.config?.projects)) {
    errors.push('config.projects must be an array');
  } else if (!report.config.projects.some((project) => isObject(project) && project.name === 'full-suite')) {
    errors.push('full-suite project is missing from the report config');
  }
  if (!Array.isArray(report.errors)) errors.push('errors must be an array');

  const derived = { expected: 0, skipped: 0, unexpected: 0, flaky: 0 };
  const reportedPlanned = new Map([...planned.keys()].map((absolute) => [absolute, 0]));
  const reportedSpecFiles = new Set();

  const visitSpec = (spec, trail) => {
    if (!isObject(spec)
      || typeof spec.title !== 'string'
      || typeof spec.id !== 'string'
      || !Array.isArray(spec.tests)
      || spec.tests.length === 0) {
      errors.push(`${trail} must be a JSON reporter v2 spec with at least one test`);
      return;
    }
    const absolute = rootDir ? reportPath(spec.file, rootDir, expectedRoot, errors) : null;
    if (!absolute) return;
    const display = displayRelative(absolute, cwd);
    const isJourney = absolute.endsWith('.spec.ts');
    const isSetup = absolute.endsWith('.setup.ts');
    if (!isJourney && !isSetup) errors.push(`unexpected non-E2E report file: ${display}`);
    if (isJourney) {
      reportedSpecFiles.add(absolute);
      if (!planned.has(absolute)) errors.push(`unplanned spec result: ${display}`);
    }

    let nonSkipped = 0;
    for (const [testIndex, current] of spec.tests.entries()) {
      const testTrail = `${trail}.tests[${testIndex}]`;
      if (!isObject(current)
        || !OUTCOME_SET.has(current.status)
        || !TEST_STATUSES.has(current.expectedStatus)
        || typeof current.projectName !== 'string'
        || !Array.isArray(current.results)) {
        errors.push(`${testTrail} has an invalid Playwright outcome or JSON reporter v2 shape`);
        continue;
      }
      derived[current.status] += 1;
      if (isJourney && current.projectName !== 'full-suite') {
        errors.push(`${testTrail} for ${display} must belong to full-suite`);
      }
      if (isJourney && current.projectName === 'full-suite' && current.status !== 'skipped') nonSkipped += 1;
    }
    if (isJourney && planned.has(absolute)) {
      reportedPlanned.set(absolute, (reportedPlanned.get(absolute) ?? 0) + nonSkipped);
    }
  };
  collectSpecs(report.suites, visitSpec, errors);

  for (const [absolute, display] of planned) {
    if (!reportedSpecFiles.has(absolute)) errors.push(`missing planned spec result: ${display}`);
    else if ((reportedPlanned.get(absolute) ?? 0) === 0) {
      errors.push(`planned spec has no non-skipped test: ${display}`);
    }
  }

  if (!isObject(report.stats)) {
    errors.push('stats must be an object');
  } else {
    for (const outcome of OUTCOMES) {
      const count = report.stats[outcome];
      if (!Number.isSafeInteger(count) || count < 0) {
        errors.push(`stats.${outcome} must be a non-negative integer`);
      } else if (count !== derived[outcome]) {
        errors.push(`stats.${outcome} does not match test outcomes: report=${count}, derived=${derived[outcome]}`);
      }
    }
    if (report.stats.expected === 0) errors.push('stats.expected must be greater than zero');
    if (report.stats.skipped !== 0) errors.push(`stats.skipped must be zero, received ${report.stats.skipped}`);
    // [2026-09-01 신설] flaky 를 게이트한다.
    //
    // ⚠ 종전에는 `flaky` 를 집계·출력만 하고 어디서도 판정하지 않았다. 그래서 실패한 뒤
    //   재시도로 통과한 테스트가 green 과 구별되지 않았다 — playwright.config.ts 의
    //   `retries: 1` 주석은 재시도가 flake 를 "가시화" 한다고 말하는데, 그 가시성을 읽는
    //   소비자가 없어 실제로는 **재시도가 실패를 삼키는** 장치였다.
    //   실측: 2026-08-31 PR #528 의 e2e 간헐 실패가 정확히 이 구멍으로 통과했다.
    //
    //   임계를 0 으로 두는 근거는 현행 실측이다 — 최근 성공 run 3 샤드 전부 `0 flaky` 였다.
    //   즉 지금 거는 것은 무비용이고, 예산을 두면 그 예산만큼 다시 보이지 않게 된다.
    //   정당한 flaky(외부 의존·플랫폼 편차)가 생기면 예산이 아니라 원인을 기록한 waiver 로
    //   다뤄야 재발이 드러난다.
    if (report.stats.flaky !== 0) {
      errors.push(`stats.flaky must be zero, received ${report.stats.flaky}`
        + ' — 재시도로 통과한 테스트는 green 이 아니다. 원인을 고치거나 근거를 남겨라.');
    }
  }

  return {
    errors,
    summary: {
      plannedSpecs: planned.size,
      reportedSpecs: [...reportedSpecFiles].filter((absolute) => planned.has(absolute)).length,
      ...derived,
    },
  };
}

function cli() {
  const reportIndex = process.argv.indexOf('--report');
  if (reportIndex < 0 || !process.argv[reportIndex + 1]) {
    throw new Error('usage: node scripts/playwright-result-contract.mjs --report <json> <e2e/**/*.spec.ts...>');
  }
  const reportPathValue = path.resolve(process.argv[reportIndex + 1]);
  const planned = process.argv.slice(2)
    .filter((_, index) => index !== reportIndex - 2 && index !== reportIndex - 1);
  const size = fs.statSync(reportPathValue).size;
  if (size === 0 || size > MAX_REPORT_BYTES) {
    throw new Error(`Playwright JSON report size is invalid: ${size} bytes`);
  }
  const report = JSON.parse(fs.readFileSync(reportPathValue, 'utf8'));
  const result = validatePlaywrightResult(report, planned);
  if (result.errors.length > 0) throw new Error(result.errors.join('\n'));
  process.stdout.write(
    `Playwright result contract passed: ${result.summary.reportedSpecs}/${result.summary.plannedSpecs} specs, `
    + `${result.summary.expected} expected, ${result.summary.flaky} flaky, ${result.summary.unexpected} unexpected.\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    cli();
  } catch (error) {
    process.stderr.write(`Playwright result contract failed closed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
