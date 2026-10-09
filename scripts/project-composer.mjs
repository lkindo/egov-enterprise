#!/usr/bin/env node
/** Shared local composition engine: CLI and web transport execute the same recipe. */
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { loadProjectComposerMenus, projectComposerMenuPreview } from './project-composer-menu-preview.mjs';
import { compositionDiff } from './project-composer-diff.mjs';
import { loadUnassignedPermissionGuidance } from './project-composer-unassigned.mjs';
import { composerPresentation, loadRouteKinds } from './project-composer-presentation.mjs';
import { composerPreflight } from './project-composer-preflight.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = 1;
const hasBatchim = word => /[\uAC00-\uD7A3]$/.test(word) && (word.charCodeAt(word.length - 1) - 0xAC00) % 28 !== 0;
const withObject = word => `${word}${hasBatchim(word) ? '을' : '를'}`;
const withSubject = word => `${word}${hasBatchim(word) ? '이' : '가'}`;
/** 필수 외래 키 위반을 사용자에게 보일 문장으로 바꾼다. 내부 경로나 클래스명은 싣지 않는다. */
export function foreignKeyBlockers(composition, catalog) {
  const label = id => catalog.capabilities.find(capability => capability.id === id)?.label ?? id;
  return composition.foreignKeyViolations.map(violation => `${label(violation.sourceDomain)}의 ${violation.childTable} 테이블이 `
    + `${label(violation.targetDomain)}의 ${violation.parentTable} 테이블을 외래 키로 참조합니다. `
    + `${withObject(label(violation.targetDomain))} 함께 선택해야 생성할 수 있습니다.`);
}
/** 기능 저하를 빠진 기능별로 묶어 화면 문장을 만든다. 생성을 막지 않는 안내다. */
export function degradationNotes(composition, catalog) {
  const label = id => catalog.capabilities.find(capability => capability.id === id)?.label ?? id;
  const groups = new Map();
  for (const edge of composition.degraded) {
    if (!groups.has(edge.to)) groups.set(edge.to, { to: edge.to, heading: `${withObject(label(edge.to))} 고르지 않아 줄어드는 동작`, reasons: [] });
    groups.get(edge.to).reasons.push({ from: edge.from, reason: edge.reason });
  }
  return [...groups.values()];
}
/** 자동 포함 근거의 종류. 화면에서 접힌 근거로만 보인다. */
export const REQUIRES_KIND_LABELS = Object.freeze({ java: '코드 참조', manifest: '생성 묶음 선언', 'shared-ui': '공동 화면', 'ui-import': '화면 참조' });
/**
 * 자동 포함을 화면 문장으로 바꾼다(설계서 9.3·E2). 경로 사슬, 단계마다 사용자용 한 문장, 해제 방법을 싣고
 * 개발자 근거(종류·파일)는 접어서 보일 수 있게 따로 둔다. 클래스명·기능 id 는 문장에 싣지 않는다.
 */
export function inclusionNotes(composition, catalog) {
  const label = id => catalog.capabilities.find(capability => capability.id === id)?.label ?? id;
  return composition.autoIncluded.map(item => {
    const roots = item.roots.map(label);
    const listed = [...roots.slice(0, -1), withObject(roots.at(-1))].join(', ');
    return {
      domain: item.domain, label: label(item.domain), roots: [...item.roots],
      path: [item.chain[0].from, ...item.chain.map(hop => hop.to)].map(label).join(' → '),
      steps: item.chain.map(hop => ({ from: hop.from, to: hop.to, text: `${label(hop.from)} → ${label(hop.to)}: ${hop.userReason}`,
        evidence: hop.kinds.map(kind => REQUIRES_KIND_LABELS[kind] ?? kind), files: [...hop.evidence] })),
      removal: `이 기능을 빼려면 ${listed} ${roots.length > 1 ? '모두 ' : ''}해제하세요.`,
    };
  });
}
const signed = number => (number > 0 ? `+${number}` : number < 0 ? `−${-number}` : '0');
const DIFF_COUNT_LABELS = Object.freeze({ tables: '테이블', menus: '메뉴', permissions: '권한' });
/**
 * 계획 차이를 카드에 보일 한 문장으로 바꾼다(설계서 10장·E3). 늘고 주는 기능·테이블·메뉴·권한과
 * 새로 생기거나 사라지는 기능 저하, 생성을 막는 외래 키를 말한다. 들어오는 기능과 빠지는 기능은 이름을 붙인다
 * (누른 기능 하나만 움직이면 되풀이하지 않는다). 빼도 남는 기능은 무엇이 붙잡는지 먼저 말하고, 시작 구성에서
 * 직접 선택으로 바뀌며 생기는 다른 변화가 있으면 이어서 말한다.
 */
