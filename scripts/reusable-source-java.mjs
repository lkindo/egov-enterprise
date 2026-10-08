/**
 * 소스 투영의 Java 단계 — 주석·리터럴을 걷어 낸 코드 기준 의존 판정, 제외 도메인 제거 계획과 투영.
 * 하네스 기준선 거울도 같은 주석 제거(stripJavaComments)를 써야 메타 게이트와 해시가 맞는다.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';
import { domainSupportFiles, projectComposerJava } from './project-composer-source.mjs';
import { fail, normalize, walk } from './reusable-source-tree.mjs';

/**
 * 게이트 술어 — 메타 게이트({@code HarnessBaselineIntegrityTest#isGateSource})와 **같은 모집단**을 본다.
 * 여기가 좁으면 투영이 게이트를 지우고도 "제거 0건" 이라고 보고한다(= 조용한 손실).
 */
const GATE_FILE_PATTERN =
  /(?:LinterTest|ArchTest|MatrixTest|GuardrailIntegrationTest|ValidationIntegrationTest|Archunit\w*|ArchitectureTest|IsolationTest|ArchitectureRules|ConventionRules)\.java$/;
const GATE_TAGS = ['@Tag("governance-harness")', '@Tag("schema-validation")', '@ArchTag("architecture-gate")'];

export function isJavaGateSource(path, source) {
  const normalized = normalize(path);
  if (normalized.includes('/harness/') || GATE_FILE_PATTERN.test(normalized)) return true;
  // 태그는 문자열 리터럴이므로 **리터럴은 보존한 채 주석만** 지운다(javadoc 인용의 오탐 차단).
  return GATE_TAGS.some((tag) => stripJavaComments(source).includes(tag));
}

function javaType(path) {
  const source = readFileSync(path, 'utf8');
  const packageName = source.match(/\bpackage\s+([\w.]+)\s*;/)?.[1];
  return packageName ? `${packageName}.${basename(path, '.java')}` : undefined;
}

function importedJavaTypes(path, source = readFileSync(path, 'utf8')) {
  // import 선언도 **코드에서만** 읽는다 — 테스트 픽스처 텍스트 블록·주석 속 `import …;` 는 의존이 아니다.
  //   (원문에 적용하던 종전 판정은 red-proof 텍스트 블록 한 줄 때문에 결합 census 게이트를 통째로 지웠다.)
  const code = stripJavaCommentsAndStringLiterals(source);
  return [...code.matchAll(/\bimport\s+(?:static\s+)?([\w.]+)(?:\.\*)?\s*;/g)].map((match) => match[1]);
}

function referencedRemovedJavaType(path, removedTypes, source = readFileSync(path, 'utf8')) {
  const imported = importedJavaTypes(path, source).find((type) => removedTypes.has(type));
  if (imported) return imported;
  // 의존은 **코드에서만** 판정한다 — 주석·문자열 리터럴 속 클래스 이름은 참조가 아니다.
  //   (census·정규식이 게이트 이름을 문자열로 열거하는 관용 때문에 오탐이 연쇄한다.)
  const code = stripJavaCommentsAndStringLiterals(source);
  const packageName = source.match(/\bpackage\s+([\w.]+)\s*;/)?.[1];
  // 와일드카드 import(`import a.b.*;`)는 패키지를 들여오므로 같은 패키지 파일과 똑같이 단순명으로 본다.
  //   종전에는 패키지 이름이 제거 타입 집합에 없어 조용히 놓쳤다 — 살아남은 파일이 투영에서 컴파일되지 않는 경로다.
  const visiblePackages = new Set([
    packageName,
    ...[...code.matchAll(/\bimport\s+([\w.]+)\.\*\s*;/g)].map((match) => match[1]),
  ].filter(Boolean));
  for (const type of removedTypes) {
    if (!type) continue;
    if (code.includes(type)) return type;
    const typePackage = type.slice(0, type.lastIndexOf('.'));
    if (!visiblePackages.has(typePackage)) continue;
    const simpleName = type.slice(typePackage.length + 1);
    if (new RegExp(`\\b${simpleName}\\b`).test(code)) return type;
  }
  return undefined;
}

