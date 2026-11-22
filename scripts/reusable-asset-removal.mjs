/*
 * Shared multi-ledger asset removal engine and ledger disjointness validator.
 */
import { lstatSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, posix, relative, sep } from 'node:path';

function assertCleanRelativePath(value, context) {
  if (typeof value !== 'string' || !value.length || value.trim() !== value) {
    throw new Error(`제거 원장의 ${context} 경로는 비어 있지 않은 상대 경로여야 한다: ${JSON.stringify(value)}`);
  }
  if (value.includes('\\') || value.includes('\0') || value.includes(':')
    || isAbsolute(value) || posix.isAbsolute(value)
    || value.startsWith('/') || value.endsWith('/')) {
    throw new Error(`제거 원장의 ${context} 경로는 안전한 POSIX 상대 경로여야 한다: ${value}`);
  }
  const segments = value.split('/');
  if (segments.some(seg => seg === '' || seg === '.' || seg === '..')) {
    throw new Error(`제거 원장의 ${context} 경로가 상위·빈 세그먼트를 포함할 수 없다: ${value}`);
  }
  return value;
}

function assertStrictSubpath(rootReal, candidateReal, relPath, context) {
  const rel = relative(rootReal, candidateReal);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`제거 원장의 ${context} 대상이 출력 루트 밖을 가리킨다: ${relPath}`);
  }
}

export function inspectStrictChild(outputRoot, rootReal, relPath, context, { requireFile = false } = {}) {
  assertCleanRelativePath(relPath, context);
  const segments = relPath.split('/');
  let cur = outputRoot;
  let lastStat = null;
  let lastReal = null;
  for (let idx = 0; idx < segments.length; idx += 1) {
    cur = join(cur, segments[idx]);
    let stat;
    try {
      stat = lstatSync(cur, { bigint: true });
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return {
          exists: false,
          target: idx === segments.length - 1 ? cur : null,
          realPath: null,
          nlink: 0,
          dev: 0n,
          ino: 0n,
          isFile: false,
          isDirectory: false,
        };
      }
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`제거 원장의 ${context} 대상이 심볼릭 링크/정션을 지난다: ${relPath}`);
    }
    lastReal = realpathSync(cur);
    assertStrictSubpath(rootReal, lastReal, relPath, context);
    lastStat = stat;
  }
  if (requireFile && !lastStat?.isFile()) {
    throw new Error(`제거 원장의 ${context} 대상은 일반 파일이어야 한다: ${relPath}`);
  }
  return {
    exists: true,
    target: cur,
    realPath: lastReal,
    nlink: Number(lastStat?.nlink ?? 0n),
    dev: lastStat?.dev ?? 0n,
    ino: lastStat?.ino ?? 0n,
    isFile: Boolean(lastStat?.isFile()),
    isDirectory: Boolean(lastStat?.isDirectory()),
  };
}

/** Parse and validate a removal ledger string or object (`assets`, optional `aliases`, optional `gates`). */
export function parseRemovalLedger(raw, ledgerPath = 'removal-ledger') {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`제거 원장은 JSON 객체여야 한다: ${ledgerPath}`);
  }
  if (!Array.isArray(parsed.assets)) {
    throw new Error(`제거 원장의 assets 는 배열이어야 한다: ${ledgerPath}`);
  }
  const assets = parsed.assets.map(asset => assertCleanRelativePath(asset, 'assets'));

  let aliases = [];
  if (parsed.aliases !== undefined) {
    if (!Array.isArray(parsed.aliases)
      || parsed.aliases.some(alias => typeof alias !== 'string' || !alias.trim() || alias.trim() !== alias)) {
      throw new Error(`제거 원장의 aliases 는 비어 있지 않은 문자열 배열이어야 한다: ${ledgerPath}`);
    }
    aliases = [...parsed.aliases];
  }

  let gates = [];
  if (parsed.gates !== undefined) {
    if (!Array.isArray(parsed.gates)
      || parsed.gates.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
      throw new Error(`제거 원장의 gates 는 객체 배열이어야 한다: ${ledgerPath}`);
    }
    gates = parsed.gates.map(row => ({
      ...row,
      file: assertCleanRelativePath(row.file, 'gates[].file'),
    }));
  }

  return { ...parsed, assets, aliases, gates };
}

/** Read and validate a removal ledger file within `root` without following symlinks/junctions or escapes. */
export function readRemovalLedger(root, ledgerPath) {
  const rootReal = realpathSync(root);
  const inspected = inspectStrictChild(root, rootReal, ledgerPath, '원장 파일', { requireFile: true });
  if (!inspected.exists) {
    const err = new Error(`제거 원장을 찾을 수 없다: ${ledgerPath}`);
    err.code = 'ENOENT';
    throw err;
  }
  return parseRemovalLedger(readFileSync(inspected.target, 'utf8'), ledgerPath);
}

/** Missing assets or package.json script aliases indicating a stale removal ledger. */
export function staleRemovalLedgerEntries(ledger, has, scripts) {
  return [
    ...(ledger.assets ?? []).filter(asset => !has(asset)),
    ...(ledger.aliases ?? []).filter(alias => !Object.hasOwn(scripts ?? {}, alias)),
  ];
}

