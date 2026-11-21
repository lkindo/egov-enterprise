/** 시험 전용 증거 값. 실제 실행 결과가 아니라 형식을 통과하는 최소값이다. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VENDOR_ENGINES } from './project-composer-vendor-engine.mjs';
import { VENDOR_EVIDENCE_SCOPE, VENDOR_LEDGER_PATH } from './project-composer-vendors.mjs';
import { vendorCiPlan } from './vendor-evidence-inputs.mjs';

export const fixtureEvidence = (engineId, inputHash = 'a'.repeat(64)) => ({
  runId: `${engineId}-fixture-0001`,
  commit: 'b'.repeat(40),
  recordedAt: '2026-11-03T10:00:00.000+09:00',
  inputHash,
  modelHash: 'c'.repeat(64),
  image: VENDOR_ENGINES[engineId].image,
  imageOrigin: VENDOR_ENGINES[engineId].imageOrigin,
  scope: VENDOR_EVIDENCE_SCOPE,
  composition: { profile: 'demo', layout: 'multi-module', compositionHash: 'd'.repeat(64) },
  steps: {
    verification: { result: 'passed' },
    schemaParity: { tables: 98, statements: 900, degradations: 2 },
    seedParity: { tables: 98, rows: 18143 },
    hibernateValidate: { ddlAuto: 'validate', contexts: 51 },
    integration: { classes: 51, tests: 399, failures: 0, errors: 0, skipped: 0 },
    conformance: {
      catalog: { classes: 1, tests: 12, failures: 0, errors: 0, skipped: 0 },
      differential: { checks: 134, rows: 700, differences: 0, unbalanced: 0, intentFailures: 0 },
    },
    representativeE2e: { specs: 11, expected: 120, unexpected: 0, flaky: 0, skipped: 1 },
  },
});

/**
 * 실제 원장에서 고를 수 있거나 고를 수 있게 될 벤더(기준인 PostgreSQL·blocked 밖)를 모두 승격 전 모양(preview·CI 벤더 잡 열림·무증거·사유 있음)으로 맞춘다.
 * 원장을 복사해 쓰는 사례는 이 출발점에서 편집하므로, 어느 벤더의 증거를 기록하거나 승격하거나 인증을 멈춰도(DEC-OPS-422 — 원장에 ci 가 없다) 같은 판정을 시험한다.
 * CI 잡은 통합 시험 엔진이 있는 벤더만 연다(원장 적재 규칙과 같다).
 */
export function asPreviewVendors(ledger) {
  for (const vendor of ledger.vendors.filter(row => row.id !== 'postgresql' && row.status !== 'blocked')) {
    vendor.status = 'preview';
    vendor.reason ??= '시험용 사유입니다.';
    if (VENDOR_ENGINES[vendor.id]?.integration) vendor.ci = true;
    for (const engine of vendor.engines) engine.evidence = null;
  }
  return ledger;
}

/** 실제 원장의 벤더를 승격 전 모양으로 연 CI 벤더 잡 계획. 원장에 ci 벤더가 없는 동안에도 잡 선택 규칙을 실제 인증 입력으로 시험한다. */
export const openedVendorCiPlan = root => vendorCiPlan(root, { ledger: asPreviewVendors(JSON.parse(readFileSync(join(root, VENDOR_LEDGER_PATH), 'utf8'))) });

/** 원장 객체의 벤더를 certified 로 올린다. inputHash 는 낡음 판정 시험이 실제 값을 넣는다. */
export function certifyVendor(vendor, inputHash) {
  vendor.status = 'certified';
  vendor.ci = true; // CI 벤더 잡은 인증 조건이다. 인증 중단 기간(DEC-OPS-422)의 원장에는 없다.
  delete vendor.reason;
  for (const engine of vendor.engines) engine.evidence = fixtureEvidence(engine.engine, inputHash);
  return vendor;
}
