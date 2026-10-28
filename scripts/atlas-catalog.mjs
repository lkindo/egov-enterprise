import fs from 'node:fs';
import path from 'node:path';
import { CURRENT_DECISION_INDEX, DECISION_ARCHIVE, DECISION_AREA_INDEXES, GAP_DETAIL, GAP_INDEX, HISTORICAL_DECISION_INDEX } from './decision-indexes.mjs';
import { parseWorkflowJobs } from './required-checks-contract.mjs';
import { BACKEND_LAYOUTS } from './reusable-layout.mjs';

const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const normalize = text => text.replace(/\r\n?/g, '\n');
const asText = value => typeof value === 'string' ? value : JSON.stringify(value);
const detail = (label, value) => ({ label, value: asText(value ?? '미확인') });
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']);
const excerpt = (text, max = 400) => text.length > max ? `${text.slice(0, max)}… [상세 원문 확인]` : text;
// 의존성 버전과 액션 커밋 핀은 싣지 않고 이름만 싣는다. 값의 정본은 선언 파일(package.json·lockfile·build.gradle·버전 카탈로그·
// 워크플로)이다. Atlas 가 값을 다시 적으면 Dependabot 범프마다 Atlas 재생성을 요구하는데, 봇 PR 은 재생성을 돌리지 못한다.
// `pnpm@9.15.0` → `pnpm`, `actions/checkout@<sha>` → `actions/checkout`.
const withoutVersion = reference => reference.replace(/(?<=.)@[^@/]*$/, '');
const CONSTITUTIONS = [
  ['backend', '백엔드', 'backend-api-constitution'],
  ['frontend', '프론트엔드', 'frontend-ux-constitution'],
  ['database', 'DB', 'db-standard-constitution'],
];

function requireValue(value, message) {
  if (!value) throw new Error(`Atlas catalog: ${message}`);
  return value;
}

function unique(records, label) {
  const ids = records.map(record => record.id);
  requireValue(ids.length === new Set(ids).size, `${label} duplicate ID`);
  return records;
}

function record(id, title, summary, status, source, extra = {}) {
  return { id, title, summary, status, source, ...extra };
}

/**
 * Only repository-owned, explicitly requested files are read; no environment or Git state.
 * 읽은 원본은 경로만 기록한다. 파일별 내용 해시를 싣지 않으므로, catalog 에 실리는 사실을 바꾸지 않는 소스 수정은
 * Atlas 재생성을 요구하지 않는다. 신선도는 생성물 계약(atlas-generation.test.mjs)이 다시 만든 HTML 과 바이트로 대조해 소유한다.
 */
function repositoryReader(repoRoot) {
  const root = path.resolve(repoRoot);
  const sources = new Map();
  const cache = new Map();
  function resolve(relative) {
    requireValue(typeof relative === 'string' && !path.isAbsolute(relative), 'source must be relative');
    const absolute = path.resolve(root, relative);
    requireValue(absolute.startsWith(`${root}${path.sep}`), 'source escapes repository');
    requireValue(!relative.split(/[\\/]/).some(part => /^\.env(?:\.|$)/i.test(part)), 'environment sources forbidden');
    return absolute;
  }
  function read(relative) {
    const canonical = relative.replace(/\\/g, '/');
    if (cache.has(canonical)) return cache.get(canonical);
    const text = normalize(fs.readFileSync(resolve(canonical), 'utf8'));
    cache.set(canonical, text);
    sources.set(canonical, { path: canonical });
    return text;
  }
  function files(relative, predicate = () => true) {
    const result = [];
    function walk(directory) {
      for (const entry of fs.readdirSync(resolve(directory), { withFileTypes: true }).sort((a, b) => compare(a.name, b.name))) {
        const next = `${directory}/${entry.name}`;
        if (entry.isSymbolicLink()) throw new Error(`Atlas catalog: symbolic source unsupported: ${next}`);
        if (entry.isDirectory()) walk(next);
        else if (predicate(next)) result.push(next);
      }
    }
    walk(relative);
    return result;
  }
  return { read, files, resolve, sources, json: relative => JSON.parse(read(relative)) };
}

