/**
 * 운영 결정 색인의 경로와 경로 → 영역 색인 판정 — 정본 한 곳(DEC-OPS-381).
 *
 * 공용 결정 인덱스(.agent/memory/decisions.md)는 에이전트 진입점이 매 세션 읽고, 영역 결정 색인 넷은 대상 경로를 고칠 때만 읽으며,
 * 역사 색인은 지금의 작업을 제약하지 않는 결정을 둔다. 셋은 보관 원문의 DEC 를 정확히 한 번씩 나눠 가진다(Atlas 생성기가 검사).
 * Atlas·공용 메모리 계약·원장 재진술 검출·병합 도구·화면 용어 계약이 이 목록을 읽는다.
 *
 * 어느 영역 색인을 읽을지는 DECISION_AREA_ROUTES 가 정본이다. decisions.md 「영역 결정 색인」 표는 그 사람용 요약이고, 공용 메모리 계약이
 * 표의 경로 패턴이 이 원장과 같은지 대조한다. `node scripts/decision-indexes.mjs --for <경로…>` 와 `--diff <base>` 가 읽을 색인을 출력한다.
 * 대상 경로는 작업이 직접 고치는 입력 파일이다 — 생성물·공용 메모리·결정 색인은 그 입력 경로로 판정한다(NO_EXTRA_INDEX_PATHS).
 * 어느 원장에도 걸리지 않는 경로는 넷 모두를 읽는다(fail-closed). 그런 경로가 새 최상위 디렉터리에 생기면 공용 메모리 계약이 붉다.
 *
 * merge-main-regenerate.mjs 가 병합 중(다른 파일에 충돌 표기가 남아 있을 때) 읽으므로 정적 import 를 두지 않는다 — 명령줄 실행만
 * node 내장 모듈을 동적으로 불러온다.
 */
export const CURRENT_DECISION_INDEX = '.agent/memory/decisions.md';

export const DECISION_AREA_INDEXES = Object.freeze([
  { area: 'ci-governance', label: 'CI·검증·거버넌스', path: 'docs/04-operations/operational-decisions-index-ci-governance.md' },
  { area: 'composer', label: '프로젝트 생성기·재사용 투영', path: 'docs/04-operations/operational-decisions-index-composer.md' },
  { area: 'migration', label: '레거시 이관 도구', path: 'docs/04-operations/operational-decisions-index-migration.md' },
  { area: 'product', label: '제품 동작·화면·도메인', path: 'docs/04-operations/operational-decisions-index-product.md' },
].map(Object.freeze));

export const HISTORICAL_DECISION_INDEX = 'docs/archived/operational-decisions-index-historical.md';
export const DECISION_ARCHIVE = 'docs/archived/operational-decisions-history.md';

/** 지금의 작업을 제약하는 결정 색인(공용·영역). */
export const BINDING_DECISION_INDEXES = Object.freeze([CURRENT_DECISION_INDEX, ...DECISION_AREA_INDEXES.map(({ path }) => path)]);
/** 보관 원문의 DEC 를 나눠 갖는 모든 색인(공용·영역·역사). */
export const ALL_DECISION_INDEXES = Object.freeze([...BINDING_DECISION_INDEXES, HISTORICAL_DECISION_INDEX]);

/**
 * 자동 로드되는 gap 인덱스와, 특정 경로에만 걸리는 gap 행의 전문을 영역별 절로 둔 상세 파일(DEC-OPS-389). 상세 파일의 절 앵커는
 * 영역 키(`#ci-governance` 등)이고 영역 색인과 같은 경로 판정으로 읽는다.
 */
export const GAP_INDEX = '.agent/memory/known-gaps.md';
export const GAP_DETAIL = 'docs/04-operations/known-gaps-detail.md';

/*
 * 경로 → 영역 색인. `paths` 는 decisions.md 표에 그대로 보이는 경로 패턴, `documents` 는 표에 싣지 않는 문서 배정(이 원장과 명령이
 * 정본), `conditions` 는 경로로 가를 수 없어 사람이 판정하는 조건(표에 문장으로 둔다). 패턴: `**` 는 경로 구분자를 넘는 임의 문자열,
 * `*` 는 구분자 안의 임의 문자열이다. 한 경로가 여러 영역에 걸리면 모두 읽는다.
 */
