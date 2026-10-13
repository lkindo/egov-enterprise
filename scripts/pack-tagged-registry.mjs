/**
 * 횡단 게이트 원장 계약의 공용 판정 — 원장 항목이 재사용 base 생성기의 **실제 제거 계획**과 맞게 남고 빠지는지 본다.
 *
 * 개인정보 접근·교차 도메인 결합·입력 계약 미러 세 게이트는 판정 원장을 JSON 으로 둔다(DEC-OPS-089·090). 종전에는 항목마다
 * 소유 pack 을 적고 rank 누적 프로필마다 태그를 대조했는데, 매니페스트 v2 에서 pack·순위가 사라져(11단계 C4) 태그도 걷었다.
 * 이제 기대는 **소유에서 계산한다** — 항목이 참조하는 소스 파일마다 기능 소유(카탈로그와 같은 sourceOwner 규칙)를 정하고,
 * 소유 기능이 모두 구성 안에 있을 때만 그 구성에서 남는다고 본다. 시작 구성마다(그리고 survey 와 demo 전용 기능을 가르는 합성 구성
 * 하나) 생성기의 `planJavaRemoval` 을 그대로 불러 그 기대와 **양방향**으로 대조한다 — 시뮬레이터가 아니라 생성기 판정 자체다.
 * 파일 이름의 'pack-tagged' 는 옛 이름이다. 결정 기록(DEC-OPS-089·090)이 이 경로를 가리키므로 이름을 바꾸지 않는다.
 *
 * ⚠ api-server 의 기능 디렉터리 밖 파일은 참조하는 업무 패키지로 소유가 정해진다 — 생성기 연쇄와 같은 import 관계다. 그래서 그런
 * 소스만 가진 항목은 이 대조가 '잘못 들어간 import 로 코어 항목이 사라지는' 경우를 따로 잡지 못하고, 그 신호(DEC-OPS-089)는 시작 구성의
 * Java 연쇄 exact 목록(presets.json 의 expected.javaCascade)이 받친다. 그 목록을 수로 바꾸지 않는다.
 *
 * 투영본(생성물)에서는 제거가 이미 끝났다. 거기서는 계획 대신 생성기가 남긴 하네스 프로필 기록
 * (`config/governance/reusable-harness-profile.json` 의 retained·removed)과 실제 파일이 맞는지 본다. 투영본 판별은 매니페스트 v2 의
 * 생성물 표지(presets.json 의 active, composer-modules.mjs 의 detectGeneratedComposition)다 — 표지 필드 하나로 하지 않고 생성기가 쓰는
 * **구조**(시작 구성이 그 하나이고 기능 파일이 그 구성의 기능)까지 요구해, 원본 presets.json 에 표지만 넣어 계획 대조를 끄는 경로를
 * 막는다(11단계 C5).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectGeneratedComposition } from './composer-modules.mjs';
import { javaCascadeAcknowledgement } from './reusable-source-gates.mjs';
import { javaCascadeRemovals, planJavaRemoval } from './reusable-source-java.mjs';
import { trackedAndUntrackedFiles } from './reusable-source-tree.mjs';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const HARNESS_PROFILE = 'config/governance/reusable-harness-profile.json';
export const PRESETS_PATH = 'config/modules/presets.json';
export const JAVA_POPULATION_FLOOR = 1000;
/**
 * survey 와 demo 전용 기능을 가르는 합성 구성 — 협업 시작 구성에 설문만 더한다. 지금 시작 구성 셋(core·collaboration·demo)은 설문을
 * 늘 다른 demo 전용 기능과 함께 넣거나 함께 빼므로, 설문 소유를 다른 demo 기능으로 잘못 정해도 세 구성 어디서도 드러나지 않는다
 * (DEC-OPS-090 이 합성 프로필 [core,collaboration,survey] 를 필수로 둔 이유와 같다). '공통 기반 + 설문' 시작 구성(13b)이 생기면 걷는다.
 */
export const SURVEY_SPLIT_FIXTURE = Object.freeze({ base: 'collaboration', add: Object.freeze(['survey']) });
const SKIPPED_DIRECTORIES = new Set(['build', 'node_modules', '.git', '.gradle']);