function localLinks(text, source) {
  return [...text.matchAll(/\[([^\]\n]+)\]\(([^\s)]+)\)/g)].flatMap((match) => {
    const target = match[2];
    if (/^(?:https?:|mailto:)/i.test(target)) return [{ label: match[1], path: target }];
    const [file, anchor] = target.split('#');
    const resolved = file ? path.posix.normalize(path.posix.join(path.posix.dirname(source), file)) : source;
    if (resolved.startsWith('../') || resolved.startsWith('/')) return [];
    return [{ label: match[1], path: `${resolved}${anchor ? `#${anchor}` : ''}` }];
  });
}

/** Trace only explicit source references; a matching title never proves enforcement. */
export function classifyConstitutionEnforcement(body, source, registry) {
  const active = body.replace(/<!--[\s\S]*?-->/g, ' ').replace(/^\s*(```|~~~)[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, ' ');
  const tokens = [...active.matchAll(/`([^`\n]+)`/g)].map(match => match[1]);
  const links = localLinks(active, source);
  const paths = new Set(links.map(link => link.path.split('#')[0]));
  for (const token of tokens) if (/^[\w./-]+\.(?:java|test\.[cm]?[jt]sx?|spec\.ts)$/.test(token) && token.includes('/')) paths.add(token);
  const rules = registry.gateSets.flatMap(set => (set.rules ?? []).map(rule => ({ ...rule, set })));
  const mappings = [];
  for (const rule of rules) {
    const symbol = path.posix.basename(rule.source, '.java');
    const symbolUnique = rules.filter(candidate => path.posix.basename(candidate.source, '.java') === symbol).length === 1;
    const reference = paths.has(rule.source) ? rule.source
      : [...tokens, ...links.map(link => link.label)].find(token => token === rule.id
        || (symbolUnique && (token === symbol || token.startsWith(`${symbol}.`))));
    if (reference) mappings.push({ id: rule.id, source: rule.source, gateSet: rule.set.id, reference,
      evidenceKind: reference === rule.source ? 'explicit-source-path' : 'explicit-id-or-unique-symbol' });
  }
  for (const set of registry.gateSets.filter(item => !item.rules)) {
    for (const file of paths) {
      const selected = (set.selector.catalogs ?? []).some(catalog => {
        const relative = path.posix.relative(catalog.root, file);
        return relative && !relative.startsWith('../') && !path.posix.isAbsolute(relative)
          && (catalog.recursive || !relative.includes('/')) && catalog.suffixes.some(suffix => file.endsWith(suffix));
      });
      if (selected) mappings.push({ id: set.id, source: file, gateSet: set.id, reference: file, evidenceKind: 'explicit-source-path-in-runner-catalog' });
    }
  }
  return { status: mappings.length ? 'partial' : 'unverified', mappings,
    explanation: mappings.length
      ? '일부연결: 원문의 명시 참조와 registry 대응을 확인했습니다. 조항 전체의 의미 집행·실행 성공은 확인하지 않았으며 원문의 범위·예외와 설계 리뷰를 함께 확인해야 합니다.'
      : '미확인: 조항별 gate 대응은 별도 의미 검토 필요. 이름 유사성이나 다른 조항의 검사로 자동 연결하지 않습니다.' };
}

function tableRows(text, prefix) {
  return text.split('\n').filter(line => new RegExp(`^\\| ${prefix}`).test(line))
    .map(line => ({ raw: line, cells: line.replace(/^\|\s*|\s*\|$/g, '').split(/\s+\|\s+/).map(cell => cell.trim()) }));
}

function heading(text, fallback) {
  return text.match(/^#\s+(.+)$/m)?.[1] ?? text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? fallback;
}

function schemaReferences(value) {
  const refs = new Set();
  function visit(item) {
    if (!item || typeof item !== 'object') return;
    if (typeof item.$ref === 'string') refs.add(item.$ref);
    for (const child of Object.values(item)) visit(child);
  }
  visit(value);
  return [...refs].sort(compare);
}

function javaDeclarations(text) {
  // Only declaration references are used. Comments and literals are not evidence of a dependency.
  const code = text.replace(/"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ' ');
  return { code, packageName: code.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1],
    references: [...new Set(code.match(/(?<![\w$])nuri\.business\.(?:domain|service)\.[\w.]+/g) ?? [])] };
}

function lookupReference(index, reference) {
  let candidate = reference;
  while (candidate.includes('.')) {
    if (index.has(candidate)) return index.get(candidate);
    candidate = candidate.slice(0, candidate.lastIndexOf('.'));
  }
  return [];
}

function referencedTypes(index, declaration) {
  const explicit = declaration.references.flatMap(reference => lookupReference(index, reference));
  const wildcards = new Set([...declaration.code.matchAll(/^\s*import\s+([\w.]+)\.\*\s*;/gm)].map(match => match[1]));
  const body = declaration.code.replace(/^\s*import\s+[^;]+;/gm, '');
  const candidates = [...index.keys()].filter(fqcn => wildcards.has(fqcn.slice(0, fqcn.lastIndexOf('.'))));
  const matches = candidates.filter(fqcn => {
    const simple = fqcn.slice(fqcn.lastIndexOf('.') + 1);
    // An ambiguous wildcard name needs compiler resolution; do not guess a domain.
    return candidates.filter(other => other.endsWith(`.${simple}`)).length === 1
      && new RegExp(`\\b${simple}\\b`).test(body);
  });
  return [...explicit, ...matches.flatMap(fqcn => index.get(fqcn))];
}

function connectDomainDeclarations(io, domains) {
  const domainTypes = new Map();
  const linksByDomain = new Map(domains.map(domain => [domain.id, { services: new Set(), controllers: new Set() }]));
  for (const domain of domains) {
    for (const link of domain.links.filter(link => link.path.endsWith('.java'))) {
      const declaration = javaDeclarations(io.read(link.path));
      if (!declaration.packageName) continue;
      const fqcn = `${declaration.packageName}.${path.posix.basename(link.path, '.java')}`;
      domainTypes.set(fqcn, [...(domainTypes.get(fqcn) ?? []), domain]);
    }
  }
  const serviceTypes = new Map();
  for (const module of ['business-core', 'business-app']) {
    const serviceFiles = io.files(`${module}/src/main/java/nuri/business/service`, file => file.endsWith('.java'));
    for (const source of serviceFiles) {
      const declaration = javaDeclarations(io.read(source));
      if (!declaration.packageName || !/@Service\b|\b(?:class|interface)\s+\w*Service(?:Impl)?\b/.test(declaration.code)) continue;
      const matchedDomains = new Set(referencedTypes(domainTypes, declaration)
        .filter(domain => domain.module === module).map(domain => domain.id));
      if (matchedDomains.size === 0) continue;
      const aliases = new Set([`${declaration.packageName}.${path.posix.basename(source, '.java')}`]);
      const implementsClause = declaration.code.match(/\bclass\s+\w+[^{}]*?\bimplements\s+([^{}]+)/)?.[1] ?? '';
      for (const implemented of implementsClause.split(',')) {
        const name = implemented.trim().match(/^[\w.]+/)?.[0];
        if (!name) continue;
        const imported = declaration.references.find(reference => reference.endsWith(`.${name}`));
        aliases.add(name.includes('.') ? name : imported ?? `${declaration.packageName}.${name}`);
      }
      for (const domainId of matchedDomains) linksByDomain.get(domainId).services.add(source);
      for (const alias of aliases) serviceTypes.set(alias, [...(serviceTypes.get(alias) ?? []), ...matchedDomains]);
    }
  }
  for (const source of io.files('api-server/src/main/java/nuri/api/controller', file => file.endsWith('.java'))) {
    const declaration = javaDeclarations(io.read(source));
    if (!/@(?:RestController|Controller)\b/.test(declaration.code)) continue;
    for (const domainId of new Set(referencedTypes(serviceTypes, declaration))) {
      linksByDomain.get(domainId).controllers.add(source);
    }
  }
  for (const domain of domains) {
    const observed = linksByDomain.get(domain.id);
    domain.serviceSources = [...observed.services].sort(compare);
    domain.controllerSources = [...observed.controllers].sort(compare);
    domain.details.push(detail('Service 정적 선언 참조', domain.serviceSources.length || '연결 미확인'),
      detail('Controller → Service 선언 참조', domain.controllerSources.length || '연결 미확인'),
      detail('연결 범위', '동일 모듈의 domain FQCN 또는 모호하지 않은 wildcard+타입명 → Service → Controller 선언. 실제 호출·DI 선택·사용 가능 여부는 검증하지 않습니다.'),
      detail('화면 연결', '미확인: route/API 카탈로그와 실제 호출 경로 확인 필요'));
    domain.links.push(...domain.serviceSources.map(source => ({ label: `Service · ${path.posix.basename(source)}`, path: source })),
      ...domain.controllerSources.map(source => ({ label: `Controller · ${path.posix.basename(source)}`, path: source })));
  }
}

function declaredDocumentStatus(text, source) {
  if (source.startsWith('docs/archived/')) return 'historical';
  const declaration = text.match(/^(?:>\s*|-\s*)?(?:\*\*)?(?:상태|Status)(?:\*\*)?\s*[:：]\s*(.+)$/im);
  return declaration ? declaration[1].replace(/\*\*/g, '').trim() : 'source-document';
}

/** Static YAML excerpts, deliberately not a permissions evaluator or a workflow interpreter. */
function yamlSection(text, key, indentation = 0) {
  const lines = text.split('\n');
  const regex = new RegExp(`^ {${indentation}}${key}:\\s*(.*)$`);
  const start = lines.findIndex(line => regex.test(line));
  if (start < 0) return null;
  const output = [lines[start]];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && !line.trimStart().startsWith('#') && line.search(/\S/) <= indentation) break;
    if (line.trim() && !line.trimStart().startsWith('#')) output.push(line);
  }
  return output.join('\n');
}

export function parseAtlasWorkflow(text, source, required = []) {
  const normalized = normalize(text);
  const jobs = [...parseWorkflowJobs(normalized)].map(([id, body]) => {
    const permission = yamlSection(body, 'permissions', 4);
    const stepNames = [...body.matchAll(/^\s+-\s+name:\s*(.+)$/gm)].map(match => match[1]);
    const actions = [...body.matchAll(/^\s+(?:-\s+)?uses:\s*([^\s#]+)/gm)].map(match => withoutVersion(match[1]));
    const writeIndicators = [
      ['image-push', /(?:^|\n)\s*(?:docker|podman)\s+(?:buildx\s+build[^\n]*--push|push)\b|push:\s*true/m],
      ['release-publication', /\bgh\s+release\s+(?:create|upload|edit)\b|softprops\/action-gh-release/],
      ['git-push', /\bgit\s+push\b/],
      ['dependency-submission', /dependency-graph\/snapshots|dependency-submission|dependency-graph:\s*generate-and-submit/],
      ['artifact-upload', /actions\/upload-artifact/],
      ['sarif-upload', /upload-sarif|upload:\s*true/],
    ].filter(([, pattern]) => pattern.test(body.replace(/^\s*#.*$/gm, ''))).map(([name]) => name);
    return { id, permissions: permission ?? '미선언: 상위 선언·플랫폼 기본값 확인 필요',
      condition: body.match(/^ {4}if:\s*(.+)$/m)?.[1] ?? '미선언',
      requiredContexts: required.filter(check => check.jobId === id
        || (Array.isArray(check.aggregate) ? check.aggregate : (check.aggregate ? [check.aggregate] : []))
          .some(source => source?.sourceJobId === id)).map(check => check.context),
      stepNames, actions, writeIndicators, status: 'static-declaration' };
  });
  return record(source, normalized.match(/^name:\s*(.+)$/m)?.[1] ?? path.posix.basename(source),
    '트리거·권한·job·발행 후보의 정적 선언. 실행 결과·유효 권한·쓰기 부재를 보증하지 않습니다.',
    jobs.length ? 'static-declaration' : 'unverified-parser', source, {
      triggers: yamlSection(normalized, '(?:on|[\'\"]on[\'\"])') ?? '미확인: 트리거 형식 직접 확인',
      permissions: yamlSection(normalized, 'permissions') ?? '미선언: 플랫폼 기본값 확인 필요', jobs,
      details: [detail('트리거 선언', yamlSection(normalized, '(?:on|[\'\"]on[\'\"])') ?? '미확인'),
        detail('최상위 권한 선언', yamlSection(normalized, 'permissions') ?? '미선언'),
        ...jobs.map(job => detail(`job ${job.id}`, job))],
    });
}

/** Generate an exhaustive, deterministic source catalog. No live-state or policy approval inference. */
export function buildAtlasCatalog(repoRoot) {
  const io = repositoryReader(repoRoot);
  const gateSource = 'config/governance/gates.json';
  const registry = io.json(gateSource);
  const requiredSource = '.github/required-checks.json';
  const required = io.json(requiredSource);
  // 재사용 시작 구성과 기능 선언은 매니페스트 v2(config/modules)다(11단계 C5 — v1 manifest 의 profile·pack 축을 걷었다).
  const profileSource = 'config/modules/presets.json';
  const presets = io.json(profileSource).presets;
  const moduleDirectory = 'config/modules';
  const coreModule = io.json(`${moduleDirectory}/core.json`);
  const featureModules = io.files(moduleDirectory, file => file.endsWith('.json')
    && !['_schema.json', 'core.json', 'presets.json'].includes(path.posix.basename(file))).map(file => ({ file, value: io.json(file) }));
  const routeSource = 'config/ui-route-capabilities.json';
  const routeInventory = io.json(routeSource);
  const operationSource = 'config/governance/operation-consumer-census.json';
  const operationInventory = io.json(operationSource);
  const openapi = io.json('api-docs.json');
  const rootPackage = io.json('package.json');
  const frontendPackage = io.json('frontend/package.json');
  const settings = io.read('settings.gradle');
  const includedModules = [...settings.matchAll(/^include\s+['"]([^'"]+)['"]/gm)].map(match => match[1]);
  requireValue(includedModules.length > 0, 'no Gradle modules');

  const moduleRecords = includedModules.map(name => {
    const source = `${name}/build.gradle`;
    const moduleBuild = io.read(source);
    const dependencies = [...moduleBuild.matchAll(/^\s*(?:api|implementation)\s+project\(['"]:([^'"]+)['"]\)/gm)].map(match => match[1]);
    return record(name, name, name === 'migration-tool' ? '온라인 앱과 분리된 선택형 오프라인 CLI' : 'Gradle 모듈·코드 의존 선언', 'source-defined', source,
      { dependencies, details: [detail('컴파일 의존', dependencies), detail('구성 원본', 'settings.gradle')], links: [{ label: '모듈 선언', path: 'settings.gradle' }] });
  });
  moduleRecords.push(record('frontend', 'frontend / Next.js', '백엔드와 별도 빌드되는 웹 애플리케이션', 'source-defined', 'frontend/package.json',
    { dependencies: [], details: [detail('도구체인', withoutVersion(frontendPackage.packageManager))] }));

  const domainRecords = ['business-core', 'business-app'].flatMap(module => {
    const root = `${module}/src/main/java/nuri/business/domain`;
    const javaFiles = io.files(root, file => file.endsWith('.java'));
    const groups = new Map();
    for (const file of javaFiles) {
      const tail = file.slice(root.length + 1);
      if (!tail.includes('/')) continue;
      const name = tail.split('/')[0];
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(file);
      io.read(file);
    }
    return [...groups].map(([name, files]) => {
      // 업무 앱 폴더는 같은 이름의 기능 선언이, 공통 모듈 폴더는 필수 기반(core.json 의 backend.modules)이 소유한다.
      const features = module === 'business-app'
        ? featureModules.filter(({ value }) => value.id === name).map(({ value }) => value.id)
        : (coreModule.backend?.modules ?? []).includes(module) ? ['core'] : [];
      return record(`${module}/${name}`, `${name} · ${module}`, '최상위 소스 폴더 인벤토리. 독립 업무 수·화면 완성·권한 확인을 의미하지 않습니다.',
        'source-inventory', `${root}/${name}`, { module, features, javaFileCount: files.length,
          details: [detail('기능 소유 선언', features), detail('Java 파일 수', files.length), detail('제품 의미·실제 역량', 'UNVERIFIED')],
          links: [{ label: '재사용 범위', path: moduleDirectory }, ...files.map(file => ({ label: path.posix.basename(file), path: file }))] });
    });
  });
  connectDomainDeclarations(io, domainRecords);

  const profileRecords = presets.map(value => record(value.id, value.label ?? value.id, value.description ?? '', 'declared-profile', profileSource,
    { domains: value.domains, details: [detail('포함 기능', value.domains.length ? value.domains : '공통 기반만')] }));
  const featureRecords = featureModules.map(({ file, value }) => record(value.id, value.label ?? value.id,
    '매니페스트 v2 의 기능 선언. 시작 구성은 이 기능들의 이름 붙은 목록입니다.', 'declared-feature', file,
    { details: [detail('테이블 소유', value.owns?.tables ?? []), detail('화면 소유', value.owns?.frontend ?? []),
      detail('권한 도메인', value.owns?.permissionDomains ?? [])] }));

  // 소스 생성 진입점. 검증 runner(gates.json 파생)와 다른 축이라 별도 카탈로그로 둔다 —
  // 게이트는 "red 로 증명되는 검사"이고 이 명령들은 "제품 소스를 만들어 내는 도구"다.
  // 명령 문자열은 package.json 선언에서 파생하며, 레이아웃 값은 BACKEND_LAYOUTS 가 정본이다.
  const generatorSource = 'package.json';
  const layouts = BACKEND_LAYOUTS.join(' | ');
  const GENERATOR_AXES = {
    'base:generate-source': ['재사용 base 소스', `--profile · --layout(${layouts})`,
      '시작 구성이 기능 단위로 파일을 제거하고(연쇄 포함) 레이아웃은 Gradle 구성만 바꾼다. 파일을 루트로 합치지 않는다.'],
    'base:generate-db': ['재사용 base DB 번들', `--profile · --layout(${layouts})`, '구성별 스키마·시드 번들. 레이아웃마다 만들며 내용은 같다.'],
    'base:verify': ['생성 + 기술 검증', `--profile · --layout(${layouts})`, 'CI가 시작 구성 × 레이아웃(PR 은 시작 구성마다 한 레이아웃, main 은 두 레이아웃)으로 실행하는 진입점이다.'],
    'project:catalog': ['선택 가능 도메인 조회', '(인자 없음)', '읽기 전용 조회다. 산출물을 만들지 않는다.'],
    'project:plan': ['생성 계획 산출', '선택 명세', '읽기 전용 계획이다. 산출물을 만들지 않는다.'],
    'project:create': ['도메인 선택형 프로젝트', '선택 명세', 'Foundation/Core에 선택한 업무 도메인을 더한 독립 소스를 만든다.'],
    'project:ui': ['선택 생성기 로컬 UI', 'loopback', '별도 loopback 서버를 띄운다. CLI와 같은 엔진을 쓴다.'],
    'migration:export': ['독립 이관 도구 산출물', '(인자 없음)', '온라인 앱과 분리된 offline CLI 산출물이다.'],
  };
  const generatorRecords = Object.entries(GENERATOR_AXES).map(([id, [produces, axes, note]]) => {
    const command = requireValue(rootPackage.scripts?.[id], `generator script missing: ${id}`);
    const script = requireValue(command.match(/\bscripts\/[\w.-]+\.mjs\b/)?.[0], `generator script path missing: ${id}`);
    io.read(script);
    return record(id, id, `${produces} · ${note} 생성 성공은 기술 검증도 기관 운영 승인도 아닙니다.`,
      'declared-generator', generatorSource,
      { details: [detail('실행 명령', command), detail('선택 축', axes), detail('산출물', produces),
        detail('기술 검증·기관 승인', 'UNVERIFIED — 각각 별도 절차')],
        links: [{ label: '구현', path: script }, { label: '재사용 생성 가이드', path: 'docs/03-guides/reusable-base-guide.md' },
          { label: '선택 생성기 가이드', path: 'docs/03-guides/project-composer-guide.md' }] });
  });

  const routeRecords = routeInventory.routes.map(route => {
    io.read(route.source);
    const capabilities = (route.capabilities ?? []).map(capability => Object.fromEntries(
      ['id', 'status', 'dataSource', 'actions', 'actorScope', 'visibleLabel', 'evidenceLevel', 'decisionSafe']
        .filter(key => key in capability).map(key => [key, capability[key]])));
    return record(route.route, route.route, '라우트 인벤토리. shell admission·페이지 존재와 실제 업무 인가·역량을 구별합니다.', route.status ?? 'unverified', route.source,
      { route: route.route, roles: route.roles, capabilities, shellAccess: route.shellAccess,
        profileOwners: route.profileOwners, menuExposure: route.menuExposure, routing: route.routing,
        details: [detail('역할', route.roles), detail('shell 진입', route.shellAccess), detail('업무 역량', capabilities),
          detail('메뉴 노출', route.menuExposure), detail('profile 소유', route.profileOwners), detail('라우팅', route.routing)],
        links: [{ label: '원장과 증거 상태', path: routeSource }] });
  });

  const operationExceptions = new Map(operationInventory.entries.map(entry => [entry.operationId, entry]));
  const operationRecords = Object.entries(openapi.paths).flatMap(([url, methods]) => Object.entries(methods)
    .filter(([method]) => HTTP_METHODS.has(method))
    .map(([method, operation]) => {
      requireValue(operation.operationId, `operationId missing: ${method} ${url}`);
      const exception = operationExceptions.get(operation.operationId);
      const schemas = { request: schemaReferences(operation.requestBody), response: schemaReferences(operation.responses) };
      return record(operation.operationId, `${method.toUpperCase()} ${url}`, excerpt(operation.summary ?? operation.description ?? operation.operationId, 240),
        exception?.category ?? 'documented-operation', 'api-docs.json', { method: method.toUpperCase(), path: url, tags: operation.tags ?? [],
          details: [detail('요청 schema', schemas.request.join(', ') || '없음 또는 inline: OpenAPI 확인'),
            detail('응답 schema', schemas.response.join(', ') || 'inline: OpenAPI 확인'),
            detail('파라미터', (operation.parameters ?? []).map(parameter => `${parameter.name} (${parameter.in}${parameter.required ? ', required' : ''})`).join(', ') || '없음'),
            ...(exception ? [detail('소비 분류 근거', excerpt(exception.note ?? '', 240))] : [])],
          ...(exception ? { links: [{ label: '소비 분류 원장', path: operationSource }] } : {}) });
    }));
  unique(operationRecords, 'operations');
  for (const exception of operationInventory.entries) requireValue(operationRecords.some(item => item.id === exception.operationId), `orphan operation classification ${exception.operationId}`);

  const constitutionRecords = CONSTITUTIONS.flatMap(([id, title, folder]) => {
    const source = `.agent/knowledge/${folder}/artifacts/constitution.md`;
    const text = io.read(source);
    const headings = [...text.matchAll(/^###\s+제(\d+)조\s*([^\n]*)$/gm)];
    requireValue(headings.length > 0, `no constitution articles: ${id}`);
    return headings.map((match, index) => {
      const body = text.slice(match.index + match[0].length, headings[index + 1]?.index ?? text.length).trim();
      const enforcement = classifyConstitutionEnforcement(body, source, registry);
      for (const mapping of enforcement.mappings) io.read(mapping.source);
      const enforcementLinks = enforcement.mappings.flatMap(mapping => [
        { label: `명시 대응 · ${mapping.id}`, path: mapping.source },
        { label: `runner registry · ${mapping.gateSet}`, path: gateSource },
      ]);
      return record(`${id}-${match[1]}`, `${title} 제${match[1]}조 ${match[2]}`, body.split('\n').find(line => line.trim()) ?? '', 'normative-source', source,
        { constitution: id, article: Number(match[1]), enforcement,
          details: [detail('조문 원문', body), detail('집행 대응 상태', enforcement.explanation),
            ...(enforcement.mappings.length ? [detail('명시 대응 근거', enforcement.mappings)] : [])],
          links: [...localLinks(body, source), ...enforcementLinks].filter((link, i, all) => all.findIndex(item => item.path === link.path && item.label === link.label) === i) });
    });
  });

  const gateRecords = registry.gateSets.flatMap(set => (set.rules ?? []).map(rule => {
    io.read(rule.source);
    return record(rule.id, rule.id, `${set.category} · ${path.posix.basename(rule.source)}`, 'registered-gate', rule.source,
      { category: set.category, gateSet: set.id, requiredContext: set.requiredCiContext,
        details: [detail('실행 명령', set.task), detail('실행 tier', set.tier), detail('required context', set.requiredCiContext),
          detail('selector', `${set.selector.type}: ${set.selector.annotation ?? ''} ${set.selector.value ?? ''}`),
          detail('검증 산출물', set.evidence), detail('의도적 위반 / red', set.redProof)],
        links: [{ label: '게이트 registry', path: gateSource }] });
  }));
  const runnerRecords = registry.gateSets.filter(set => !set.rules).map(set => record(set.id, set.id, `${set.category} 실행 범위`, 'registered-runner', gateSource,
    { details: [detail('실행 명령', set.task), detail('tier', set.tier), detail('선택·실행 결속', set.selector),
      detail('required context', set.requiredCiContext), detail('입력', set.inputs), detail('산출물', set.evidence), detail('의도적 위반 / red', set.redProof)] }));
  const executionRecords = registry.executionProfiles.map(item => record(item.id, item.id, item.command, 'registered-execution-profile', gateSource,
    { details: [detail('tier', item.tier), detail('실행 binding', item.bindings)] }));
  for (const set of registry.gateSets) {
    for (const binding of [...(set.selector.executionBindings ?? []), ...(set.selector.commandBindings ?? [])]) io.read(binding.source);
    if (set.selector.packageScript) io.read(set.selector.packageScript.source);
  }
  for (const profile of registry.executionProfiles) for (const binding of profile.bindings) io.read(binding.source);
  const requiredRecords = required.requiredChecks.map(check => record(check.context, check.context, '저장소의 병합 필수 상태 명세. 현재 원격 적용·해당 SHA의 성공 결과는 별도 증거입니다.', 'required-manifest', requiredSource,
    { details: [detail('job', check.jobId), detail('선행 job', check.needs), detail('집계 계약', check.aggregate ?? '직접 job'), detail('리뷰 정책', required.pullRequestPolicy)],
      links: [{ label: 'CI 실행 정의', path: required.workflow }] }));

  const workflowRecords = io.files('.github/workflows', file => /\.ya?ml$/.test(file))
    .map(source => parseAtlasWorkflow(io.read(source), source, source === required.workflow ? required.requiredChecks : []));
  const documentRecords = io.files('docs', file => /\.(?:md|html)$/i.test(file))
    .map(source => {
      const text = io.read(source);
      return record(source, heading(text, path.posix.basename(source)), '문서의 권위·상태·검토 시점은 원문 확인', declaredDocumentStatus(text, source), source);
    });

  const decisionSource = CURRENT_DECISION_INDEX;
  const decisionText = io.read(decisionSource);
  const decisionHistorySource = DECISION_ARCHIVE;
  const historyText = io.read(decisionHistorySource);
  const historyRows = tableRows(historyText, 'DEC-OPS-\\d{3} \\|');
  unique(historyRows.map(row => ({ id: row.cells[0] })), 'decision history');
  requireValue(historyRows.every(row => row.cells.length === 7), 'decision history requires seven columns');
  const historyHeadings = [...historyText.matchAll(/^## (DEC-OPS-\d{3})\s*$/gm)];
  for (const [index, heading] of historyHeadings.entries()) {
    const section = historyText.slice(heading.index + heading[0].length, historyHeadings[index + 1]?.index ?? historyText.length);
    const rows = tableRows(section, 'DEC-OPS-\\d{3} \\|');
    requireValue(rows.length === 1 && rows[0].cells[0] === heading[1],
      `${heading[1]} decision history section must contain its same-ID row`);
  }
  requireValue(historyHeadings.length === historyRows.length, 'decision history headings and rows differ');
  const decisionHistory = new Map(historyRows.map(row => [row.cells[0], row]));
  // Operational decisions are split between the auto-loaded current index (decisions that bind every change), the area
  // indexes read when their paths change (DEC-OPS-381) and a historical index (retired, fully superseded, one-off runs,
  // implementation records). Together they index every archived decision exactly once. Accepted ADRs sit in the current index
  // when they bind every change and at the top of an area index otherwise (DEC-OPS-385); an ID appears in one index only.
  const historicalIndexSource = HISTORICAL_DECISION_INDEX;
  const HISTORICAL_KINDS = new Set(['퇴역', '대체됨', '일회성 실행', '구현 기록']);
  const indexRowPrefix = '(?:ADR-\\d{4}|DEC-OPS-\\d{3}) \\|';
  const decisionIndexRows = [
    ...tableRows(decisionText, indexRowPrefix).map(row => ({ ...row, source: decisionSource, historical: false })),
    ...DECISION_AREA_INDEXES.flatMap(({ label, path: source }) =>
      tableRows(io.read(source), indexRowPrefix).map(row => ({ ...row, source, historical: false, area: label }))),
    ...tableRows(io.read(historicalIndexSource), indexRowPrefix).map(row => ({ ...row, source: historicalIndexSource, historical: true })),
  ];
  const indexedIds = decisionIndexRows.map(row => row.cells[0]);
  for (const id of new Set(indexedIds)) {
    requireValue(indexedIds.filter(other => other === id).length === 1,
      `${id} is indexed more than once across the decision indexes`);
  }
  const indexedDecisionIds = indexedIds.filter(id => id.startsWith('DEC-'));
  for (const id of decisionHistory.keys()) {
    requireValue(indexedDecisionIds.includes(id), `${id} archived decision is missing from every decision index`);
  }
  // The ADR registry owns each ADR's link (the memory row keeps only its summary). Its ID format and uniqueness belong to the
  // shared memory contract (acceptedAdrIds); here the registry only resolves the same-ID ADR file.
  const adrRegistrySource = 'docs/02-architecture/decisions/README.md';
  const adrRegistry = new Map(tableRows(io.read(adrRegistrySource), '\\[ADR-\\d{4}\\]\\(')
    .map(row => [row.cells[0].match(/^\[(ADR-\d{4})\]/)?.[1], row]).filter(([id]) => id));
  const decisionRecords = decisionIndexRows.map(({ raw, cells, source, historical, area }) => {
    const id = cells[0];
    let links = localLinks(raw, source);
    let fullCells = cells;
    let fullRaw = raw;
    // Index rows (ADR, current, area): ID | 상태 | 결정 | 시행일 | supersedes — a DEC ID is the archive anchor and an ADR ID is
    // the ADR registry key, so neither repeats its reason or source (DEC-OPS-381). Historical rows add 분류 | 근거 after them.
    const isDecision = id.startsWith('DEC-');
    if (historical) requireValue(isDecision, `${id} historical decision index accepts only operational decisions`);
    const columns = historical ? 7 : 5;
    requireValue(cells.length === columns,
      `${id} ${historical ? 'historical ' : ''}decision index row requires ${columns === 5 ? 'five' : 'seven'} columns`);
    if (historical) requireValue(HISTORICAL_KINDS.has(cells[5]), `${id} historical decision kind must be one of ${[...HISTORICAL_KINDS].join(', ')}`);
    const dateIndex = 3;
    const supersedesIndex = 4;
    if (!isDecision) {
      // references stay the index row's own text: the registry row only supplies the ADR link.
      const registered = requireValue(adrRegistry.get(id), `${id} is missing from the ADR registry`);
      links =[...localLinks(registered.cells[0], adrRegistrySource), ...links];
    }
    if (isDecision) {
      requireValue(links.every(link => link.path.split('#')[0] !== decisionHistorySource),
        `${id} must not link a decision history section; its ID is the archive anchor`);
      const historical = requireValue(decisionHistory.get(id), `${id} decision history section missing; its ID is the archive anchor`);
      requireValue([[1, 1], [5, 3], [6, 4]].every(([history, index]) => historical.cells[history] === cells[index]),
        `${id} decision history status/date/supersedes differs from index`);
      links = [{ label: '원문', path: `${decisionHistorySource}#${id.toLowerCase()}` }, ...links];
      fullCells = historical.cells;
      fullRaw = historical.raw;
      for (const link of localLinks(fullRaw, decisionHistorySource)) {
        if (!links.some(existing => existing.label === link.label && existing.path === link.path)) links.push(link);
      }
    }
    // Keep the memory row's stable ID/source. Only the registry's same-ID ADR is authoritative;
    // related decisions and similarly named documents must not supply approval or search content.
    const adrPaths = [...new Set(links.map(link => link.path.split('#')[0]).filter(source =>
      source.startsWith('docs/02-architecture/decisions/') && path.posix.basename(source).startsWith(`${id}-`)))];
    let adrTitle;
    let adrText = '';
    let adrStatus;
    if (id.startsWith('ADR-')) {
      requireValue(adrPaths.length === 1, `${id} must link exactly one same-ID ADR`);
      const text = io.read(adrPaths[0]);
      adrTitle = heading(text, '');
      requireValue(new RegExp(`^${id}(?:\\s|:|：|—|$)`).test(adrTitle), `${id} canonical ADR heading differs`);
      adrStatus = declaredDocumentStatus(text, adrPaths[0]);
      if (cells[1] === 'accepted' && /^Accepted\b/i.test(adrStatus)) adrText = text;
    }
    const searchCells = fullCells === cells ? cells : [...cells, ...fullCells];
    const referenceText = fullRaw === raw ? raw : `${raw}\n${fullRaw}`;
    return record(id, adrTitle || id, excerpt(cells[2] ?? ''), cells[1], source, {
      details: [detail('결정 원문', fullCells[2]), ...(isDecision ? [detail('이유', fullCells[3])] : []), detail('시행일', cells[dateIndex]),
        ...(area ? [detail('결정 영역', area)] : []),
        ...(adrTitle ? [detail('ADR 선언 상태', adrStatus)] : []), detail('대체 범위 원문', cells[supersedesIndex]),
        ...(historical ? [detail('역사 분류', cells[5]), detail('역사 분류 근거', cells[6])] : []),
        detail('효력 주의', '요약이며 원문이 우선합니다. 시행일·당시 수치는 역사 기록이고 accepted라도 일부 범위가 후속 결정으로 대체될 수 있습니다.')],
      supersedes: cells[supersedesIndex], references: [...new Set([...referenceText.matchAll(/\b(?:ADR-\d{4}|DEC-OPS-\d{3})\b/g)].map(match => match[0]).filter(id => id !== cells[0]))],
      links,
      searchText: [...searchCells, adrText].join('\n'),
    });
  });
  // [DEC-OPS-389] 역방향 대체 표시: 뒤 결정의 supersedes 칸이 이 결정을 인용하면 그 ID 를 보인다. 색인 행은 당시 기록 그대로라
  // 고치지 않고(소급 편집 금지) Atlas 가 계산해 보인다. '재확인' 같은 맥락 인용도 섞일 수 있어 대체 범위는 인용한 결정에서 확인한다.
  const citedBy = new Map();
  for (const { id, supersedes } of decisionRecords) {
    for (const cited of new Set(String(supersedes ?? '').match(/\b(?:ADR-\d{4}|DEC-OPS-\d{3})\b/g) ?? [])) {
      if (cited !== id) citedBy.set(cited, [...(citedBy.get(cited) ?? []), id]);
    }
  }
  for (const item of decisionRecords) {
    const later = citedBy.get(item.id);
    if (later) {
      item.supersededBy = [...later].sort(compare);
      item.details.push(detail('뒤 결정의 대체 범위에 인용', `${item.supersededBy.join(', ')} — 일부·전부 대체인지는 그 결정의 대체 범위 원문을 확인합니다.`));
    }
  }
  // 자동 로드 표에 남은 행과 영역 상세로 옮긴 행(DEC-OPS-389)의 전문(9열)만 싣는다 — 레지스트리 줄(6열)은 상세 행의 요약이다.
  const gapRecords = [GAP_INDEX, GAP_DETAIL].flatMap(gapSource => tableRows(io.read(gapSource), 'GAP-[A-Z]+-\\d{3} \\|')
    .filter(({ cells }) => cells.length === 9).map(({ raw, cells }) =>
      record(cells[0], `${cells[0]} · ${cells[3]}`, cells[4], cells[2], gapSource,
        { priority: cells[1], verifiedAt: cells.at(-1), details: [detail('다음 행동 / 재개 조건', cells[6]), detail('결정권자', cells[7]), detail('기록된 검증일', cells.at(-1))], links: localLinks(raw, gapSource) })));
  const contextSource = '.agent/memory/project-context.md';
  const memoryRecords = tableRows(io.read(contextSource), 'CTX-\\d{3} \\|').map(({ raw, cells }) =>
    record(cells[0], cells[0], cells[1], 'derived-fact', contextSource,
      { verifiedAt: cells.at(-1), details: [detail('기록된 검증일', cells.at(-1))], links: localLinks(raw, contextSource) }));

  const migrationTests = io.files('migration-tool/src/test/java', file => file.endsWith('.java'));
  const migrationTestCount = migrationTests.reduce((count, file) => count + [...io.read(file).matchAll(/^\s*@(?:Test|ParameterizedTest|RepeatedTest|TestFactory|TestTemplate)\b/gm)].length, 0);
  const waivers = io.json('config/governance/zdm-waivers.json');
  const waiverMarkers = io.files('api-server/src/main/resources/db/migration', file => file.endsWith('.sql'))
    .map(file => [...io.read(file).matchAll(/linter:ignore/g)].length).filter(count => count > 0);
  const e2eMatrix = required.requiredChecks.find(check => check.context === 'e2e-test')?.aggregate?.sourceMatrix;
  requireValue(e2eMatrix?.key === 'shard' && Array.isArray(e2eMatrix.values) && e2eMatrix.values.length > 0, 'E2E shard matrix missing');
  const sharedPostgresClassCount = io.files('api-server/src/test/java/nuri/api/schema', file => file.endsWith('.java'))
    .filter(file => /class\s+\w+\s+extends\s+SharedPostgresMigrationTestSupport\b/.test(io.read(file))).length;
  const snapshotSource = io.read('scripts/dependency-snapshot-readiness.mjs');
  const snapshotWaitSeconds = Number(requireValue(snapshotSource.match(/env\.SNAPSHOT_WAIT_SECONDS\s*\?\?\s*['"](\d+)['"]/)?.[1], 'snapshot wait default missing'));
  const facts = {
    governanceCount: gateRecords.filter(item => item.category === 'governance').length,
    architectureCount: gateRecords.filter(item => item.category === 'architecture').length,
    schemaCount: gateRecords.filter(item => item.category === 'database').length,
    runnerCount: runnerRecords.length, requiredCount: requiredRecords.length, profileCount: profileRecords.length,
    routeCount: routeRecords.length, documentCount: documentRecords.length, clauseCount: constitutionRecords.length,
    gateCount: gateRecords.length, migrationTestCount,
    e2eShardCount: e2eMatrix.values.length, sharedPostgresClassCount,
    snapshotWaitSeconds,
    migrationTestFileCount: migrationTests.filter(file => /Test\.java$/.test(file)).length,
    waiverCount: waiverMarkers.reduce((total, count) => total + count, 0), waiverFileCount: waiverMarkers.length,
    structuredWaiverCount: waivers.waivers.length, structuredWaiverFileCount: new Set(waivers.waivers.map(item => item.path)).size,
    qualityPopulationCount: registry.qualityPopulations.length, qualityRatchetCount: registry.qualityRatchets.length,
    // 런타임·빌드 버전(Java·Spring Boot·Gradle·Node.js·pnpm·Next.js)은 사실로 싣지 않는다 — 화면은 선언 파일로 링크한다(withoutVersion).
  };
  requireValue(rootPackage.engines?.node, 'root Node engine missing');
  const catalogs = { modules: moduleRecords, domains: domainRecords, profiles: profileRecords, features: featureRecords, generators: generatorRecords, routes: routeRecords,
    operations: operationRecords, constitutions: constitutionRecords, gates: gateRecords, runners: runnerRecords,
    executionProfiles: executionRecords, requiredChecks: requiredRecords, workflows: workflowRecords, documents: documentRecords,
    decisions: decisionRecords, gaps: gapRecords, memory: memoryRecords };
  for (const [name, records] of Object.entries(catalogs)) {
    requireValue(records.length > 0, `${name} inventory empty`);
    unique(records, name);
    records.sort((a, b) => compare(a.id, b.id));
  }
  return { schemaVersion: 1, authority: 'derived-source-catalog', facts,
    sources: [...io.sources.values()].sort((a, b) => compare(a.path, b.path)), catalogs };
}
