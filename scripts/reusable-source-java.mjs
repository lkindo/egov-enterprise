/**
 * 소스 투영의 Java 단계 — 주석·리터럴을 걷어 낸 코드 기준 의존 판정, 제외 도메인 제거 계획과 투영.
 * 게이트 술어(isJavaGateSource)·주석 제거(stripJavaComments)·문장 끝(findJavaStatementEnd)은 하네스 기준선 census 의 정의라 그
 * 도구(harness-baseline-manifest.mjs)에 둔다 — 투영이 지운 게이트를 세는 모집단이 기준선의 게이트 모집단과 같은 함수다. 여기가 좁으면
 * 투영이 게이트를 지우고도 "제거 0건" 이라고 보고한다(= 조용한 손실). 기존 import 경로를 위해 여기서 다시 내보낸다.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { findJavaStatementEnd, isJavaGateSource, skipJavaLiteral, stripJavaComments } from './harness-baseline-manifest.mjs';
import { projectComposerJava } from './project-composer-source.mjs';
import {
  MESSAGE_HANDLER_SOURCE, beanValidationRefsIn, errorCodesIn, isErrorCodeSource, isScannedSource,
  lowerMessageContractFloors, ownedMessageKeys, pruneOwnedMessageKeys, validationKeysToPrune,
} from './reusable-source-messages.mjs';
import { fail, normalize, readTextIfPresent, walk } from './reusable-source-tree.mjs';

export { findJavaStatementEnd, isJavaGateSource, stripJavaComments };

function javaType(path, source) {
  const packageName = source.match(/\bpackage\s+([\w.]+)\s*;/)?.[1];
  return packageName ? `${packageName}.${basename(path, '.java')}` : undefined;
}

/** 의존 판정에 쓰는 코드 조각. 계획 중에는 파일 내용이 바뀌지 않으므로 파일마다 한 번만 만든다. */
function javaDependencyIndex(source) {
  // import 선언도 **코드에서만** 읽는다 — 테스트 픽스처 텍스트 블록·주석 속 `import …;` 는 의존이 아니다.
  //   (원문에 적용하던 종전 판정은 red-proof 텍스트 블록 한 줄 때문에 결합 census 게이트를 통째로 지웠다.)
  // 의존은 **코드에서만** 판정한다 — 주석·문자열 리터럴 속 클래스 이름은 참조가 아니다.
  //   (census·정규식이 게이트 이름을 문자열로 열거하는 관용 때문에 오탐이 연쇄한다.)
  const code = stripJavaCommentsAndStringLiterals(source);
  const packageName = source.match(/\bpackage\s+([\w.]+)\s*;/)?.[1];
  return {
    code,
    imports: [...code.matchAll(/\bimport\s+(?:static\s+)?([\w.]+)(?:\.\*)?\s*;/g)].map((match) => match[1]),
    // 와일드카드 import(`import a.b.*;`)는 패키지를 들여오므로 같은 패키지 파일과 똑같이 단순명으로 본다.
    //   종전에는 패키지 이름이 제거 타입 집합에 없어 조용히 놓쳤다 — 살아남은 파일이 투영에서 컴파일되지 않는 경로다.
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
  // 패키지 이름은 타입 이름의 앞부분이다. 코드에 패키지 이름이 없고 그 패키지가 보이지도 않으면 그 패키지의 어떤 타입도 맞지 않는다.
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

function referencedRemovedJavaType(path, removedTypes, source = readFileSync(path, 'utf8')) {
  return firstReferencedJavaType(javaDependencyIndex(source), [...removedTypes]);
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

// `walkDirectory` 는 제외 도메인 폴더 아래 생성물의 파일을 돌려준다. 생성기는 복사한 트리를 훑고, 정밀 점검(plan/deep)은
// 복사할 파일 목록에서 고른다(디스크의 무시된 파일·대소문자만 다른 이름을 생성물과 같게 본다).
// `projectSource` 는 판정 전에 소스를 구성에 맞게 고쳐 쓰는 투영이다. 소스를 고치지 않는 수동 삭제(domain-deletion-plan.mjs)는
// 원문 그대로를 넘긴다 — 생성기처럼 고쳐 쓴 소스로 판정하면 실제로 남는 원문과 판정이 어긋난다.
// `ownership` 은 기능 소유(기능 id 전부·기능 → 지원 파일·RBAC 매트릭스 표면 소유, composerOwnership)이고 `profile.resolvedDomains` 는
// 남길 기능이다. 제외 기능은 그 차집합이다 — pack 을 보지 않는다(11단계 C3). 시작 구성도 해석된 기능 목록으로 투영한다.
// `readSource` 는 파일 원문을 읽는다(planFrontendRemoval 의 readSource 와 같은 자리). 한 호출 안에서는 파일마다 한 번만 부른다 —
// 형식 판정·게이트 판정·의존 색인이 같은 원문을 쓴다. 호출이 끝나면 그 원문을 버린다(다음 호출은 다시 읽는다).
// 여러 계획이 같은 원문을 공유하려면 내용이 바뀌지 않는 트리를 보는 호출자가 기억하는 읽기를 넘긴다(시험·정밀 점검 한 번·원장 계약 문맥 한 번).
export function planJavaRemoval(root, ownership, profile, javaFiles = walk(root, (path) => path.endsWith('.java')),
  { walkDirectory = (directory) => walk(directory, () => true),
    projectSource = (file, source) => projectComposerJava(file, source, profile, ownership?.rbac),
    readSource = (path) => readFileSync(path, 'utf8') } = {}) {
  if (!Array.isArray(profile?.resolvedDomains)) fail('Java 투영에는 해석된 기능 목록(resolvedDomains)이 필요하다.');
  if (!Array.isArray(ownership?.domains) || !(ownership.supportFiles instanceof Map)) fail('Java 투영에는 기능 소유(기능 목록·지원 파일)가 필요하다.');
  const support = ownership.supportFiles;
  const excludedDomains = ownership.domains.filter((domain) => !profile.resolvedDomains.includes(domain));
  const allBefore = javaFiles;
  // 파일 내용은 계획 중 바뀌지 않는다 — 원문은 파일마다 한 번만 읽는다(종전에는 형식·게이트·색인이 따로 읽어 같은 파일을 세 번 읽었다).
  const sources = new Map();
  const sourceOf = (path) => {
    if (!sources.has(path)) sources.set(path, readSource(path));
    return sources.get(path);
  };
  const pathToType = new Map(allBefore.map((path) => [path, javaType(path, sourceOf(path))]));
  /*
    투영이 무엇을 게이트로 지웠는지는 **지우기 전에** 판정해야 한다 — 파일이 사라진 뒤에는
    소스를 읽을 수 없어 "몇 개 지웠다" 조차 말할 수 없다(그게 종전의 조용한 손실이다).
  */
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
  // 선언으로 지운 파일. 나머지는 타입 참조 연쇄로 지운 것이다(설계서 C4 — 연쇄 제거는 프리셋마다 승인 목록과 대조한다).
  const direct = new Set(removed);

  const removedTypes = new Set([...removed].map((path) => pathToType.get(path)).filter(Boolean));
  /*
    연쇄는 증분으로 판정한다. 파일마다 이미 대조한 타입 수를 기억하고 그 뒤에 지워진 타입만 본다.
    앞서 대조한 타입과는 어떤 경로로도 맞지 않았으므로, 매번 전체를 다시 보던 종전 판정과 제거 여부·시점·사유 타입이 같다
    (사유 타입은 import 순서, 그다음 삽입 순서의 첫 일치이고 새 타입은 삽입 순서의 뒤쪽이다). 파일 내용은 계획 중 바뀌지 않는다.
  */
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
      // 첫 반복에서 모든 파일을 투영한다 — 투영 오류(표지 드리프트)는 지울 타입이 없어도 드러나야 한다.
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
 * 생성기의 lock 기록과 프리셋 승인 대조(acknowledgedJavaCascade)가 같은 목록을 쓴다.
 */
export function javaCascadeRemovals(root, plan) {
  return [...plan.removed]
    .filter((path) => !plan.direct.has(path) && !plan.gateSources.has(path))
    .map((path) => ({ file: normalize(relative(root, path)), reason: plan.removalReason.get(path) ?? '(사유 미상)' }))
    .sort((left, right) => left.file.localeCompare(right.file));
}

export function pruneJava(output, ownership, profile) {
  const plan = planJavaRemoval(output, ownership, profile);
  const { excludedDomains, removed, removalReason, removedTypes, gateSources, directDirectories } = plan;
  // 지우기 전에 센다 — 지운 뒤에는 무엇이 선언이 아니라 연쇄로 사라졌는지 말할 수 없다.
  const cascadeRemoved = javaCascadeRemovals(output, plan);

  const adaptedGates = [];
  const rel = (path) => normalize(relative(output, path));
  // 지우기 전에 읽는다 — 지운 뒤에는 그 enum 이 소유한 메시지 키도, 메시지 번들 계약이 세던 참조 수도 알 수 없다.
  // 범위는 계약과 같다(네 모듈의 src/main/java 의 .java).
  const removedScanned = [...removed].filter((path) => path.endsWith('.java') && isScannedSource(rel(path)))
    .map((path) => ({ path, source: readTextIfPresent(path) })).filter(({ source }) => source !== undefined);
  const removedErrorCodes = removedScanned.filter(({ path }) => isErrorCodeSource(rel(path)));
  const removedStripped = removedScanned.map(({ source }) => stripJavaComments(source));
  const removedBeanValidationRefs = removedStripped.reduce((sum, source) => sum + beanValidationRefsIn(source), 0);
  const survivingErrorCodes = [];
  // 남는 스캔 대상 소스의 투영 뒤 원문(주석 제거) — 지운 소스만 참조하던 Bean Validation 키를 가린다.
  const survivingStripped = [];
  for (const path of removed) if (existsSync(path)) rmSync(path);
  for (const directory of directDirectories) if (existsSync(directory)) rmSync(directory, { recursive: true });
  for (const path of walk(output, (candidate) => candidate.endsWith('.java'))) {
    const source = readFileSync(path, 'utf8');
    const projected = projectComposerJava(normalize(relative(output, path)), source, profile, ownership.rbac);
    if (isErrorCodeSource(rel(path))) survivingErrorCodes.push({ path, source: projected });
    if (isScannedSource(rel(path))) survivingStripped.push(stripJavaComments(projected));
    if (source !== projected) {
      writeFileSync(path, projected);
      adaptedGates.push({ file: normalize(relative(output, path)), domains: profile.resolvedDomains,
        reason: '선택한 RBAC 표면의 단언을 유지하고 미선택 표면의 단언만 제외한다.',
        upstreamSha256: createHash('sha256').update(source).digest('hex'), projectedSha256: createHash('sha256').update(projected).digest('hex') });
    }
    // 디스크의 내용은 방금 쓴 projected 와 같다(바뀌지 않았으면 원문과 같다) — 다시 읽지 않고 그것으로 판정한다.
    const dangling = referencedRemovedJavaType(path, removedTypes, projected);
    if (dangling) fail(`Java projection dangling import: ${normalize(relative(output, path))} -> ${dangling}`);
  }
  const removedGates = [...removed]
    .filter((path) => gateSources.has(path))
    .map((path) => ({
      file: normalize(relative(output, path)),
      reason: removalReason.get(path) ?? '(사유 미상)',
    }))
    .sort((left, right) => left.file.localeCompare(right.file));
  const owned = ownedMessageKeys(removedErrorCodes, survivingErrorCodes);
  const prunedMessageKeys = pruneOwnedMessageKeys(output, owned);
  // 계약은 handler 키를 이 파일 하나에서 읽는다. 걷을 후보가 있는데 없으면 경로가 바뀐 것이라 계약도 붉다 — 조용히 넘기지 않는다.
  let validationKeys;
  try {
    validationKeys = validationKeysToPrune(removedStripped, survivingStripped, {
      errorCodes: survivingErrorCodes.flatMap(({ source }) => errorCodesIn(source)),
      readHandler: () => readTextIfPresent(join(output, MESSAGE_HANDLER_SOURCE)) });
  } catch (error) { fail(error.message); }
  const prunedValidationMessageKeys = pruneOwnedMessageKeys(output, { keys: validationKeys, owners: [] });
  const messageContractFloors = lowerMessageContractFloors(output,
    { errorCodes: owned.keys.length, beanValidationRefs: removedBeanValidationRefs });
  return { excludedDomains: excludedDomains.sort(), removedFiles: removed.size, removedGates, cascadeRemoved,
    ...(adaptedGates.length ? { adaptedGates } : {}), ...(prunedMessageKeys.length ? { prunedMessageKeys } : {}),
    ...(prunedValidationMessageKeys.length ? { prunedValidationMessageKeys } : {}),
    ...(Object.keys(messageContractFloors).length ? { messageContractFloors } : {}) };
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
 * 텍스트 블록(`"""`)은 여기서만 따로 인식한다. 공용 {@link skipJavaLiteral} 은 하네스 기준선 해시용
 * 주석 제거의 경계라 바꾸지 않는다(바꾸면 기준선의 모든 상수 해시가 바뀐다) — 그 함수로는 텍스트 블록 안의 `"` 가
 * 리터럴 경계로 읽혀 따옴표 사이 조각이 코드로 남는다(JSON 픽스처 등).
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