export const normalize = (path) => path.split(sep).join('/');
export const readRepoJson = (root, path) => JSON.parse(readFileSync(join(root, path), 'utf8'));

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
 * 소스 파일(절대 경로) → 소유 기능('core' 또는 기능 id). 카탈로그가 이벤트·포트 연동을 계산할 때 쓰는 sourceOwner 규칙을 그대로 쓴다 —
 * 지원 파일 선언, 업무 앱 기능 디렉터리, foundation·business-core 는 core, 그 밖(api-server)은 주석·문자열을 지운 코드의 업무 패키지 참조다.
 * 기능 id 가 아닌 소유가 나오면 판정할 수 없는 것이라 실패한다(조용히 core 로 보지 않는다).
 */
export function compositionOwnerOf(root, { ownerOf, features, stripComments }) {
  const owners = new Map();
  return (absolute) => {
    if (!owners.has(absolute)) {
      const path = normalize(relative(root, absolute));
      const owner = ownerOf(path, stripComments(readFileSync(absolute, 'utf8'), { strings: false }));
      if (owner !== 'core' && !features.has(owner)) throw new Error(`${path} 의 소유가 기능이 아니다: ${owner}`);
      owners.set(absolute, owner);
    }
    return owners.get(absolute);
  };
}

/**
 * 소유 파생 기대 생존과 생성기 계획의 양방향 대조. `entries = [{ label, sources: [절대 경로], owners: [기능] }]`,
 * `compositions = [{ name, selected: Set, plan }]`. 항목은 소스의 소유 기능이 모두 구성 안(또는 core)일 때만 그 구성에서 남는다.
 */
export function evaluateExpectedSurvival({ entries, compositions }) {
  const violations = [];
  for (const entry of entries) {
    if (entry.sources.length === 0) {
      violations.push(`${entry.label}: 판정할 소스 파일이 없다`);
      continue;
    }
    for (const { name, selected, plan } of compositions) {
      const outside = [...new Set(entry.owners.filter((owner) => owner !== 'core' && !selected.has(owner)))].sort();
      const removedSource = entry.sources.find((source) => plan.removed.has(source));
      if (outside.length === 0 && removedSource) {
        violations.push(`expected to survive in ${name}: ${entry.label} — 생성기가 지운다: `
          + `${plan.removalReason.get(removedSource) ?? '(사유 미상)'}`);
      } else if (outside.length > 0 && !removedSource) {
        violations.push(`expected to be removed in ${name}: ${entry.label} — 구성 밖 소유 기능 [${outside.join(', ')}] 인데 생성기가 남긴다`);
      }
    }
  }
  return violations;
}

/**
 * 투영본: 생성기가 남긴 하네스 프로필 기록으로 원장 항목의 소스를 푼다. `types`(이진 이름)는 기록의 type 으로, `paths`(저장소 상대 경로)는
 * 기록의 path 로 찾고, 정확히 한 번 기록돼 있어야 한다. 기록이 없는 소스는 '조용히 빠진 소스' 라 위반이다.
 */
export function recordedSources(record, label, { types = [], paths = [] }) {
  const rows = [...(record.retained ?? []).map((row) => ({ ...row, retained: true })),
    ...(record.removed ?? []).map((row) => ({ ...row, retained: false }))];
  const sources = [];
  const violations = [];
  const take = (matches, what) => {
    if (matches.length !== 1) violations.push(`${label}: ${what} 가 투영 기록(${HARNESS_PROFILE})에 정확히 한 번 있지 않다 (${matches.length}건)`);
    else sources.push({ path: matches[0].path, retained: matches[0].retained });
  };
  for (const type of types) take(rows.filter((row) => row.type === type.split('$')[0]), type);
  for (const path of paths) take(rows.filter((row) => row.path === path), path);
  return { sources, violations };
}

/** 투영본 대조: 남김 기록의 소스는 파일이 있고, 지움 기록의 소스는 파일이 없어야 한다. */
export function evaluateRecordedPresence({ root, entries, exists = existsSync }) {
  const violations = [];
  for (const entry of entries) {
    for (const source of entry.sources) {
      const present = exists(join(root, source.path));
      if (source.retained && !present) violations.push(`${entry.label}: 투영 기록은 남겼는데 소스가 없다 — ${source.path}`);
      if (!source.retained && present) violations.push(`${entry.label}: 투영 기록은 지웠는데 소스가 남아 있다 — ${source.path}`);
    }
  }
  return violations;
}