export const DECISION_AREA_ROUTES = Object.freeze({
  'ci-governance': Object.freeze({
    paths: Object.freeze([
      '.github/**', '.githooks/**', '.zap/**', '.agent/scripts/**', '.agent/skills/**', '.agent/knowledge/**',
      '.agents/hooks.json', '.claude/settings.json', '.codex/hooks.json', '.gemini/settings.json',
      'AGENTS.md', 'CLAUDE.md', 'GEMINI.md', 'Makefile', 'start-dev.ps1',
      '.editorconfig', '.gitattributes', '.gitignore', '.gitleaks.toml', '.nvmrc', 'lombok.config',
      'config/governance/**', 'config/security/**', 'config/dependency-check/**', 'config/migration-test-duration-profile.json',
      'scripts/**', 'tools/agent-evaluation/**', 'api-server/src/test/**', 'api-server/src/main/resources/db/migration/**',
      'frontend/e2e/**', 'frontend/scripts/**', 'frontend/atlas/**', 'frontend/*.config.*', 'frontend/tsconfig*.json',
      'frontend/vitest.setup.ts', 'frontend/lighthouserc.json', 'frontend/.gitignore', 'frontend/.nvmrc', 'test/load-tests/**',
      'package.json', 'package-lock.json', 'frontend/package.json', 'frontend/pnpm-lock.yaml',
      'gradle/**', '**/*.gradle', 'gradle.properties', 'gradlew', 'gradlew.bat',
    ]),
    documents: Object.freeze([
      'docs/02-architecture/pitest-mutation-testing.md', 'docs/02-architecture/testing-process-redesign.md',
      'docs/02-architecture/zero-downtime-migration.md',
      'docs/03-guides/api-documentation-guide.md', 'docs/03-guides/cicd-pipeline.md', 'docs/03-guides/design-to-deliverables-guide.md',
      'docs/03-guides/e2e-test-guide.md', 'docs/03-guides/governance-atlas-guide.md', 'docs/03-guides/governance-review-lifecycle.md',
      'docs/03-guides/harness-improvement-pilot.md', 'docs/03-guides/non-e2e-verification-guide.md',
      'docs/03-guides/orchestration-protocol.md', 'docs/03-guides/testing-guide.md',
      'docs/04-operations/dependabot-alert-census.md', 'docs/04-operations/load-test-guide.md',
      'docs/04-operations/migration-release-log.md', 'docs/04-operations/sast-findings-review.md', 'docs/04-operations/secure-coding-weakness-baseline.md',
      'docs/04-operations/ui-quality-assisted-accessibility.md', 'docs/04-operations/ui-ux-baseline-protocol.md',
      'docs/04-operations/verification-blindspots.md',
    ]),
    conditions: Object.freeze([]),
  }),
  composer: Object.freeze({
    paths: Object.freeze([
      'config/modules/**', 'config/project-composer-menus.json', 'tools/project-composer/**', 'frontend/src/extensions/**',
      'scripts/project-composer*', 'scripts/composer-*', 'scripts/reusable-*', 'scripts/generate-reusable-base-*',
      'scripts/verify-reusable-*', 'scripts/slot-registry*', 'scripts/domain-deletion-*', 'scripts/frontend-reachability-census*',
    ]),
    documents: Object.freeze([
      'docs/02-architecture/project-composer-design.md', 'docs/03-guides/getting-started.md',
      'docs/03-guides/project-composer-guide.md', 'docs/03-guides/reusable-base-guide.md',
      'docs/04-operations/adopter-baseline-refreeze.md', 'docs/04-operations/project-safe-deletion-analysis.md',
    ]),
    conditions: Object.freeze([
      '기능 마커(`config/modules/*.json` 의 `markerBlocks`)가 가리키는 화면',
      '한 기능이 다른 기능의 코드를 새로 import 하는 변경',
    ]),
  }),
  migration: Object.freeze({
    paths: Object.freeze([
      'migration-tool/**', 'tools/migration-workspace/**', 'tools/migration-workspace-prototype/**', 'scripts/*migration*',
      'config/migration-test-duration-profile.json',
    ]),
    documents: Object.freeze([
      'docs/01-product/migration-workspace-design.md', 'docs/02-architecture/legacy-migration-tool-design.md',
      'docs/03-guides/legacy-non-data-migration-guide.md', 'docs/03-guides/migration-workspace-guide.md',
      'docs/04-operations/migration-recovery-runbook.md', 'docs/04-operations/standard-metadata-disposition.md',
    ]),
    conditions: Object.freeze([]),
  }),
  product: Object.freeze({
    paths: Object.freeze([
      'foundation/**', 'business-core/**', 'business-app/**', 'api-server/src/main/**', 'api-server/src/test/**', 'api-server/Dockerfile',
      'frontend/src/**', 'frontend/public/**', 'frontend/next.config.*', 'frontend/next-env.d.ts', 'frontend/components.json',
      'frontend/Dockerfile', 'frontend/.dockerignore', 'frontend/.env.example', 'frontend/README.md', 'frontend/AGENTS.md',
      'frontend/CLAUDE.md', '.agent/knowledge/**', 'lombok.config', 'db_columns.json',
      'config/governance/permission-catalog.json', 'config/governance/authorization-policies.json',
      'config/governance/permission-bundles.json', 'config/governance/privacy-access-census.json',
      'config/frontend-visible-terms.json', 'config/ui-*.json', 'config/ui-quality-baseline/**', 'config/krds-profile-mapping.json',
      'config/db/**', 'config/edge/**', 'config/observability/**', 'docker-compose*.yml', '.dockerignore', '.env.example', 'README.md',
    ]),
    documents: Object.freeze([
      'docs/01-product/README.md', 'docs/01-product/information-architecture.md', 'docs/01-product/ui-ux-modernization-brief.md',
      'docs/02-architecture/a-group-decision-recommendations.md', 'docs/02-architecture/approval-workflow-ux.md',
      'docs/02-architecture/authorization-simplification-design.md', 'docs/02-architecture/backend-architecture.md',
      'docs/02-architecture/board-management-expansion-design.md', 'docs/02-architecture/db-naming-exceptions.md',
      'docs/02-architecture/db-standardization-assessment.md', 'docs/02-architecture/domain-resilience.md',
      'docs/02-architecture/frontend-architecture.md', 'docs/02-architecture/frontend-design-system.md',
      'docs/02-architecture/jpa-performance-guardrail.md', 'docs/02-architecture/krds-profile-mapping.md',
      'docs/02-architecture/ui-ux-modernization-plan.md', 'docs/02-architecture/url-state-approval-overlay-design.md',
      'docs/02-architecture/user-reference-key-policy.md', 'docs/02-architecture/work-screen-grammar-catalog.md',
      'docs/02-architecture/zero-downtime-migration.md',
      'docs/03-guides/api-documentation-guide.md', 'docs/03-guides/content-operations-guide.md',
      'docs/03-guides/cross-cutting-conventions.md', 'docs/03-guides/db-standardization-manual.md', 'docs/03-guides/design-tokens.md',
      'docs/03-guides/frontend-content-style.md', 'docs/03-guides/frontend-form-validation-loop.md',
      'docs/03-guides/identity-model-guide.md', 'docs/03-guides/security-hardening-playbook.md',
      'docs/03-guides/ui-ux-task-flow-optimization.md',
      'docs/04-operations/authorization-cutover-runbook.md', 'docs/04-operations/backup-and-restore-runbook.md',
      'docs/04-operations/crypto-key-rotation.md', 'docs/04-operations/database-optimization-guide.md',
      'docs/04-operations/durable-work-recovery.md', 'docs/04-operations/log-retention-policy.md',
      'docs/04-operations/mfa-operations.md', 'docs/04-operations/migration-release-log.md', 'docs/04-operations/observability-baseline.md',
      'docs/04-operations/performance-optimization-guide.md', 'docs/04-operations/shared-oci-migration-apply-log.md',
      'docs/04-operations/sms-provider-operations.md', 'docs/04-operations/standard-metadata-disposition.md',
      'docs/04-operations/ui-quality-assisted-accessibility.md', 'docs/04-operations/ui-ux-baseline-protocol.md',
      'docs/04-operations/ui-ux-modernization-user-action-runbook.md', 'docs/04-operations/url-state-class-approval-evidence.md',
    ]),
    conditions: Object.freeze([]),
  }),
});

