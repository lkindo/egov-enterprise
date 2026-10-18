import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { parseModuleReferences } from './frontend-module-graph.mjs';
import { IGNORED_FRONTEND_DIRECTORIES, MODULE_EXTENSIONS, buildCaseMap, resolveModuleReference } from './frontend-module-resolver.mjs';
import { stripComments } from './project-composer-integrations.mjs';
import { SLOT_CONSUMER_KINDS, SLOT_REGISTRY_CONSUMERS, slotConsumerFiles, slotRegistryPath } from './slot-registry.mjs';

/*
 * 슬롯 기여를 값으로 읽는 다른 기능 계산(GAP-COMPOSE-001, DEC-OPS-353). 기여 F 가 빠지면 줄어드는 동작은 두 갈래다.
 *   (1) 셸이 항목을 그린다 — 사라지는 것은 F 자신의 진입점·카드·탭뿐이다. 이 기여는 registrationOnly 다.
 *   (2) 값 소비자가 항목을 값으로 돌려주고 다른 기능의 화면이 그 값으로 문구·단추·탭을 바꾼다 — 예: 알림 채널 유무로 재알림 단추를 가리는
 *       결재 화면. F 가 빠지면 그 화면의 동작이 줄어드는 연동이다.
 * 소비자의 종류와 값 소비자가 읽는 기여는 SLOT_CONSUMER_KINDS(slot-registry.mjs)에 손으로 적는다. 이 모듈은 그 선언을 소스와 대조하고
 * (레지스트리를 import 하는 파일은 모두 선언돼야 하고, 선언된 소비자는 레지스트리를 import 해야 한다) 선언된 값 소비자에서 reader 를 계산한다:
 *   - 첫 단계: 값 소비자를 import 하면서 그 `exports` 이름을 코드에 쓰는 파일(주석·문자열 제외). 같은 파일의 다른 export 만 쓰는 importer 는
 *     읽지 않는다.
 *   - 다음 단계: core 소유 파일(확장자와 무관하다 — .ts·.tsx 를 가리지 않는다)은 지나가며 그 importer 를 따른다. 기능이 소유한 파일에 닿으면
 *     그 기능이 reader 이고 그 너머는 보지 않는다. importer 가 없는 core 파일(화면·레이아웃 진입점)에 닿으면 reader 는 'core' 다.
 *   - 타입만 가져오는 참조는 값이 오가지 않으므로 따르지 않는다.
 * reader 는 선언이 고른 기여에만 붙는다. 기여 기능 F 자신과 값 소비자를 소유한 기능은 reader 가 아니다.
 * 판정할 수 없는 슬롯(레지스트리나 선언된 소비자 파일이 없는 트리 — 합성 입력·일부만 복사한 시험 트리·그 소비자를 지운 투영본)은 그 슬롯의
 * 기여만 null(판정 불가)로 둔다. 다른 슬롯은 그대로 판정한다.
 * 이 모듈은 Node 내장 모듈과 형제 모듈만 쓴다(카탈로그가 생성기 단계에서 불리므로 의존성 설치 전에 돈다).
 */
const byCodeUnits = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const slash = path => path.split(sep).join('/');
const covers = (prefix, candidate) => candidate === prefix || candidate.startsWith(`${prefix}/`);
const isModuleFile = path => MODULE_EXTENSIONS.some(extension => path.endsWith(extension));
// 제품 소스가 아닌 시험 파일은 reader 도 소비자도 아니다.
const isTestSource = path => path.split('/').includes('__tests__') || /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(path);
const frontendPath = path => path.replace(/^frontend\//u, '');
const SELECTOR_KEYS = new Set(['all', 'feature', 'placement', 'id']);
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

function walk(directory, out = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_FRONTEND_DIRECTORIES.has(entry.name)) walk(join(directory, entry.name), out);
    } else out.push(join(directory, entry.name));
  }
  return out;
}

/**
 * frontend 기준 경로(`src/…`)의 소유 기능 목록. 가장 긴 소유 경로가 이긴다. 어느 경로에도 없으면 core(빈 목록)다.
 * `rules` 는 카탈로그의 frontendRules({ path, domains })다. 공동 소유(여럿)는 그 기능 전부를 돌려준다.
 */
export function frontendFileOwners(path, rules) {
  let best = null;
  for (const rule of rules) if (covers(rule.path, path) && (!best || rule.path.length > best.path.length)) best = rule;
  return best ? [...best.domains] : [];
}

/**
 * 소비자 종류 표가 소비자 표와 정확히 같은 파일을 덮고 모양이 맞는지(문제 문장 목록). 둘이 어긋나면 새 소비자가 종류 없이 들어오거나
 * 지운 소비자의 선언이 남는다.
 */
