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

export const VENDOR_LEDGER_PATH = 'config/db-vendors.json';
export const VENDOR_STATUSES = Object.freeze(['certified', 'preview', 'blocked']);
/** 이관 도구와 같은 7종이다(ADR-0047 결정 2). */
export const VENDOR_IDS = Object.freeze(['postgresql', 'oracle', 'tibero', 'mysql', 'mariadb', 'mssql', 'cubrid']);

export const VENDOR_ADAPTERS = Object.freeze({
  oracle: oracleAdapter, mysql: mysqlAdapter, mariadb: mariadbAdapter, mssql: mssqlAdapter, cubrid: cubridAdapter,
});

export function loadVendorLedger(root) {
  const ledger = JSON.parse(readFileSync(join(root, VENDOR_LEDGER_PATH), 'utf8'));
  const ids = ledger.vendors?.map(vendor => vendor.id) ?? [];
  if (ledger.schemaVersion !== 1 || [...ids].sort().join() !== [...VENDOR_IDS].sort().join()) {
    throw new Error(`${VENDOR_LEDGER_PATH} 의 벤더가 등록표와 다르다.`);
  }
  for (const vendor of ledger.vendors) {
    if (!VENDOR_STATUSES.includes(vendor.status)) throw new Error(`${vendor.id}: 모르는 상태 ${vendor.status}`);
    if (!vendor.label) throw new Error(`${vendor.id}: 화면에 보일 이름이 없다`);
    if (vendor.status === 'certified' && vendor.id !== 'postgresql' && !vendor.evidence) throw new Error(`${vendor.id}: 증거 없는 certified`);
    if (vendor.status !== 'certified' && !vendor.reason) throw new Error(`${vendor.id}: 고를 수 없는 사유가 없다`);
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
