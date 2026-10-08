/**
 * 소스 투영의 공용 바탕 — 원본 트리 복사, Git 실행, 파일 순회·삭제, DB 번들 설치.
 * 생성기 단계 모듈(Java·프런트·게이트·하네스)과 생성기 본체가 함께 쓴다.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const MANIFEST_PATH = join(ROOT, 'config', 'reusable-base-profiles.json');
// 알려진 재배포 제한 스킬만 복사에서 제외한다. 나머지 자산의 라이선스 검토를 대신하지 않는다.
const EXCLUDED_REUSABLE_SKILL_ROOTS = ['docx', 'pdf', 'pptx', 'xlsx']
  .map((skill) => `.agent/skills/${skill}`);

export function fail(message) {
  throw new Error(message);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: null,
    maxBuffer: 128 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    fail(`${command} 실행 실패(exit ${result.status}): ${result.stderr?.toString('utf8').trim() ?? ''}`);
  }
  return result.stdout ?? Buffer.alloc(0);
}

export function git(args) {
  return run('git', args).toString('utf8').trim();
}

export function normalize(path) {
  return path.split(sep).join('/');
}

/** An exported project must not inherit the producer's ignored build/ boundary. */
export function initializeGeneratedRepository(output) {
  // 경로는 실제 표기로 비교한다. realpathSync 는 Windows 드라이브 문자를 받은 그대로(d:\…) 두지만
  //   Git 은 실제 표기(D:\…)를 돌려줘, 같은 디렉터리를 다른 경로로 판정했다.
  const target = realpathSync.native(resolve(output));
  if (target === realpathSync.native(ROOT) || existsSync(join(target, '.git'))) {
    fail('새 산출물만 독립 Git 저장소로 초기화할 수 있다.');
  }
  git(['-C', target, 'init', '--quiet']);
  const repository = git(['-C', target, 'rev-parse', '--show-toplevel']);
  if (realpathSync.native(repository) !== target) fail('산출물의 독립 Git 경계를 확인하지 못했다.');
}

export function trackedAndUntrackedFiles() {
  return run('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'])
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .filter((path) => !normalize(path).split('/').includes('build'));
}

export function copySourceTree(output, { sourceRoot = ROOT, files = trackedAndUntrackedFiles() } = {}) {
  for (const rel of files) {
    const normalized = rel.replaceAll('\\', '/');
    if (EXCLUDED_REUSABLE_SKILL_ROOTS.some((skill) => normalized === skill || normalized.startsWith(`${skill}/`))) continue;
    const source = join(sourceRoot, rel);
    if (!existsSync(source) || !statSync(source).isFile()) continue;
    const target = join(output, rel);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
  const gradlew = join(output, 'gradlew');
  if (existsSync(gradlew)) {
    // Windows 디렉터리 산출물에서는 실행 비트를 표현하지 못한다. 릴리스 archive 단계가
    // git index(100755)의 gradlew 모드를 보존해야 한다.
    statSync(gradlew);
  }
}

export function walk(root, predicate, out = []) {
  if (!existsSync(root)) return out;
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, predicate, out);
    else if (predicate(path)) out.push(path);
  }
  return out;
}

export function removePath(path, removed) {
  if (!existsSync(path)) return;
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const file of walk(path, () => true)) removed.add(file);
    rmSync(path, { recursive: true });
  } else {
    removed.add(path);
    rmSync(path);
  }
}

export function installDatabaseBundle(output, dbBundle) {
  const migrationTarget = join(output, 'api-server', 'src', 'main', 'resources', 'db', 'migration');
  if (existsSync(migrationTarget)) rmSync(migrationTarget, { recursive: true });
  mkdirSync(migrationTarget, { recursive: true });
  const migrationSource = join(dbBundle, 'db', 'migration');
  for (const file of readdirSync(migrationSource)) {
    copyFileSync(join(migrationSource, file), join(migrationTarget, file));
  }
}

/**
 * 텍스트를 읽되 부재는 {@code undefined} 로 돌려준다.
 *
 * <p>⚠ `existsSync` 로 먼저 확인하고 읽는 것은 **TOCTOU 경쟁**이며 CodeQL `js/file-system-race`(7.7,
 * blocking)가 소스 생성기에서 이미 한 번 차단했다(adaptGeneratedHarness, 지금은 reusable-source-gates.mjs). 확인과 사용 사이에 대상이 바뀔 수
 * 있으므로 **읽기를 시도하고 ENOENT 만 골라** 처리한다 — 다른 오류(권한·I/O)는 그대로 던져 조용한
 * 건너뜀으로 위장되지 않게 한다.
 */
export function readTextIfPresent(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return undefined;
  }
}