/**
 * Java 투영의 **제거 계획**을 부작용 없이 계산한다 — 파일을 읽기만 하고 지우지 않는다.
 *
 * 투영({@link pruneJava})과 계약 테스트가 같은 판정을 쓰도록 분리했다. 계약은 저장소 루트에서
 * `copySourceTree` 와 같은 파일 모집단(`javaFiles`)으로 이 함수를 불러 "이 타입이 이 프로필에서 사라지는가" 를
 * 생성기 실행 없이 확인한다 — 같은 패키지 중간 클래스를 거치는 간접 참조까지 생성기와 똑같이 따라간다.
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

export function planJavaRemoval(root, manifest, profile, javaFiles = walk(root, (path) => path.endsWith('.java'))) {
  const support = domainSupportFiles(root, manifest);
  const allowedPacks = new Set(profile.packs);
  const excludedDomains = profile.resolvedDomains
    ? Object.values(manifest.packs).flatMap(pack => pack.backend?.appDomains ?? []).filter(domain => !profile.resolvedDomains.includes(domain))
    : Object.entries(manifest.packs)
    .filter(([packName]) => !allowedPacks.has(packName))
    .flatMap(([, pack]) => pack.backend?.appDomains ?? []);
  const allBefore = javaFiles;
  const pathToType = new Map(allBefore.map((path) => [path, javaType(path)]));
  /*
    투영이 무엇을 게이트로 지웠는지는 **지우기 전에** 판정해야 한다 — 파일이 사라진 뒤에는
    소스를 읽을 수 없어 "몇 개 지웠다" 조차 말할 수 없다(그게 종전의 조용한 손실이다).
  */
  const gateSources = new Set(allBefore.filter((path) => isJavaGateSource(path, readFileSync(path, 'utf8'))));
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
        for (const file of walk(directory, () => true)) removed.add(file);
      }
    }
    for (const path of removed) {
      if (!removalReason.has(path)) removalReason.set(path, `제외 domain ${domain} 직접 제거`);
    }
  }

  const removedTypes = new Set([...removed].map((path) => pathToType.get(path)).filter(Boolean));
  let changed = true;
  while (changed) {
    changed = false;
    for (const path of allBefore) {
      if (removed.has(path)) continue;
      const dangling = referencedRemovedJavaType(path, removedTypes,
        projectComposerJava(normalize(relative(root, path)), readFileSync(path, 'utf8'), profile));
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
      removedTypes.add(pathToType.get(path));
      changed = true;
    }
  }

  return { excludedDomains, removed, removalReason, removedTypes, gateSources, directDirectories };
}

export function pruneJava(output, manifest, profile) {
  const { excludedDomains, removed, removalReason, removedTypes, gateSources, directDirectories } =
    planJavaRemoval(output, manifest, profile);

  const adaptedGates = [];
  for (const path of removed) if (existsSync(path)) rmSync(path);
  for (const directory of directDirectories) if (existsSync(directory)) rmSync(directory, { recursive: true });
  for (const path of walk(output, (candidate) => candidate.endsWith('.java'))) {
    const source = readFileSync(path, 'utf8');
    const projected = projectComposerJava(normalize(relative(output, path)), source, profile);
    if (source !== projected) {
      writeFileSync(path, projected);
      adaptedGates.push({ file: normalize(relative(output, path)), domains: profile.resolvedDomains,
        reason: '선택한 RBAC 표면의 단언을 유지하고 미선택 표면의 단언만 제외한다.',
        upstreamSha256: createHash('sha256').update(source).digest('hex'), projectedSha256: createHash('sha256').update(projected).digest('hex') });
    }
    const dangling = referencedRemovedJavaType(path, removedTypes);
    if (dangling) fail(`Java projection dangling import: ${normalize(relative(output, path))} -> ${dangling}`);
  }
  const removedGates = [...removed]
    .filter((path) => gateSources.has(path))
    .map((path) => ({
      file: normalize(relative(output, path)),
      reason: removalReason.get(path) ?? '(사유 미상)',
    }))
    .sort((left, right) => left.file.localeCompare(right.file));
  return { excludedDomains: excludedDomains.sort(), removedFiles: removed.size, removedGates, ...(adaptedGates.length ? { adaptedGates } : {}) };
}