/** Return true when `candidate` equals `asset` or lives strictly beneath directory `asset/`. */
export function isPathCoveredBy(candidate, asset, { caseInsensitive = false } = {}) {
  const left = caseInsensitive ? candidate.toLowerCase() : candidate;
  const right = caseInsensitive ? asset.toLowerCase() : asset;
  return left === right || left.startsWith(`${right}/`);
}

/**
 * Remove assets, gate files, and script aliases listed in `ledgerPath` from `output`.
 * Validates relative path safety, strict output-root containment (including `package.json` hardlinks & file IDs),
 * regular-file gate type, and ledger completeness before any deletion or write.
 */
export function pruneAssetLedger(output, { ledgerPath, label = '제거 원장' }) {
  const ledger = readRemovalLedger(output, ledgerPath);
  if (ledger.assets.some(asset => asset.toLowerCase() === 'package.json')
    || ledger.gates.some(row => row.file.toLowerCase() === 'package.json')) {
    throw new Error(`${label}은 package.json 을 제거 대상으로 포함할 수 없다`);
  }
  const rootReal = realpathSync(output);
  const pkgInspect = inspectStrictChild(output, rootReal, 'package.json', 'package.json', { requireFile: true });
  if (!pkgInspect.exists) {
    throw new Error(`${label}이 낡았다: package.json 이 없다`);
  }
  if (pkgInspect.nlink > 1) {
    throw new Error(`제거 원장의 package.json 은 하드 링크(nlink > 1)일 수 없다`);
  }
  const pkg = JSON.parse(readFileSync(pkgInspect.target, 'utf8'));

  const gateTargets = ledger.gates.map(row => ({
    file: row.file,
    inspected: inspectStrictChild(output, rootReal, row.file, 'gates[].file', { requireFile: true }),
  }));
  const assetTargets = ledger.assets.map(asset => ({
    asset,
    inspected: inspectStrictChild(output, rootReal, asset, 'assets'),
  }));
  const isSameAsPackageJson = inspected => inspected.exists && (
    (pkgInspect.ino !== 0n && inspected.dev === pkgInspect.dev && inspected.ino === pkgInspect.ino)
    || (inspected.realPath && pkgInspect.realPath && inspected.realPath.toLowerCase() === pkgInspect.realPath.toLowerCase())
  );
  if (gateTargets.some(item => isSameAsPackageJson(item.inspected))
    || assetTargets.some(item => isSameAsPackageJson(item.inspected))) {
    throw new Error(`${label}은 package.json 을 제거 대상으로 포함할 수 없다`);
  }

  const existingAssets = new Set(assetTargets.filter(item => item.inspected.exists).map(item => item.asset));
  const stale = staleRemovalLedgerEntries(ledger, asset => existingAssets.has(asset), pkg.scripts);
  if (stale.length) throw new Error(`${label}이 낡았다: ${stale.join(', ')}`);

  const existingGates = gateTargets
    .filter(item => item.inspected.exists)
    .sort((left, right) => left.file.localeCompare(right.file));
  for (const gate of existingGates) {
    rmSync(gate.inspected.target, { force: true });
  }
  for (const item of assetTargets) {
    rmSync(item.inspected.target, { recursive: true, force: true });
  }
  for (const alias of ledger.aliases) delete pkg.scripts[alias];
  writeFileSync(pkgInspect.target, `${JSON.stringify(pkg, null, 2)}\n`);
  return {
    files: existingGates.map(item => item.file),
    assets: [...ledger.assets],
    aliases: [...ledger.aliases],
  };
}

/**
 * Verify multiple removal ledgers are pairwise disjoint across assets and gates (including
 * directory prefixes and Windows case collisions), and script aliases.
 */
export function findLedgerOverlapErrors(namedLedgers) {
  const errors = [];
  for (let i = 0; i < namedLedgers.length; i += 1) {
    const left = namedLedgers[i];
    const leftPaths = [
      ...(left.ledger.assets ?? []).map(path => ({ kind: 'asset', path })),
      ...(left.ledger.gates ?? []).map(row => ({ kind: 'gate', path: row.file })),
    ];
    for (let j = i + 1; j < namedLedgers.length; j += 1) {
      const right = namedLedgers[j];
      const rightPaths = [
        ...(right.ledger.assets ?? []).map(path => ({ kind: 'asset', path })),
        ...(right.ledger.gates ?? []).map(row => ({ kind: 'gate', path: row.file })),
      ];
      for (const l of leftPaths) {
        for (const r of rightPaths) {
          if (isPathCoveredBy(l.path, r.path, { caseInsensitive: true })
            || isPathCoveredBy(r.path, l.path, { caseInsensitive: true })) {
            const label = l.kind === r.kind ? l.kind : 'asset/gate';
            const detail = l.path === r.path && l.kind === 'gate' && r.kind === 'gate'
              ? l.path
              : `${l.path} <-> ${r.path}`;
            errors.push(`removal ledger ${label} overlap (${left.name} vs ${right.name}): ${detail}`);
          }
        }
      }
      const rightAliases = new Set(right.ledger.aliases ?? []);
      for (const alias of left.ledger.aliases ?? []) {
        if (rightAliases.has(alias)) {
          errors.push(`removal ledger alias overlap (${left.name} vs ${right.name}): ${alias}`);
        }
      }
    }
  }
  return errors;
}
