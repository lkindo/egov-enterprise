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

const invokedDirectly = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invokedDirectly) process.stdout.write(buildJUnitDurationSummary(process.argv[2] ?? process.cwd()));
