/**
 * Read-only Java domain removal planning — computes direct and transitive domain removals without mutating the tree.
 */
import { existsSync, readFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { findJavaStatementEnd, isJavaGateSource, skipJavaLiteral, stripJavaComments } from './harness-baseline-manifest.mjs';
import { projectComposerJava } from './project-composer-source.mjs';
import { fail, normalize, walk } from './reusable-source-tree.mjs';

export { findJavaStatementEnd, isJavaGateSource, stripJavaComments };

function javaType(path, source) {
  const packageName = source.match(/\bpackage\s+([\w.]+)\s*;/)?.[1];
  return packageName ? `${packageName}.${basename(path, '.java')}` : undefined;
}

/** 의존 판정에 쓰는 코드 조각. 계획 중에는 파일 내용이 바뀌지 않으므로 파일마다 한 번만 만든다. */
function javaDependencyIndex(source) {
  const code = stripJavaCommentsAndStringLiterals(source);
  const packageName = source.match(/\bpackage\s+([\w.]+)\s*;/)?.[1];
  return {
    code,
    imports: [...code.matchAll(/\bimport\s+(?:static\s+)?([\w.]+)(?:\.\*)?\s*;/g)].map((match) => match[1]),
    visiblePackages: new Set([
      packageName,
      ...[...code.matchAll(/\bimport\s+([\w.]+)\.\*\s*;/g)].map((match) => match[1]),
    ].filter(Boolean)),
  };
}

/** `types`(삽입 순서) 가운데 이 파일이 참조하는 첫 타입. import 를 먼저, 그다음 코드 본문을 본다. */
function firstReferencedJavaType({ code, imports, visiblePackages }, types) {
  const typeSet = new Set(types);
  const imported = imports.find((type) => typeSet.has(type));
  if (imported) return imported;
  const reachable = new Map();
  for (const type of types) {
    if (!type) continue;
    const typePackage = type.slice(0, type.lastIndexOf('.'));
    if (!reachable.has(typePackage)) reachable.set(typePackage, visiblePackages.has(typePackage) || code.includes(typePackage));
    if (!reachable.get(typePackage)) continue;
    if (code.includes(type)) return type;
    if (!visiblePackages.has(typePackage)) continue;
    const simpleName = type.slice(typePackage.length + 1);
    if (new RegExp(`\\b${simpleName}\\b`).test(code)) return type;
  }
  return undefined;
}

export function referencedRemovedJavaType(path, removedTypes, source = readFileSync(path, 'utf8')) {
  return firstReferencedJavaType(javaDependencyIndex(source), [...removedTypes]);
}

/**
 * Java 투영의 **제거 계획**을 부작용 없이 계산한다 — 파일을 읽기만 하고 지우지 않는다.
 */
export function resolveDomainRemovalDirectory(root, sourceSet, layer, domain) {
  if (typeof domain !== 'string' || !/^[a-z][a-z0-9_]*(?:\/[a-z][a-z0-9_]*)*$/u.test(domain)) {
    fail(`삭제 대상 domain은 비어 있지 않은 Java 패키지 경로여야 한다: ${JSON.stringify(domain)}`);
  }
  const parent = resolve(root, 'business-app', 'src', sourceSet, 'java', 'nuri', 'business', layer);
  const directory = resolve(parent, domain);
  const child = relative(parent, directory);
  if (child === '' || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) {
    fail(`domain 삭제 대상이 상위 패키지 또는 외부 경로다: ${directory}`);
  }
  return directory;
}

export function planJavaRemoval(root, ownership, profile, javaFiles = walk(root, (path) => path.endsWith('.java')),
  { walkDirectory = (directory) => walk(directory, () => true),
    projectSource = (file, source) => projectComposerJava(file, source, profile, ownership?.rbac),
    readSource = (path) => readFileSync(path, 'utf8') } = {}) {
  if (!Array.isArray(profile?.resolvedDomains)) fail('Java 투영에는 해석된 기능 목록(resolvedDomains)이 필요하다.');
  if (!Array.isArray(ownership?.domains) || !(ownership.supportFiles instanceof Map)) fail('Java 투영에는 기능 소유(기능 목록·지원 파일)가 필요하다.');
  const support = ownership.supportFiles;
  const excludedDomains = ownership.domains.filter((domain) => !profile.resolvedDomains.includes(domain));
  const allBefore = javaFiles;
  const sources = new Map();
  const sourceOf = (path) => {
    if (!sources.has(path)) sources.set(path, readSource(path));
    return sources.get(path);
  };
  const pathToType = new Map(allBefore.map((path) => [path, javaType(path, sourceOf(path))]));
  const gateSources = new Set(allBefore.filter((path) => isJavaGateSource(path, sourceOf(path))));
  const removed = new Set();
  const removalReason = new Map();
  const directDirectories = [];

  for (const domain of excludedDomains) {
    for (const file of support.get(domain) ?? []) {
      const path = resolve(root, file);
      removed.add(path);
      removalReason.set(path, `제외 domain ${domain} support 직접 제거`);
    }
    for (const sourceSet of ['main', 'test']) {
      for (const layer of ['domain', 'service']) {
        const directory = resolveDomainRemovalDirectory(root, sourceSet, layer, domain);
        if (!existsSync(directory)) continue;
        directDirectories.push(directory);
        for (const file of walkDirectory(directory)) removed.add(file);
      }
    }
    for (const path of removed) {
      if (!removalReason.has(path)) removalReason.set(path, `제외 domain ${domain} 직접 제거`);
    }
  }
  const direct = new Set(removed);

  const removedTypes = new Set([...removed].map((path) => pathToType.get(path)).filter(Boolean));
  const typeOrder = [...removedTypes];
  const checkedTypes = new Map();
  const indexes = new Map();
  const dependencyIndex = (path) => {
    if (!indexes.has(path)) {
      indexes.set(path, javaDependencyIndex(projectSource(normalize(relative(root, path)), sourceOf(path))));
    }
    return indexes.get(path);
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const path of allBefore) {
      if (removed.has(path)) continue;
      const index = dependencyIndex(path);
      const fresh = typeOrder.slice(checkedTypes.get(path) ?? 0);
      checkedTypes.set(path, typeOrder.length);
      const dangling = fresh.length ? firstReferencedJavaType(index, fresh) : undefined;
      if (!dangling) continue;
      const rel = normalize(relative(root, path));
      if (rel.startsWith('foundation/') || rel.startsWith('business-core/')) {
        fail(`필수 모듈이 제외 domain을 참조한다: ${rel} -> ${dangling}`);
      }
      if (!rel.startsWith('business-app/') && !rel.startsWith('api-server/')) {
        fail(`자동 소유권을 판정할 수 없는 Java 참조: ${rel} -> ${dangling}`);
      }
      removed.add(path);
      removalReason.set(path, `${dangling} 참조`);
      const type = pathToType.get(path);
      if (!removedTypes.has(type)) typeOrder.push(type);
      removedTypes.add(type);
      changed = true;
    }
  }

  return { excludedDomains, removed, direct, removalReason, removedTypes, gateSources, directDirectories };
}

