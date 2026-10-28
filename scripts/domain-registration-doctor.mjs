#!/usr/bin/env node
/**
 * 새 업무 기능의 등록 지점을 점검한다 — 읽기 전용(DEC-OPS-382).
 *
 * 새 기능 하나는 소스 밖에서도 여러 원장·생성물에 등록돼야 한다(cms 기능 f370d969c 는 127파일 가운데 수십 개가 등록·원장·
 * 생성물이었다). 빠진 등록은 push 뒤 게이트에서야 드러난다. 이 도구는 빠진 지점을 원장 경로와 함께 보이고, 지점마다
 * 누가 채우는지를 나눠 말한다.
 *
 *   사람 판정 — 검토 원장이다. 도구가 채우지 않는다(자동으로 채우면 검토 지점이 사라진다, H2·H3).
 *   생성기    — 원장에서 다시 만드는 생성물이다. 명령을 안내한다.
 *   선택 등재 — 의무가 아닌 원장이다(입력 계약 원장, PIT 범위). 등재 여부만 알린다.
 *
 * 파일을 쓰지 않는다. 판정은 evaluateRegistration(입력) 순수 함수이고, CLI 는 디스크에서 입력만 읽는다.
 *
 * 사용: node scripts/domain-registration-doctor.mjs <기능 id> [--json]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadComposerModules } from './composer-modules.mjs';
import { hasClassAnnotation } from './governance-gates-contract.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { apiSourceOwner, requiresClosure, sourceOwner, stripComments } from './project-composer-integrations.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION_DIR = 'api-server/src/main/resources/db/migration';
const CONTROLLER_PREFIX = 'api-server/src/main/java/nuri/api/controller/';
/** 매핑 애노테이션(그 뒤 애노테이션 줄 포함) 다음 줄의 public 메서드 이름. 선언은 한 줄 안에서만 찾는다. */
const MAPPED_HANDLER = /@(?:Get|Post|Put|Patch|Delete|Request)Mapping\b[^\n]*\n((?:[ \t]*@[^\n]*\n)*)[ \t]*public\s+[^(\n]*?\s(\w+)\s*\(/gu;
const HARNESS_DIR = 'api-server/src/test/java/nuri/api/harness';
/** ResponseContractLinterTest 의 생성형 이름 판정과 같은 동사들(ADR-0036). */
const CREATION_NAME = /^(?:create|insert|register|upload|send|signup|copy|submit)/u;
const SCHEMA_VALIDATION_GATESET = 'GATESET-SCHEMA-VALIDATION';

/** 새 schema-validation 시험의 규칙 id 제안 — 클래스 이름의 낱말을 대문자 kebab 으로 잇는다. 기존 id 와 겹치면 번호를 붙인다. */
export function proposeSchemaRuleId(className, existingIds) {
  const words = className.replace(/(?:Integration)?Test$/u, '').match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/gu) ?? ['SCHEMA'];
  const base = `DB-${words.join('-').toUpperCase()}`;
  let candidate = base;
  for (let suffix = 2; existingIds.has(candidate); suffix += 1) candidate = `${base}-${suffix}`;
  return candidate;
}

export const KINDS = Object.freeze({ HUMAN: '사람 판정', GENERATED: '생성기', OPTIONAL: '선택 등재' });

/** 생성기가 다시 만드는 지점 — 판정하지 않고 명령만 안내한다. */
export const GENERATED_POINTS = Object.freeze([
  { id: 'regen', path: 'npm run regen', detail: '권한 생성물·화면 목록·URL census·슬롯·경계 census·생성 계약·Atlas 를 다시 만든다(검사만: npm run regen -- --check).' },
  { id: 'api-docs', path: 'api-docs.json', detail: '컨트롤러·DTO 를 바꿨으면 OpenApiDocumentationTest 정적 추출로 다시 만든다(무거운 실행, SOP §6.4).' },
  { id: 'operation-count', path: 'config/governance/operation-consumer-census.json', detail: 'node scripts/operation-consumer-census.mjs --json 의 operationCount 로 expected.operationCount 를 맞춘다.' },
]);

function readJson(root, path) {
  return JSON.parse(readFileSync(join(root, path), 'utf8'));
}

function listFiles(root, directory, predicate) {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return listFiles(root, relative, predicate);
    return predicate(entry.name) ? [relative] : [];
  });
}

