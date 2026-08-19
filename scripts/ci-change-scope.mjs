import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DOCUMENTATION_ONLY = [
  /^(?:README|AGENTS|GEMINI|CLAUDE)\.md$/,
  /^docs\/.*\.(?:md|mdx|txt|csv|png|jpe?g|gif|svg|webp|ico|pdf|woff2?|ttf|eot|mp4|webm)$/i,
  /^\.agent\/memory\/(?:project-context|decisions|known-gaps)\.md$/,
  /^\.agent\/(?:knowledge|skills)\/.*\.md$/,
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
  /^(?:foundation|business-core|business-app|api-server|migration-tool)\//,
  /^(?:build|settings)\.gradle$/,
  /^gradle\//,
  /^gradle\.properties$/,
  /^config\/(?:db|checkstyle|dependency-check)\//,
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
  /^(?:foundation|business-core|business-app|api-server|migration-tool)\/src\/main\/java\//,
];

const MUTATION_RELEVANT = [
  ...BACKEND_PRODUCTION,
  /^(?:foundation|business-core|business-app|api-server|migration-tool)\/src\/test\/java\//,
  /^(?:foundation|business-core|business-app|api-server|migration-tool)\/src\/test\/resources\//,
  /^(?:build|settings)\.gradle$/,
  /^(?:foundation|business-core|business-app|api-server|migration-tool)\/build\.gradle$/,
];

const SCHEMA_RELEVANT = [
  /^api-server\/src\/main\/resources\/db\/migration\//,
  /^api-server\/src\/test\/java\/nuri\/api\/schema\//,
  /^api-server\/src\/test\/resources\/application-tc\.yml$/,
  /^(?:business-core|business-app|foundation)\/src\/main\/java\/.*\/domain\//,
  /^foundation\/src\/test\/resources\/(?:db\/migration\/|application-test(?:-dump)?\.yml$)/,
  // ddl-auto·naming strategy·dialect 바인딩은 런타임 설정에 있다. 설정만 고치면
  // 엔티티 파일이 그대로여도 물리 스키마 정합이 달라지므로 스키마 축에 포함한다.
  /^api-server\/src\/main\/resources\/application(?:-[a-z0-9-]+)?\.ya?ml$/,
  /^(?:build|settings)\.gradle$/,
  /^(?:foundation|business-core|business-app|api-server|migration-tool)\/build\.gradle$/,
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
  return matchesAny(file, BACKEND) || matchesAny(file, HARNESS_INPUTS_UNDER_FRONTEND);
}

function isFrontend(file) {
  return matchesAny(file, FRONTEND) && !isDocumentationOnly(file);
}

function isKnown(file) {
  return isDocumentationOnly(file) || isBackend(file) || isFrontend(file);
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
 * Fail-closed CI scope classification.
 *
 * Unknown or empty input deliberately selects the full pipeline. A false
 * positive costs runner time; a false negative silently removes evidence.
 */
export function classifyChangedFiles(changedFiles) {
  const files = [...new Set(changedFiles.map(normalizeFile).filter(Boolean))].sort();
  const unknownFiles = files.filter(file => !isKnown(file));
  const full = files.length === 0 || unknownFiles.length > 0;
  const docsOnly = !full && files.every(isDocumentationOnly);
  const atlas = files.includes('frontend/public/governance_harness_atlas.html');
  const backend = full || files.some(isBackend);
  const frontend = full || files.some(isFrontend) || files.includes('api-docs.json');
  const crossStack = full || files.some(file => matchesAny(file, CROSS_STACK_CONTRACT));
  const schema = full || files.some(file => matchesAny(file, SCHEMA_RELEVANT));
  const e2e = full || crossStack || files.some(isE2eRelevant);
  const mutation = full || files.some(file => matchesAny(file, MUTATION_RELEVANT));

  return {
    files,
    unknownFiles,
    docsOnly,
    atlas,
    governance: true,
    secretScan: true,
    backend,
    frontend,
    schema,
    e2e,
    mutation,
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
    backend: bool(result.backend),
    frontend: bool(result.frontend),
    schema: bool(result.schema),
    e2e: bool(result.e2e),
    mutation: bool(result.mutation),
    unknown_count: String(result.unknownFiles.length),
  };
}

function parseArgs(argv) {
  const options = { files: [], base: '', head: 'HEAD', githubOutput: '', stdin: false, field: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--file') options.files.push(argv[++index] ?? '');
    else if (value === '--base') options.base = argv[++index] ?? '';
    else if (value === '--head') options.head = argv[++index] ?? 'HEAD';
    else if (value === '--github-output') options.githubOutput = argv[++index] ?? '';
    else if (value === '--stdin') options.stdin = true;
    else if (value === '--field') options.field = argv[++index] ?? '';
    else throw new Error(`unknown argument: ${value}`);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const files = options.files.length > 0
    ? options.files
    : options.stdin
      ? (await import('node:fs')).readFileSync(0, 'utf8').split(/\r?\n/).filter(Boolean)
      : changedFilesFromGit(options.base, options.head);
  const result = classifyChangedFiles(files);
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
