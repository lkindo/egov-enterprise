/**
 * pack 태그 원장 계약의 공용 판정 — 원장 항목의 `pack` 이 재사용 base 생성기의 **실제 제거 계획**과 맞는지 본다.
 *
 * 개인정보 접근·교차 도메인 결합·입력 계약 미러 세 게이트는 판정 원장을 JSON 으로 두고 항목마다 소유 pack 을 적는다
 * (DEC-OPS-089·090). 게이트는 투영된 트리에 남은 pack 의 항목만 기대하므로, 태그가 틀리면 축소 프로필에서 조용히
 * 검사를 건너뛰거나 거짓 red 가 난다. 이 모듈은 생성기의 `planJavaRemoval` 을 rank 누적 프로필마다 그대로 불러
 * "항목의 소스가 모두 살아남는가" 를 태그와 대조한다 — 시뮬레이터가 아니라 생성기 판정 자체다.
 *
 * 투영본(생성기가 쓴 manifest)에서는 제거가 이미 끝났으므로 계획 대신 소스 존재를 본다. 투영본 판별은
 * `sourcePolicy.generatedProfile` 필드 하나로 하지 않는다 — 저장소 manifest 에 그 필드만 넣어 계획 대조를 끄는 경로를
 * 막기 위해, 생성기가 쓰는 **구조**(프로필이 정확히 그 하나이고 pack 이 그 프로필의 pack 과 같다)까지 요구한다.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { planJavaRemoval, trackedAndUntrackedFiles } from './generate-reusable-base-source.mjs';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PACK_MANIFEST = 'config/reusable-base-profiles.json';
export const JAVA_POPULATION_FLOOR = 1000;
const SKIPPED_DIRECTORIES = new Set(['build', 'node_modules', '.git', '.gradle']);

export const normalize = (path) => path.split(sep).join('/');
export const readRepoJson = (root, path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

/**
 * 투영본 판별. 생성기의 `writeProjectedManifest` 가 쓰는 구조일 때만 투영본으로 인정하고,
 * `generatedProfile` 이 있는데 구조가 다르면 모드 전환이 아니라 오류다.
 */
export function detectProjection(manifest) {
  const generatedProfile = manifest.sourcePolicy?.generatedProfile;
  if (generatedProfile === undefined) return { projection: false };
  const profileNames = Object.keys(manifest.profiles ?? {});
  const profile = manifest.profiles?.[generatedProfile];
  const packNames = Object.keys(manifest.packs ?? {}).sort();
  const profilePacks = [...(profile?.packs ?? [])].sort();
  if (profileNames.length !== 1 || profileNames[0] !== generatedProfile
      || JSON.stringify(packNames) !== JSON.stringify(profilePacks)) {
    throw new Error(
      `sourcePolicy.generatedProfile='${generatedProfile}' 인데 manifest 가 생성기 투영 구조가 아니다 `
        + `(profiles=${JSON.stringify(profileNames)}, packs=${JSON.stringify(packNames)}) — 투영 모드로 전환하지 않는다.`,
    );
  }
  return { projection: true, profile: generatedProfile };
}

function walkJava(directory, out = []) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(name)) walkJava(path, out);
    } else if (name.endsWith('.java')) {
      out.push(path);
    }
  }
  return out;
}

/** 생성기 copySourceTree 와 같은 모집단 — 저장소에서는 git 추적+미추적, 투영본에서는 파일시스템. */
export function javaPopulation(root, projection) {
  if (projection) return walkJava(root);
  return trackedAndUntrackedFiles()
    .filter((rel) => rel.endsWith('.java'))
    .map((rel) => join(root, rel))
    .filter((path) => existsSync(path));
}

/** manifest pack 을 rank 순으로 누적한 합성 프로필 — core=[core], 다음=[core, collaboration] … */
export function rankPrefixProfiles(manifest) {
  const ordered = Object.entries(manifest.packs)
    .sort(([, left], [, right]) => left.rank - right.rank)
    .map(([name]) => name);
  return ordered.map((_, index) => ({ packs: ordered.slice(0, index + 1) }));
}

export function buildPrefixPlans(root, manifest, javaFiles) {
  return rankPrefixProfiles(manifest).map((profile) => ({
    profile,
    plan: planJavaRemoval(root, manifest, profile, javaFiles),
  }));
}

/** 이진 이름(`Outer$Inner`)을 포함한 FQN → main 소스 파일 목록. 정확히 하나가 아니면 호출자가 위반으로 다룬다. */
export function mainSourceOf(root, javaFiles, fqn) {
  const outer = fqn.split('$')[0];
  const suffix = `/src/main/java/${outer.replaceAll('.', '/')}.java`;
  return javaFiles.filter((path) => `/${normalize(relative(root, path))}`.endsWith(suffix));
}

/** 타입 FQN 들을 소스 파일로 푼다. 해석 실패는 위반 문구로 돌려준다. */
export function resolveTypeSources(root, javaFiles, label, types) {
  const sources = [];
  const violations = [];
  for (const type of types) {
    const hits = mainSourceOf(root, javaFiles, type);
    if (hits.length !== 1) violations.push(`${label}: ${type} 의 main 소스 파일이 정확히 하나가 아니다 (${hits.length}건)`);
    else sources.push(hits[0]);
  }
  return { sources, violations };
}

/**
 * 태그 대조: `entries = [{ label, pack, sources: [절대 경로] }]`.
 * 항목은 소스가 **모두** 살아남을 때만 그 프로필에 있고, 그 사실이 `pack ∈ 프로필` 과 같아야 한다.
 */
