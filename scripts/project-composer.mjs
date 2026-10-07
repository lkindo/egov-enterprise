#!/usr/bin/env node
/** Shared local composition engine: CLI and web transport execute the same recipe. */
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { projectComposerMenuPreview } from './project-composer-menu-preview.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = 1;
const withObject = word => `${word}${/[\uAC00-\uD7A3]$/.test(word) && (word.charCodeAt(word.length - 1) - 0xAC00) % 28 !== 0 ? '을' : '를'}`;
/** 필수 외래 키 위반을 사용자에게 보일 문장으로 바꾼다. 내부 경로나 클래스명은 싣지 않는다. */
export function foreignKeyBlockers(composition, catalog) {
  const label = id => catalog.capabilities.find(capability => capability.id === id)?.label ?? id;
  return composition.foreignKeyViolations.map(violation => `${label(violation.sourceDomain)}의 ${violation.childTable} 테이블이 `
    + `${label(violation.targetDomain)}의 ${violation.parentTable} 테이블을 외래 키로 참조합니다. `
    + `${withObject(label(violation.targetDomain))} 함께 선택해야 생성할 수 있습니다.`);
}
function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error('Source checkout identity could not be verified');
  return result.stdout.trim();
}
export function composerSourceFingerprint(root) {
  const hash = createHash('sha256');
  const files = git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean).sort();
  for (const file of files) {
    if (file.replaceAll('\\', '/').split('/').includes('build')) continue;
    const path = join(root, file);
    hash.update(`${file}\0`);
    /*
      존재를 먼저 묻고 그 다음에 읽으면 두 호출 사이에 파일이 바뀔 수 있다(TOCTOU).
      지문은 "읽은 내용"을 근거로 삼아야 하므로 바로 읽고, 읽지 못한 경우만 [missing] 으로
      적는다 — 디렉터리·심볼릭 링크 깨짐·권한 부족은 모두 readFileSync 가 던지며
      종전 분기와 같은 결과로 수렴한다.
    */
    let contents = null;
    try {
      contents = readFileSync(path);
    } catch {
      contents = null;
    }
    hash.update(contents ?? '[missing]');
    hash.update('\0');
  }
  return hash.digest('hex');
}

