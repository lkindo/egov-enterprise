import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { presetIds } from './composition-profiles.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULES_DIRECTORY = path.join(REPO_ROOT, 'config', 'modules');
const MODULE_DECLARATION_FILES = new Set(['_schema.json', 'core.json', 'presets.json']);
/** 재사용 생성기. 이것도 시작 구성 선언도 없는 트리는 재사용 생성 대상이 없는 독립 산출물이다(reusableProfileNames). */
const REUSABLE_GENERATOR = path.join(REPO_ROOT, 'scripts', 'generate-reusable-base-source.mjs');
const stringList = value => Array.isArray(value) && value.every(item => typeof item === 'string');

/**
 * 매니페스트 v2(config/modules)의 시작 구성과 기능 소유를 읽는다(11단계 C5). 이 파일은 의존성 설치 전 분류 단계와
 * 독립 이관 제품에서 다른 모듈 없이 돈다(migration-product-contract) — 카탈로그 로더를 import 하지 않고 JSON 만 읽는다.
 * 파일이 없거나(독립 export 는 시작 구성 선언을 싣지 않는다) 모양이 다르면 null 이고, 그러면 모든 시작 구성을 두 레이아웃으로
 * 고른다 — 소유 증거를 읽지 못했다고 검증을 건너뛰거나 독립 산출물을 쓸 수 없게 만들지 않는다.
 */
function loadComposerModules() {
  try {
    const presetsFile = JSON.parse(readFileSync(path.join(MODULES_DIRECTORY, 'presets.json'), 'utf8'));
    const features = new Map();
    for (const name of readdirSync(MODULES_DIRECTORY).filter(name => name.endsWith('.json') && !MODULE_DECLARATION_FILES.has(name)).sort()) {
      const value = JSON.parse(readFileSync(path.join(MODULES_DIRECTORY, name), 'utf8'));
      const shared = value?.owns?.frontendAny;
      if (`${value?.id}.json` !== name || !stringList(value.owns?.frontend) || !stringList(value.backend?.supportFiles)
        || !Array.isArray(shared) || !shared.every(rule => typeof rule?.path === 'string' && stringList(rule.with))) return null;
      features.set(value.id, { frontend: value.owns.frontend, frontendAny: shared, supportFiles: value.backend.supportFiles });
    }
    const presets = presetsFile?.presets;
    if (!Array.isArray(presets) || presets.length === 0 || new Set(presets.map(preset => preset?.id)).size !== presets.length
      || !presets.every(preset => typeof preset?.id === 'string' && stringList(preset.domains)
        && preset.domains.every(domain => features.has(domain)))) return null;
    return { presets, features };
  } catch {
    return null;
  }
}

const COMPOSER_MODULES = loadComposerModules();

/**
 * 재사용 생성 검증의 시작 구성 이름(11단계 C8 — 종전에는 이 파일에 이름을 열거해 두고 읽지 못하면 그것으로 닫았다). 기능 파일의 모양이
 * 달라 소유를 읽지 못해도 시작 구성 id 는 presets.json 에서 따로 읽어 모든 시작 구성·두 레이아웃으로 닫는다. 재사용 생성기도 시작 구성
 * 선언도 없는 트리(독립 이관 제품)는 재사용 생성 대상이 없으므로 빈 목록이다. 그 밖에 시작 구성 선언을 읽지 못하면 분류를 멈춘다 —
 * 검증할 구성을 모르는 채로 재사용 검증을 건너뛰지 않는다.
 */
function reusableProfileNames() {
  if (COMPOSER_MODULES) return COMPOSER_MODULES.presets.map(preset => preset.id);
  if (!existsSync(MODULES_DIRECTORY) && !existsSync(REUSABLE_GENERATOR)) return [];
  return presetIds(REPO_ROOT);
}
const REUSABLE_PROFILE_NAMES = reusableProfileNames();

const REUSABLE_LAYOUTS = Object.freeze(['multi-module', 'single-module']);

/**
 * PR 은 시작 구성마다 presets.json 의 `ci.pr` 레이아웃 하나만 생성·검증한다(ADR-0027, 11단계 C5 에서 이 파일의 표를 시작 구성
 * 선언으로 옮겼다). `ci.pr` 이 null 이면 그 시작 구성은 PR 에서 빼고 main·T2 에서만 돈다(DEC-OPS-296 — 13b 의 인증 시작 구성은
 * 기능이 모두 demo 에 있어 PR 의 demo 가 같은 코드를 생성·검증하고, 그 구성의 생성기 계획은 PR 의 운영 계약이 대조한다).
 * main push·수동 실행·이벤트 미상과 `ci.pr` 이 없는 시작 구성(새로 더한 시작 구성 포함)은 두 레이아웃 전수다 — 선언이 빠져도
 * 덮개가 줄지 않는 쪽으로 닫힌다. PR 이 놓친 회귀는 병합 뒤 main 전수가 잡는다(ADR-0023 의 E2E 와 같은 수용 위험). 값의 검사는
 * reusableMatrix 가 한다 — 모르는 레이아웃은 넘기지 않고 분류를 실패시킨다.
 */