function skipJavaLiteral(source, open, quote) {
  for (let index = open + 1; index < source.length; index += 1) {
    if (source[index] === '\\') index += 1;
    else if (source[index] === quote) return index;
  }
  return source.length - 1;
}

/** 텍스트 블록 `"""…"""` 의 마지막 따옴표 위치. 이스케이프된 따옴표(`\"`)는 닫는 구분자가 아니다. */
function skipJavaTextBlock(source, open) {
  for (let index = open + 3; index < source.length; index += 1) {
    if (source[index] === '\\') index += 1;
    else if (source.startsWith('"""', index)) return index + 2;
  }
  return source.length - 1;
}

/**
 * **타입 의존 판정용** 소스 — 주석에 더해 문자열 리터럴의 *내용*까지 지운다.
 *
 * `stripJavaComments` 는 리터럴을 **보존**한다(해시·본문 동결에는 그게 맞다). 그러나
 * "이 파일이 저 타입에 의존하는가" 를 볼 때 리터럴 속 이름은 참조가 아니다 — census·정규식이
 * 클래스 이름을 문자열로 열거하는 것은 이 저장소의 흔한 관용이다.
 *
 * 실제 피해(2026-09-12 core 프로필 실측): `HarnessBaselineIntegrityTest` 가
 * `Pattern.compile("(?:…|InputContractMirrorLinterTest|…)")` 라는 **정규식 문자열** 하나 때문에
 * 제거 대상으로 판정됐고, 그 클래스에 얹힌 공용 유틸을 쓰던 린터 6개가 뒤따라 빠졌다.
 * 하네스 11개 중 **7개가 이 오탐 하나에서** 비롯됐다 — 그중에는 메서드 인가·인가 배선 동기화·
 * 시큐리티 체인 우회 차단 같은 보안 게이트가 포함된다.
 *
 * 리터럴은 빈 껍데기로 바꿔 자리만 남긴다 — 완전히 지우면 토큰이 붙어 새 식별자가 생긴다.
 *
 * 텍스트 블록(`"""`)은 여기서만 따로 인식한다. 공용 {@link skipJavaLiteral} 은 메타 게이트의 해시용
 * 주석 제거와 **동일해야** 하므로 바꾸지 않는다 — 그 함수로는 텍스트 블록 안의 `"` 가 리터럴 경계로 읽혀
 * 따옴표 사이 조각이 코드로 남는다(JSON 픽스처 등).
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

/**
 * 주석만 제거하고 문자열 리터럴은 보존한다 — 메타 게이트의
 * {@code HarnessBaselineIntegrityTest#stripCommentsPreservingStrings} 와 **동일해야 한다**.
 * 블록 주석을 공백 한 칸으로 바꾸는 것도 그 동등성의 일부다(지워 버리면 앞뒤 토큰이 붙어
 * 없던 식별자가 생기고, 상수 해시·__sourceHash 가 메타 게이트와 달라진다).
 */
export function stripJavaComments(source) {
  let output = '';
  for (let index = 0; index < source.length;) {
    const char = source[index];
    if (char === '"' || char === "'") {
      const close = skipJavaLiteral(source, index, char);
      output += source.slice(index, close + 1);
      index = close + 1;
    } else if (char === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index + 2);
      index = newline < 0 ? source.length : newline;
    } else if (char === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2);
      index = close < 0 ? source.length : close + 2;
      output += ' ';
    } else {
      output += char;
      index += 1;
    }
  }
  return output;
}

export function findJavaStatementEnd(source, from) {
  let depth = 0;
  for (let index = from; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"' || char === "'") index = skipJavaLiteral(source, index, char);
    else if ('({['.includes(char)) depth += 1;
    else if (')}]'.includes(char)) depth -= 1;
    else if (char === ';' && depth <= 0) return index;
  }
  return -1;
}

