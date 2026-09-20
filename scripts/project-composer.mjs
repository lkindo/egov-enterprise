#!/usr/bin/env node
/** Shared local composition engine: CLI and web transport execute the same recipe. */
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { projectComposerMenuPreview } from './project-composer-menu-preview.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = 1;
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

/** Windows shells are used only for fixed tool names and fixed argument lists. Recipe values never become shell code. */
export function runComposerCommand(command, args, { root, env = process.env, capture = false } = {}) {
  return new Promise((accept, reject) => {
    const windows = process.platform === 'win32';
    const executable = command === 'node' ? process.execPath
      : windows && ['npm', 'pnpm'].includes(command) ? `${command}.cmd` : command;
    const shell = windows && ['npm.cmd', 'pnpm.cmd'].includes(executable);
    if (shell && args.some(value => !/^[A-Za-z0-9_./:= -]+$/.test(value))) return reject(new Error('Unsafe fixed-tool argument'));
    const child = spawn(executable, args, { cwd: root, env, windowsHide: true, shell, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    // Output can contain credentials from dependencies: discard it unless this call requests a bounded machine result.
    child.stdout.on('data', chunk => { if (capture && output.length < 4 * 1024 * 1024) output += chunk.toString(); });
    child.stderr.resume();
    const failed = (code, exitCode) => Object.assign(new Error(`Command failed: ${command} (${code}${exitCode === null ? '' : ` ${exitCode}`})`),
      { code, commandId: command === 'node' ? args[0] : command, exitCode });
    child.on('error', () => reject(failed('TOOL_UNAVAILABLE', null)));
    child.on('close', code => code === 0 ? accept(output.trim()) : reject(failed('COMMAND_FAILED', code)));
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

export function createComposerEngine({ root = ROOT, run = runComposerCommand, fingerprint = composerSourceFingerprint } = {}) {
  root = realpathSync(root);
  let running = false;
  const catalog = () => {
    const value = loadProjectComposerCatalog(root);
    const sourceCommit = git(root, ['rev-parse', 'HEAD']);
    return { ...value, sourceRef: sourceCommit, sourceCommit };
  };
  const plan = recipe => {
    const current = loadProjectComposerCatalog(root);
    const composition = resolveProjectRecipe(recipe, current);
    // The local generator exports the inspected checkout. It never silently checks out another revision.
    const sourceCommit = git(root, ['rev-parse', '--verify', `${recipe.sourceRef}^{commit}`]);
    if (sourceCommit !== git(root, ['rev-parse', 'HEAD'])) throw new Error('Recipe sourceRef does not identify the current checkout');
    return { ...composition, sourceCommit,
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
      const composition = { ...resolveProjectRecipe(recipe, loadProjectComposerCatalog(root)), sourceCommit: resolvedPlan.sourceCommit };
      const sourceFingerprint = fingerprint(root);
      token = randomBytes(8).toString('hex');
      paths = composerOutputPaths(root, composition.project.name, token);
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
      { env: { ...process.env, POSTGRES_PASSWORD: randomBytes(32).toString('hex') } });
      if (!/^[a-f0-9]{64}$/.test(container)) throw new Error('Invalid owned database container identity');
      let ready = false;
      for (let attempt = 0; attempt < 120; attempt++) {
        try { await docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'composer', '-d', 'composer']); ready = true; break; }
        catch { await new Promise(accept => setTimeout(accept, 500)); }
      }
      if (!ready) throw new Error('Owned PostgreSQL did not become ready');
      const common = ['--composition', compositionPath, '--allow-dirty', '--allow-non-release-ref'];
      await run('node', ['scripts/generate-reusable-base-db.mjs', ...common, '--container', container, '--output', paths.databaseDirectory], { root });
      progress('source', 28);
      await run('node', ['scripts/generate-reusable-base-source.mjs', ...common, '--db-bundle', paths.databaseDirectory, '--output', paths.stagingDirectory], { root });
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
      await run('npm', ['ci', '--ignore-scripts'], { root: paths.projectDirectory });
      await run('pnpm', ['-C', 'frontend', 'install', '--frozen-lockfile'], { root: paths.projectDirectory });
      progress('verify', 60);
      await run('node', ['scripts/verify-reusable-artifact.mjs'], { root: paths.projectDirectory });
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
      if (report) {
        report.result = 'failed'; report.stage = stage; report.finishedAt = new Date().toISOString();
        report.failure = { code: error.code ?? 'COMPOSITION_FAILED', ...(error.commandId ? { commandId: error.commandId, exitCode: error.exitCode } : {}),
          verificationReport: join(paths.projectDirectory, 'build/reports/reusable-base/full.json') };
        save();
        if (existsSync(paths.projectDirectory)) writeFileSync(join(paths.projectDirectory, 'project-generation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
      }
      throw error;
    } finally {
      try { await cleanupDatabase(); } finally { running = false; }
    }
  };
  return { catalog, plan, generate };
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