export const PR_REUSABLE_LAYOUT = Object.freeze(Object.fromEntries((COMPOSER_MODULES?.presets ?? [])
  .filter(preset => preset.ci !== undefined && preset.ci !== null && Object.hasOwn(preset.ci, 'pr'))
  .map(preset => [preset.id, preset.ci.pr])));

/**
 * main push·수동 실행에서 검증할 레이아웃(`ci.main`, DEC-OPS-296). main 은 늘 두 레이아웃 전수라(ADR-0027 결정 2) 선언은 그 사실을
 * 적을 뿐이고, 하나라도 빠지거나 모르는 값이면 분류를 멈춘다. PR 에서 빼는 시작 구성(`ci.pr: null`)은 이것을 적어야 한다 —
 * 'PR 에서 뺀다' 가 'CI 에서 뺀다' 로 바뀌지 않게, 빠뜨리면 그 시작 구성을 고르는 순간 분류가 멈춘다.
 */
export const MAIN_REUSABLE_LAYOUTS = Object.freeze(Object.fromEntries((COMPOSER_MODULES?.presets ?? [])
  .filter(preset => preset.ci !== undefined && preset.ci !== null && (Object.hasOwn(preset.ci, 'main') || preset.ci.pr === null))
  .map(preset => [preset.id, preset.ci.main])));

export function reusableMatrix(profileNames = REUSABLE_PROFILE_NAMES,
  { event = '', prLayouts = PR_REUSABLE_LAYOUT, mainLayouts = MAIN_REUSABLE_LAYOUTS } = {}) {
  const pullRequest = event === 'pull_request';
  return {
    include: profileNames.flatMap(profile => {
      if (Object.hasOwn(mainLayouts, profile)) {
        const declared = mainLayouts[profile];
        if (!Array.isArray(declared) || declared.length !== REUSABLE_LAYOUTS.length
          || !REUSABLE_LAYOUTS.every(layout => declared.includes(layout))) {
          throw new Error(`main reusable layouts for ${profile} must be every layout: ${JSON.stringify(declared ?? null)}`);
        }
      }
      if (pullRequest && Object.hasOwn(prLayouts, profile)) {
        const narrowed = prLayouts[profile];
        // PR 에서 빼는 시작 구성 — main·수동 실행과 T2 에서만 돈다.
        if (narrowed === null) return [];
        if (!REUSABLE_LAYOUTS.includes(narrowed)) throw new Error(`unknown PR reusable layout for ${profile}: ${narrowed}`);
        return [{ profile, layout: narrowed }];
      }
      return REUSABLE_LAYOUTS.map(layout => ({ profile, layout }));
    }),
  };
}

const DOCUMENTATION_ONLY = [
  /^(?:README|AGENTS|GEMINI|CLAUDE)\.md$/,
  /^docs\/.*\.(?:md|mdx|txt|csv|png|jpe?g|gif|svg|webp|ico|pdf|woff2?|ttf|eot|mp4|webm)$/i,
  /^\.agent\/memory\/(?:project-context|decisions|known-gaps)\.md$/,
  /^\.agent\/(?:knowledge|skills)\/.*\.md$/,
  // 스킬 안내 파일은 .agent/skills 정본에서 npm run regen 이 만든다(scripts/agent-skill-adapters.mjs) — 정본과 함께 바뀌는 문서다.
  /^\.(?:agents|claude)\/skills\/[^/]+\/SKILL\.md$/,
  /^frontend\/public\/governance_harness_atlas\.html$/,
];

// A constitution edit can change which executable evidence is mandatory even
// though the file itself is Markdown. Treat it as policy code and fail closed
// to the full pipeline instead of letting the documentation fast path hide an
// implementation/policy mismatch.
const POLICY_CRITICAL = [
  /^AGENTS\.md$/,
  /^docs\/03-guides\/orchestration-protocol\.md$/,
  /^\.agent\/knowledge\/[^/]+constitution\/artifacts\/constitution\.md$/,
];

const BACKEND = [
  /^(?:foundation|business-core|business-app|api-server)\//,
  /^(?:build|settings)\.gradle$/,
  /^gradle\//,
  /^gradle\.properties$/,
  /^config\/(?:db|dependency-check)\//,
  /^api-docs\.json$/,
];

const FRONTEND = [
  /^frontend\//,
  /^pnpm-lock\.yaml$/,
  /^pnpm-workspace\.yaml$/,
];

/**
 * 거버넌스 하네스는 `backend` 스코프로 게이팅되지만 감사 대상 일부가 `frontend/` 아래에 있다
 * (Dockerfile 패키지 매니저·번들 예산·품질 래칫·vitest coverage 축). 이 목록이 없으면
 * "감사 대상만 고치면 감사자가 돌지 않는" 경로가 생긴다 — 게이트가 있다는 서술만 남고
 * 집행은 0 이 되는 형태다(AGENTS.md Evidence guardrails H5).
 */
const HARNESS_INPUTS_UNDER_FRONTEND = [
  /^frontend\/Dockerfile$/,
  /^frontend\/package\.json$/,
  /^frontend\/scripts\/check-bundle-budget\.mjs$/,
  /^frontend\/vitest\.config\.mts$/,
];

