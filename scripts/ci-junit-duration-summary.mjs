#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { className, findResultFiles } from './ci-annotate-test-failures.mjs';

const TOP_LIMIT = 20;

function suiteSeconds(xml) {
  const opening = xml.match(/<testsuite\b([^>]*)>/)?.[1] ?? '';
  const raw = opening.match(/\btime="([^"]+)"/)?.[1];
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
}

function taskIdentity(repoRoot, file) {
  const parts = relative(repoRoot, file).split(sep);
  const build = parts.indexOf('build');
  if (build <= 0 || parts[build + 1] !== 'test-results' || !parts[build + 2]) return 'unknown';
  return `${parts[0]}:${parts[build + 2]}`;
}

export function collectJUnitDurations(repoRoot, { readFile = file => readFileSync(file, 'utf8') } = {}) {
  const suites = [];
  for (const file of findResultFiles(repoRoot)) {
    try {
      const seconds = suiteSeconds(readFile(file));
      if (seconds === null) continue;
      suites.push({ task: taskIdentity(repoRoot, file), suite: className(file), seconds });
    } catch {
      // Timing evidence must not hide the underlying test result when a report is unreadable.
    }
  }
  return suites.sort((left, right) => right.seconds - left.seconds
    || left.task.localeCompare(right.task) || left.suite.localeCompare(right.suite));
}

function markdownCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll(/\r?\n/g, ' ');
}

export function buildJUnitDurationSummary(repoRoot, options = {}) {
  const suites = collectJUnitDurations(repoRoot, options);
  const totalSeconds = suites.reduce((sum, suite) => sum + suite.seconds, 0);
  const lines = [
    '## JUnit duration evidence',
    '',
    `Parsed suites: **${suites.length}**, cumulative suite time: **${totalSeconds.toFixed(3)}s**.`,
    '',
  ];
  if (suites.length === 0) return `${lines.join('\n')}No JUnit XML with a valid suite duration was produced.\n`;
  lines.push('| Rank | Task | Suite | Seconds |', '|---:|---|---|---:|');
  suites.slice(0, TOP_LIMIT).forEach((suite, index) => {
    lines.push(`| ${index + 1} | ${markdownCell(suite.task)} | ${markdownCell(suite.suite)} | ${suite.seconds.toFixed(3)} |`);
  });
  return `${lines.join('\n')}\n`;
}

// ─── node --test 의 파일별 JUnit(scripts/node-test-junit-reporter.mjs) ───────────────────────────────────────────────
// 운영 계약 실행의 파일별 합과 느린 시험을 낸다(D2-5). 보고서에는 파일 경로·시험 이름·시간·상태만 있고, 이 요약도 그것만 싣는다.
const NODE_NAME_LIMIT = 160;

function unescapeXml(value) {
  return value.replaceAll('&quot;', '"').replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&');
}

function xmlAttributes(tag) {
  return Object.fromEntries([...tag.matchAll(/\b([a-z]+)="([^"]*)"/g)].map(([, key, value]) => [key, unescapeXml(value)]));
}

const validSeconds = value => (Number.isFinite(value) && value >= 0 ? value : null);

/** 보고자가 한 줄에 요소 하나씩 쓰는 형식을 줄 단위로 읽는다(여러 줄에 걸친 범용 JUnit 파서가 아니다). */
export function collectNodeTestDurations(xml) {
  const files = [];
  const tests = [];
  let current = null;
  for (const line of xml.split(/\r?\n/)) {
    const suite = /^\s*<testsuite\s([^>]*)>\s*$/.exec(line);
    if (suite) {
      const attributes = xmlAttributes(suite[1]);
      const seconds = validSeconds(Number(attributes.time));
      current = attributes.name && seconds !== null ? attributes.name : null;
      if (current) files.push({ file: current, tests: Number(attributes.tests) || 0, failures: Number(attributes.failures) || 0, seconds });
      continue;
    }
    if (/^\s*<\/testsuite>\s*$/.test(line)) { current = null; continue; }
    const testcase = /^\s*<testcase\s([^>]*)>/.exec(line);
    if (!testcase || current === null) continue;
    const test = xmlAttributes(testcase[1]);
    const testSeconds = validSeconds(Number(test.time));
    if (typeof test.name === 'string' && testSeconds !== null) tests.push({ file: current, name: test.name, seconds: testSeconds });
  }
  const bySeconds = (left, right) => right.seconds - left.seconds || left.file.localeCompare(right.file);
  const wall = validSeconds(Number(xmlAttributes(xml.match(/<testsuites\b[^>]*>/)?.[0] ?? '').time));
  return { files: files.sort(bySeconds), tests: tests.sort((left, right) => bySeconds(left, right) || left.name.localeCompare(right.name)),
    wallSeconds: wall };
}

export function buildNodeTestDurationSummary(reportPath, { readFile = file => readFileSync(file, 'utf8') } = {}) {
  const heading = ['## Node test duration evidence', ''];
  let xml;
  try {
    xml = readFile(reportPath);
  } catch {
    // 요약은 증거를 보태는 일이라, 보고서가 없다고 시험 결과를 가리지 않는다.
    return `${heading.join('\n')}No Node test JUnit report was produced.\n`;
  }
  const { files, tests, wallSeconds } = collectNodeTestDurations(xml);
  if (files.length === 0) return `${heading.join('\n')}The Node test JUnit report holds no file with a valid duration.\n`;
  const total = files.reduce((sum, file) => sum + file.seconds, 0);
  const name = value => markdownCell(value.length > NODE_NAME_LIMIT ? `${value.slice(0, NODE_NAME_LIMIT - 1)}…` : value);
  const lines = [...heading,
    `Files: **${files.length}**, cumulative file time: **${total.toFixed(3)}s**${wallSeconds === null ? '' : `, wall clock: **${wallSeconds.toFixed(3)}s**`}.`,
    '', '| Rank | File | Tests | Seconds |', '|---:|---|---:|---:|'];
  files.slice(0, TOP_LIMIT).forEach((file, index) => {
    lines.push(`| ${index + 1} | ${name(file.file)} | ${file.tests} | ${file.seconds.toFixed(3)} |`);
  });
  lines.push('', '### Slowest tests', '', '| Rank | File | Test | Seconds |', '|---:|---|---|---:|');
  tests.slice(0, TOP_LIMIT).forEach((test, index) => {
    lines.push(`| ${index + 1} | ${name(test.file)} | ${name(test.name)} | ${test.seconds.toFixed(3)} |`);
  });
  return `${lines.join('\n')}\n`;
}

const invokedDirectly = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invokedDirectly) {
  process.stdout.write(process.argv[2] === '--node-junit'
    ? buildNodeTestDurationSummary(process.argv[3] ?? '')
    : buildJUnitDurationSummary(process.argv[2] ?? process.cwd()));
}
