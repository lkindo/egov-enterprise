/**
 * node --test 의 파일별 JUnit 보고자 — 운영 계약 실행이 어느 파일·시험에서 시간을 쓰는지 남긴다(D2-5).
 *
 * Node 22 의 내장 junit 보고자는 시험이 어느 파일의 것인지 적지 않는다(testcase 에 파일 속성이 없다). 그래서 파일별 시간을 낼
 * 수 없다. 이 보고자는 시험 파일마다 <testsuite name="저장소 상대 경로" time="최상위 시험 시간 합">을 두고, 그 안에 시험마다
 * <testcase classname="같은 경로" name="상위 이름 > 이름" time>을 쓴다. 실패·건너뜀은 상태만 적는다. 오류 메시지·스택·명령·
 * 출력 원문은 쓰지 않는다(실행 기록 원칙: 원문을 저장하지 않는다). 요약은 scripts/ci-junit-duration-summary.mjs --node-junit 이 낸다.
 *
 * 사용: node --test --test-reporter=spec --test-reporter-destination=stdout
 *         --test-reporter=./scripts/node-test-junit-reporter.mjs --test-reporter-destination=<build 아래 파일> ...
 */
import path from 'node:path';

const UNKNOWN_FILE = '(unknown file)';

export function xmlAttribute(value) {
  return String(value)
    // XML 1.0 이 허용하지 않는 제어 문자는 지운다(탭·줄바꿈은 공백으로).
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[\t\r\n]+/g, ' ')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function relativeFile(file, cwd) {
  if (typeof file !== 'string' || file === '') return UNKNOWN_FILE;
  const relative = path.relative(cwd, file);
  return (relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? relative : path.basename(file)).split(path.sep).join('/');
}

const seconds = durationMs => (Number.isFinite(durationMs) && durationMs >= 0 ? durationMs / 1000 : 0);

/** 보고 사건을 파일별 집계로 모은다. 순수 함수라 시험이 합성 사건으로 판정을 고정한다. */
export function collectNodeTestEvents(events, { cwd = process.cwd() } = {}) {
  const files = new Map();
  const stacks = new Map();
  const fileOf = name => {
    if (!files.has(name)) files.set(name, { name, seconds: 0, tests: [] });
    return files.get(name);
  };
  for (const event of events) {
    const data = event?.data ?? {};
    const file = relativeFile(data.file, cwd);
    if (event?.type === 'test:start') {
      const stack = stacks.get(file) ?? [];
      stack.length = Math.max(0, data.nesting ?? 0);
      stack[data.nesting ?? 0] = data.name;
      stacks.set(file, stack);
      continue;
    }
    if (event?.type !== 'test:pass' && event?.type !== 'test:fail') continue;
    const entry = fileOf(file);
    const nesting = Number.isInteger(data.nesting) && data.nesting >= 0 ? data.nesting : 0;
    const duration = seconds(data.details?.duration_ms);
    if (nesting === 0) entry.seconds += duration;
    if (data.details?.type === 'suite') continue;
    const parents = (stacks.get(file) ?? []).slice(0, nesting).filter(name => typeof name === 'string');
    entry.tests.push({
      name: [...parents, String(data.name ?? '')].join(' > '),
      seconds: duration,
      status: data.skip || data.todo ? 'skipped' : event.type === 'test:fail' ? 'failed' : 'passed',
    });
  }
  return [...files.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function renderNodeTestJUnit(files, { wallSeconds = null } = {}) {
  const count = (tests, status) => tests.filter(test => test.status === status).length;
  const all = files.flatMap(file => file.tests);
  const lines = ['<?xml version="1.0" encoding="utf-8"?>',
    `<testsuites name="node-test" tests="${all.length}" failures="${count(all, 'failed')}" skipped="${count(all, 'skipped')}"`
      + `${wallSeconds === null ? '' : ` time="${wallSeconds.toFixed(3)}"`}>`];
  for (const file of files) {
    lines.push(`  <testsuite name="${xmlAttribute(file.name)}" tests="${file.tests.length}" failures="${count(file.tests, 'failed')}"`
      + ` skipped="${count(file.tests, 'skipped')}" time="${file.seconds.toFixed(3)}">`);
    for (const test of file.tests) {
      const open = `    <testcase classname="${xmlAttribute(file.name)}" name="${xmlAttribute(test.name)}" time="${test.seconds.toFixed(3)}"`;
      if (test.status === 'failed') lines.push(`${open}><failure type="failed"/></testcase>`);
      else if (test.status === 'skipped') lines.push(`${open}><skipped/></testcase>`);
      else lines.push(`${open}/>`);
    }
    lines.push('  </testsuite>');
  }
  lines.push('</testsuites>', '');
  return lines.join('\n');
}

export default async function* nodeTestJUnitReporter(source) {
  const started = performance.now();
  const events = [];
  for await (const event of source) {
    if (event?.type === 'test:start' || event?.type === 'test:pass' || event?.type === 'test:fail') {
      // 오류 객체·출력은 담지 않는다 — 파일·이름·깊이·시간·상태만 쓴다.
      const { name, nesting, file, skip, todo, details } = event.data ?? {};
      events.push({ type: event.type, data: { name, nesting, file, skip, todo, details: { duration_ms: details?.duration_ms, type: details?.type } } });
    }
  }
  yield renderNodeTestJUnit(collectNodeTestEvents(events), { wallSeconds: (performance.now() - started) / 1000 });
}