/**
 * 추가 색인 없음 — 다른 입력에서 나오거나 결정·위험을 기록하는 파일. 그 변경을 부른 입력 경로로 판정한다. 공용 메모리와 결정 색인을
 * 직접 고치는 규칙(기록 기준·행 상한·원장 재진술)은 자동 로드되는 AGENTS.md 와 decisions.md 운영 결정 표에 있다.
 */
export const NO_EXTRA_INDEX_PATHS = Object.freeze([
  '.agent/memory/**', GAP_DETAIL, 'docs/04-operations/operational-decisions-index-*.md', 'docs/archived/operational-decisions-*.md',
  'docs/02-architecture/decisions/README.md', 'docs/README.md',
  '.agents/skills/**', '.claude/skills/**', 'frontend/public/governance_harness_atlas.html', 'api-docs.json',
  'frontend/src/types/generated-**', 'frontend/src/extensions/generated-*', 'config/governance/generated-*',
  'config/ui-url-state-census.json', 'business-core/src/main/java/nuri/business/security/authorization/PermissionCodes.java',
  'business-core/src/main/resources/authorization/*.json',
]);

/** ADR 문서는 그 ADR 의 행을 가진 색인으로 판정한다(공용 인덱스의 ADR 은 추가 색인이 없다). 행이 없는 ADR 은 넷 모두다. */
export const ADR_DOCUMENT = /^docs\/02-architecture\/decisions\/(ADR-\d{4})-[^/]+\.md$/u;

