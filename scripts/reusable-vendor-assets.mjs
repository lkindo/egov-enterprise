/*
 * 벤더 프로젝트에서 빼는 PostgreSQL 전용 자산(ADR-0047, 설계서 §8). 무엇을 왜 빼는지는 원장이 정하고 이 모듈은 원장대로 걷는다.
 * 게이트는 규칙 승인을 거치고, 잠금과 생성물 거버넌스가 부재를 대조한다.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const VENDOR_ASSET_LEDGER = 'config/governance/vendor-removed-assets.json';
export const VENDOR_ASSET_RULE = 'vendor-postgresql-assets';

export const readVendorAssetLedger = root => JSON.parse(readFileSync(join(root, ...VENDOR_ASSET_LEDGER.split('/')), 'utf8'));

/** 원장이 가리키는데 없는 자산·별칭. 있으면 원장이 낡은 것이라 걷기 전에 멈춘다. */
export function staleVendorAssets(ledger, has, scripts) {
  return [...ledger.assets.filter(asset => !has(asset)), ...ledger.aliases.filter(alias => !Object.hasOwn(scripts ?? {}, alias))];
}

export function pruneVendorPostgresAssets(output) {
  const ledger = readVendorAssetLedger(output);
  const path = join(output, 'package.json');
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  const stale = staleVendorAssets(ledger, asset => existsSync(join(output, asset)), pkg.scripts);
  if (stale.length) throw new Error(`벤더 제거 원장이 낡았다: ${stale.join(', ')}`);
  // 구성에 따라 이미 빠진 게이트가 있다. 규칙에는 실제로 지운 것만 적는다.
  const files = ledger.gates.map(row => row.file).filter(file => existsSync(join(output, file))).sort((left, right) => left.localeCompare(right));
  for (const file of [...files, ...ledger.assets]) rmSync(join(output, file), { recursive: true, force: true });
  for (const alias of ledger.aliases) delete pkg.scripts[alias];
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  return { files, assets: [...ledger.assets], aliases: [...ledger.aliases] };
}