const BACKEND_PRODUCTION = [
  /^(?:foundation|business-core|business-app|api-server)\/src\/main\/java\//,
];

const SHARED_GRADLE_INPUTS = [
  /^(?:build|settings)\.gradle$/,
  /^gradle\//,
  /^gradle\.properties$/,
];

// StandardIdGenerator intentionally mirrors the online ID format without a
// Gradle dependency on foundation. Preserve both verification paths when either
// side's generator, prefix/length constants, or direct contract test changes.
const SHARED_ID_CONTRACT = [
  /^foundation\/src\/(?:main|test)\/java\/nuri\/foundation\/core\/util\/IdGenerationUtil(?:Test)?\.java$/,
  /^foundation\/src\/(?:main|test)\/java\/nuri\/foundation\/constants\/Constants(?:Test)?\.java$/,
  /^migration-tool\/src\/(?:main|test)\/java\/nuri\/migration\/keymap\/StandardIdGenerator(?:Test)?\.java$/,
];

// EgovAriaColumnCipher independently mirrors the online RRNO encryption and
// ProtectedTargetColumns mirrors the online encrypted columns (DEC-OPS-308).
// OnlineRrnoConverterContractTest compiles these online sources inside the
// migration suite, so an online-side change must run the migration suite too.
// The migration-side files already select it through migration-tool/.
const SHARED_PROTECTED_COLUMN_CONTRACT = [
  /^business-core\/src\/main\/java\/nuri\/business\/domain\/common\/RrnoEncryptionConverter\.java$/,
  /^foundation\/src\/main\/java\/nuri\/foundation\/core\/(?:util\/CryptoUtil|config\/ProjectCryptoConfig)\.java$/,
  /^foundation\/src\/main\/java\/nuri\/foundation\/security\/mfa\/MfaSecretCipher\.java$/,
  /^business-core\/src\/main\/java\/nuri\/business\/domain\/(?:user\/entity\/User|auth\/mfa\/MfaCredential)\.java$/,
  // Non-encrypting numeric converters are explicitly classified by the same inventory.
  // Pin their holders too: removal leaves no @Convert content to select the contract.
  /^business-core\/src\/main\/java\/nuri\/business\/domain\/deptjob\/DeptJob\.java$/,
  /^business-app\/src\/main\/java\/nuri\/business\/domain\/promotion\/popup\/Popup\.java$/,
  // A new JPA converter may encrypt another column; the contract counts every @Convert.
  /^(?:foundation|business-core|business-app|api-server)\/src\/main\/java\/.*Converter\.java$/,
  // The contract also compares the exact set of online encryption users (ENCRYPTION_USERS).
  // Removing a call from one of them or deleting it leaves no content to read, so the
  // path itself must select the contract.
  /^business-app\/src\/main\/java\/nuri\/business\/service\/mail\/MailDeliveryWorkHandler\.java$/,
  /^business-core\/src\/main\/java\/nuri\/business\/service\/auth\/mfa\/MfaSettings\.java$/,
];

// The paths above cannot see an entity that newly declares @Convert or a service
// that newly calls the online ciphers, so an online main source is also selected
// by its content — the same four roots and forms the contract test counts
// (FQN @jakarta.persistence.Convert, any argument order, explicit and wildcard
// static imports, @Converter(autoApply = true)). Content is read after the change
// only: a removed call or a deleted file has none, so every source that holds this
// content today must also be pinned by path above — ci-change-scope.test.mjs
// enforces that invariant over the online roots.
const ONLINE_MAIN_JAVA = /^(?:foundation|business-core|business-app|api-server)\/src\/main\/java\/.+\.java$/;
export const PROTECTED_COLUMN_CONTENT = new RegExp([
  String.raw`@(?:jakarta\.persistence\.)?Convert\s*\(`,
  String.raw`@(?:jakarta\.persistence\.)?Converter\s*\([^)]*autoApply\s*=\s*true`,
  String.raw`\bCryptoUtil\s*\.\s*encrypt\b`,
  String.raw`import\s+static\s+[\w.]*\bCryptoUtil\s*\.\s*(?:encrypt|\*)`,
  String.raw`\bMfaSecretCipher\b`,
].join('|'));

function readRepositorySource(file) {
  try {
    return readFileSync(path.join(REPO_ROOT, file), 'utf8');
  } catch {
    return null;
  }
}

function declaresProtectedColumn(file, readSource) {
  if (!ONLINE_MAIN_JAVA.test(file)) return false;
  const source = readSource(file);
  return typeof source === 'string' && PROTECTED_COLUMN_CONTENT.test(source);
}

// [2026-10-29 ADR-0044 결정 5] api-server 를 빼지 않는다. 어느 PIT 범위도 api-server 를 변이하지 않지만, foundation 범위의
// 시험 집합(nuri.foundation.*)에 든 MessageBundleContractTest 가 실행 중 api-server/src/main/java 를 읽고, 모든 PIT 잡이
// --warning-mode fail 로 api-server/build.gradle 까지 구성한다. 제품 PIT 선택은 범위 묶음 하나(mutation)라 그 범위만 고를 수 없다.
const MUTATION_RELEVANT = [
  ...BACKEND_PRODUCTION,
  /^(?:foundation|business-core|business-app|api-server)\/src\/test\/java\//,
  /^(?:foundation|business-core|business-app|api-server)\/src\/(?:main|test)\/resources\//,
  /^(?:foundation|business-core|business-app|api-server)\/src\/testFixtures\//,
  ...SHARED_GRADLE_INPUTS,
  ...SHARED_ID_CONTRACT,
  /^(?:foundation|business-core|business-app|api-server)\/build\.gradle$/,
];

