/*
 * 벤더 프로젝트에서 빼는 PostgreSQL 전용 자산(ADR-0047, 설계서 §8). 무엇을 왜 빼는지는 원장이 정하고 이 모듈은 원장대로 걷는다.
 * 게이트는 규칙 승인을 거치고, 잠금과 생성물 거버넌스가 부재를 대조한다.
 */
import { parseRemovalLedger, pruneAssetLedger, readRemovalLedger, staleRemovalLedgerEntries } from './reusable-asset-removal.mjs';

export const VENDOR_ASSET_LEDGER = 'config/governance/vendor-removed-assets.json';
export const VENDOR_ASSET_RULE = 'vendor-postgresql-assets';

export const parseVendorAssetLedger = raw => parseRemovalLedger(raw, VENDOR_ASSET_LEDGER);
export const readVendorAssetLedger = root => readRemovalLedger(root, VENDOR_ASSET_LEDGER);

/** 원장이 가리키는데 없는 자산·별칭. 있으면 원장이 낡은 것이라 걷기 전에 멈춘다. */
export function staleVendorAssets(ledger, has, scripts) {
  return staleRemovalLedgerEntries(ledger, has, scripts);
}

export function pruneVendorPostgresAssets(output) {
  return pruneAssetLedger(output, { ledgerPath: VENDOR_ASSET_LEDGER, label: '벤더 제거 원장' });
}