const SECRET_NAME = /PASS|SECRET|TOKEN|KEY|CREDENTIAL/i;
const PRIVATE_KEY_BEGIN = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/;
const PRIVATE_KEY_END = /-----END [A-Z0-9 ]*PRIVATE KEY-----/;
// 값만 가리고 키 이름과 형식은 남긴다. 무엇이 있었는지는 진단에 쓰되 값은 로그에 남기지 않는다.
const SECRET_SHAPES = [
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, () => '***'],
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, (_, scheme) => `${scheme} ***`],
  [/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/:@]+:[^\s/@]+@/gi, (_, scheme) => `${scheme}***:***@`],
  [/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|npm_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[abprs]-[A-Za-z0-9-]{10,})\b/g, () => '***'],
  [/\b([A-Za-z0-9_.-]*(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|credential)[A-Za-z0-9_.-]*)(\s*[:=]\s*)(["']?)([^\s"',;]+)\3/gi,
    (_, key, separator, quote) => `${key}${separator}${quote}***${quote}`],
];

/**
 * 자식 프로세스 출력 한 줄씩 비밀을 가린다. 줄 단위로 가리므로 꼬리만 남기려고 앞을 잘라도
 * 가리지 않은 비밀 조각이 남지 않는다. `secrets` 는 이 호출의 환경에서 온 값 그대로의 비밀이다.
 */
export function createLogMasker(secrets = []) {
  const literals = [...new Set(secrets.filter(value => typeof value === 'string' && value.length >= 8))].sort((a, b) => b.length - a.length);
  let privateKey = false;
  let count = 0;
  return {
    line(raw) {
      if (privateKey || PRIVATE_KEY_BEGIN.test(raw)) {
        privateKey = !PRIVATE_KEY_END.test(raw);
        count += 1;
        return '[가린 개인키]';
      }
      let line = raw;
      for (const literal of literals) if (line.includes(literal)) { line = line.split(literal).join('***'); count += 1; }
      for (const [pattern, replace] of SECRET_SHAPES) line = line.replace(pattern, (...match) => { count += 1; return replace(...match); });
      return line;
    },
    get count() { return count; },
  };
}

const LOG_LIMIT = 1024 * 1024;
const LINE_LIMIT = 16 * 1024;

/** Windows shells are used only for fixed tool names and fixed argument lists. Recipe values never become shell code. */
export function runComposerCommand(command, args, { root, env = process.env, capture = false, log } = {}) {
  return new Promise((accept, reject) => {
    const windows = process.platform === 'win32';
    const executable = command === 'node' ? process.execPath
      : windows && ['npm', 'pnpm'].includes(command) ? `${command}.cmd` : command;
    const shell = windows && ['npm.cmd', 'pnpm.cmd'].includes(executable);
    if (shell && args.some(value => !/^[A-Za-z0-9_./:= -]+$/.test(value))) return reject(new Error('Unsafe fixed-tool argument'));
    const startedAt = Date.now();
    const child = spawn(executable, args, { cwd: root, env, windowsHide: true, shell, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    // Output can contain credentials from dependencies: it is kept only masked, bounded and on this computer.
    const masker = createLogMasker(Object.entries(env ?? {}).filter(([name]) => SECRET_NAME.test(name)).map(([, value]) => value));
    const lines = [];
    let bytes = 0;
    let dropped = 0;
    const keep = raw => {
      const line = masker.line(raw.length > LINE_LIMIT ? `${raw.slice(0, LINE_LIMIT)} …(줄 잘림)` : raw);
      lines.push(line);
      bytes += Buffer.byteLength(line) + 1;
      while (bytes > LOG_LIMIT && lines.length > 1) { bytes -= Buffer.byteLength(lines.shift()) + 1; dropped += 1; }
    };
    const stream = source => {
      let rest = '';
      source.on('data', chunk => {
        if (!log) return;
        const parts = (rest + chunk.toString()).split(/\r?\n/);
        rest = parts.pop();
        for (const part of parts) keep(part);
      });
      return () => { if (log && rest) keep(rest); };
    };
    child.stdout.on('data', chunk => { if (capture && output.length < 4 * 1024 * 1024) output += chunk.toString(); });
    const flush = [stream(child.stdout), stream(child.stderr)];
    const written = exitCode => {
      if (!log) return;
      flush.forEach(finish => finish());
      const header = masker.line(`$ ${[command, ...args].join(' ')}`);
      const omitted = dropped ? [`…앞 ${dropped}줄 생략(로그 상한 ${LOG_LIMIT}바이트, 끝부분 보존)`] : [];
      mkdirSync(dirname(log), { recursive: true });
      appendFileSync(log, `${[header, ...omitted, ...lines, `[종료 코드 ${exitCode ?? '없음'} · ${Date.now() - startedAt}ms · 가림 ${masker.count}건]`, ''].join('\n')}\n`);
    };
    const failed = (code, exitCode) => Object.assign(new Error(`Command failed: ${command} (${code}${exitCode === null ? '' : ` ${exitCode}`})`),
      { code, commandId: command === 'node' ? args[0] : command, exitCode, durationMs: Date.now() - startedAt, ...(log ? { log } : {}) });
    // 실행 실패 뒤에도 close 가 올 수 있다. 로그와 결과는 한 번만 남긴다.
    let settled = false;
    const settle = (exitCode, finish) => { if (settled) return; settled = true; written(exitCode); finish(); };
    child.on('error', () => settle(null, () => reject(failed('TOOL_UNAVAILABLE', null))));
    child.on('close', code => settle(code, () => code === 0 ? accept(output.trim()) : reject(failed('COMMAND_FAILED', code))));
  });
}

export function composerOutputPaths(root, name, token) {
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(name) || !/^[a-f0-9]{16}$/.test(token)) throw new Error('Invalid output identity');
  const paths = {
    projectDirectory: resolve(root, 'build/reusable-base/source', `${name}-${token}`),
    stagingDirectory: resolve(root, 'build/reusable-base/source', `.pending-${name}-${token}`),
    databaseDirectory: resolve(root, 'build/reusable-base', `composer-${name}-${token}-db`),
    jobDirectory: resolve(root, 'build/project-composer/jobs', `${name}-${token}`),
  };
  const base = resolve(root, 'build');
  for (const path of Object.values(paths)) {
    const rel = relative(base, path);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel) || existsSync(path)) throw new Error('Output must be fresh and inside the build directory');
    let ancestor = dirname(path);
    while (!existsSync(ancestor)) ancestor = dirname(ancestor);
    const physical = relative(realpathSync(root), realpathSync(ancestor));
    if (physical === '..' || physical.startsWith(`..${sep}`) || isAbsolute(physical)) throw new Error('Output ancestor escapes the workspace');
  }
  return paths;
}

/**
 * outputRoot 는 계약 테스트용 이음새다. 기본값은 원본 저장소이고 CLI·서버는 넘기지 않는다.
 * 실제 생성기 스크립트는 저장소 build/ 밖 출력을 거부하므로, 운영 경로에서 다른 값을 넘기면
 * 생성이 실패할 뿐 출력이 새지 않는다.
 */