/**
 * 원장 항목을 판정 입력으로 바꾼다. `raw = [{ label, types: [이진 이름], paths: [저장소 상대 경로] }]`.
 * 저장소에서는 main 소스로 풀고 소유 기능을 붙이며, 투영본에서는 하네스 프로필 기록으로 푼다.
 */
export function ledgerEntries(context, raw) {
  const entries = [];
  const violations = [];
  const population = context.projection ? undefined : new Set(context.javaFiles);
  for (const { label, types = [], paths = [] } of raw) {
    if (context.projection) {
      const resolved = recordedSources(context.record, label, { types, paths });
      violations.push(...resolved.violations);
      entries.push({ label, sources: resolved.sources });
      continue;
    }
    const resolved = resolveTypeSources(context.root, context.javaFiles, label, types);
    violations.push(...resolved.violations);
    const files = paths.map((path) => join(context.root, path));
    for (const file of files) if (!population.has(file)) violations.push(`${label}: ${normalize(relative(context.root, file))} 가 Java 모집단에 없다`);
    const sources = [...files.filter((file) => population.has(file)), ...resolved.sources];
    entries.push({ label, sources, owners: sources.map(context.ownerOf) });
  }
  return { entries, violations };
}

/** 저장소면 소유 파생 기대 생존을 구성마다 계획과, 투영본이면 기록과 파일을 대조한다. */
export function ledgerViolations(context, entries) {
  if (context.projection) return evaluateRecordedPresence({ root: context.root, entries });
  return evaluateExpectedSurvival({ entries, compositions: context.compositions });
}

/**
 * 게이트 파일은 어떤 구성에서도 제거되면 안 된다. 파일이 모집단에 아예 없으면(개명·이동) 계획에 오를 수도
 * 없으므로 "제거되지 않음" 으로 조용히 통과하지 않게 먼저 위반으로 센다.
 */
export function evaluateGateSurvival({ root, compositions, gateFiles, javaFiles }) {
  const violations = [];
  const population = javaFiles ? new Set(javaFiles) : undefined;
  for (const gateFile of gateFiles) {
    const gate = join(root, gateFile);
    if (population ? !population.has(gate) : !existsSync(gate)) {
      violations.push(`${gateFile} 가 Java 모집단에 없다 — 개명·이동이면 게이트 목록을 갱신하라`);
      continue;
    }
    for (const { name, plan } of compositions) {
      if (plan.removed.has(gate)) violations.push(`${name} 에서 ${gateFile} 가 제거된다 — ${plan.removalReason.get(gate)}`);
    }
  }
  return violations;
}

/**
 * 시작 구성의 Java 게이트 제거 승인(presets.json 의 expected.gates)과 계획의 게이트 제거를 exact 대조한다(R4). 수 래칫이 아니라 목록이다 —
 * 게이트 하나가 사라지고 다른 하나가 살아나는 교체도 붉다. `compositions` 의 `profile` 은 composerProfile 결과다.
 */
export function presetGateMismatches({ root, compositions }) {
  const violations = [];
  for (const { name, profile, plan } of compositions) {
    const planned = [...plan.removed].filter((path) => plan.gateSources.has(path)).map((path) => normalize(relative(root, path))).sort();
    const acknowledged = (Array.isArray(profile.acknowledgedRemovedGates) ? profile.acknowledgedRemovedGates : [])
      .map((entry) => entry?.file).filter((file) => typeof file === 'string' && file.endsWith('.java')).sort();
    const unacknowledged = planned.filter((file) => !acknowledged.includes(file));
    const stale = acknowledged.filter((file) => !planned.includes(file));
    if (unacknowledged.length) violations.push(`${name} 이 승인하지 않은 Java 게이트를 제거한다: ${unacknowledged.join(', ')}`);
    if (stale.length) violations.push(`${name} 의 승인 목록에 더 이상 제거되지 않는 Java 게이트가 남아 있다: ${stale.join(', ')}`);
  }
  return violations;
}

