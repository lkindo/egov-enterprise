/**
 * 소스 투영의 하네스 단계 — 메타 게이트 actual 맵의 거울(기준선 매니페스트)과 투영본 하네스 프로필 census.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { findJavaStatementEnd, isJavaGateSource, planJavaRemoval, stripJavaComments } from './reusable-source-java.mjs';
import { MANIFEST_PATH, ROOT, fail, git, normalize, readTextIfPresent, trackedAndUntrackedFiles, walk } from './reusable-source-tree.mjs';

/**
 * 하네스 baseline 미러 상수 — 전부 메타 게이트({@code HarnessBaselineIntegrityTest})의 동명 선언과
 * **같은 값이어야 한다**. 어긋나면 투영본 매니페스트가 메타 게이트의 actual 과 달라져 산출물이
 * 통째로 red 가 된다(2026-09-12 실측: 신설 136 · 누락 54 · 소멸 54).
 */
const HARNESS_SCAN_ROOTS = [
  'api-server/src/test/java',
  'business-app/src/test/java',
  'business-core/src/test/java',
  'business-core/src/testFixtures/java',
  'foundation/src/test/java',
  'migration-tool/src/test/java',
];
const ARCH_RULE_FILE_PATTERN =
  /(?:WorkflowManifestLinterTest|FlywaySchemaOwnershipLinterTest|ReusableHarnessProfile|ControllerScanBaseLinterTest|EntityLombokSourceLinterTest|EntitySchemaConformanceLinterTest|EntityTableOwnershipLinterTest|HandlerReachesServiceLinterTest|PageableConstructionLinterTest|PkGenerationStandardLinterTest|ResponseContractLinterTest|SecurityAuthAnnotationLinterTest|ServiceReadOnlyTransactionalLinterTest|SchemaValidationIntegrationTest|WriteSmokeIntegrationTest|AuthorizationAdministrationIntegrationTest|AttachmentSourceRegistryLinterTest|CrossDomainCouplingLinterTest|InputContractMirrorLinterTest|PrivacyAccessCensusLinterTest|ArchTest|ArchitectureTest|IsolationTest|ArchitectureRules|ConventionRules|Archunit\w*)\.java$/;
const GATE_REGISTRIES = [
  'scripts/reusable-layout.mjs',
  'scripts/reusable-layout-runtime.mjs',
  'scripts/reusable-single-module.mjs',
  'scripts/reusable-artifact-entrypoints-contract.mjs',
  'scripts/reusable-artifact-entrypoints-contract.test.mjs',
  'scripts/verify-reusable-artifact.mjs',
  'config/governance/reusable-harness-profile.json',
  'config/governance/authorization-policies.json',
  'config/governance/cross-domain-coupling-census.json',
  'config/governance/gates.json',
  'config/governance/input-contract-mirror-census.json',
  'config/governance/privacy-access-census.json',
  'config/governance/zdm-waivers.json',
  'config/security/false-positive-review.json',
];
const GATE_HOOKS = ['.githooks/pre-push', '.githooks/pre-commit'];


