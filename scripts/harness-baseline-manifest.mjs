#!/usr/bin/env node
/**
 * 하네스 기준선 매니페스트의 계산과 검사 — 이 저장소에서 그 계산을 하는 유일한 구현이다.
 *
 * 사용법:
 *   node scripts/harness-baseline-manifest.mjs --check          # 계산값과 매니페스트를 키 단위로 대조한다(다르면 종료 코드 1)
 *   node scripts/harness-baseline-manifest.mjs --write          # 계산값으로 다시 쓰고 바뀐 키를 보인다
 *   node scripts/harness-baseline-manifest.mjs --keys <키…>     # 그 키의 계산값만 보인다(쓰지 않는다)
 *   npm run harness:baseline -- --write
 *
 * 쓰는 곳: 하네스 메타 게이트(HarnessBaselineIntegrityTest)가 `--check` 를 실행한다 — 원본 CI·pre-push·재사용 생성물의 하네스가
 * 모두 이 경로다. 운영 계약(harness-baseline-mirror-contract.test.mjs — 이름은 거울 계약 시절 그대로다)은 같은 계산을 늘 도는 CI 잡에서 커밋본과 대조하고, 재사용 투영
 * 생성기(reusable-source-harness.mjs)는 이 계산으로 생성물의 매니페스트를 쓴다. 종전에는 같은 계산을 메타 게이트(Java)와 생성기(node)가
 * 따로 구현하고 거울 계약이 둘을 맞췄다(2026-10-19 하나로 모았다).
 *
 * 무엇을 동결하나: 게이트 소스의 `static final` 상수(동결·예외 목록·경로·정규식·숫자 하한), 판정이 메서드 본문에 사는 게이트의 소스
 * 전체(__sourceHash), 게이트 판정 원장과 훅의 내용 해시, registry(gates.json) 밖의 게이트 소스 목록과 registry 에 등록됐는데 census 에
 * 없는 게이트. 이 census 의 정의도 같은 경계 안에 있다 — 이 파일과 형식 모듈의 내용 해시가 매니페스트에 실리므로(GATE_REGISTRIES)
 * 스캔 루트·게이트 술어·상수 정규식·해시 대상·검사 판정을 약하게 고치면 매니페스트가 함께 바뀐다. 목적은 은폐를 불가능하게가 아니라
 * 조용할 수 없게 만드는 것이다 — 목록을 손대면 서로 다른 두 파일이 함께 바뀌어 diff 에 의도가 남는다(H2).
 *
 * `--keys` 는 병합에서 같은 키가 충돌했을 때 쓴다. 오케스트레이션 프로토콜 §6.4 는 충돌한 키의 값만 옮기고 그 입력 변경이
 * 양쪽 모두 정당한지 사람이 확인하게 한다(H2). 그래서 충돌 표기가 남은 매니페스트에는 `--write` 를 거부한다 — 통째로 다시
 * 쓰면 그 확인 지점이 조용히 사라진다.
 *
 * 경로와 쓰기 형식(머리 주석·코드 단위 키 순서·LF)은 형식 모듈(harness-baseline-manifest-format.mjs)이 정한다. 이 도구는 기존 파일의
 * 머리 주석을 그대로 두고(없으면 형식 모듈의 기본 2줄) 그 모듈의 렌더 함수로 쓴다. 재사용 투영 생성기도 같은 렌더 함수를 써서
 * 생성물에서 처음 `--write` 해도 줄 순서가 바뀌지 않는다.
 *
 * import 는 node 내장·형식 모듈·소스 트리 공용 바탕(node 내장만 쓴다)뿐이다 — 메타 게이트가 Gradle 안에서 이 파일을 실행하므로 생성기
 * 모듈 그래프를 끌어오지 않는다.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  DEFAULT_HEADER, MANIFEST_PATH, hasConflictMarkers, manifestHeader, parseManifest, renderHarnessBaselineManifest,
} from './harness-baseline-manifest-format.mjs';
import { fail, normalize, readTextIfPresent, walk } from './reusable-source-tree.mjs';

export { DEFAULT_HEADER, MANIFEST_PATH, hasConflictMarkers, manifestHeader, parseManifest, renderHarnessBaselineManifest };

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/*
  스캔 루트 — 게이트는 `nuri.api.harness` 밖에도 있다(모듈별 ArchUnit·RBAC 매트릭스·쿼리 수 가드레일). 한 디렉터리만 지키면
  "매니페스트 밖으로 게이트를 옮기는" 우회가 성립하므로 다섯 모듈의 시험 소스와, ArchUnit 규칙 정의가 사는 business-core testFixtures 를
  모두 본다(2026-08-31 testFixtures·migration-tool 편입 — 그 전에는 규칙 본문의 완화가 census 에 전혀 남지 않았다).
*/
export const HARNESS_SCAN_ROOTS = [
  'api-server/src/test/java',
  'business-app/src/test/java',
  'business-core/src/test/java',
  'business-core/src/testFixtures/java',
  'foundation/src/test/java',
  'migration-tool/src/test/java',
];