/**
 * 어느 원장에도 걸리지 않는 추적 파일이 있는 최상위 디렉터리(파일은 그 이름). 넷 모두로 떨어지는 경로가 새 최상위에서 생기면
 * 공용 메모리 계약이 붉다 — 그 경로를 원장에 배정하거나, 넷 모두가 맞다는 판단과 함께 이 목록에 더한다.
 */
export const UNASSIGNED_TOP_LEVEL = Object.freeze(['docs']);

const globCache = new Map();
/** 경로 패턴을 정규식으로 — `**` 는 구분자를 넘고 `*` 는 넘지 않는다. */
export function globPattern(glob) {
  if (!globCache.has(glob)) {
    let source = '';
    for (let index = 0; index < glob.length; index += 1) {
      const char = glob[index];
      if (char === '*' && glob[index + 1] === '*') {
        const slash = glob[index + 2] === '/';
        source += slash ? '(?:.*/)?' : '.*';
        index += slash ? 2 : 1;
      } else if (char === '*') {
        source += '[^/]*';
      } else {
        source += char.replace(/[.+?^${}()|[\]\\]/gu, '\\$&');
      }
    }
    globCache.set(glob, new RegExp(`^${source}$`, 'u'));
  }
  return globCache.get(glob);
}

export const matchesGlob = (file, glob) => globPattern(glob).test(file);
const normalizePath = (file) => String(file).replace(/\\/gu, '/').replace(/^\.\//u, '');

/** 공용·영역 색인의 ADR 행에서 ADR → 'common' | 영역 키. read(path) 는 저장소 상대 경로의 원문을 돌려준다. */
export function adrHolders(read) {
  const holders = new Map();
  const collect = (text, holder) => {
    for (const match of text.matchAll(/^\| (ADR-\d{4}) \|/gmu)) holders.set(match[1], holder);
  };
  collect(read(CURRENT_DECISION_INDEX), 'common');
  for (const { area, path } of DECISION_AREA_INDEXES) collect(read(path), area);
  return holders;
}

/**
 * 한 경로의 판정: `derived`(추가 색인 없음), `common`(공용 인덱스로 충분 — 공용 인덱스에 행이 있는 ADR), `areas`(걸린 영역 키),
 * `unassigned`(넷 모두).
 */
export function decisionRoute(file, holders = new Map()) {
  const normalized = normalizePath(file);
  if (NO_EXTRA_INDEX_PATHS.some((glob) => matchesGlob(normalized, glob))) return Object.freeze({ kind: 'derived' });
  const adr = ADR_DOCUMENT.exec(normalized);
  if (adr) {
    const holder = holders.get(adr[1]);
    if (holder === 'common') return Object.freeze({ kind: 'common' });
    return holder ? Object.freeze({ kind: 'areas', areas: Object.freeze([holder]) }) : Object.freeze({ kind: 'unassigned' });
  }
  const areas = DECISION_AREA_INDEXES.map(({ area }) => area).filter((area) => {
    const { paths, documents } = DECISION_AREA_ROUTES[area];
    return paths.some((glob) => matchesGlob(normalized, glob)) || documents.includes(normalized);
  });
  return areas.length > 0 ? Object.freeze({ kind: 'areas', areas: Object.freeze(areas) }) : Object.freeze({ kind: 'unassigned' });
}

/** 어느 원장에도 걸리지 않는 경로의 최상위 이름(정렬). 공용 메모리 계약이 UNASSIGNED_TOP_LEVEL 과 대조한다. */
export function unassignedTopLevels(files, holders = new Map()) {
  return [...new Set(files.map(normalizePath).filter((file) => file && decisionRoute(file, holders).kind === 'unassigned')
    .map((file) => file.split('/')[0]))].sort();
}

/** 여러 경로의 읽기 계획. 하나라도 미배정이면 넷 모두다. */
export function decisionReadingPlan(files, holders = new Map()) {
  const routed = [...new Set(files.map(normalizePath))].filter(Boolean).sort().map((file) => ({ file, route: decisionRoute(file, holders) }));
  const unassigned = routed.filter(({ route }) => route.kind === 'unassigned').map(({ file }) => file);
  const all = unassigned.length > 0;
  const areas = DECISION_AREA_INDEXES.filter(({ area }) => all || routed.some(({ route }) => route.areas?.includes(area)))
    .map((index) => ({ ...index, gapDetail: `${GAP_DETAIL}#${index.area}`,
      files: routed.filter(({ route }) => route.areas?.includes(index.area)).map(({ file }) => file) }));
  return {
    all,
    areas,
    unassigned,
    derived: routed.filter(({ route }) => route.kind === 'derived').map(({ file }) => file),
    common: routed.filter(({ route }) => route.kind === 'common').map(({ file }) => file),
  };
}

function renderPlan(plan) {
  const lines = [];
  if (plan.all) lines.push(`넷 모두 읽는다 — 어느 원장에도 걸리지 않는 경로: ${plan.unassigned.join(', ')}`);
  lines.push(plan.areas.length ? `읽을 영역 결정 색인(${plan.areas.length}):` : '읽을 영역 결정 색인 없음 — 자동 로드되는 공용 인덱스로 충분하다.');
  for (const { label, path, gapDetail, files } of plan.areas) {
    lines.push(`- ${label}: ${path}`, `    gap 상세: ${gapDetail}`);
    if (files.length) lines.push(`    걸린 경로: ${files.join(', ')}`);
  }
  if (plan.derived.length) lines.push(`추가 색인 없음(입력 경로로 판정): ${plan.derived.join(', ')}`);
  if (plan.common.length) lines.push(`공용 인덱스의 ADR(추가 색인 없음): ${plan.common.join(', ')}`);
  const conditions = DECISION_AREA_INDEXES.flatMap(({ area, label }) => DECISION_AREA_ROUTES[area].conditions.map((text) => `${label} — ${text}`));
  if (conditions.length) lines.push('경로로 가를 수 없는 조건(직접 판정한다):', ...conditions.map((text) => `- ${text}`));
  return lines.join('\n');
}

async function main(argv) {
  const [{ execFileSync }, fs, path, { fileURLToPath }] = await Promise.all([
    import('node:child_process'), import('node:fs'), import('node:path'), import('node:url')]);
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const json = argv.includes('--json');
  const args = argv.filter((arg) => arg !== '--json');
  const git = (...gitArgs) => execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8' }).split(/\r?\n/u).filter(Boolean);
  let files;
  if (args[0] === '--for' && args.length > 1) {
    files = args.slice(1).map((file) => path.isAbsolute(file) ? path.relative(root, file) : file);
  } else if (args[0] === '--diff' && args.length === 2) {
    const base = git('merge-base', args[1], 'HEAD')[0];
    files = [...git('diff', '--name-only', base), ...git('ls-files', '--others', '--exclude-standard')];
  } else {
    process.stderr.write('사용법: node scripts/decision-indexes.mjs --for <경로…> | --diff <base> [--json]\n');
    process.exitCode = 2;
    return;
  }
  const plan = decisionReadingPlan(files, adrHolders((file) => fs.readFileSync(path.join(root, file), 'utf8')));
  process.stdout.write(`${json ? JSON.stringify(plan, null, 2) : renderPlan(plan)}\n`);
}

if (typeof process !== 'undefined' && /(?:^|[\\/])decision-indexes\.mjs$/u.test(process.argv?.[1] ?? '')) {
  await main(process.argv.slice(2));
}
