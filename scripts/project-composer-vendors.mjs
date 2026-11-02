/**
 * 벤더 등록표와 번역 게이트(ADR-0047 결정 2, 설계서 D-1·D-9·D-14).
 *
 * 인증 원장은 config/db-vendors.json 하나다. 고를 수 있는지는 원장의 status 로만 정한다.
 * 번역은 어댑터가 받는 순수 함수라 모든 생성에서 돌릴 수 있고, 번역 불가는 그 자리에서 드러난다.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cubridAdapter } from './project-composer-vendor-cubrid.mjs';
import { mariadbAdapter, mysqlAdapter } from './project-composer-vendor-mysql.mjs';
import { mssqlAdapter } from './project-composer-vendor-mssql.mjs';
import { oracleAdapter } from './project-composer-vendor-oracle.mjs';
import { VENDOR_ENGINES } from './project-composer-vendor-engine.mjs';
import { VENDOR_SOURCE } from './project-composer-vendor-source.mjs';

export const VENDOR_LEDGER_PATH = 'config/db-vendors.json';
export const VENDOR_STATUSES = Object.freeze(['certified', 'preview', 'blocked']);
/** 이관 도구와 같은 7종이다(ADR-0047 결정 2). */
export const VENDOR_IDS = Object.freeze(['postgresql', 'oracle', 'tibero', 'mysql', 'mariadb', 'mssql', 'cubrid']);

export const VENDOR_ADAPTERS = Object.freeze({
  oracle: oracleAdapter, mysql: mysqlAdapter, mariadb: mariadbAdapter, mssql: mssqlAdapter, cubrid: cubridAdapter,
});

/** 증거가 말하는 범위. 19c 는 recipe 로 고르지 않고 공식 배포는 번들 DB 만 받으므로 배포 경로 증거가 아니다(설계서 §7). */
export const VENDOR_EVIDENCE_SCOPE = 'application-database';
const DIGEST_IMAGE = /@sha256:[a-f0-9]{64}$/;
const HASH = /^[a-f0-9]{64}$/;
const count = value => Number.isInteger(value) && value >= 0;
const positive = value => Number.isInteger(value) && value > 0;
/** 끝까지 돌았고 하나도 실패하지 않은 시험 묶음. 전부 건너뛴 묶음은 돈 것이 아니다. */
const passedTests = run => positive(run?.classes) && positive(run.tests) && run.failures === 0 && run.errors === 0 && count(run.skipped) && run.skipped < run.tests;

/** 설계서 §7 의 증거 형식. 값이 현재 저장소와 맞는지는 낡음 판정(project-composer-vendor-evidence.mjs)이 본다. */
export function vendorEvidenceProblems(evidence) {
  const steps = evidence?.steps;
  const differential = steps?.conformance?.differential;
  const e2e = steps?.representativeE2e;
  const rules = [
    ['실행 ID', /^[a-z0-9][a-z0-9-]{7,}$/.test(evidence?.runId ?? '')],
    ['커밋', /^[a-f0-9]{40}$/.test(evidence?.commit ?? '')],
    ['기록 시각', /\+09:00$/.test(evidence?.recordedAt ?? '') && !Number.isNaN(Date.parse(evidence.recordedAt))],
    ['입력 해시', HASH.test(evidence?.inputHash ?? '')],
    ['모델 해시', HASH.test(evidence?.modelHash ?? '')],
    ['이미지 digest', DIGEST_IMAGE.test(evidence?.image ?? '')],
    ['이미지 출처', /^(?:official|community):\S+$/.test(evidence?.imageOrigin ?? '')],
    ['증거 범위', evidence?.scope === VENDOR_EVIDENCE_SCOPE],
    ['구성', Boolean(evidence?.composition?.profile && evidence.composition.layout) && HASH.test(evidence?.composition?.compositionHash ?? '')],
    ['생성물 검증', steps?.verification?.result === 'passed'],
    ['스키마 대조', positive(steps?.schemaParity?.tables) && positive(steps.schemaParity.statements) && count(steps.schemaParity.degradations)],
    ['시드 행 대조', positive(steps?.seedParity?.tables) && positive(steps.seedParity.rows)],
    ['Hibernate validate', steps?.hibernateValidate?.ddlAuto === 'validate'],
    ['통합 시험', passedTests(steps?.integration)],
    ['카탈로그 적합성', passedTests(steps?.conformance?.catalog)],
    ['차등 시험', positive(differential?.checks) && positive(differential.rows) && differential.differences === 0 && differential.unbalanced === 0 && differential.intentFailures === 0],
    ['대표 E2E', positive(e2e?.specs) && positive(e2e.expected) && e2e.unexpected === 0 && e2e.flaky === 0 && count(e2e.skipped)],
  ];
  return rules.filter(([, passed]) => !passed).map(([name]) => name);
}