/** 게이트 소스 스캔 건수의 하한 — 스캔이 조용히 붕괴하면 빈 대조가 통과하므로 막는다(2026-08-31 모집단 확대로 12 → 40). */
export const MINIMUM_GATE_SOURCES = 40;

/*
  게이트 술어 — `harness` 디렉터리 소속이거나, 이름이 게이트 패턴이거나, 게이트 태그를 단 시험 소스. 재사용 투영의 Java 제거 계획도 이
  술어로 지운 게이트를 센다(같은 모집단). 이름 패턴에 ArchUnit 계층(*ArchitectureTest·*IsolationTest·규칙 정의 *ArchitectureRules·
  *ConventionRules)을 넣었다(2026-08-31 — 그 전에는 ArchUnit 계층 전체에 '조용한 삭제' 차단이 비어 있었다). 태그는 registry 의 게이트 술어와
  같은 축이다 — 태그가 있는데 이름이 패턴 밖인 게이트(schema-validation 의 migration IT 들)도 보호한다.
*/
const GATE_FILE_PATTERN =
  /(?:LinterTest|ArchTest|MatrixTest|GuardrailIntegrationTest|ValidationIntegrationTest|Archunit\w*|ArchitectureTest|IsolationTest|ArchitectureRules|ConventionRules)\.java$/;
const GATE_TAGS = ['@Tag("governance-harness")', '@Tag("schema-validation")', '@ArchTag("architecture-gate")'];

/*
  소스 전체 해시 대상 — ArchUnit 계열과 판정 본문 자체가 계약인 표적 게이트. ArchUnit 의 규칙과 allowlist 는 `static final` 상수가 아니라
  메서드 체인에 산다 — 상수 해시만으로는 allowlist 를 한 줄 늘려도 매니페스트에 아무것도 남지 않는다. 주석 제거·개행 정규화 후 소스
  전체를 해시한다. 메타 게이트(HarnessBaselineIntegrityTest)도 여기 있다 — 이 도구를 실행하고 판정하는 본문이 그 게이트의 전부다.
*/
const ARCH_RULE_FILE_PATTERN =
  /(?:WorkflowManifestLinterTest|FlywaySchemaOwnershipLinterTest|ReusableHarnessProfile|ControllerScanBaseLinterTest|EntityLombokSourceLinterTest|EntitySchemaConformanceLinterTest|EntityTableOwnershipLinterTest|HandlerReachesServiceLinterTest|HarnessBaselineIntegrityTest|PageableConstructionLinterTest|PkGenerationStandardLinterTest|ResponseContractLinterTest|SecurityAuthAnnotationLinterTest|ServiceReadOnlyTransactionalLinterTest|SchemaValidationIntegrationTest|WriteSmokeIntegrationTest|AuthorizationAdministrationIntegrationTest|AttachmentSourceRegistryLinterTest|CrossDomainCouplingLinterTest|InputContractMirrorLinterTest|PrivacyAccessCensusLinterTest|ArchTest|ArchitectureTest|IsolationTest|ArchitectureRules|ConventionRules|Archunit\w*)\.java$/;