/** 디스크에서 판정 입력을 읽는다. 없는 파일은 null 로 둔다. */
export function loadRegistrationInputs(featureId, root = ROOT) {
  const featurePath = `config/modules/${featureId}.json`;
  // 있는지 따로 확인하지 않고 바로 읽는다(확인과 읽기 사이 경합을 두지 않는다). 없으면 null 이다.
  let feature = null;
  try {
    feature = readJson(root, featurePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const migrations = Object.fromEntries(listFiles(root, MIGRATION_DIR, (name) => name.endsWith('.sql'))
    .map((path) => [path, readFileSync(join(root, path), 'utf8')]));
  // 기능의 컨트롤러는 생성기와 같은 소유 판정으로 고른다(sourceOwner — 지원 파일 선언 → 디렉터리 → 참조 패키지). 그 판정은 생성기
  // 카탈로그가 있어야 하므로, 카탈로그 적재가 실패하면 그 실패를 등록 지점으로 알리고 디렉터리 규칙(apiSourceOwner)으로만 고른다.
  let ownerOf;
  let catalogError = null;
  try {
    const catalog = loadProjectComposerCatalog(root);
    const supportOwners = new Map([...loadComposerModules(root).declarations.supportFiles()].flatMap(([domain, files]) => files.map((file) => [file, domain])));
    const owner = sourceOwner(supportOwners, catalog.capabilities.map((capability) => capability.id), requiresClosure(catalog.capabilities));
    ownerOf = (path, source) => owner(path, stripComments(source, { strings: false }));
  } catch (error) {
    catalogError = error.message;
    const featureIds = listFiles(root, 'config/modules', (name) => name.endsWith('.json') && !['_schema.json', 'presets.json'].includes(name))
      .map((path) => path.split('/').pop().replace(/\.json$/u, ''));
    ownerOf = (path) => apiSourceOwner(path, featureIds);
  }
  const controllers = Object.fromEntries(listFiles(root, CONTROLLER_PREFIX.slice(0, -1), (name) => name.endsWith('.java'))
    .map((path) => [path, readFileSync(join(root, path), 'utf8')])
    .filter(([path, source]) => ownerOf(path, source) === featureId));
  const dtoFiles = listFiles(root, `business-app/src/main/java/nuri/business/service/${featureId}/dto`, (name) => name.endsWith('.java'));
  // 엔티티 모집단 census 는 린터 소스의 기대 개수와 소스의 @Entity 파일 수·고유 @Table 이름 수를 견준다(같은 네 모듈의 생산 Java).
  const entitySources = ['foundation', 'business-core', 'business-app', 'api-server']
    .flatMap((module) => listFiles(root, `${module}/src/main/java`, (name) => name.endsWith('.java')))
    .map((path) => readFileSync(join(root, path), 'utf8'))
    .filter((source) => /^\s*@Entity\b/mu.test(source));
  const entityFileCount = entitySources.length;
  const entityTableCount = new Set(entitySources
    .map((source) => source.match(/@Table\s*\(\s*name\s*=\s*"([^"]+)"/u)?.[1]?.toLowerCase()).filter(Boolean)).size;
  // schema-validation 태그 시험은 게이트 원장에 손으로 등록한다(DEC-OPS-371 ②). 태그 판정은 거버넌스 계약과 같은 함수를 쓴다.
  const schemaGate = readJson(root, 'config/governance/gates.json').gateSets?.find((set) => set.id === SCHEMA_VALIDATION_GATESET);
  const selector = schemaGate?.selector ?? {};
  const schemaValidation = {
    rules: (schemaGate?.rules ?? []).map(({ id, source }) => ({ id, source })),
    tagged: (selector.roots ?? []).flatMap((directory) => listFiles(root, directory, (name) => name.endsWith('.java')))
      .filter((path) => hasClassAnnotation(readFileSync(join(root, path), 'utf8'), selector.annotation, selector.value,
        path.split('/').pop().replace(/\.java$/u, ''))),
  };
  return {
    featureId,
    featurePath,
    feature,
    presets: readJson(root, 'config/modules/presets.json'),
    migrations,
    controllers,
    dtoFiles,
    permissionCatalog: readJson(root, 'config/governance/permission-catalog.json'),
    authorizationPolicies: readJson(root, 'config/governance/authorization-policies.json'),
    permissionBundles: readJson(root, 'config/governance/permission-bundles.json'),
    routeLedger: readJson(root, 'config/ui-route-capabilities.json'),
    inputContractCensus: readJson(root, 'config/governance/input-contract-mirror-census.json'),
    ciWorkflow: readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8'),
    responseContractSource: readFileSync(join(root, `${HARNESS_DIR}/ResponseContractLinterTest.java`), 'utf8'),
    entityLinterSource: readFileSync(join(root, `${HARNESS_DIR}/EntityTableOwnershipLinterTest.java`), 'utf8'),
    entityFileCount,
    entityTableCount,
    schemaValidation,
    catalogError,
    // 재사용 생성물은 기대 개수를 하네스 프로필로 투영하므로 소스 상수와 견주지 않는다.
    projectedHarness: existsSync(join(root, 'config/governance/reusable-harness-profile.json')),
  };
}

const point = (kind, id, path, status, detail) => ({ kind, id, path, status, detail });

/** 등록 지점을 판정한다. status 는 ok·missing·review(사람이 볼 것)·info 다. */
export function evaluateRegistration(inputs) {
  const { featureId, featurePath, feature } = inputs;
  const points = [];
  if (!feature) {
    points.push(point(KINDS.HUMAN, 'feature-file', featurePath, 'missing', '기능 선언이 없다. 스캐폴더가 출력한 초안을 검토해 둔다(형식: config/modules/_schema.json).'));
    return { featureId, points };
  }
  points.push(point(KINDS.HUMAN, 'feature-file', featurePath, feature.id === featureId ? 'ok' : 'missing',
    feature.id === featureId ? '기능 선언이 있다.' : `기능 선언의 id(${feature.id})가 파일 이름과 다르다.`));

  const presetIds = (inputs.presets.presets ?? []).filter((preset) => (preset.domains ?? []).includes(featureId)).map((preset) => preset.id);
  points.push(point(KINDS.HUMAN, 'presets', 'config/modules/presets.json', presetIds.length > 0 ? 'ok' : 'review',
    presetIds.length > 0 ? `시작 구성 ${presetIds.join(', ')} 에 들어 있다.` : '어느 시작 구성에도 없다 — 직접 선택으로만 생성된다. 의도인지 확인한다.'));

  const tables = feature.owns?.tables ?? [];
  const migrationText = Object.values(inputs.migrations).join('\n').toLowerCase();
  for (const table of tables) {
    const created = new RegExp(`create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?${table.toLowerCase()}\\b`).test(migrationText);
    points.push(point(KINDS.HUMAN, `table:${table}`, MIGRATION_DIR, created ? 'ok' : 'missing',
      created ? `${table} 를 만드는 마이그레이션이 있다.` : `${table} 를 만드는 마이그레이션이 없다. 컬럼은 표준 용어를 조회해 확정한다(DB 헌법 제2·9조).`));
  }

  const permissions = inputs.permissionCatalog.permissions ?? [];
  const featureCodes = permissions.filter((permission) => (feature.owns?.permissionDomains ?? []).includes(permission.domain)).map((permission) => permission.code);
  for (const domain of feature.owns?.permissionDomains ?? []) {
    const count = permissions.filter((permission) => permission.domain === domain).length;
    points.push(point(KINDS.HUMAN, `permission-domain:${domain}`, 'config/governance/permission-catalog.json', count > 0 ? 'ok' : 'missing',
      count > 0 ? `권한 도메인 ${domain} 에 권한 ${count}개가 있다.` : `권한 도메인 ${domain} 에 권한이 없다. 권한 의미(owner-only 등)를 먼저 판정한다(H3).`));
  }
  const bundled = new Set([
    ...(inputs.permissionBundles.bundles ?? []).flatMap((bundle) => bundle.permissions ?? []),
    ...(inputs.permissionBundles.excluded ?? []).map((entry) => entry.code),
  ]);
  const unbundled = featureCodes.filter((code) => !bundled.has(code));
  if (featureCodes.length > 0) {
    points.push(point(KINDS.HUMAN, 'permission-bundles', 'config/governance/permission-bundles.json', unbundled.length === 0 ? 'ok' : 'missing',
      unbundled.length === 0 ? '기능 권한이 모두 묶음이나 제외 목록에 있다.' : `묶음·제외 목록에 없는 권한: ${unbundled.join(', ')}`));
  }

  // 소유 라우트는 경로 접두다(exactRoutes 에 든 것만 그 화면 하나) — 생성기 카탈로그와 같은 의미다.
  const exactRoutes = new Set(feature.owns?.exactRoutes ?? []);
  const covers = (prefix, route) => (exactRoutes.has(prefix) ? route === prefix : route === prefix || route.startsWith(`${prefix}/`));
  const pagePermissions = inputs.permissionCatalog.pagePermissions ?? {};
  const ledgerRoutes = (inputs.routeLedger.routes ?? []).map((route) => route.route);
  for (const prefix of feature.owns?.routes ?? []) {
    const screens = ledgerRoutes.filter((route) => covers(prefix, route));
    points.push(point(KINDS.HUMAN, `route-ledger:${prefix}`, 'config/ui-route-capabilities.json', screens.length > 0 ? 'ok' : 'missing',
      screens.length > 0 ? `${prefix} 아래 화면 ${screens.length}개가 라우트 원장에 있다.` : `${prefix} 아래 라우트 원장 행이 없다 — 화면(page.tsx)이 생기면 원장 행을 둔다.`));
    for (const route of screens) {
      const present = Object.hasOwn(pagePermissions, route);
      points.push(point(KINDS.HUMAN, `page-permission:${route}`, 'config/governance/permission-catalog.json', present ? 'ok' : 'missing',
        present ? `${route} 가 등재돼 있다.` : `${route}: 화면 진입 권한(pagePermissions)이 없다.`));
    }
  }
  // IA 처분 행은 판정하지 않고 처분 원장도 읽지 않는다 — 승인 전 처분 원장을 등록되지 않은 실행 코드가 읽는 일을 처분 계약이 막고,
  // 화면마다 행이 있는지는 그 계약이 이미 센다(같은 불변식을 두 번 보지 않는다).
  if ((feature.owns?.routes ?? []).length > 0) {
    points.push(point(KINDS.HUMAN, 'disposition', 'scripts/ui-navigation-disposition-contract.test.mjs', 'review',
      '새 화면은 IA 처분 원장에 행이 있어야 한다 — 빠지면 이 계약 시험이 붉다. 행은 owner PR 리뷰로 승인한다(ADR-0007).'));
  }

  const boundHandlers = new Set((inputs.authorizationPolicies.operationBindings ?? []).map((binding) => binding.handler));
  if (inputs.catalogError) {
    points.push(point(KINDS.HUMAN, 'composer-catalog', 'config/modules/', 'missing',
      `생성기 카탈로그를 적재하지 못했다 — ${inputs.catalogError.slice(0, 300)}. 컨트롤러 귀속은 디렉터리 규칙으로만 봤다.`));
  }
  if (Object.keys(inputs.controllers).length === 0 && !feature.backend?.frontendOnly) {
    points.push(point(KINDS.HUMAN, 'controllers', CONTROLLER_PREFIX, 'review',
      `이 기능에 귀속되는 컨트롤러가 없다 — 컨트롤러는 api-server 의 ${featureId} 디렉터리 아래에 둔다(생성기 소유 규칙). 의도한 구성인지 확인한다.`));
  }
  for (const [path, source] of Object.entries(inputs.controllers)) {
    // 바인딩 대상 handler 는 가드 SpEL 이 가리키는 것과 매핑 애노테이션이 붙은 메서드를 함께 센다 — 가드 표기가 달라도 놓치지 않는다.
    const declaredClass = `${source.match(/^\s*package\s+([\w.]+)\s*;/mu)?.[1]}.${path.split('/').pop().replace(/\.java$/u, '')}`;
    const handlers = [...new Set([
      ...[...source.matchAll(/@permissionPolicy\.allowed\(authentication, '([^']+)'\)/g)].map((match) => match[1]),
      ...[...source.matchAll(MAPPED_HANDLER)].map((match) => `${declaredClass}#${match[2]}`),
    ])];
    const unbound = handlers.filter((handler) => !boundHandlers.has(handler));
    points.push(point(KINDS.HUMAN, `operation-bindings:${path}`, 'config/governance/authorization-policies.json', unbound.length === 0 ? 'ok' : 'missing',
      unbound.length === 0 ? `${handlers.length}개 handler 가 모두 바인딩돼 있다.` : `바인딩이 없는 handler: ${unbound.map((handler) => handler.split('#')[1]).join(', ')} — 미등록은 요청 거부·린터 red 다.`));
  }

  // 생성 POST census(ADR-0036): 201 을 쓰거나 생성형 이름인 POST 는 CREATED_HANDLERS 나 200 유지 목록 어느 한쪽에 있어야 한다.
  for (const [path, source] of Object.entries(inputs.controllers)) {
    const posts = [...source.matchAll(/@PostMapping\b[^\n]*\n((?:[ \t]*@[^\n]*\n)*)[ \t]*public\s+[^(\n]*?\s(\w+)\s*\(/gu)]
      .filter((match) => CREATION_NAME.test(match[2]) || /HttpStatus\.CREATED/u.test(match[1])).map((match) => match[2]);
    if (posts.length === 0) continue;
    const key = path.startsWith(CONTROLLER_PREFIX) ? path.slice(CONTROLLER_PREFIX.length) : path;
    const unclassified = posts.filter((name) => !inputs.responseContractSource.includes(`"${key}#${name}"`));
    points.push(point(KINDS.HUMAN, `created-post-census:${path}`, `${HARNESS_DIR}/ResponseContractLinterTest.java`, unclassified.length === 0 ? 'ok' : 'missing',
      unclassified.length === 0 ? '생성 POST 가 모두 분류돼 있다.'
        : `분류되지 않은 POST: ${unclassified.join(', ')} — 새 식별자를 갖는 자원을 만들면 CREATED_HANDLERS, 행위형이면 CREATION_NAMED_KEEP_200 에 사유와 함께 둔다(ADR-0036).`));
  }
  if (tables.length > 0) {
    const constant = (name) => Number(inputs.entityLinterSource.match(new RegExp(`${name}\\s*=\\s*(\\d+)`, 'u'))?.[1]);
    const expected = { entities: constant('EXPECTED_ENTITY_COUNT'), tables: constant('EXPECTED_PHYSICAL_TABLE_COUNT') };
    const status = inputs.projectedHarness || !Number.isInteger(expected.entities) || !Number.isInteger(expected.tables) ? 'review'
      : expected.entities === inputs.entityFileCount && expected.tables === inputs.entityTableCount ? 'ok' : 'missing';
    points.push(point(KINDS.HUMAN, 'entity-census', `${HARNESS_DIR}/EntityTableOwnershipLinterTest.java`, status,
      status === 'ok' ? `엔티티 ${expected.entities}개·물리 테이블 ${expected.tables}개가 소스와 같다.`
        : status === 'missing' ? `소스는 엔티티 ${inputs.entityFileCount}개·물리 테이블 ${inputs.entityTableCount}개, 린터 기대는 ${expected.entities}개·${expected.tables}개다 — 물리 테이블 소유권을 재판정하고 엔티티·테이블·감사 형태 census 를 고친다.`
          : '엔티티 모집단·물리 테이블·감사 형태 census 를 재판정한다(재사용 생성물은 하네스 프로필의 수가 정본).'));
  }

  // 새 schema-validation 시험은 게이트 원장 등록이 빠지면 운영 계약(수 분)이나 하네스 단계에서야 붉다. 붙여 넣을 항목을 그대로 보인다.
  // 어느 기능 소유인지는 사람이 정한다 — 이 기능이 그 시험의 대상일 때만 이 기능 파일의 owns.gates 에 둔다.
  const schema = inputs.schemaValidation ?? { rules: [], tagged: [] };
  const registeredSchema = new Set(schema.rules.map(({ source }) => source));
  const ruleIds = new Set(schema.rules.map(({ id }) => id));
  const ownedGates = new Set((feature.owns?.gates ?? []).map((gate) => gate.file));
  for (const path of schema.tagged.filter((source) => !registeredSchema.has(source))) {
    const className = path.split('/').pop().replace(/\.java$/u, '');
    const id = proposeSchemaRuleId(className, ruleIds);
    ruleIds.add(id);
    const moduleEntry = ownedGates.has(path) ? '' : ` 이 기능(${featureId})의 시험이면 ${featurePath} 의 owns.gates 에 ${JSON.stringify({ file: path, alsoRequires: [] })} 를 둔다(다른 기능의 시험이면 그 기능 파일에).`;
    points.push(point(KINDS.HUMAN, `schema-gate:${className}`, 'config/governance/gates.json', 'missing',
      `@Tag("schema-validation") 시험이 게이트 원장에 없다 — ${SCHEMA_VALIDATION_GATESET} 의 rules 에 ${JSON.stringify({ id, source: path })} 를 둔다(id 는 제안이다).${moduleEntry} 그다음 npm run regen 으로 하네스 기준선·Atlas 를 다시 만든다.`));
  }

  const censusText = JSON.stringify(inputs.inputContractCensus);
  const dtoNames = inputs.dtoFiles.map((path) => path.split('/').pop().replace(/\.java$/, ''));
  const registeredDtos = dtoNames.filter((name) => censusText.includes(name));
  if (dtoNames.length > 0) {
    points.push(point(KINDS.OPTIONAL, 'input-contract', 'config/governance/input-contract-mirror-census.json', 'info',
      `요청 DTO ${dtoNames.length}개 가운데 ${registeredDtos.length}개가 입력 계약 원장에 있다. 새 쓰기 DTO 는 저장 경로를 확인한 뒤 등재한다(GAP-CONTRACT-001).`));
  }
  const pit = inputs.ciWorkflow.includes(`nuri.business.service.${featureId}.`);
  points.push(point(KINDS.OPTIONAL, 'pit-scope', '.github/workflows/ci.yml', 'info',
    pit ? 'PIT 범위에 들어 있다.' : 'PIT 범위에 없다. 핵심 서비스면 범위 추가를 검토한다(백엔드 헌법 제16조).'));

  for (const generated of GENERATED_POINTS) {
    points.push(point(KINDS.GENERATED, generated.id, generated.path, 'info', generated.detail));
  }
  points.push(point(KINDS.HUMAN, 'form-census', 'config/governance/frontend-form-validation-census.json', 'review',
    '화면에 폼이 있으면 pnpm -C frontend run check:form-validation 이 알려 주는 항목을 사람이 분류해 등재한다.'));
  return { featureId, points };
}

export function formatReport({ featureId, points }) {
  const lines = [`등록 점검: ${featureId}`];
  for (const kind of Object.values(KINDS)) {
    const group = points.filter((entry) => entry.kind === kind);
    if (group.length === 0) continue;
    lines.push('', `[${kind}]`);
    for (const entry of group) lines.push(`  ${entry.status.padEnd(7)} ${entry.id} — ${entry.detail} (${entry.path})`);
  }
  const missing = points.filter((entry) => entry.status === 'missing').length;
  lines.push('', missing === 0 ? '빠진 사람 판정 지점이 없다.' : `빠진 지점 ${missing}개.`);
  return lines.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [featureId, ...flags] = process.argv.slice(2);
  if (!featureId || !/^[a-z][a-z0-9-]*$/.test(featureId)) {
    console.error('사용: node scripts/domain-registration-doctor.mjs <기능 id> [--json]');
    process.exit(2);
  }
  const report = evaluateRegistration(loadRegistrationInputs(featureId));
  console.log(flags.includes('--json') ? JSON.stringify(report, null, 2) : formatReport(report));
  process.exitCode = report.points.some((entry) => entry.status === 'missing') ? 1 : 0;
}