/**
 * certified 가 지는 조건. 원장만 고쳐 어댑터 없는 벤더나 빈 증거로 열지 못하게 한다. 입력 해시 대조는 여기서 하지 않는다 —
 * 생성 작업마다 도는 함수이고, 생성물에는 입력이 투영돼 있다.
 */
function certificationProblems(vendor, ledger) {
  if (!VENDOR_ADAPTERS[vendor.id]) return ['어댑터가 없다'];
  if (!VENDOR_SOURCE[vendor.id]) return ['소스 투영(VENDOR_SOURCE)이 없다'];
  // required 안의 CI 경로가 없으면 입력 변경이 그 벤더를 돌리지 않는다(D-14).
  if (vendor.ci !== true) return ['CI 벤더 잡(ci)이 없다'];
  if (!vendor.engines?.length) return ['엔진이 없다'];
  if (!vendor.evidenceInputs?.length || !ledger.evidenceInputs?.paths?.length) return ['증거 입력 목록이 없다'];
  return vendor.engines.flatMap(engine => {
    const definition = Object.hasOwn(VENDOR_ENGINES, engine.engine ?? '') ? VENDOR_ENGINES[engine.engine] : undefined;
    if (!definition?.integration || (definition.vendor ?? engine.engine) !== vendor.id) return [`${engine.version}: 통합 시험을 돌릴 엔진(${engine.engine ?? '없음'})이 아니다`];
    if (!DIGEST_IMAGE.test(definition.image)) return [`${engine.version}: 엔진 이미지가 digest 로 고정되지 않았다`];
    if (!engine.evidence) return [`증거 없는 certified(${engine.version})`];
    const problems = vendorEvidenceProblems(engine.evidence);
    return problems.length ? [`${engine.version}: 증거 형식이 맞지 않다(${problems.join(', ')})`] : [];
  });
}

export function loadVendorLedger(root) {
  const ledger = JSON.parse(readFileSync(join(root, VENDOR_LEDGER_PATH), 'utf8'));
  const ids = ledger.vendors?.map(vendor => vendor.id) ?? [];
  if (ledger.schemaVersion !== 1 || [...ids].sort().join() !== [...VENDOR_IDS].sort().join()) {
    throw new Error(`${VENDOR_LEDGER_PATH} 의 벤더가 등록표와 다르다.`);
  }
  for (const vendor of ledger.vendors) {
    if (!VENDOR_STATUSES.includes(vendor.status)) throw new Error(`${vendor.id}: 모르는 상태 ${vendor.status}`);
    if (!vendor.label) throw new Error(`${vendor.id}: 화면에 보일 이름이 없다`);
    if (vendor.status === 'certified' && vendor.id !== 'postgresql') {
      const problems = certificationProblems(vendor, ledger);
      if (problems.length) throw new Error(`${vendor.id}: ${problems.join('; ')}`);
    }
    if (vendor.status !== 'certified' && !vendor.reason) throw new Error(`${vendor.id}: 고를 수 없는 사유가 없다`);
    // CI 잡은 생성물 검증의 기본 엔진(벤더 id)으로 돈다. 통합 시험을 못 여는 벤더를 켜면 잡이 늘 실패한다.
    if (vendor.ci !== undefined && (vendor.ci !== true || !VENDOR_ENGINES[vendor.id]?.integration)) throw new Error(`${vendor.id}: ci 는 통합 시험 엔진이 있는 벤더의 true 만 쓴다`);
    // 벤더를 적지 않은 레시피와 프리셋의 기본값이다. 이 값이 빠지면 모든 기본 생성이 멈춘다.
    if (vendor.id === 'postgresql' && vendor.status !== 'certified') throw new Error('postgresql: 기본 벤더는 certified 여야 한다');
  }
  return ledger;
}

const isSelectable = vendor => vendor.status === 'certified';
export const selectableVendors = ledger => ledger.vendors.filter(isSelectable).map(vendor => vendor.id);
/** 화면에 보일 선택지. 증거·엔진 정보는 화면에 필요 없어 싣지 않는다. */
export const vendorChoices = ledger => ledger.vendors.map(vendor => ({ id: vendor.id, label: vendor.label, selectable: isSelectable(vendor),
  ...(isSelectable(vendor) ? {} : { reason: vendor.reason }) }));

/** 어댑터가 있는 모든 벤더로 번역해 본다. 첫 번역 불가에서 멈춘다. */
export function translateForAllVendors(model) {
  return Object.fromEntries(Object.values(VENDOR_ADAPTERS).map(adapter => {
    const emission = adapter.emitSchema(model);
    return [adapter.id, { statements: emission.statements.length, degradations: emission.degradations.length }];
  }));
}