function shortHash(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function extractHarnessConstants(source) {
  const code = stripJavaComments(source);
  /*
    ⚠ 이 정규식은 메타 게이트의 CONST_DECL 과 **한 글자도 어긋나면 안 된다**.
    DEC-OPS-027(2026-09-01)이 숫자·boolean 을 편입했는데(anti-vacuity 플로어·census·부채 동결이
    전부 숫자다) 이 생성기는 따라가지 않아, 투영본 매니페스트에 숫자 상수 키가 통째로 빠져 있었다
    — 메타 게이트가 '신설 감지' 로 red 가 된다. 동등성은 harness-baseline-mirror 계약이 강제한다.
  */
  const declaration = /static\s+final\s+(?:[A-Za-z_$][\w$]*\s*\.\s*)*(?:String|Set|List|Collection|Map|Pattern|int|long|short|byte|double|float|boolean|char)\s*(?:<[^=;]*>)?\s*(?:\[\s*\])?\s+([A-Za-z_$][\w$]*)\s*=/g;
  const result = new Map();
  for (const match of code.matchAll(declaration)) {
    const end = findJavaStatementEnd(code, match.index + match[0].length);
    if (end < 0) continue;
    const rhs = code.slice(match.index + match[0].length, end);
    const normalized = rhs.replaceAll(/\s+/g, ' ').trim();
    const literalCount = [...rhs.matchAll(/"(?:\\.|[^"\\])*"/g)].length;
    result.set(match[1], `${literalCount}:${shortHash(normalized)}`);
  }
  return result;
}

/**
 * 메타 게이트가 실행 시점에 만드는 {@code actual} 맵을 **그대로 재현**한다.
 *
 * <p>[왜 거울이어야 하는가] 투영본에서는 게이트가 일부 제거되므로 저장소에 커밋된 매니페스트를
 * 그대로 쓸 수 없어 생성기가 다시 쓴다. 그런데 그 계산이 메타 게이트와 조금이라도 어긋나면
 * **산출물이 통째로 red** 가 된다 — 2026-09-12 demo 투영본 실측에서 신설 136 · 누락 54 · 소멸 54.
 * 원인은 DEC-OPS-027 이 넓힌 census(ArchUnit 계층·게이트 태그·__sourceHash·__registry.*·
 * testFixtures·migration-tool·숫자 상수)를 이 생성기가 따라가지 않은 것이었다.
 *
 * <p>드리프트 재발은 {@code scripts/harness-baseline-mirror-contract.test.mjs} 가 막는다 —
 * **저장소 자신에 대해** 이 함수의 출력이 커밋된 매니페스트와 정확히 같아야 하며, 메타 게이트가
 * 바뀌면 그 계약이 main 에서 즉시 red 가 된다(산출물 생성 시점까지 기다리지 않는다).
 */
export function computeHarnessBaselineEntries(root) {
  const gateSources = new Map();
  for (const rel of HARNESS_SCAN_ROOTS) {
    const dir = join(root, ...rel.split('/'));
    // 메타 게이트는 스캔 루트 부재를 fail 로 본다(조용한 skip 은 false-green). 같은 판정을 쓴다.
    if (!existsSync(dir)) fail(`하네스 스캔 루트를 찾을 수 없다: ${rel}`);
    const module = rel.split('/')[0];
    for (const path of walk(dir, (candidate) => candidate.endsWith('.java'))) {
      const source = readFileSync(path, 'utf8');
      if (!isJavaGateSource(path, source)) continue;
      const className = `${module}/${basename(path, '.java')}`;
      /*
        메타 게이트도 이 생성기도 키를 `module/단순명` 으로 만든다 — 같은 이름의 게이트가 두 루트에
        있으면 **뒤가 앞을 덮어써** 한쪽의 동결이 조용히 사라진다. 통과시키지 않는다.
      */
      if (gateSources.has(className)) {
        fail(
          `게이트 클래스명 충돌: ${className} — ${normalize(relative(root, gateSources.get(className).path))}`
            + ` 와 ${normalize(relative(root, path))} 가 같은 동결 키를 갖는다(한쪽의 동결이 사라진다).`,
        );
      }
      gateSources.set(className, { path, source });
    }
  }

  const entries = new Map();
  const classes = [];
  for (const [className, { path, source }] of gateSources) {
    classes.push(className);
    const code = stripJavaComments(source);
    for (const [name, value] of extractHarnessConstants(source)) {
      entries.set(`${className}.${name}`, value);
    }
    // ArchUnit·표적 의미 게이트는 규칙이 상수 밖(메서드 본문)에 살아 소스 전체를 동결한다.
    if (ARCH_RULE_FILE_PATTERN.test(basename(path))) {
      entries.set(`${className}.__sourceHash`, shortHash(code.replaceAll('\r\n', '\n')));
    }
  }
  entries.set('__harness.classes', [...classes].sort().join(','));

  for (const hook of GATE_HOOKS) {
    const hookText = readTextIfPresent(join(root, ...hook.split('/')));
    entries.set(
      `__hooks.${basename(hook)}`,
      hookText === undefined ? 'MISSING' : shortHash(hookText.replaceAll('\r\n', '\n')),
    );
  }
  for (const registry of GATE_REGISTRIES) {
    const registryText = readTextIfPresent(join(root, ...registry.split('/')));
    entries.set(
      `__registry.${registry}`,
      registryText === undefined ? 'MISSING' : shortHash(registryText.replaceAll('\r\n', '\n')),
    );
  }
  return entries;
}

export function projectedWriteHandlerCounts(source) {
  const code = stripJavaComments(source);
  const skipLiteral = (open) => {
    if (code.startsWith('"""', open)) {
      const end = code.indexOf('"""', open + 3);
      if (end < 0) fail('Unclosed Java text block in handler census');
      return end + 2;
    }
    for (let i = open + 1; i < code.length; i++) {
      if (code[i] === '\\') i++;
      else if (code[i] === code[open]) return i;
    }
    fail('Unclosed Java literal in handler census');
  };
  const bodyAt = (from) => {
    let parentheses = 0;
    let open = -1;
    for (let i = from; i < code.length; i++) {
      if (code[i] === '"' || code[i] === "'") i = skipLiteral(i);
      else if (code[i] === '(') parentheses++;
      else if (code[i] === ')') parentheses--;
      else if (code[i] === '{' && parentheses === 0) { open = i; break; }
      else if (code[i] === ';' && parentheses === 0) break;
    }
    if (open < 0) fail('Cannot locate projected write handler body');
    let braces = 0;
    for (let i = open; i < code.length; i++) {
      if (code[i] === '"' || code[i] === "'") i = skipLiteral(i);
      else if (code[i] === '{') braces++;
      else if (code[i] === '}' && --braces === 0) return code.slice(open, i + 1);
    }
    fail('Unclosed projected write handler body');
  };
  let handlers = 0;
  let successful = 0;
  for (const match of code.matchAll(/@(?:Post|Put|Delete|Patch)Mapping(?![A-Za-z0-9_$])/g)) {
    handlers++;
    const body = bodyAt(match.index + match[0].length);
    let analyzed = body;
    const names = new Set([...body.replace(/"(?:\\.|[^"\\])*"/g, '""').matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map(row => row[1]));
    for (const name of names) {
      const declaration = new RegExp(`\\bprivate\\s+[^;{}()]*\\b${name.replaceAll('$', '\\$')}\\s*\\(`).exec(code);
      if (declaration) analyzed += `\n${bodyAt(declaration.index)}`;
    }
    if (/ResponseEntity\s*\.\s*(?:ok|created)\s*\(|ApiResponse\s*\.\s*success\s*\(|HttpStatus\s*\.\s*(?:OK|CREATED)\b/.test(analyzed)) successful++;
  }
  return { handlers, successful };
}

export function writeReusableHarnessProfile(output, sourceManifest) {
  const projected = JSON.parse(readFileSync(join(output, 'config/reusable-base-profiles.json'), 'utf8'));
  const profileName = projected.sourcePolicy.generatedProfile;
  const manifest = sourceManifest ?? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const profile = manifest.profiles[profileName];
  const javaFiles = trackedAndUntrackedFiles().filter(path => path.endsWith('.java')).map(path => join(ROOT, path));
  const plan = planJavaRemoval(ROOT, manifest, profile, javaFiles);
  const production = javaFiles.filter(path => /^(?:foundation|business-core|business-app|api-server)\/src\/main\/java\//.test(normalize(relative(ROOT, path))));
  const retained = [];
  const removed = [];
  const sources = new Map();
  for (const path of production) {
    const relativePath = normalize(relative(ROOT, path));
    const source = stripJavaComments(readFileSync(path, 'utf8'));
    const packageName = source.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1];
    if (!packageName) fail(`Projected source package missing: ${relativePath}`);
    const row = { path: relativePath, type: `${packageName}.${basename(path, '.java')}` };
    if (plan.removed.has(path)) removed.push({ ...row, reason: plan.removalReason.get(path) });
    else { retained.push(row); sources.set(relativePath, source); }
  }
  const actual = walk(output, path => path.endsWith('.java'))
    .map(path => normalize(relative(output, path)))
    .filter(path => /^(?:foundation|business-core|business-app|api-server)\/src\/main\/java\//.test(path)).sort();
  const expected = retained.map(row => row.path).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`Projected Java source inventory differs from independent removal plan: missing=${expected.filter(path => !actual.includes(path))}, unknown=${actual.filter(path => !expected.includes(path))}`);
  }
  const activeType = target => {
    if (target.startsWith('EXTERNAL#')) return true;
    const type = target.split('#')[0];
    const rows = [...retained, ...removed].filter(row => row.type === type || row.type.split('.').at(-1) === type);
    if (rows.length !== 1) fail(`Ambiguous/unregistered harness policy type: ${type}`);
    return sources.has(rows[0].path);
  };
  const authorization = JSON.parse(readFileSync(join(ROOT, 'config/governance/authorization-policies.json'), 'utf8'));
  const bindings = authorization.operationBindings.filter(row => activeType(row.handler));
  const endpoints = authorization.endpointPolicies.filter(row => activeType(row.handler));
  const entries = [...sources.entries()];
  const entities = entries.filter(([, source]) => /@Entity\b/.test(source));
  const restControllers = entries.filter(([, source]) => /@RestController(?![A-Za-z0-9_$])/.test(source));
  const countMatches = (rows, pattern) => rows.reduce((total, [, source]) => total + [...source.matchAll(pattern)].length, 0);
  const writes = restControllers.map(([, source]) => projectedWriteHandlerCounts(source));
  const writeHandlers = writes.reduce((sum, row) => sum + row.handlers, 0);
  const census = {
    requestControllers: entries.filter(([path, source]) => path.startsWith('api-server/') && /@(?:RestController|Controller)(?![A-Za-z0-9_$])/.test(source)).length,
    restControllers: restControllers.length,
    writeHandlers,
    successfulWriteHandlers: writes.reduce((sum, row) => sum + row.successful, 0),
    entities: entities.length,
    entityTables: new Set(entities.map(([, source]) => source.match(/@Table\s*\(\s*name\s*=\s*"([^"]+)"/)?.[1]
      ?? fail('Entity @Table(name) cannot be determined'))).size,
    schemaTables: projected.databaseSnapshot.physicalTableCountExcludingFlyway,
    migrations: walk(join(output, 'api-server/src/main/resources/db/migration'), path => path.endsWith('.sql')).length,
    booleanFlagColumns: [...readFileSync(join(output, 'api-server/src/main/resources/db/migration/V1_0__baseline.sql'), 'utf8')
      .matchAll(/^\s+[a-z][a-z0-9_]*_yn\s+[a-z]/gm)].length,
    responseHandlers: countMatches(entries.filter(([path]) => path.startsWith('api-server/src/main/java/nuri/api/controller/')),
      /@(?:Get|Post|Put|Patch|Delete|Request)Mapping\b[^\n]*\n(?:\s*@[^\n]*\n)*\s*public\s+([^\n{]+?)\s+(\w+)\s*\(/g),
    baseSearchBindings: countMatches(entries.filter(([path]) => path.startsWith('api-server/')),
      /@ModelAttribute(?:\s*\([^)]*\))?\s+(?:nuri\.business\.domain\.common\.)?BaseSearchDto\b/g),
    writeEndpoints: endpoints.length,
    readEndpoints: bindings.filter(row => !row.handler.startsWith('EXTERNAL#') && row.method === 'GET').length,
    operationBindings: bindings.length,
    operationEndpoints: bindings.filter(row => !row.handler.startsWith('EXTERNAL#')).length,
    serviceGuards: authorization.serviceGuardPolicies.filter(row => activeType(row.target)).length,
    manualGuards: authorization.manualGuardPolicies.filter(row => sources.has(row.source)).length,
    productionSources: retained.length,
  };
  for (const module of ['business-core', 'business-app']) census[`entities:${module}`] = entities.filter(([path]) => path.startsWith(`${module}/`)).length;
  const snapshot = { schemaVersion: 1, profile: profileName, packs: profile.packs,
    excludedDomains: plan.excludedDomains.sort(), sourceCommit: git(['rev-parse', 'HEAD']),
    profileManifestSha256: createHash('sha256').update(readFileSync(join(output, 'config/reusable-base-profiles.json'))).digest('hex'),
    census, retained: retained.sort((a, b) => a.path.localeCompare(b.path)), removed: removed.sort((a, b) => a.path.localeCompare(b.path)) };
  writeFileSync(join(output, 'config/governance/reusable-harness-profile.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return snapshot;
}

export function writeHarnessBaseline(output, sourceManifest) {
  writeReusableHarnessProfile(output, sourceManifest);
  const entries = computeHarnessBaselineEntries(output);
  const lines = [
    '# 자동 산출 — reusable-base source projection 기준.',
    '# 남은 게이트/동결 목록을 생성 시점에 고정한다.',
    ...[...entries.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`),
    '',
  ];
  writeFileSync(
    join(output, 'api-server', 'src', 'test', 'resources', 'harness', 'baseline-manifest.properties'),
    lines.join('\n'),
    'utf8',
  );
}