export function evaluateEntryTags({ entries, prefixPlans }) {
  const violations = [];
  for (const entry of entries) {
    if (entry.sources.length === 0) {
      violations.push(`${entry.label}: 판정할 소스 파일이 없다`);
      continue;
    }
    for (const { profile, plan } of prefixPlans) {
      const shouldRemain = profile.packs.includes(entry.pack);
      const removedSource = entry.sources.find((source) => plan.removed.has(source));
      if (shouldRemain === Boolean(removedSource)) {
        violations.push(
          `${entry.label} (pack=${entry.pack}) 는 프로필 [${profile.packs.join(',')}] 에서 `
            + (removedSource ? `제거된다 — ${plan.removalReason.get(removedSource) ?? '(사유 미상)'}` : '남는다'),
        );
      }
    }
  }
  return violations;
}

/** 투영본: 남은 pack 항목은 소스가 모두 있고, 빠진 pack 항목은 소스 중 하나라도 없어야 한다. */
export function evaluateProjectionPresence({ entries, presentPacks, exists = existsSync }) {
  const violations = [];
  for (const entry of entries) {
    const missing = entry.sources.filter((source) => !exists(source));
    if (presentPacks.has(entry.pack) && missing.length > 0) {
      violations.push(`${entry.label}: 남은 pack '${entry.pack}' 인데 소스가 없다 — ${missing.map(normalize).join(', ')}`);
    }
    if (!presentPacks.has(entry.pack) && missing.length === 0) {
      violations.push(`${entry.label}: 빠진 pack '${entry.pack}' 인데 소스가 모두 남아 있다`);
    }
  }
  return violations;
}

/**
 * 게이트 파일은 어떤 rank 누적 프로필에서도 제거되면 안 된다. 파일이 모집단에 아예 없으면(개명·이동) 계획에 오를 수도
 * 없으므로 "제거되지 않음" 으로 조용히 통과하지 않게 먼저 위반으로 센다.
 */
export function evaluateGateSurvival({ root, prefixPlans, gateFiles, javaFiles }) {
  const violations = [];
  const population = javaFiles ? new Set(javaFiles) : undefined;
  for (const gateFile of gateFiles) {
    const gate = join(root, gateFile);
    if (population ? !population.has(gate) : !existsSync(gate)) {
      violations.push(`${gateFile} 가 Java 모집단에 없다 — 개명·이동이면 게이트 목록을 갱신하라`);
      continue;
    }
    for (const { profile, plan } of prefixPlans) {
      if (plan.removed.has(gate)) {
        violations.push(`[${profile.packs.join(',')}] 에서 ${gateFile} 가 제거된다 — ${plan.removalReason.get(gate)}`);
      }
    }
  }
  return violations;
}

/** 실제 프로필의 Java `acknowledgedRemovedGates` 와 계획의 게이트 제거를 exact 대조한다. */
export function acknowledgedJavaGateMismatches({ root, manifest, javaFiles }) {
  const violations = [];
  for (const [name, profile] of Object.entries(manifest.profiles)) {
    const plan = planJavaRemoval(root, manifest, profile, javaFiles);
    const planned = [...plan.removed]
      .filter((path) => plan.gateSources.has(path))
      .map((path) => normalize(relative(root, path)))
      .sort();
    const acknowledged = (profile.acknowledgedRemovedGates ?? [])
      .map((entry) => entry.file)
      .filter((file) => file.endsWith('.java'))
      .sort();
    const unacknowledged = planned.filter((file) => !acknowledged.includes(file));
    const stale = acknowledged.filter((file) => !planned.includes(file));
    if (unacknowledged.length) violations.push(`profile '${name}' 이 승인하지 않은 Java 게이트를 제거한다: ${unacknowledged.join(', ')}`);
    if (stale.length) violations.push(`profile '${name}' 의 승인 목록에 더 이상 제거되지 않는 Java 게이트가 남아 있다: ${stale.join(', ')}`);
  }
  return violations;
}

/** 원장 어휘 검증: 저장소에서는 manifest pack 과 같고, 투영본에서는 남은 pack 을 포함한다. 항목 pack 은 어휘 안이다. */
export function evaluateVocabulary({ registryPacks, manifest, projection, entryPacks }) {
  const violations = [];
  const manifestPacks = Object.keys(manifest.packs).sort();
  if (new Set(registryPacks).size !== registryPacks.length) violations.push('packs 어휘에 중복이 있다');
  if (projection) {
    const outside = manifestPacks.filter((pack) => !registryPacks.includes(pack));
    if (outside.length) violations.push(`원장 어휘에 없는 manifest pack: ${outside.join(', ')}`);
  } else if (JSON.stringify([...registryPacks].sort()) !== JSON.stringify(manifestPacks)) {
    violations.push(`원장 어휘 ${JSON.stringify(registryPacks)} 가 manifest pack ${JSON.stringify(manifestPacks)} 와 다르다`);
  }
  for (const pack of entryPacks) {
    if (!registryPacks.includes(pack)) violations.push(`항목 pack '${pack}' 가 어휘에 없다`);
  }
  return violations;
}

let cached;
/** 저장소(또는 투영본) 한 번의 판정 문맥 — 계획은 비싸므로 한 프로세스에서 공유한다. */
export function repositoryContext(root = REPO_ROOT) {
  if (cached?.root === root) return cached;
  const manifest = readRepoJson(root, PACK_MANIFEST);
  const { projection } = detectProjection(manifest);
  const javaFiles = javaPopulation(root, projection);
  const prefixPlans = projection ? [] : buildPrefixPlans(root, manifest, javaFiles);
  cached = { root, manifest, projection, javaFiles, prefixPlans, presentPacks: new Set(Object.keys(manifest.packs)) };
  return cached;
}
