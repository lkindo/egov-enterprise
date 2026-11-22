/**
 * 소스 투영의 Java 단계 — 제외 도메인 제거 및 RBAC 단언 투영.
 * 부작용 없는 제거 계획 판정은 reusable-java-removal-plan.mjs 가 소유하며 기존 import 경로를 위해 다시 내보낸다.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { projectComposerJava } from './project-composer-source.mjs';
import {
  findJavaStatementEnd, isJavaGateSource, javaCascadeRemovals, planJavaRemoval, referencedRemovedJavaType,
  resolveDomainRemovalDirectory, stripJavaComments, stripJavaCommentsAndStringLiterals,
} from './reusable-java-removal-plan.mjs';
import {
  MESSAGE_HANDLER_SOURCE, beanValidationRefsIn, errorCodesIn, isErrorCodeSource, isScannedSource,
  lowerMessageContractFloors, ownedMessageKeys, pruneOwnedMessageKeys, validationKeysToPrune,
} from './reusable-source-messages.mjs';
import { fail, normalize, readTextIfPresent, walk } from './reusable-source-tree.mjs';

export {
  findJavaStatementEnd, isJavaGateSource, javaCascadeRemovals, planJavaRemoval, referencedRemovedJavaType,
  resolveDomainRemovalDirectory, stripJavaComments, stripJavaCommentsAndStringLiterals,
};

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
