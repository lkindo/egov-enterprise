/** 시험 전용 증거 값. 실제 실행 결과가 아니라 형식을 통과하는 최소값이다. */
import { VENDOR_ENGINES } from './project-composer-vendor-engine.mjs';
import { VENDOR_EVIDENCE_SCOPE } from './project-composer-vendors.mjs';

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
 * 실제 원장의 Oracle 을 승격 전 모양(preview·무증거·사유 있음)으로 맞춘다. 원장을 복사해 쓰는 사례는 이 출발점에서 편집하므로,
 * 증거를 기록하거나 승격해도 같은 판정을 시험한다.
 */
export function asPreviewOracle(ledger) {
  const oracle = ledger.vendors.find(vendor => vendor.id === 'oracle');
  oracle.status = 'preview';
  oracle.reason ??= '시험용 사유입니다.';
  for (const engine of oracle.engines) engine.evidence = null;
  return ledger;
}

/** 원장 객체의 벤더를 certified 로 올린다. inputHash 는 낡음 판정 시험이 실제 값을 넣는다. */
export function certifyVendor(vendor, inputHash) {
  vendor.status = 'certified';
  delete vendor.reason;
  for (const engine of vendor.engines) engine.evidence = fixtureEvidence(engine.engine, inputHash);
  return vendor;
}