// These are independent job scopes, not a subset of online mutation. A migration
// source/resource/build change must execute migration evidence even when every
// online leaf is legitimately skipped.
const MIGRATION_MUTATION_RELEVANT = [
  /^migration-tool\/src\/(?:main|test)\/(?:java|resources)\//,
  /^migration-tool\/src\/testFixtures\//,
  /^migration-tool\/build\.gradle$/,
  ...SHARED_GRADLE_INPUTS,
  ...SHARED_ID_CONTRACT,
];

function isMigrationToolMutation(file) {
  return matchesAny(file, MIGRATION_MUTATION_RELEVANT);
}

const SCHEMA_RELEVANT = [
  /^api-server\/src\/main\/resources\/db\/migration\//,
  /^api-server\/src\/test\/java\/nuri\/api\/schema\//,
  /^api-server\/src\/test\/resources\/application-tc\.yml$/,
  /^(?:business-core|business-app|foundation)\/src\/main\/java\/.*\/domain\//,
  /^foundation\/src\/test\/resources\/application-test\.yml$/,
  // ddl-auto·naming strategy·dialect 바인딩은 런타임 설정에 있다. 설정만 고치면
  // 엔티티 파일이 그대로여도 물리 스키마 정합이 달라지므로 스키마 축에 포함한다.
  /^api-server\/src\/main\/resources\/application(?:-[a-z0-9-]+)?\.ya?ml$/,
  /^(?:build|settings)\.gradle$/,
  /^(?:foundation|business-core|business-app|api-server)\/build\.gradle$/,
  /^gradle\//,
];

const E2E_RELEVANT = [
  /^(?:foundation|business-core|business-app|api-server)\/src\/main\//,
  /^api-docs\.json$/,
  /^frontend\/(?:src|public)\//,
  /^frontend\/e2e\//,
  /^frontend\/(?:package\.json|pnpm-lock\.yaml|playwright\.config\.ts|next\.config\.(?:js|mjs|ts))$/,
  /^pnpm-lock\.yaml$/,
  /^docker-compose(?:\.[^/]+)?\.ya?ml$/,
  /^Dockerfile$/,
  /^api-server\/Dockerfile$/,
  // 툴체인·버전 카탈로그는 어떤 src 파일도 건드리지 않고 런타임 거동을 바꾼다.
  // 의존성 상향 PR이 브라우저 증거 없이 병합되지 않도록 E2E 축에 포함한다.
  /^gradle\//,
  /^gradle\.properties$/,
  /^(?:build|settings)\.gradle$/,
  /^(?:foundation|business-core|business-app|api-server)\/build\.gradle$/,
];

const E2E_EXEMPT = [
  /^frontend\/public\/governance_harness_atlas\.html$/,
  /^frontend\/src\/test-utils\//,
  /^frontend\/src\/__tests__\//,
  /^frontend\/src\/.*\.test\.(?:ts|tsx)$/,
  /^frontend\/e2e\/.*\.test\.(?:ts|tsx)$/,
];

const CROSS_STACK_CONTRACT = [
  /^api-docs\.json$/,
  /^api-server\/src\/main\/resources\/db\/migration\//,
  /^docker-compose(?:\.[^/]+)?\.ya?ml$/,
  /^Dockerfile$/,
];

/**
 * 생성기·도구 전용 경로(11단계 C11, CI 2차-b — 설계 13장 '투영 무영향 경로 목록은 계약으로 고정'). 재사용 생성기·생성기
 * 화면·기능 선언만 바꾼 변경은 종전에 미분류 경로라 전 파이프라인을 돌았다(병합 PR 41개 중 16개). 이 표의 경로는 알려진
 * 경로다 — 모든 시작 구성과 사용자 구성의 재사용 검증, 늘 도는 운영 계약(secret-scan), SAST 를 고르고, 그 밖의 축은
 * 항목의 `axes` 만 켠다. 경로 문자열의 접두로 맞추고 먼저 맞는 항목이 이긴다.
 *
 * `axes` 는 그 경로를 문자열로 가리키거나(디렉터리째 읽기 포함) 실행하는 시험·조건부 CI 진입점이 도는 축이다. 운영 계약
 * (ci-change-scope-tool-paths.test.mjs)이 Java·프런트 시험 소스와 ci.yml 에서 다시 계산해 항목마다 정확히 같은지 본다 —
 * 시험이 표의 경로를 새로 읽으면 그 축을 켜야 통과하고, 읽는 시험이 사라지면 축을 내려야 통과한다. 분류기 자신이 읽는
 * composition-profiles.mjs 는 넣지 않는다(분류기가 자기 입력의 변경을 좁게 분류하지 않게 한다).
 */