export function diffSummary(diff, catalog) {
  const label = id => catalog.capabilities.find(capability => capability.id === id)?.label ?? id;
  const named = ids => {
    const names = [...ids.filter(id => id === diff.domain), ...ids.filter(id => id !== diff.domain)].map(label);
    return names.length > 3 ? `${names.slice(0, 3).join(', ')} 외 ${names.length - 3}개` : names.join(', ');
  };
  // 누른 기능 하나만 들어오거나 빠지면 이름을 되풀이하지 않는다. 다른 기능이 함께 움직이면 양쪽을 모두 밝힌다.
  const [toward, against] = diff.action === 'add' ? [diff.added, diff.removed] : [diff.removed, diff.added];
  const plain = against.length === 0 && toward.every(id => id === diff.domain);
  const moved = plain ? [] : [
    ...(diff.added.length ? [`들어옴: ${named(diff.added)}`] : []),
    ...(diff.removed.length ? [`빠짐: ${named(diff.removed)}`] : []),
  ];
  const parts = [`기능 ${signed(diff.added.length - diff.removed.length)}${moved.length ? `(${moved.join('; ')})` : ''}`,
    ...Object.entries(DIFF_COUNT_LABELS).map(([key, name]) => `${name} ${signed(diff.counts[key][1] - diff.counts[key][0])}`)];
  if (diff.degraded.added.length) parts.push(`줄어드는 동작 ${diff.degraded.added.length}건 생김`);
  if (diff.degraded.resolved.length) parts.push(`줄어들던 동작 ${diff.degraded.resolved.length}건 해소`);
  if (diff.blockers.length) parts.push('필수 외래 키 때문에 생성할 수 없습니다');
  if (diff.action === 'remove' && diff.retainedBy.length) {
    const retained = `빼도 ${withSubject(diff.retainedBy.map(label).join(', '))} 요구해 계속 포함됩니다`;
    const changed = diff.added.length || diff.removed.length || diff.degraded.added.length || diff.degraded.resolved.length || diff.blockers.length
      || Object.keys(DIFF_COUNT_LABELS).some(key => diff.counts[key][0] !== diff.counts[key][1]);
    return changed ? `${retained} · ${parts.join(' · ')}` : `${retained}.`;
  }
  return `${diff.action === 'add' ? '고르면' : '빼면'} ${parts.join(' · ')}`;
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
const PREFLIGHT_TIMEOUT_MS = 10_000;
const LINE_LIMIT = 16 * 1024;

/** Windows shells are used only for fixed tool names and fixed argument lists. Recipe values never become shell code. */
export function runComposerCommand(command, args, { root, env = process.env, capture = false, log, timeoutMs } = {}) {
  return new Promise((accept, reject) => {
    const windows = process.platform === 'win32';
    const executable = command === 'node' ? process.execPath
      : windows && ['npm', 'pnpm'].includes(command) ? `${command}.cmd` : command;
    const shell = windows && ['npm.cmd', 'pnpm.cmd'].includes(executable);
    if (shell && args.some(value => !/^[A-Za-z0-9_./:= -]+$/.test(value))) return reject(new Error('Unsafe fixed-tool argument'));
    const startedAt = Date.now();
    // 시간 제한이 있으면 POSIX 에서는 새 프로세스 그룹으로 띄워 손자까지 한 번에 끝낼 수 있게 한다.
    const child = spawn(executable, args, { cwd: root, env, windowsHide: true, shell, stdio: ['ignore', 'pipe', 'pipe'], detached: Boolean(timeoutMs) && !windows });
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
    let timer;
    const settle = (exitCode, finish) => { if (settled) return; settled = true; clearTimeout(timer); written(exitCode); finish(); };
    if (timeoutMs) {
      // 시간 제한을 넘기면 프로세스 트리를 끝내고 close 를 기다리지 않고 실패로 돌려준다(점검처럼 오래 기다릴 수 없는 호출만 건다).
      // Windows 의 pnpm.cmd 는 손자 node 가 출력 파이프를 쥐고 남아, 자식만 끝내면 close 가 손자가 끝날 때까지 오지 않는다.
      timer = setTimeout(() => {
        if (child.pid) {
          if (windows) spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).on('error', () => {});
          else { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* 이미 끝났다. */ } }
        }
        child.stdout.destroy(); child.stderr.destroy();
        settle(null, () => reject(failed('TIMED_OUT', null)));
      }, timeoutMs);
    }
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
  // 계획 차이는 마지막으로 적재한 카탈로그와 메뉴 스냅숏을 다시 쓴다(카탈로그 적재는 수 초가 걸린다).
  // 차이는 미리보기일 뿐이고, 계획과 생성은 늘 카탈로그를 새로 적재해 다시 판정한다.
  let latest;
  const remember = (value, menus) => { latest = { catalog: value, menus }; return value; };
  const catalog = () => {
    const value = remember(loadCatalog(root));
    const sourceCommit = git(root, ['rev-parse', 'HEAD']);
    // 화면 문구는 카탈로그 해시 밖에 덧붙인다. 문구를 고쳐도 구성 해시가 바뀌지 않는다.
    return { ...value, sourceRef: sourceCommit, sourceCommit, presentation: composerPresentation(value, { routeKinds: loadRouteKinds(root) }) };
  };
  const plan = recipe => {
    const snapshot = loadProjectComposerMenus(root);
    const current = remember(loadCatalog(root), snapshot.menus);
    const composition = resolveProjectRecipe(recipe, current);
    // The local generator exports the inspected checkout. It never silently checks out another revision.
    const sourceCommit = git(root, ['rev-parse', '--verify', `${recipe.sourceRef}^{commit}`]);
    if (sourceCommit !== git(root, ['rev-parse', 'HEAD'])) throw new Error('Recipe sourceRef does not identify the current checkout');
    const owner = code => current.capabilities.find(capability => capability.permissionCodes.includes(code))?.id ?? 'core';
    return { ...composition, sourceCommit, blockers: foreignKeyBlockers(composition, current),
      inclusionNotes: inclusionNotes(composition, current),
      degradationNotes: degradationNotes(composition, current),
      // 기본 그룹이 없어 생성 직후 아무에게도 배정되지 않는 권한. 생성을 막지 않고, 완료 뒤 할 일로 보인다.
      unassignedPermissions: loadUnassignedPermissionGuidance(root).filter(row => composition.permissionCodes.includes(row.code))
        .map(row => ({ ...row, owner: owner(row.code) })),
      outputDirectory: `build/reusable-base/source/${composition.project.name}-<generation-id>`,
      menus: projectComposerMenuPreview(root, composition, snapshot),
      // 도구·작업 트리처럼 이 컴퓨터의 상태는 생성 전 점검(preflight)이 실제로 확인해 말한다.
      warnings: composition.requirements.map(requirement => `추가 설정: ${requirement}`),
    };
  };
  const diff = (recipe, domain) => {
    latest ??= { catalog: loadCatalog(root) };
    latest.menus ??= loadProjectComposerMenus(root).menus;
    const result = compositionDiff({ catalog: latest.catalog, menus: latest.menus, recipe, domain });
    return { ...result, summary: diffSummary(result, latest.catalog) };
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
  // 생성 전 점검: 명령 하나가 멈춰도 화면이 기다리지 않도록 명령마다 시간 제한을 둔다.
  // sourceCommit 은 점검을 요청한 화면이 카탈로그를 받은 때의 커밋이다(탭마다 다를 수 있어 엔진에 두지 않는다).
  const preflight = ({ sourceCommit } = {}) => composerPreflight({ outputRoot, sourceCommit,
    probe: (command, args) => run(command, args, { root, capture: true, timeoutMs: PREFLIGHT_TIMEOUT_MS }) });
  return { catalog, plan, diff, preflight, generate, outputRoot };
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