export function slotConsumerKindProblems({ consumers = SLOT_REGISTRY_CONSUMERS, kinds = SLOT_CONSUMER_KINDS } = {}) {
  const problems = [];
  const slots = new Set([...Object.keys(consumers), ...Object.keys(kinds)]);
  for (const slot of [...slots].sort(byCodeUnits)) {
    const declared = new Set(slotConsumerFiles(slot, consumers));
    const typed = kinds[slot] ?? {};
    for (const file of declared) if (!Object.hasOwn(typed, file)) problems.push(`slot consumer has no declared kind: ${file} (${slot})`);
    for (const [file, kind] of Object.entries(typed)) {
      if (!declared.has(file)) problems.push(`slot consumer kind names a file that is not a consumer: ${file} (${slot})`);
      if (kind?.kind === 'shell') continue;
      if (kind?.kind !== 'value') { problems.push(`slot consumer kind must be shell or value: ${file} (${slot})`); continue; }
      if (!Array.isArray(kind.exports) || !kind.exports.length || kind.exports.some(name => !IDENTIFIER.test(name))) {
        problems.push(`value slot consumer must name the exports it hands out: ${file} (${slot})`);
      }
      if (!Array.isArray(kind.reads) || !kind.reads.length) problems.push(`value slot consumer must declare the contributions it reads: ${file} (${slot})`);
      for (const selector of kind.reads ?? []) {
        const keys = Object.keys(selector ?? {});
        if (!keys.length || keys.some(key => !SELECTOR_KEYS.has(key))
          || (selector.all !== undefined && (selector.all !== true || keys.length !== 1))
          || keys.some(key => key !== 'all' && (typeof selector[key] !== 'string' || !selector[key]))) {
          problems.push(`value slot consumer has an invalid selector: ${file} (${slot}) ${JSON.stringify(selector)}`);
        }
      }
    }
  }
  return problems;
}

/**
 * frontend/src 의 모듈 파일 import 그래프. `runtime` 은 값이 오가는 참조(타입 전용 제외)의 importer, `any` 는 타입 전용까지 넣은 importer 다
 * (대상 → importer 집합, frontend 기준 경로). 시험 파일은 importer 에서 뺀다. 프런트 소스가 없으면 null 이다.
 */
export function frontendImporters(root) {
  const frontendRoot = resolve(root, 'frontend');
  const sourceRoot = join(frontendRoot, 'src');
  if (!existsSync(sourceRoot) || !statSync(sourceRoot).isDirectory()) return null;
  const files = walk(sourceRoot).map(path => resolve(path));
  const knownFiles = new Set(files);
  const caseMap = buildCaseMap(files);
  const relativeOf = absolute => slash(relative(frontendRoot, absolute));
  const runtime = new Map();
  const any = new Map();
  const add = (map, target, file) => { if (!map.has(target)) map.set(target, new Set()); map.get(target).add(file); };
  for (const absolute of files.filter(isModuleFile)) {
    const file = relativeOf(absolute);
    if (isTestSource(file)) continue;
    // 판정할 수 없는 import(계산된 동적 import 등)는 도달성 census 가 따로 잡는다. 여기서는 읽을 수 있는 간선만 쓴다.
    const { references } = parseModuleReferences(readFileSync(absolute, 'utf8'), file);
    for (const reference of references) {
      const resolution = resolveModuleReference({ importer: absolute, specifier: reference.specifier, frontendRoot, knownFiles, caseMap, line: reference.line });
      if (!resolution.target) continue;
      const target = relativeOf(resolution.target);
      add(any, target, file);
      if (!reference.typeOnly) add(runtime, target, file);
    }
  }
  return { runtime, any };
}

