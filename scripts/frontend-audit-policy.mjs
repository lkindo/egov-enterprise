#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SEVERITIES = new Set(['info', 'low', 'moderate', 'high', 'critical']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertReportShape(report, label) {
  if (!isObject(report) || !isObject(report.advisories) || !isObject(report.metadata?.vulnerabilities)) {
    throw new Error(`${label} JSON is missing advisories or metadata.vulnerabilities`);
  }
}

/*
 * [2026-10-03] 운영 판정은 `pnpm audit --prod` 결과로 한다. pnpm 9 의 audit JSON 은 finding 에 `dev` 를 싣지 않아
 * 종전 판정(finding.dev === true 만 개발 전용)은 모든 High 를 운영으로 봤고, 정책(운영 High 차단·개발 전용 High 경고)이
 * 한 번도 그대로 동작하지 않았다(braces GHSA-vfj7-8cjw-p6xm — 패치 버전 없음, 개발 도구 경로만). run 은 두 보고서를
 * 모두 요구하므로 운영 보고서를 받지 못하면 종전 판정으로 물러나지 않고 실패한다.
 */
export function evaluateAuditReport(report, productionReport) {
  assertReportShape(report, 'pnpm audit');
  let productionIds = null;
  if (productionReport !== undefined) {
    assertReportShape(productionReport, 'pnpm audit --prod');
    productionIds = new Set(Object.keys(productionReport.advisories));
    for (const id of productionIds) {
      if (!Object.hasOwn(report.advisories, id)) {
        throw new Error(`pnpm audit --prod reported advisory '${id}' that the full audit did not`);
      }
    }
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
      production: productionIds
        ? productionIds.has(id)
        : advisory.findings.some((finding) => !isObject(finding) || finding.dev !== true),
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

function runAudit(extraArgs, label) {
  const windows = process.platform === 'win32';
  const executable = windows ? (process.env.ComSpec || 'cmd.exe') : 'pnpm';
  const args = windows
    ? ['/d', '/s', '/c', ['pnpm audit --json --audit-level low', ...extraArgs].join(' ')]
    : ['audit', '--json', '--audit-level', 'low', ...extraArgs];
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    const detail = result.stderr?.trim() || result.stdout?.slice(0, 500) || 'empty output';
    throw new Error(`${label} did not return valid JSON: ${detail}`, { cause: error });
  }
}

function run() {
  const report = runAudit([], 'pnpm audit');
  const productionReport = runAudit(['--prod'], 'pnpm audit --prod');
  const policy = evaluateAuditReport(report, productionReport);
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