export function createComposerEngine({ root = ROOT, outputRoot, run = runComposerCommand, fingerprint = composerSourceFingerprint,
  loadCatalog = loadProjectComposerCatalog } = {}) {
  root = realpathSync(root);
  outputRoot = outputRoot === undefined ? root : realpathSync(outputRoot);
  let running = false;
  const catalog = () => {
    const value = loadCatalog(root);
    const sourceCommit = git(root, ['rev-parse', 'HEAD']);
    return { ...value, sourceRef: sourceCommit, sourceCommit };
  };
  const plan = recipe => {
    const current = loadCatalog(root);
    const composition = resolveProjectRecipe(recipe, current);
    // The local generator exports the inspected checkout. It never silently checks out another revision.
    const sourceCommit = git(root, ['rev-parse', '--verify', `${recipe.sourceRef}^{commit}`]);
    if (sourceCommit !== git(root, ['rev-parse', 'HEAD'])) throw new Error('Recipe sourceRef does not identify the current checkout');
    return { ...composition, sourceCommit, blockers: foreignKeyBlockers(composition, current),
      outputDirectory: `build/reusable-base/source/${composition.project.name}-<generation-id>`,
      menus: projectComposerMenuPreview(root, composition),
      warnings: [
        '현재 체크아웃의 소스로 생성합니다. 커밋되지 않은 변경이 있으면 개발용 산출물로 표시됩니다.',
        '생성 시 Docker·Java 21·Node.js 22 이상·pnpm이 필요하며, 의존성 설치와 검증에 시간이 걸릴 수 있습니다.',
        ...composition.requirements.map(requirement => `추가 설정: ${requirement}`),
      ],
    };
  };
  const generate = async (recipe, { onProgress = () => {} } = {}) => {
    if (running) throw new Error('A composition job is already running');
    running = true;
    let container;
    let report;
    let paths;
    let token;
    let stage = 'resolve';
    const progress = (next, percent) => { stage = next; onProgress({ stage, progress: percent }); };
    const save = () => {
      if (paths && report) writeFileSync(join(paths.jobDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    };
    const docker = (args, options = {}) => run('docker', args, { root, capture: true, ...options });
    // 단계마다 자식 출력의 가린 사본을 jobs/<id>/logs/<단계>.log 에 남긴다. 이 컴퓨터 밖으로 보내지 않는다.
    const logOf = name => join(paths.jobDirectory, 'logs', `${name}.log`);
    const cleanupDatabase = async () => {
      if (container && /^[a-f0-9]{64}$/.test(container)) {
        const owner = await docker(['inspect', '--format', '{{ index .Config.Labels "egov.project-composer" }}', container]);
        if (owner !== token) throw new Error('Database container ownership changed; refusing cleanup');
        await docker(['rm', '--force', container]);
        container = undefined;
      }
    };
    try {
      progress('resolve', 2);
      const resolvedPlan = plan(recipe);
      // 생성 불가 구성은 출력 폴더·DB 컨테이너를 만들기 전에 사유와 함께 거부한다.
      if (resolvedPlan.blockers.length) throw Object.assign(new Error(resolvedPlan.blockers.join(' ')), { code: 'FK_CLOSURE' });
      const composition = { ...resolveProjectRecipe(recipe, loadCatalog(root)), sourceCommit: resolvedPlan.sourceCommit };
      const sourceFingerprint = fingerprint(root);
      token = randomBytes(8).toString('hex');
      paths = composerOutputPaths(outputRoot, composition.project.name, token);
      mkdirSync(paths.jobDirectory, { recursive: true });
      const compositionPath = join(paths.jobDirectory, 'composition.json');
      writeFileSync(compositionPath, `${JSON.stringify(composition, null, 2)}\n`);
      report = { schemaVersion: VERSION, generatorVersion: VERSION, result: 'started', stage,
        compositionHash: composition.compositionHash, sourceCommit: composition.sourceCommit, sourceFingerprint,
        localDevelopmentBuild: Boolean(git(root, ['status', '--porcelain'])) || !git(root, ['tag', '--points-at', 'HEAD']).split(/\r?\n/).some(tag => /^v\d/.test(tag)),
        startedAt: new Date().toISOString(), environmentApproved: false, ...paths };
      save();
      progress('database', 8);
      container = await docker(['run', '--detach', '--name', `egov-composer-${token}`, '--label', `egov.project-composer=${token}`,
        '--env', 'POSTGRES_USER=composer', '--env', 'POSTGRES_DB=composer', '--env', 'POSTGRES_PASSWORD', 'postgres:17-alpine'],
      { env: { ...process.env, POSTGRES_PASSWORD: randomBytes(32).toString('hex') }, log: logOf('database') });
      if (!/^[a-f0-9]{64}$/.test(container)) throw new Error('Invalid owned database container identity');
      let ready = false;
      for (let attempt = 0; attempt < 120; attempt++) {
        try { await docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'composer', '-d', 'composer']); ready = true; break; }
        catch { await new Promise(accept => setTimeout(accept, 500)); }
      }
      if (!ready) throw new Error('Owned PostgreSQL did not become ready');
      const common = ['--composition', compositionPath, '--allow-dirty', '--allow-non-release-ref'];
      await run('node', ['scripts/generate-reusable-base-db.mjs', ...common, '--container', container, '--output', paths.databaseDirectory], { root, log: logOf('database') });
      progress('source', 28);
      await run('node', ['scripts/generate-reusable-base-source.mjs', ...common, '--db-bundle', paths.databaseDirectory, '--output', paths.stagingDirectory], { root, log: logOf('source') });
      if (fingerprint(root) !== sourceFingerprint) throw new Error('Source checkout changed while the project was being composed');
      writeFileSync(join(paths.stagingDirectory, 'project-recipe.json'), `${JSON.stringify(composition.recipe, null, 2)}\n`);
      writeFileSync(join(paths.stagingDirectory, 'project-composition.json'), `${JSON.stringify(composition, null, 2)}\n`);
      // pnpm uses absolute junctions on Windows. Set the permanent source location
      // before dependency installation, and publish readiness only through the final report.
      if (existsSync(paths.projectDirectory)) throw new Error('Final output unexpectedly exists');
      renameSync(paths.stagingDirectory, paths.projectDirectory);
      report.result = 'verifying';
      writeFileSync(join(paths.projectDirectory, 'project-generation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
      progress('install', 42);
      await run('npm', ['ci', '--ignore-scripts'], { root: paths.projectDirectory, log: logOf('install') });
      await run('pnpm', ['-C', 'frontend', 'install', '--frozen-lockfile'], { root: paths.projectDirectory, log: logOf('install') });
      progress('verify', 60);
      await run('node', ['scripts/verify-reusable-artifact.mjs'], { root: paths.projectDirectory, log: logOf('verify') });
      const verification = JSON.parse(readFileSync(join(paths.projectDirectory, 'build/reports/reusable-base/full.json'), 'utf8'));
      if (verification.result !== 'passed' || verification.sourceCommit !== composition.sourceCommit
        || verification.layout !== composition.backendLayout || verification.profile !== composition.profile
        || verification.scope !== 'full') throw new Error('Generated project verification report is incomplete');
      await cleanupDatabase();
      report = { ...report, result: 'passed', stage: 'complete', finishedAt: new Date().toISOString(), verification };
      delete report.stagingDirectory;
      save();
      writeFileSync(join(paths.projectDirectory, 'project-generation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
      progress('complete', 100);
      return { projectDirectory: paths.projectDirectory, databaseDirectory: paths.databaseDirectory,
        reportPath: join(paths.projectDirectory, 'project-generation-report.json'), recipe: composition.recipe, verified: true };
    } catch (error) {
      // 화면으로는 단계·명령 식별자·종료 코드·로그 위치만 넘긴다. 자식 출력 원문은 로그 파일에만 있다.
      const failure = { stage, code: error.code ?? 'COMPOSITION_FAILED',
        ...(error.commandId ? { commandId: error.commandId, exitCode: error.exitCode ?? null, durationMs: error.durationMs } : {}),
        ...(error.log ? { log: error.log } : {}) };
      if (report) {
        report.result = 'failed'; report.stage = stage; report.finishedAt = new Date().toISOString();
        const verificationReport = join(paths.projectDirectory, 'build/reports/reusable-base/full.json');
        report.failure = { ...failure, message: createLogMasker().line(String(error.message)).slice(0, 2000),
          ...(existsSync(verificationReport) ? { verificationReport } : {}) };
        save();
        if (existsSync(paths.projectDirectory)) writeFileSync(join(paths.projectDirectory, 'project-generation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
      }
      throw Object.assign(error, { failure });
    } finally {
      try { await cleanupDatabase(); } finally { running = false; }
    }
  };
  return { catalog, plan, generate, outputRoot };
}

export function parseComposerArgs(args) {
  if (args.length === 1 && args[0] === 'catalog') return { action: 'catalog' };
  if (args.length !== 3 || !['plan', 'generate'].includes(args[0]) || args[1] !== '--recipe' || !args[2] || args[2].startsWith('--')) {
    throw new Error('Usage: project-composer.mjs catalog | plan --recipe FILE | generate --recipe FILE');
  }
  return { action: args[0], recipeFile: args[2] };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseComposerArgs(process.argv.slice(2));
    const engine = createComposerEngine();
    const result = args.action === 'catalog' ? engine.catalog()
      : await engine[args.action](JSON.parse(readFileSync(resolve(args.recipeFile), 'utf8')), {
        onProgress: ({ stage, progress }) => process.stderr.write(`[composer] ${stage} ${progress}%\n`),
      });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) { process.stderr.write(`[composer] ${error.message}\n`); process.exitCode = 1; }
}