/**
 * 타입 참조 연쇄로 지운 게이트가 아닌 Java 파일과 그 사유. 게이트는 따로 승인한다(acknowledgedRemovedGates).
 */
export function javaCascadeRemovals(root, plan) {
  return [...plan.removed]
    .filter((path) => !plan.direct.has(path) && !plan.gateSources.has(path))
    .map((path) => ({ file: normalize(relative(root, path)), reason: plan.removalReason.get(path) ?? '(사유 미상)' }))
    .sort((left, right) => left.file.localeCompare(right.file));
}

/** 텍스트 블록 `"""…"""` 의 마지막 따옴표 위치. */
function skipJavaTextBlock(source, open) {
  for (let index = open + 3; index < source.length; index += 1) {
    if (source[index] === '\\') index += 1;
    else if (source.startsWith('"""', index)) return index + 2;
  }
  return source.length - 1;
}

/**
 * **타입 의존 판정용** 소스 — 주석에 더해 문자열 리터럴의 *내용*까지 지운다.
 */
export function stripJavaCommentsAndStringLiterals(source) {
  let output = '';
  for (let index = 0; index < source.length;) {
    const char = source[index];
    if (source.startsWith('"""', index)) {
      output += '""""""';
      index = skipJavaTextBlock(source, index) + 1;
    } else if (char === '"' || char === "'") {
      const close = skipJavaLiteral(source, index, char);
      output += char === '"' ? '""' : "''";
      index = close + 1;
    } else if (char === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index + 2);
      index = newline < 0 ? source.length : newline;
    } else if (char === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2);
      index = close < 0 ? source.length : close + 2;
    } else {
      output += char;
      index += 1;
    }
  }
  return output;
}
