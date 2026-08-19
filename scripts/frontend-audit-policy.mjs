#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SEVERITIES = new Set(['info', 'low', 'moderate', 'high', 'critical']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function evaluateAuditReport(report) {
  if (!isObject(report) || !isObject(report.advisories) || !isObject(report.metadata?.vulnerabilities)) {
    throw new Error('pnpm audit JSON is missing advisories or metadata.vulnerabilities');
  }

  const advisories = Object.entries(report.advisories).map(([id, advisory]) => {
    if (!isObject(advisory)
      || !SEVERITIES.has(advisory.severity)
      || !Array.isArray(advisory.findings)
      || advisory.findings.length === 0) {
      throw new Error(`pnpm audit advisory '${id}' has an invalid shape`);
    }
    return {
      id,
      title: typeof advisory.title === 'string' ? advisory.title : advisory.module_name ?? 'unknown advisory',
      severity: advisory.severity,
      production: advisory.findings.some((finding) => !isObject(finding) || finding.dev !== true),
    };
  });

  const reportedCount = Object.values(report.metadata.vulnerabilities).reduce((total, count) => {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error('pnpm audit vulnerability counts must be non-negative integers');
    }
    return total + count;
  }, 0);
  if (reportedCount !== advisories.length) {
    throw new Error(`pnpm audit count mismatch: metadata=${reportedCount}, advisories=${advisories.length}`);
  }

  const blocking = advisories.filter(({ severity, production }) => (
    severity === 'critical' || (severity === 'high' && production)
  ));
  const advisoryOnly = advisories.filter(({ severity, production }) => (
    severity === 'high' && !production
  ));
  return { advisories, blocking, advisoryOnly };
}

function run() {
  const windows = process.platform === 'win32';
  const executable = windows ? (process.env.ComSpec || 'cmd.exe') : 'pnpm';
  const args = windows
    ? ['/d', '/s', '/c', 'pnpm audit --json --audit-level low']
    : ['audit', '--json', '--audit-level', 'low'];
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    const detail = result.stderr?.trim() || result.stdout?.slice(0, 500) || 'empty output';
    throw new Error(`pnpm audit did not return valid JSON: ${detail}`, { cause: error });
  }

  const policy = evaluateAuditReport(report);
  for (const advisory of policy.advisoryOnly) {
    console.warn(`::warning::development-only high advisory ${advisory.id}: ${advisory.title}`);
  }
  if (policy.blocking.length > 0) {
    for (const advisory of policy.blocking) {
      console.error(`::error::blocking ${advisory.severity} advisory ${advisory.id}: ${advisory.title}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Frontend audit policy passed: ${policy.advisories.length} advisories, ${policy.advisoryOnly.length} advisory-only high findings.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    run();
  } catch (error) {
    console.error(`::error::frontend dependency audit failed closed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