/** 기여 파일 항목의 문자열 값(id·placement). 주석은 보지 않는다. 기여는 데이터만 담는다(경계 계약). */
function contributionFields(root, path) {
  const absolute = join(root, path);
  const fields = { id: new Set(), placement: new Set() };
  if (!existsSync(absolute)) return fields;
  const code = stripComments(readFileSync(absolute, 'utf8'), { kind: 'ts' });
  for (const match of code.matchAll(/(?<![\w$.])(id|placement)\s*:\s*(['"])([^'"\n]*)\2/gu)) fields[match[1]].add(match[3]);
  return fields;
}

/** 선택자 목록이 기여를 고르는가. 한 선택자 안의 조건은 모두 맞아야 하고 선택자끼리는 하나만 맞으면 된다. */
export function selectsContribution(reads, contribution, fields) {
  return reads.some(selector => selector.all === true || ((selector.feature === undefined || selector.feature === contribution.owner)
    && (selector.placement === undefined || fields.placement.has(selector.placement))
    && (selector.id === undefined || fields.id.has(selector.id))));
}

/**
 * 슬롯 기여마다 그것을 값으로 읽는 다른 기능을 계산한다.
 * `contributions` 는 카탈로그의 기여 목록({ path: 'frontend/src/extensions/<기능>/<슬롯>.ts', owner, slot }), `rules` 는 frontendRules 다.
 * 결과: 기여 경로 → [{ feature, consumers: [값 소비자(저장소 기준)], files: [reader 파일(frontend 기준)] }] (기능 코드 포인트 순) 또는 null(그 슬롯을
 * 판정할 수 없다). 프런트 소스가 아예 없으면 null 이다. 선언이 소스와 어긋나면 실패한다.
 */
export function deriveSlotContributionReaders({ root, rules, contributions, importers: given = null,
  consumers = SLOT_REGISTRY_CONSUMERS, kinds = SLOT_CONSUMER_KINDS }) {
  const fail = message => { throw new Error(`project-composer catalog: ${message}`); };
  const problems = slotConsumerKindProblems({ consumers, kinds });
  if (problems.length) fail(problems.join('; '));
  const graph = given ?? frontendImporters(root);
  if (!graph) return null;
  const present = path => existsSync(join(root, 'frontend', frontendPath(path)));
  const ownersCache = new Map();
  const ownersOf = file => {
    if (!ownersCache.has(file)) ownersCache.set(file, frontendFileOwners(file, rules));
    return ownersCache.get(file);
  };
  const codeCache = new Map();
  const codeOf = file => {
    if (!codeCache.has(file)) {
      const absolute = join(root, 'frontend', file);
      codeCache.set(file, existsSync(absolute) ? stripComments(readFileSync(absolute, 'utf8'), { kind: 'ts', strings: false }) : '');
    }
    return codeCache.get(file);
  };
  const usesExport = (file, names) => names.some(name => new RegExp(`(?<![\\w$])${escapeRegExp(name)}(?![\\w$])`, 'u').test(codeOf(file)));

  // 값 소비자 하나에서 reader(기능 → 파일)를 모은다. core 진입점은 'core' 다.
  const readersFrom = (consumer, kind) => {
    const start = frontendPath(consumer);
    const hostOwners = new Set(ownersOf(start));
    const readers = new Map();
    const record = (feature, file) => {
      if (hostOwners.has(feature)) return;
      if (!readers.has(feature)) readers.set(feature, new Set());
      readers.get(feature).add(file);
    };
    const firstHop = [...(graph.runtime.get(start) ?? [])].filter(file => usesExport(file, kind.exports)).sort(byCodeUnits);
    const seen = new Set([start, ...firstHop]);
    const queue = [...firstHop];
    while (queue.length) {
      const file = queue.shift();
      const owners = ownersOf(file);
      if (owners.length) { for (const feature of owners) record(feature, file); continue; }
      const next = [...(graph.runtime.get(file) ?? [])].sort(byCodeUnits);
      if (!next.length) { record('core', file); continue; }
      for (const importer of next) if (!seen.has(importer)) { seen.add(importer); queue.push(importer); }
    }
    return readers;
  };

  const result = new Map();
  for (const slot of [...new Set(contributions.map(row => row.slot))].sort(byCodeUnits)) {
    const ofSlot = contributions.filter(row => row.slot === slot);
    const declared = slotConsumerFiles(slot, consumers);
    if (!present(slotRegistryPath(slot)) || declared.some(file => !present(file))) {
      for (const row of ofSlot) result.set(row.path, null);
      continue;
    }
    const registry = slotRegistryPath(slot);
    const actual = [...(graph.any.get(registry) ?? [])].map(file => `frontend/${file}`).sort(byCodeUnits);
    for (const file of actual) if (!declared.includes(file)) fail(`slot registry is imported by an undeclared consumer: ${file} (${slot})`);
    for (const file of declared) if (!actual.includes(file)) fail(`declared slot consumer does not import its registry: ${file} (${slot})`);
    const perContribution = new Map(ofSlot.map(row => [row.path, new Map()]));
    for (const [consumer, kind] of Object.entries(kinds[slot] ?? {})) {
      if (kind.kind !== 'value') continue;
      const readers = readersFrom(consumer, kind);
      for (const row of ofSlot) {
        if (!selectsContribution(kind.reads, row, contributionFields(root, row.path))) continue;
        const byFeature = perContribution.get(row.path);
        for (const [feature, files] of readers) {
          if (feature === row.owner) continue;
          if (!byFeature.has(feature)) byFeature.set(feature, { consumers: new Set(), files: new Set() });
          byFeature.get(feature).consumers.add(consumer);
          for (const file of files) byFeature.get(feature).files.add(file);
        }
      }
    }
    for (const row of ofSlot) {
      result.set(row.path, [...perContribution.get(row.path)].sort(([a], [b]) => byCodeUnits(a, b))
        .map(([feature, value]) => ({ feature, consumers: [...value.consumers].sort(byCodeUnits), files: [...value.files].sort(byCodeUnits) })));
    }
  }
  return result;
}

/**
 * 원본 트리에서 값 소비자의 선택자가 실제 기여를 고르는지(문제 문장 목록). 투영본에서는 기여가 기능과 함께 지워질 수 있어 카탈로그 로드에서는
 * 보지 않고 원본의 운영 계약이 본다.
 */
export function staleSlotValueSelectors({ root, contributions, kinds = SLOT_CONSUMER_KINDS }) {
  const problems = [];
  for (const [slot, files] of Object.entries(kinds)) for (const [consumer, kind] of Object.entries(files)) {
    if (kind.kind !== 'value') continue;
    for (const selector of kind.reads) {
      const matched = contributions.filter(row => row.slot === slot && selectsContribution([selector], row, contributionFields(root, row.path)));
      if (!matched.length) problems.push(`value slot consumer selector matches no contribution: ${consumer} (${slot}) ${JSON.stringify(selector)}`);
    }
  }
  return problems;
}