/*
  게이트 판정의 근거 데이터를 담은 registry 와 실행 가능한 생성물 정책 — 내용 해시를 동결한다. 동결 census 가 상수에서 JSON registry 로
  이관되면서(인가 가드·ZDM 예외·게이트 목록·품질 하한) 그 목록의 편집이 매니페스트에 남지 않던 구멍을 막는다. 파일이 사라진 것도
  위반이다(MISSING) — registry 부재는 그것을 읽는 게이트를 통째로 무력화한다.
*/
const GATE_REGISTRIES = [
  // 이 census 의 정의(스캔 루트·게이트 술어·상수 정규식·해시 대상·검사 판정)와 매니페스트 형식. 고치면 매니페스트를 함께 다시 쓴다.
  'scripts/harness-baseline-manifest.mjs',
  'scripts/harness-baseline-manifest-format.mjs',
  'scripts/reusable-layout.mjs',
  'scripts/reusable-layout-runtime.mjs',
  'scripts/reusable-single-module.mjs',
  // 실행 가능한 생성물 정책도 JSON 원장과 같은 전체 내용 hash 경계에 묶는다.
  'scripts/reusable-artifact-entrypoints-contract.mjs',
  'scripts/reusable-artifact-entrypoints-contract.test.mjs',
  'scripts/verify-reusable-artifact.mjs',
  // 위 생성물 정책이 받는 구성 이름(시작 구성 id·custom)은 이 모듈이 정한다(11단계 C8) — 정책과 같은 경계에 묶는다.
  'scripts/composition-profiles.mjs',
  'config/governance/reusable-harness-profile.json',
  'config/governance/authorization-policies.json',
  'config/governance/cross-domain-coupling-census.json',
  'config/governance/gates.json',
  'config/governance/input-contract-mirror-census.json',
  'config/governance/privacy-access-census.json',
  'config/governance/zdm-waivers.json',
  'config/security/false-positive-review.json',
];

/*
  훅 파일 자체의 무결성. git 은 워킹트리의 훅을 그대로 실행하므로 훅을 약화하는 편집은 그 편집된 훅이 자기 자신의 푸시를 승인한다.
  훅이 사라진 것도 위반이다 — git 은 훅 없이 조용히 동작하므로 '삭제' 가 가장 값싼 우회가 된다.
*/
const GATE_HOOKS = ['.githooks/pre-push', '.githooks/pre-commit'];

/*
  게이트 클래스 census 의 두 키 종류. 한 줄에 클래스 하나다. registry(gates.json 의 gateSets[].rules[].source)에 등록된 게이트는 매니페스트에
  다시 적지 않고, registry 밖의 게이트 소스(지원·규칙 정의 파일과 이름 패턴만으로 편입된 시험)만 스캔 루트를 값으로 적는다(2026-10-19 —
  그 전에는 172개를 한 줄에 적어 registry 와 같은 목록을 두 번 적었다). registry 에 등록됐는데 census 에 없는 게이트(파일 삭제·개명·스캔
  루트 밖 이동·게이트 술어 이탈)는 MISSING 으로 적는다 — 원본 매니페스트에는 이 키가 없고, 투영본은 원본 registry 를 그대로 두고 게이트를
  지우므로 이 키가 지운 등록 게이트를 기록한다. 등록 게이트를 지우고 registry 도 고치면 그 registry 의 해시가 바뀐다 — 어느 쪽이든
  diff 두 곳에 남는다.
*/
export const UNREGISTERED_CLASS_PREFIX = '__harness.unregistered.';
export const REGISTERED_ABSENT_PREFIX = '__harness.registered.';
const GATE_REGISTRY = 'config/governance/gates.json';

/*
  상수 선언 — 목록(Set/List/Collection/Map)뿐 아니라 경로·스캔 베이스 문자열·정규식(Pattern)과 숫자·boolean 도 본다. 스캔 루트를 빈 경로로
  바꾸거나 탐지 정규식을 무력하게 고치는 것도 같은 은폐이고, anti-vacuity 플로어·결합 census·부채 동결이 전부 숫자다(2026-09-01 —
  HANDLER_FLOOR 를 250 → 1 로 낮춰도 통과하던 구멍). 타입은 패키지 수식(java.util.Set<String>)을 허용한다(완전수식 선언 우회 차단).
*/
const CONST_DECLARATION = /static\s+final\s+(?:[A-Za-z_$][\w$]*\s*\.\s*)*(?:String|Set|List|Collection|Map|Pattern|int|long|short|byte|double|float|boolean|char)\s*(?:<[^=;]*>)?\s*(?:\[\s*\])?\s+([A-Za-z_$][\w$]*)\s*=/g;
const STRING_LITERAL = /"(?:\\.|[^"\\])*"/g;

/** 문자·문자열 리터럴의 닫는 따옴표 위치. 재사용 투영의 Java 단계도 이 경계를 쓴다. */
export function skipJavaLiteral(source, open, quote) {
  for (let index = open + 1; index < source.length; index += 1) {
    if (source[index] === '\\') index += 1;
    else if (source[index] === quote) return index;
  }
  return source.length - 1;
}

