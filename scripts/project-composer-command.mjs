/*
 * 생성기가 자식 명령을 실행하고 그 출력을 가려 단계 로그에 남기는 공용 모듈. 엔진·메뉴 미리보기 자료 갱신이 같은 실행을 쓰고,
 * 생성 작업 실패 분류가 같은 가림 규칙으로 로그 끝부분을 다시 가린다. 다른 생성기 모듈을 가져오지 않는다.
 */
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SECRET_NAME = /PASS|SECRET|TOKEN|KEY|CREDENTIAL/i;
/** 이 환경의 비밀 이름(PASS·SECRET·TOKEN·KEY·CREDENTIAL)이 붙은 값. 로그를 다시 가릴 때 같은 목록을 쓴다. */
export const environmentSecrets = (env = process.env) => Object.entries(env ?? {}).filter(([name]) => SECRET_NAME.test(name)).map(([, value]) => value);
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
// 시간 초과·취소로 프로세스 트리를 끝낼 때 taskkill 을 기다리는 최대 시간.
const KILL_WAIT_MS = 5_000;

/** Windows shells are used only for fixed tool names and fixed argument lists. Recipe values never become shell code. */
/**
 * `onLine` 은 자식 출력 한 줄마다(가리기 전 원문) 불린다. 생성 작업이 검증기의 단계 머리줄을 보고 진행 단계를 알리는 데만 쓴다
 * (원문을 저장하거나 화면으로 보내지 않는다). `signal`(AbortSignal)이 취소되면 시간 제한과 같은 방법으로 프로세스 트리를 끝내고
 * CANCELLED 로 거부한다. 이미 취소된 신호면 명령을 띄우지 않는다.
 */
export function runComposerCommand(command, args, { root, env = process.env, capture = false, log, timeoutMs, onLine, signal } = {}) {
  return new Promise((accept, reject) => {
    const windows = process.platform === 'win32';
    const executable = command === 'node' ? process.execPath
      : windows && ['npm', 'pnpm'].includes(command) ? `${command}.cmd` : command;
    const shell = windows && ['npm.cmd', 'pnpm.cmd'].includes(executable);
    if (shell && args.some(value => !/^[A-Za-z0-9_./:= -]+$/.test(value))) return reject(new Error('Unsafe fixed-tool argument'));
    const commandId = command === 'node' ? args[0] : command;
    if (signal?.aborted) {
      return reject(Object.assign(new Error(`Command cancelled: ${command}`), { code: 'CANCELLED', commandId, exitCode: null, durationMs: 0 }));
    }
    const startedAt = Date.now();
    // 시간 제한이나 취소 신호가 있으면 POSIX 에서는 새 프로세스 그룹으로 띄워 손자까지 한 번에 끝낼 수 있게 한다.
    const child = spawn(executable, args, { cwd: root, env, windowsHide: true, shell, stdio: ['ignore', 'pipe', 'pipe'], detached: Boolean(timeoutMs || signal) && !windows });
    let output = '';
    // Output can contain credentials from dependencies: it is kept only masked, bounded and on this computer.
    const masker = createLogMasker(environmentSecrets(env));
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
      const take = part => {
        if (onLine) { try { onLine(part); } catch { /* 관찰자 오류가 명령 결과를 바꾸지 않는다. */ } }
        if (log) keep(part);
      };
      source.on('data', chunk => {
        if (!log && !onLine) return;
        const parts = (rest + chunk.toString()).split(/\r?\n/);
        rest = parts.pop();
        for (const part of parts) take(part);
      });
      return () => { if (rest) take(rest); rest = ''; };
    };
    child.stdout.on('data', chunk => { if (capture && output.length < 4 * 1024 * 1024) output += chunk.toString(); });
    const flush = [stream(child.stdout), stream(child.stderr)];
    const written = exitCode => {
      flush.forEach(finish => finish());
      if (!log) return;
      const header = masker.line(`$ ${[command, ...args].join(' ')}`);
      const omitted = dropped ? [`…앞 ${dropped}줄 생략(로그 상한 ${LOG_LIMIT}바이트, 끝부분 보존)`] : [];
      mkdirSync(dirname(log), { recursive: true });
      appendFileSync(log, `${[header, ...omitted, ...lines, `[종료 코드 ${exitCode ?? '없음'} · ${Date.now() - startedAt}ms · 가림 ${masker.count}건]`, ''].join('\n')}\n`);
    };
    const failed = (code, exitCode) => Object.assign(new Error(`Command failed: ${command} (${code}${exitCode === null ? '' : ` ${exitCode}`})`),
      { code, commandId, exitCode, durationMs: Date.now() - startedAt, ...(log ? { log } : {}) });
    // 실행 실패 뒤에도 close 가 올 수 있다. 로그와 결과는 한 번만 남긴다.
    let settled = false;
    let timer;
    let stopping;
    const onAbort = () => stopTree('CANCELLED');
    const settle = (exitCode, finish) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort', onAbort); written(exitCode); finish();
    };
    // 프로세스 트리를 끝내고 close 를 기다리지 않고 실패로 돌려준다(시간 제한·취소).
    // Windows 의 pnpm.cmd 는 손자 node 가 출력 파이프를 쥐고 남아, 자식만 끝내면 close 가 손자가 끝날 때까지 오지 않는다.
    // 그래서 close 대신 taskkill 이 트리를 끝낼 때까지 기다린다(정리하는 쪽이 아직 살아 있는 손자와 폴더를 다투지 않게, 최대 5초).
    function stopTree(code) {
      if (settled || stopping) return;
      stopping = code;
      clearTimeout(timer);
      const finish = () => { child.stdout.destroy(); child.stderr.destroy(); settle(null, () => reject(failed(code, null))); };
      // 자식이 이미 끝났으면(손자가 파이프만 쥐고 있으면) 그 번호는 다른 프로세스가 다시 받았을 수 있다. 그 번호로 트리를 끝내지 않는다.
      const exited = child.exitCode !== null || child.signalCode !== null;
      if (child.pid && windows && !exited) {
        const guard = setTimeout(finish, KILL_WAIT_MS);
        const done = () => { clearTimeout(guard); finish(); };
        spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).on('exit', done).on('error', done);
        return;
      }
      // POSIX 프로세스 그룹은 구성원이 남아 있는 동안 번호가 재사용되지 않으므로, 자식이 끝났어도 그룹(손자)을 끝낸다.
      if (child.pid && !windows) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* 이미 끝났다. */ } }
      finish();
    }
    // 시간 제한은 점검처럼 오래 기다릴 수 없는 호출에만 건다.
    if (timeoutMs) timer = setTimeout(() => stopTree('TIMED_OUT'), timeoutMs);
    signal?.addEventListener('abort', onAbort, { once: true });
    // 실행하지 못한 원인(errno)을 함께 싣는다. 작업 폴더가 없을 때도 같은 이벤트(ENOENT)가 나므로, 생성 작업은 작업 폴더가
    // 늘 있는 docker 호출 지점에서만 이 값으로 도구 부재를 판정한다(코드만 보고 도구 부재라고 말하지 않는다).
    // 멈추는 중에 온 종료·오류는 멈춘 이유(시간 초과·취소)로 돌려준다.
    child.on('error', spawnError => settle(null, () => reject(stopping ? failed(stopping, null)
      : Object.assign(failed('TOOL_UNAVAILABLE', null), { errno: spawnError.code }))));
    child.on('close', code => settle(code, () => stopping ? reject(failed(stopping, null))
      : code === 0 ? accept(output.trim()) : reject(failed('COMMAND_FAILED', code))));
  });
}
