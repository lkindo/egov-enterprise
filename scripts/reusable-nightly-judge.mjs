/**
 * T2 야간 검증의 판정(DEC-OPS-283). 종료 코드가 아니라 작업별 JUnit XML 과 vitest JSON 으로 판정한다.
 * 보고서가 없거나 모집단이 0이면 실패다 — 공집합 통과는 통과가 아니다.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

function hasJavaSource(directory) {
  if (!existsSync(directory)) return false;
  return readdirSync(directory, { withFileTypes: true }).some((entry) => entry.isDirectory()
    ? hasJavaSource(join(directory, entry.name)) : entry.name.endsWith('.java'));
}

const decode = (value) => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** 작업별 JUnit XML 판정. 시험 소스가 남은 작업만 보고서를 요구한다(투영이 시험 소스를 모두 지운 모듈은 기록만 한다). */
export function judgeJUnit(artifact, units) {
  const suites = [];
  const errors = [];
  for (const unit of units) {
    if (!hasJavaSource(join(artifact, unit.source))) { suites.push({ task: unit.task, status: 'no-test-sources' }); continue; }
    const directory = join(artifact, unit.results);
    const files = existsSync(directory) ? readdirSync(directory).filter((name) => /^TEST-.+\.xml$/.test(name)).sort() : [];
    const totals = { tests: 0, failures: 0, errors: 0, skipped: 0 };
    const failedTests = [];
    for (const file of files) {
      const xml = readFileSync(join(directory, file), 'utf8');
      const head = xml.match(/<testsuite\b([^>]*?)\/?>/)?.[1] ?? '';
      for (const key of Object.keys(totals)) {
        const value = Number(head.match(new RegExp(`\\b${key}="(\\d+)"`))?.[1]);
        if (Number.isFinite(value)) totals[key] += value; else errors.push(`${unit.task}: ${file} lacks the ${key} count`);
      }
      for (const [, attributes, body = ''] of xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
        if (!/<(?:failure|error)\b/.test(body)) continue;
        const attribute = (key) => decode(attributes.match(new RegExp(`\\b${key}="([^"]*)"`))?.[1] ?? '');
        failedTests.push(`${attribute('classname')}#${attribute('name')}`);
      }
    }
    if (files.length === 0) errors.push(`${unit.task}: no JUnit report in ${unit.results}`);
    else if (totals.tests === 0) errors.push(`${unit.task}: JUnit reports hold no test`);
    if (totals.failures + totals.errors > 0) errors.push(`${unit.task}: ${totals.failures + totals.errors} failed of ${totals.tests}`);
    suites.push({ task: unit.task, reports: files.length, ...totals, failedTests: failedTests.slice(0, 5) });
  }
  // 백엔드 전체의 하한: 판정한 작업이 없거나(모든 작업이 시험 소스 없음·작업 0개) 판정한 시험이 0건이면 공집합 통과다.
  const judgedTests = suites.reduce((sum, suite) => sum + (suite.tests ?? 0), 0);
  if (suites.every((suite) => suite.status === 'no-test-sources') || judgedTests === 0) errors.push('backend: no JUnit test was judged');
  return { suites, errors };
}

/**
 * vitest JSON 판정. 파일·시험이 0이면 공집합 통과라 실패다. 실패한 파일은 앞 5개만 남긴다.
 * 실패 파일 수는 testResults 에서 센다 — numFailedTestSuites 는 describe 블록도 suite 로 세므로 파일 수가 아니다(T2 첫 실행에서
 * 실패 파일 4개가 '9 failed files' 로 적혔다). 둘을 따로 적는다.
 */
export function judgeVitest(file, base = dirname(file)) {
  if (!existsSync(file)) return { errors: ['vitest: no JSON report'] };
  let report;
  try { report = JSON.parse(readFileSync(file, 'utf8')); } catch { return { errors: ['vitest: unreadable JSON report'] }; }
  const keys = ['numTotalTestSuites', 'numFailedTestSuites', 'numTotalTests', 'numFailedTests', 'numPendingTests'];
  const summary = Object.fromEntries(keys.map((key) => [key, report?.[key]]));
  const errors = [];
  if (!keys.every((key) => Number.isInteger(summary[key]))) errors.push('vitest: JSON report lacks its counts');
  if (!(summary.numTotalTestSuites > 0) || !(summary.numTotalTests > 0)) errors.push('vitest: report holds no test');
  const failedFiles = (Array.isArray(report?.testResults) ? report.testResults : [])
    .filter((result) => result?.status === 'failed').map((result) => relative(base, String(result.name)).replaceAll('\\', '/'));
  if (summary.numFailedTestSuites !== 0 || summary.numFailedTests !== 0) {
    errors.push(`vitest: ${failedFiles.length} failed files, ${summary.numFailedTestSuites} failed suites, ${summary.numFailedTests} failed tests`);
  }
  if (report?.success !== true) errors.push('vitest: report is not successful');
  return { summary: { ...summary, success: report?.success === true, numFailedFiles: failedFiles.length, failedFiles: failedFiles.slice(0, 5) }, errors };
}

function reportFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
    ? reportFiles(join(directory, entry.name)) : entry.name.endsWith('.json') ? [join(directory, entry.name)] : []);
}

/** 계획의 모든 항목에 통과 보고서가 있어야 한다. 보고서 없음·실패·계획 밖 보고서는 모두 실패다. */
export function summarize(plan, directory) {
  const reports = new Map();
  for (const file of reportFiles(directory)) {
    const report = JSON.parse(readFileSync(file, 'utf8'));
    if (report?.schemaVersion === 1 && typeof report.id === 'string') reports.set(`${report.id}-${report.layout}`, report);
  }
  const expected = new Set((plan?.include ?? []).map((item) => `${item.id}-${item.layout}`));
  if (expected.size === 0) return { rows: [], errors: ['the nightly plan has no item'] };
  const errors = [];
  const rows = [...expected].map((key) => {
    const report = reports.get(key);
    if (!report) { errors.push(`${key}: no report`); return [key, '보고서 없음', '-']; }
    if (report.result !== 'passed') errors.push(`${key}: ${(report.errors ?? []).slice(0, 3).join('; ') || 'failed'}`);
    const backend = (report.stages?.backend?.suites ?? []).reduce((sum, suite) => sum + (suite.tests ?? 0), 0);
    const frontend = report.stages?.frontend?.numTotalTests ?? 0;
    return [key, report.result === 'passed' ? '통과' : '실패', `백엔드 ${backend}건 · 프런트 ${frontend}건`];
  });
  for (const key of reports.keys()) if (!expected.has(key)) errors.push(`${key}: report outside the plan`);
  return { rows, errors };
}