/**
 * 주석만 제거하고 문자열 리터럴은 보존한다. 단순 정규식 치환은 "http://…" 같은 리터럴을 주석으로 오인해 목록 내용을 훼손하므로
 * 상태 기계로 처리한다. 블록 주석은 공백 한 칸으로 바꾼다 — 지워 버리면 앞뒤 토큰이 붙어 없던 식별자가 생긴다. 상수 해시와
 * __sourceHash 가 이 결과를 해시하므로 바꾸면 매니페스트가 함께 바뀐다.
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

/** 문자열 리터럴 밖·괄호 depth 0 인 첫 `;` 위치(없으면 -1). */
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

/**
 * 게이트 소스인가. 태그는 문자열 리터럴이므로 **리터럴은 보존한 채 주석만** 지우고 본다 — javadoc 에 태그 문자열을 인용한 지원 클래스가
 * 오탐 편입되는 것을 막는다(오탐 = 무관 파일의 상수 동결 = 소음). 주석 제거는 한 번만 하고 세 태그에 같이 쓴다.
 */
export function isJavaGateSource(file, source) {
  const normalized = normalize(file);
  if (normalized.includes('/harness/') || GATE_FILE_PATTERN.test(normalized)) return true;
  const code = stripJavaComments(source);
  return GATE_TAGS.some(tag => code.includes(tag));
}