/** 시작 구성의 Java 연쇄 제거(게이트 제외)와 presets.json 의 expected.javaCascade 를 생성기와 같은 판정으로 exact 대조한다(설계서 C4·R4). */
export function presetJavaCascadeMismatches({ root, compositions }) {
  const violations = [];
  for (const { name, profile, plan } of compositions) {
    const removals = javaCascadeRemovals(root, plan);
    const { invalidEntries, duplicates, unacknowledged, stale } = javaCascadeAcknowledgement(profile, removals.map((entry) => entry.file));
    const reasons = new Map(removals.map((entry) => [entry.file, entry.reason]));
    if (invalidEntries.length) violations.push(`${name} 의 javaCascade 항목이 .java 경로가 아니다: ${JSON.stringify(invalidEntries)}`);
    if (duplicates.length) violations.push(`${name} 의 javaCascade 에 중복이 있다: ${duplicates.join(', ')}`);
    if (unacknowledged.length) {
      violations.push(`${name} 이 승인하지 않은 Java 파일을 연쇄로 지운다 — 잘못 들어간 import 인지 먼저 본다: `
        + unacknowledged.map((file) => `${file} <- ${reasons.get(file)}`).join(', '));
    }
    if (stale.length) violations.push(`${name} 의 javaCascade 에 더 이상 연쇄로 지워지지 않는 파일이 남아 있다: ${stale.join(', ')}`);
  }
  return violations;
}

const contexts = new Map();
/**
 * 저장소(또는 투영본) 한 번의 판정 문맥 — 카탈로그 적재와 계획은 비싸므로 한 프로세스에서 공유한다. 카탈로그·해석기는 저장소 쪽에서만
 * 부른다(동적 import) — 투영본에는 원본 카탈로그를 적재할 원천이 없다.
 */
export function repositoryContext(root = REPO_ROOT) {
  if (!contexts.has(root)) contexts.set(root, buildContext(root));
  return contexts.get(root);
}

async function buildContext(root) {
  const { projection } = detectGeneratedComposition(root);
  const javaFiles = javaPopulation(root, projection);
  if (projection) {
    const presets = readRepoJson(root, PRESETS_PATH).presets;
    return { root, projection: true, javaFiles, record: readRepoJson(root, HARNESS_PROFILE), active: presets[0], presets: [], compositions: [] };
  }
  const [{ loadProjectComposerCatalog }, { resolveProjectRecipe }, { composerOwnership, loadComposerModules }, { composerProfile },
    { requiresClosure, sourceOwner, stripComments }] = await Promise.all([
    import('./project-composer-catalog.mjs'), import('./project-composer-recipe.mjs'), import('./composer-modules.mjs'),
    import('./project-composer-source.mjs'), import('./project-composer-integrations.mjs')]);
  const catalog = loadProjectComposerCatalog(root);
  const modules = loadComposerModules(root);
  const ownership = composerOwnership(modules);
  const recipe = (selection) => ({ schemaVersion: 1, project: { name: 'ledger-contract' }, sourceRef: 'main', selection,
    database: { vendor: 'postgresql' }, backendLayout: 'multi-module' });
  const row = (name, composition, preset) => {
    const profile = composerProfile(modules, composition);
    return { name, preset, selected: new Set(composition.resolvedDomains), profile, plan: planJavaRemoval(root, ownership, profile, javaFiles) };
  };
  const presets = catalog.presets.map((preset) => row(`preset ${preset.id}`, resolveProjectRecipe(recipe({ preset: preset.id }), catalog), preset.id));
  const base = presets.find((entry) => entry.preset === SURVEY_SPLIT_FIXTURE.base);
  if (!base) throw new Error(`합성 구성의 기준 시작 구성이 없다: ${SURVEY_SPLIT_FIXTURE.base}`);
  const fixtureDomains = [...new Set([...base.selected, ...SURVEY_SPLIT_FIXTURE.add])].sort();
  const fixture = row(`합성 구성 [${SURVEY_SPLIT_FIXTURE.base} + ${SURVEY_SPLIT_FIXTURE.add.join(', ')}]`,
    resolveProjectRecipe(recipe({ domains: fixtureDomains }), catalog));
  const features = new Set(catalog.capabilities.map((capability) => capability.id));
  const supportOwners = new Map([...ownership.supportFiles].flatMap(([domain, files]) => files.map((file) => [file, domain])));
  const ownerOf = compositionOwnerOf(root, { ownerOf: sourceOwner(supportOwners, [...features], requiresClosure(catalog.capabilities)),
    features, stripComments });
  return { root, projection: false, javaFiles, catalog, modules, ownership, ownerOf, presets, compositions: [...presets, fixture] };
}