export const GENERATOR_TOOL_PATHS = Object.freeze([
  // Atlas와 소비 원장도 실행 가능한 도구 입력이다. 문서 fast-pass 대신 소비자 축을
  // 동일한 source-reader 계약으로 확인하고, 관계없는 migration/PIT만 선택하지 않는다.
  { path: 'scripts/atlas-', axes: ['backend', 'e2e', 'schema'] },
  { path: 'scripts/build-atlas.mjs', axes: ['backend', 'e2e', 'schema'] },
  { path: 'config/governance/operation-consumer-census.json', axes: ['backend'] },
  // 기능 선언(매니페스트 v2). 하네스가 생성물 표지(presets.json)와 디렉터리를, 기본 관리자 시드 스키마 검증이 기능 파일을
  // 읽고, 생성기 화면 시험이 카탈로그를 실행한다.
  { path: 'config/modules/', axes: ['backend', 'e2e', 'schema'] },
  // 생성기 메뉴 스냅숏. 탭 목적지 cross-stack 계약도 읽는다.
  { path: 'config/project-composer-menus.json', axes: ['atlas', 'backend', 'e2e', 'schema'] },
  // scripts/ 는 하네스 두 개(FlywaySchemaOwnershipLinterTest·SecretLiteralLinterTest)가 디렉터리째 읽어 backend 를 끄지 못한다.
  { path: 'scripts/composer-modules', axes: ['backend', 'e2e', 'schema'] },
  { path: 'scripts/domain-deletion-plan', axes: ['backend', 'e2e', 'schema'] },
  // [2026-10-24 DEC-OPS-382] 새 기능 등록 점검기, 도메인 스캐폴더, 감리·검수 입력 자료 초안 내보내기 — 읽기 전용·비커밋 도구다.
  { path: 'scripts/domain-registration-doctor', axes: ['backend', 'e2e', 'schema'] },
  { path: 'scripts/export-deliverables', axes: ['backend', 'e2e', 'schema'] },
  { path: 'scripts/generate-domain', axes: ['backend', 'e2e', 'schema'] },
  { path: 'scripts/generate-reusable-base-', axes: ['backend', 'e2e', 'schema'] },
  { path: 'scripts/project-composer', axes: ['backend', 'e2e', 'schema'] },
  { path: 'scripts/reusable-', axes: ['backend', 'e2e', 'schema'] },
  { path: 'scripts/verify-project-composer', axes: ['backend', 'e2e', 'schema'] },
  { path: 'scripts/verify-reusable-', axes: ['backend', 'e2e', 'schema'] },
  // 생성기 화면. 화면 시험(ui.test.mjs)은 e2e 0번 샤드에서만 돈다.
  { path: 'tools/project-composer/', axes: ['e2e'] },
  // [DEC-OPS-383] 로컬 이관 작업공간과 정적 시안(ADR-0041). 시험은 늘 도는 운영 계약(secret-scan)에서, 코드는 SAST 에서 본다.
  // 실제 packaged workspace 시험의 엔진 3파일은 이관 축, 생성 Groovy의 경로를 따라가는 보수적 reader는 backend/e2e도 고른다.
  // backend/e2e의 정적 참조를 엔진 바이트의 직접 실행 증거로 해석하지 않는다. 나머지 UI/server/AI 와 정적 시안은
  // 기존 운영 계약·SAST·재사용 검증 경계를 유지한다. 파일 접두가 같은 다른 이름까지 새 축에 포함하지 않는다.
  { path: 'tools/migration-workspace/engine.mjs', exact: true, axes: ['backend', 'e2e', 'migration', 'mutationMigrationTool'] },
  { path: 'tools/migration-workspace/store.mjs', exact: true, axes: ['backend', 'e2e', 'migration', 'mutationMigrationTool'] },
  { path: 'tools/migration-workspace/inputs.mjs', exact: true, axes: ['backend', 'e2e', 'migration', 'mutationMigrationTool'] },
  { path: 'tools/migration-workspace/', axes: [] },
  { path: 'tools/migration-workspace-prototype/', axes: [] },
  // [2026-10-27 DEC-OPS-387] 에이전트 하네스(DEC-OPS-386) — 실행 전 가드·스킬 안내 생성기와 세 도구의 훅 어댑터. 시험은 늘 도는 운영
  // 계약(agent-guard·agent-skill-adapters·project-composer-source)이고, 생성물에 복사되므로 재사용 검증은 남는다. 축은 운영 계약이
  // 그 경로를 읽는 시험에서 계산한 값이다(훅 어댑터를 읽는 시험은 운영 계약뿐이다). 이관·PIT 는 켜지 않는다. 실행 기록
  // (verification-record.mjs)은 verify.mjs·pre-push 가 import 하는 실행 경로라 넣지 않는다.
  { path: 'scripts/agent-guard', axes: ['backend', 'e2e', 'schema'] },
  { path: 'scripts/agent-skill-adapters', axes: ['backend', 'e2e', 'schema'] },
  { path: '.claude/settings.json', axes: [] },
  { path: '.codex/hooks.json', axes: [] },
  { path: '.agents/hooks.json', axes: [] },
].map(entry => Object.freeze({ ...entry, axes: Object.freeze(entry.axes) })));