function shortHash(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

/** `상수 → "<문자열 리터럴 수>:<정규화한 우변의 sha256 앞 12자리>"`. */
function extractHarnessConstants(code) {
  const result = new Map();
  for (const match of code.matchAll(CONST_DECLARATION)) {
    const end = findJavaStatementEnd(code, match.index + match[0].length);
    if (end < 0) continue;
    const rhs = code.slice(match.index + match[0].length, end);
    result.set(match[1], `${[...rhs.matchAll(STRING_LITERAL)].length}:${shortHash(rhs.replaceAll(/\s+/g, ' ').trim())}`);
  }
  return result;
}

/**
 * registry 에 등록된 게이트 클래스(`<모듈>/<단순명>`, source 의 첫 경로 조각과 파일 이름). registry 가 없으면 빈 집합이다 — 모든 게이트가
 * 미등록 키로 나오고 `__registry.config/governance/gates.json=MISSING` 이 함께 red 다. JSON 을 읽지 못하면 대조하지 않고 실패한다.
 */
export function registeredGateClasses(root) {
  const text = readTextIfPresent(path.join(root, ...GATE_REGISTRY.split('/')));
  const classes = new Set();
  if (text === undefined) return classes;
  let registry;
  try {
    registry = JSON.parse(text);
  } catch (error) {
    fail(`${GATE_REGISTRY} 를 JSON 으로 읽지 못했다 — 등록 판정 없이는 census 를 대조하지 않는다: ${error.message}`);
  }
  for (const gateSet of Array.isArray(registry?.gateSets) ? registry.gateSets : []) {
    for (const rule of Array.isArray(gateSet?.rules) ? gateSet.rules : []) {
      if (typeof rule?.source !== 'string') continue;
      const fileName = rule.source.slice(rule.source.lastIndexOf('/') + 1);
      classes.add(`${rule.source.split('/')[0]}/${fileName.endsWith('.java') ? fileName.slice(0, -'.java'.length) : fileName}`);
    }
  }
  return classes;
}

/**
 * 매니페스트에 적을 키와 값을 `root` 의 실제 소스에서 계산한다. `minimumGateSources` 는 게이트 소스 스캔 건수의 하한이다 — CLI 는
 * MINIMUM_GATE_SOURCES 를 넘기고, 작은 fixture 를 계산하는 시험과 생성기는 0 이다(생성물은 자기 메타 게이트가 CLI 로 다시 본다).
 */
export function computeHarnessBaselineEntries(root, { minimumGateSources = 0 } = {}) {
  const gateSources = new Map();
  for (const scanRoot of HARNESS_SCAN_ROOTS) {
    const dir = path.join(root, ...scanRoot.split('/'));
    // 스캔 루트 부재를 넘기면 조용한 skip 이고 false-green 이다.
    if (!fs.existsSync(dir)) fail(`게이트 무결성 파손: 하네스 스캔 루트를 찾을 수 없다 — ${scanRoot}`);
    const module = scanRoot.split('/')[0];
    for (const file of walk(dir, candidate => candidate.endsWith('.java'))) {
      const source = fs.readFileSync(file, 'utf8');
      if (!isJavaGateSource(file, source)) continue;
      const className = `${module}/${path.basename(file, '.java')}`;
      // 키가 `모듈/단순명` 이라 같은 이름의 게이트가 두 루트에 있으면 뒤가 앞을 덮어써 한쪽의 동결이 조용히 사라진다.
      if (gateSources.has(className)) {
        fail(`게이트 클래스명 충돌: ${className} — ${normalize(path.relative(root, gateSources.get(className).file))}`
          + ` 와 ${normalize(path.relative(root, file))} 가 같은 동결 키를 갖는다(한쪽의 동결이 사라진다).`);
      }
      gateSources.set(className, { file, source, scanRoot });
    }
  }
  if (gateSources.size < minimumGateSources) {
    fail(`게이트 무결성 파손: 게이트 소스 스캔 건수(${gateSources.size})가 하한(${minimumGateSources}) 미만이다 — 경로·클래스 삭제를 의심한다(${root}).`);
  }

  const entries = new Map();
  for (const [className, { file, source }] of gateSources) {
    const code = stripJavaComments(source);
    for (const [name, value] of extractHarnessConstants(code)) entries.set(`${className}.${name}`, value);
    if (ARCH_RULE_FILE_PATTERN.test(path.basename(file))) entries.set(`${className}.__sourceHash`, shortHash(code.replaceAll('\r\n', '\n')));
  }
  const registered = registeredGateClasses(root);
  for (const [className, { scanRoot }] of gateSources) {
    if (!registered.has(className)) entries.set(`${UNREGISTERED_CLASS_PREFIX}${className}`, scanRoot);
  }
  for (const className of registered) {
    if (!gateSources.has(className)) entries.set(`${REGISTERED_ABSENT_PREFIX}${className}`, 'MISSING');
  }
  // 훅·registry 는 줄바꿈만 정규화하고(CRLF↔LF) 내용은 그대로 해시한다 — 주석 한 줄이 바뀌어도 드러나는 것이 목적이다.
  for (const [prefix, files] of [['__hooks.', GATE_HOOKS], ['__registry.', GATE_REGISTRIES]]) {
    for (const file of files) {
      const text = readTextIfPresent(path.join(root, ...file.split('/')));
      entries.set(`${prefix}${prefix === '__hooks.' ? path.basename(file) : file}`,
        text === undefined ? 'MISSING' : shortHash(text.replaceAll('\r\n', '\n')));
    }
  }
  return entries;
}

/**
 * 키 단위 차이. 게이트 클래스 키(registry 밖의 미등록 클래스·registry 에 있는데 census 에 없는 등록 클래스)는 한 줄에 클래스 하나라
 * 다른 키와 같은 방식으로 나누고, 보일 때만 클래스 이름으로 바꿔 말한다.
 */
export function diffHarnessBaseline(expected, actual) {
  const isClassKey = key => key.startsWith(UNREGISTERED_CLASS_PREFIX) || key.startsWith(REGISTERED_ABSENT_PREFIX);
  const keys = map => [...map.keys()].filter(key => !isClassKey(key));
  const classKeys = map => [...map.keys()].filter(isClassKey);
  const name = key => key.slice((key.startsWith(UNREGISTERED_CLASS_PREFIX) ? UNREGISTERED_CLASS_PREFIX : REGISTERED_ABSENT_PREFIX).length);
  return {
    changed: [...keys(expected), ...classKeys(expected)].filter(key => actual.has(key) && actual.get(key) !== expected.get(key)).sort()
      .map(key => ({ key, from: expected.get(key), to: actual.get(key) })),
    added: keys(actual).filter(key => !expected.has(key)).sort().map(key => ({ key, to: actual.get(key) })),
    removed: keys(expected).filter(key => !actual.has(key)).sort().map(key => ({ key, from: expected.get(key) })),
    classesAdded: classKeys(actual).filter(key => !expected.has(key) && key.startsWith(UNREGISTERED_CLASS_PREFIX)).map(name).sort(),
    classesRemoved: classKeys(expected).filter(key => !actual.has(key) && key.startsWith(UNREGISTERED_CLASS_PREFIX)).map(name).sort(),
    registeredAbsent: classKeys(actual).filter(key => !expected.has(key) && key.startsWith(REGISTERED_ABSENT_PREFIX)).map(name).sort(),
    registeredPresent: classKeys(expected).filter(key => !actual.has(key) && key.startsWith(REGISTERED_ABSENT_PREFIX)).map(name).sort(),
  };
}

export function formatHarnessBaselineDiff(diff) {
  const lines = [];
  for (const { key, from, to } of diff.changed) lines.push(`  변경 ${key}: ${from} → ${to}`);
  for (const { key, to } of diff.added) lines.push(`  신설 ${key}=${to}`);
  for (const { key, from } of diff.removed) lines.push(`  소멸 ${key} (매니페스트 값 ${from})`);
  for (const name of diff.classesAdded) lines.push(`  클래스 신설 ${name} (gates.json registry 밖 — 등재하지 않으면 지워도 소멸로 잡히지 않는다)`);
  for (const name of diff.classesRemoved) lines.push(`  클래스 소멸 ${name} (registry 로 옮겼거나 지웠다)`);
  for (const name of diff.registeredAbsent) lines.push(`  등록 게이트 소멸 ${name} (gates.json 에 있으나 census 에 없다 — 삭제·개명·스캔 루트 밖 이동·게이트 술어 이탈)`);
  for (const name of diff.registeredPresent) lines.push(`  등록 게이트 복귀 ${name} (매니페스트가 부재로 적었다)`);
  return lines.join('\n');
}

const USAGE = '사용법: node scripts/harness-baseline-manifest.mjs --check | --write | --keys <키…>';

/** CLI 본체. 반환값이 종료 코드다. 시험은 `compute`·`log`·`error` 를 바꿔 넘긴다. */
export function main(argv, { root = repoRoot, compute = computeHarnessBaselineEntries, log = console.log, error = console.error } = {}) {
  const modes = ['--check', '--write', '--keys'].filter(mode => argv.includes(mode));
  if (modes.length !== 1) { error(USAGE); return 2; }
  const manifestFile = path.join(root, ...MANIFEST_PATH.split('/'));
  const text = readTextIfPresent(manifestFile);
  const actual = compute(root, { minimumGateSources: MINIMUM_GATE_SOURCES });

  if (modes[0] === '--keys') {
    const keys = argv.slice(argv.indexOf('--keys') + 1).filter(arg => !arg.startsWith('--'));
    if (!keys.length) { error(USAGE); return 2; }
    log(`# 계산값(${MANIFEST_PATH}). 충돌한 키의 값만 옮기고, 그 입력 변경이 양쪽 모두 정당한지 확인한다(§6.4·H2).`);
    for (const key of keys) {
      log(actual.has(key) ? `${key}=${actual.get(key)}` : `# ${key}: 계산에 없는 키다 — 매니페스트에서 지운다`);
    }
    return 0;
  }

  if (text !== undefined && hasConflictMarkers(text)) {
    error(`${MANIFEST_PATH} 에 충돌 표기가 남아 있다. 통째로 다시 쓰지 않는다 — --keys <충돌한 키…> 로 그 값만 옮긴다(§6.4).`);
    return 1;
  }
  const expected = text === undefined ? new Map() : parseManifest(text);
  if (modes[0] === '--check' && expected.size === 0) {
    error(`${MANIFEST_PATH} 가 없거나 비어 있다 — 대조할 기준선이 없다. --write 로 쓰고 바뀐 키가 모두 정당한지 확인한다.`);
    return 1;
  }
  const diff = diffHarnessBaseline(expected, actual);
  const report = formatHarnessBaselineDiff(diff);
  if (modes[0] === '--check') {
    if (!report) { log(`${MANIFEST_PATH} 는 계산값과 같다(${actual.size}개 키).`); return 0; }
    error(`${MANIFEST_PATH} 가 계산값과 다르다. 정당한 변경이면 --write 로 다시 쓰고 사유를 커밋에 남긴다 — 목록을 고쳐 red 를 지우는 것은 수정이 아니라 은폐다(H2).\n${report}`);
    return 1;
  }
  const rendered = renderHarnessBaselineManifest(actual, manifestHeader(text));
  if (text !== undefined && text.replaceAll('\r\n', '\n') === rendered) {
    log(`${MANIFEST_PATH} 는 이미 계산값과 같다 — 쓰지 않았다.`);
    return 0;
  }
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, rendered, 'utf8');
  log(`${MANIFEST_PATH} 를 다시 썼다(${actual.size}개 키). 바뀐 키가 모두 정당한지 diff 로 확인한다.${report ? `\n${report}` : ''}`);
  return 0;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (failure) {
    console.error(failure.message);
    process.exitCode = 1;
  }
}