export function generatorToolEntry(file) {
  const normalized = normalizeFile(file);
  return GENERATOR_TOOL_PATHS.find(entry => entry.exact ? normalized === entry.path : normalized.startsWith(entry.path)) ?? null;
}

function selectsToolAxis(file, axis) {
  return generatorToolEntry(file)?.axes.includes(axis) ?? false;
}

function normalizeFile(file) {
  return String(file).trim().replaceAll('\\', '/').replace(/^\.\//, '');
}

function matchesAny(file, patterns) {
  return patterns.some(pattern => pattern.test(file));
}

function isDocumentationOnly(file) {
  return !matchesAny(file, POLICY_CRITICAL) && matchesAny(file, DOCUMENTATION_ONLY);
}

function isBackend(file) {
  return matchesAny(file, BACKEND) || matchesAny(file, HARNESS_INPUTS_UNDER_FRONTEND)
    || matchesAny(file, SHARED_ID_CONTRACT);
}

function isMigration(file) {
  return file.startsWith('migration-tool/') || matchesAny(file, SHARED_GRADLE_INPUTS)
    || matchesAny(file, SHARED_ID_CONTRACT) || matchesAny(file, SHARED_PROTECTED_COLUMN_CONTRACT);
}

function isFrontend(file) {
  return matchesAny(file, FRONTEND) && !isDocumentationOnly(file);
}

function isKnown(file) {
  return isDocumentationOnly(file) || isBackend(file) || isMigration(file) || isFrontend(file)
    || generatorToolEntry(file) !== null;
}

/**
 * 미지 경로의 fail-closed 안전망(`isKnown`)은 `frontend/**` 를 덮지 못한다 — 그 경로는
 * 전부 known 이기 때문이다. 그래서 E2E 축만은 allowlist 열거가 아니라 '프런트 전체 포함,
 * E2E_EXEMPT 로만 제외' 로 뒤집는다. 열거를 유지하면 tailwind/postcss/tsconfig/eslint 같은
 * 신규 루트 설정이 목록에 없다는 이유만으로 브라우저 증거를 조용히 잃는다.
 */
function isE2eRelevant(file) {
  if (matchesAny(file, E2E_EXEMPT)) return false;
  return matchesAny(file, E2E_RELEVANT) || /^frontend\//.test(file);
}

/**
 * 파일 하나가 바꾸는 시작 구성 — 파일 → 소유 기능 → 그 파일이 남는 시작 구성이다(매니페스트 v2, 11단계 C5). 소유는 생성기 투영과 같은
 * 규칙이다: 업무 앱의 기능 패키지(business-app 의 domain·service/<기능 id>)와 기능 파일의 지원 파일(backend.supportFiles)은 그 기능이
 * 있어야 남고, 화면 경로(owns.frontend)는 그 경로를 덮는 기능이 모두 있어야, 함께 소유한 화면(owns.frontendAny)은 그 기능이나 with
 * 기능 가운데 하나라도 있어야 남는다. 그 조건을 모두 채우는 시작 구성을 고른다 — 연쇄 제거는 보지 않으므로 실제로 남는 구성보다
 * 넓은 쪽이다. 공통 모듈·api-server·기능이 정해지지 않는 파일은 모든 시작 구성이다(fail-closed). config/modules 자체와 생성기·도구
 * 전용 경로(GENERATOR_TOOL_PATHS)도 소유 기능이 없어 모든 시작 구성이다 — 빠진 기능의 선언(화면 경로 등)도 그 기능이 없는 구성의
 * 생성물을 바꾼다.
 */
function reusableProfilesForFile(file) {
  if (isDocumentationOnly(file)) return [];
  if (!COMPOSER_MODULES) return REUSABLE_PROFILE_NAMES;

  const { features, presets } = COMPOSER_MODULES;
  // 각 항목은 "이 기능들 가운데 하나라도 있어야 남는다" 다. 시작 구성은 모든 항목을 채워야 고른다.
  const survivalConditions = [];
  const backendFeature = file.match(
    /^business-app\/src\/(?:main|test)\/java\/nuri\/business\/(?:domain|service)\/([^/]+)\//,
  )?.[1];
  if (backendFeature && features.has(backendFeature)) survivalConditions.push([backendFeature]);
  const frontendRelative = file.startsWith('frontend/') ? file.slice('frontend/'.length) : '';
  const covers = owned => frontendRelative !== ''
    && (frontendRelative === owned || frontendRelative.startsWith(`${owned}/`));
  for (const [id, feature] of features) {
    if (feature.supportFiles.includes(file) || feature.frontend.some(covers)) survivalConditions.push([id]);
    for (const rule of feature.frontendAny) if (covers(rule.path)) survivalConditions.push([id, ...rule.with]);
  }
  if (survivalConditions.length === 0) return REUSABLE_PROFILE_NAMES;

  return presets
    .filter(preset => survivalConditions.every(condition => condition.some(domain => preset.domains.includes(domain))))
    .map(preset => preset.id);
}

function selectedReusableProfiles(files, { full, docsOnly }) {
  if (full) return REUSABLE_PROFILE_NAMES;
  if (docsOnly) return [];
  const selected = new Set(files.flatMap(reusableProfilesForFile));
  return REUSABLE_PROFILE_NAMES.filter(profile => selected.has(profile));
}

/**
 * Fail-closed CI scope classification.
 *
 * Unknown or empty input deliberately selects the full pipeline. A false
 * positive costs runner time; a false negative silently removes evidence.
 */
export function classifyChangedFiles(changedFiles,
  { forceFull = false, event = '', readSource = readRepositorySource } = {}) {
  const files = [...new Set(changedFiles.map(normalizeFile).filter(Boolean))].sort();
  const unknownFiles = files.filter(file => !isKnown(file));
  const full = forceFull || files.length === 0 || unknownFiles.length > 0;
  const docsOnly = !full && files.every(isDocumentationOnly);
  // 생성기·도구 전용 경로는 표의 축만 켠다(GENERATOR_TOOL_PATHS). 재사용 검증은 아래 selectedReusableProfiles 가 고른다 —
  // 이 경로는 기능 소유가 없어 모든 시작 구성이다.
  const tool = axis => files.some(file => selectsToolAxis(file, axis));
  const atlas = tool('atlas') || files.some(file => file === 'frontend/public/governance_harness_atlas.html'
    || file.startsWith('frontend/atlas/')
    || file === 'scripts/build-atlas.mjs'
    || /^scripts\/atlas-[^/]+\.mjs$/.test(file));
  const backend = full || files.some(isBackend) || tool('backend');
  const migration = full || files.some(isMigration) || tool('migration')
    || files.some(file => declaresProtectedColumn(file, readSource));
  const frontend = full || files.some(isFrontend) || files.includes('api-docs.json') || tool('frontend');
  const crossStack = full || files.some(file => matchesAny(file, CROSS_STACK_CONTRACT));
  const schema = full || files.some(file => matchesAny(file, SCHEMA_RELEVANT)) || tool('schema');
  const e2e = full || crossStack || files.some(isE2eRelevant) || tool('e2e');
  const mutation = full || files.some(file => matchesAny(file, MUTATION_RELEVANT)) || tool('mutation');
  const mutationMigrationTool = full || files.some(isMigrationToolMutation) || tool('mutationMigrationTool');
  const reusableProfiles = selectedReusableProfiles(files, { full, docsOnly });
  const reusableCustom = reusableProfiles.includes('core');
  const matrix = reusableMatrix(reusableProfiles.length > 0 ? reusableProfiles : undefined, { event });

  return {
    files,
    unknownFiles,
    docsOnly,
    atlas,
    governance: true,
    secretScan: true,
    sast: !docsOnly,
    backend,
    migration,
    frontend,
    schema,
    e2e,
    mutation,
    mutationMigrationTool,
    // PR 에서 고른 시작 구성이 모두 PR 제외(ci.pr: null)면 생성할 항목이 없다 — 빈 matrix 를 넘기면 잡이 시작도 못 하고 실패한다.
    reusable: reusableProfiles.length > 0 && matrix.include.length > 0,
    reusableCustom,
    reusableProfiles,
    reusableMatrix: matrix,
  };
}

export function changedFilesFromGit(base, head = 'HEAD') {
  if (!base || !head) return [];
  const stdout = execFileSync(
    'git',
    ['diff', '--no-renames', '--name-only', '--diff-filter=ACMRD', '-z', `${base}...${head}`],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  return stdout.split('\0').filter(Boolean);
}

function bool(value) {
  return value ? 'true' : 'false';
}

export function githubOutputs(result) {
  return {
    docs_only: bool(result.docsOnly),
    atlas: bool(result.atlas),
    governance: bool(result.governance),
    secret_scan: bool(result.secretScan),
    sast: bool(result.sast),
    backend: bool(result.backend),
    migration: bool(result.migration),
    frontend: bool(result.frontend),
    schema: bool(result.schema),
    e2e: bool(result.e2e),
    mutation: bool(result.mutation),
    mutation_migration_tool: bool(result.mutationMigrationTool),
    reusable: bool(result.reusable),
    reusable_custom: bool(result.reusableCustom),
    reusable_matrix: JSON.stringify(result.reusableMatrix),
    unknown_count: String(result.unknownFiles.length),
  };
}

/**
 * 그 커밋의 축을 실제로 돌려 결과를 남긴 결론. 성공·실패·시간 초과는 초록이든 빨강이든 그 커밋에 보이는 판정이다(DEC-OPS-183).
 * [2026-10-26] 시작하지 못했거나(startup_failure) 승인을 기다리거나(action_required) 잡이 모두 건너뛰어진(skipped) 실행,
 * stale·neutral, 끝났는데 결론이 없는 실행은 어느 축도 판정하지 않았다 — 종전에는 취소만 걸러 이들도 검증으로 셌다.
 */
const JUDGED_CONCLUSIONS = new Set(['success', 'failure', 'timed_out']);

function verifiesCommit(run) {
  if (JUDGED_CONCLUSIONS.has(run?.conclusion)) return true;
  // 진행 중인 실행은 아직 결론이 없다 — 그 실행이 이 커밋을 스스로 판정한다.
  return run?.conclusion == null && run?.status !== 'completed';
}

/**
 * main push 의 변경 범위는 직전 main SHA(event.before)와의 차이다. 그 SHA 가 자기 main CI 실행을 갖지 못하면
 * (GitHub 가 push 이벤트를 누락한 #795 병합 ac2508c96 처럼) 그 커밋의 변경은 어떤 main 실행에서도 검사되지 않는다.
 * 그래서 base 에 그 커밋을 판정한(또는 판정 중인) main push 실행이 있음을 Actions API 로 확인하고, 없거나 확인할 수
 * 없으면 false 를 돌려 전수 검증을 고른다(fail-closed). 진행 중인 실행도 그 커밋을 스스로 검증하므로 있음으로 본다.
 */
export async function pushBaseWasVerified({ sha, repository, token, workflow = 'ci.yml', branch = 'main', fetchImpl = globalThis.fetch }) {
  const runs = await listMainPushRuns({ sha, repository, token, workflow, branch, fetchImpl });
  return runs !== null && runs.some(verifiesCommit);
}

/**
 * 커밋 하나의 main `ci.yml` push 실행 목록(Actions API). 입력이 형식에 맞지 않거나 조회에 실패하면 null 이다 — 호출부는 이것을
 * '확인하지 못함'으로 다룬다(fail-closed). 릴리스 이력 검증(scripts/release-main-history.mjs)도 같은 조회를 쓴다.
 */
export async function listMainPushRuns({ sha, repository, token, workflow = 'ci.yml', branch = 'main', fetchImpl = globalThis.fetch }) {
  if (!/^[0-9a-f]{40}$/u.test(sha ?? '') || !/^[\w.-]+\/[\w.-]+$/u.test(repository ?? '') || !token || typeof fetchImpl !== 'function') {
    return null;
  }
  try {
    const url = `https://api.github.com/repos/${repository}/actions/workflows/${workflow}/runs?head_sha=${sha}&event=push&branch=${branch}&per_page=20`;
    const response = await fetchImpl(url, {
      headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'x-github-api-version': '2022-11-28' },
    });
    if (!response?.ok) return null;
    const body = await response.json();
    if (!Array.isArray(body?.workflow_runs)) return null;
    return body.workflow_runs.filter(run => run?.head_sha === sha && run?.event === 'push' && run?.head_branch === branch);
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const options = { files: [], base: '', head: 'HEAD', githubOutput: '', stdin: false, field: '', forceFull: false,
    verifyPushBaseRun: false, event: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--file') options.files.push(argv[++index] ?? '');
    else if (value === '--event') options.event = argv[++index] ?? '';
    else if (value === '--base') options.base = argv[++index] ?? '';
    else if (value === '--head') options.head = argv[++index] ?? 'HEAD';
    else if (value === '--github-output') options.githubOutput = argv[++index] ?? '';
    else if (value === '--stdin') options.stdin = true;
    else if (value === '--full') options.forceFull = true;
    else if (value === '--verify-push-base-run') options.verifyPushBaseRun = true;
    else if (value === '--field') options.field = argv[++index] ?? '';
    else throw new Error(`unknown argument: ${value}`);
  }
  return options;
}

/** 검증되지 않은 push base 는 diff 범위를 쓰지 않고 전수로 바꾼다. 판정기를 주입해 CLI 경로를 네트워크 없이 검사한다. */
export async function applyPushBaseCheck(options, { verify = pushBaseWasVerified, env = process.env } = {}) {
  if (!options.verifyPushBaseRun) return { ...options, pushBaseVerified: null };
  const verified = await verify({ sha: options.base, repository: env.GITHUB_REPOSITORY, token: env.GH_TOKEN });
  return { ...options, forceFull: options.forceFull || !verified, pushBaseVerified: verified };
}

async function main() {
  const options = await applyPushBaseCheck(parseArgs(process.argv.slice(2)));
  if (options.pushBaseVerified === false) {
    process.stdout.write(`::notice title=change-scope::push base ${options.base.slice(0, 12)} has no main CI push run (or it could not be confirmed); selecting the full pipeline.\n`);
  }
  const files = options.files.length > 0
    ? options.files
    : options.stdin
      ? (await import('node:fs')).readFileSync(0, 'utf8').split(/\r?\n/).filter(Boolean)
      : changedFilesFromGit(options.base, options.head);
  const result = classifyChangedFiles(files, { forceFull: options.forceFull, event: options.event });
  const outputs = githubOutputs(result);

  if (options.field) {
    if (!Object.hasOwn(result, options.field) || typeof result[options.field] !== 'boolean') {
      throw new Error(`unsupported boolean field: ${options.field}`);
    }
    process.stdout.write(`${bool(result[options.field])}\n`);
    return;
  }

  if (options.githubOutput) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(
      options.githubOutput,
      `${Object.entries(outputs).map(([key, value]) => `${key}=${value}`).join('\n')}\n`,
      'utf8',
    );
  }

  process.stdout.write(`${JSON.stringify({ ...result, outputs }, null, 2)}\n`);
}

const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
