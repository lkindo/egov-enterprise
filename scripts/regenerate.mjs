#!/usr/bin/env node
/**
 * 생성물 재생성 한 명령(오케스트레이션 프로토콜 §6.4). 손으로 돌리던 순서를 코드로 둔다.
 *
 * 사용법:
 *   npm run regen                   # 다시 쓴다 — 생성기 사슬 → SAST 예외 해시 확인 → 하네스 기준선 → Atlas, 끝에 바뀐 파일을 보인다
 *   npm run regen -- --check        # 쓰지 않는다 — 낡은 생성물·해시 결속이 있으면 종료 코드 1(pre-push 맨 앞에서 돈다)
 *   npm run regen -- --rebind-sast SAST-FP-001,SAST-FP-002 --note "Re-reviewed 2026-10-19: <무엇이 바뀌었고 어느 방어가 그대로인지>"
 *                                   # 방어 경계를 재검토한 SAST 예외 항목만 소스 해시를 다시 결속하고 사유 끝에 재검토 문장을 붙인다
 *
 * 순서의 근거(실패한 push 의 대부분이 이 순서를 어겼다):
 *   1. 생성기 사슬은 scripts/merge-main-regenerate.mjs 의 GENERATORS 를 그 순서로 돈다 — URL census 뒤에는 같은 파일의
 *      rebindApprovalText 로 승인 해시를 다시 결속한다. 생성기 목록·검사 명령을 이 파일에 다시 적지 않는다(같은 불변식을 두 곳에 두지 않는다).
 *   2. SAST 예외 원장(config/security/false-positive-review.json)은 자동으로 다시 결속하지 않는다(H2). 지원 소스 해시가 낡았으면
 *      그 항목과 파일을 보이고 하네스 기준선을 쓰기 전에 멈춘다 — 기준선이 그 원장의 해시를 담기 때문이다. 사람이 방어 경계를 재검토하고
 *      --rebind-sast 로 그 항목만 결속한 뒤 이 명령을 다시 돌린다(몇 번 돌려도 결과가 같다).
 *   3. 하네스 기준선(baseline-manifest.properties)은 손 결속 원장(gates.json·SAST 예외)과 훅·게이트 소스의 해시라 그 뒤에 쓴다.
 *   4. Atlas 는 문서·게이트 원장·훅을 읽는 마지막 단계다.
 *
 * 하지 않는 것: api-docs.json 추출(Gradle)과 메뉴 snapshot(일회용 PostgreSQL)은 §6.3 의 무거운 실행이라 따로 돌린다. 새 시험의 게이트
 * 등록(gates.json)과 고정 수 시험의 값은 사람이 정한다 — 이 명령은 그 결과를 해시할 뿐이다. 재생성으로 래칫 수치가 오르거나 새 예외가
 * 생기면 받아들이지 않고 원인을 본다(§6.4·H2). 바뀐 파일 목록과 diff 를 확인한 뒤 함께 커밋한다.
 *
 * --check 는 각 생성기 자신의 검사 모드(GENERATORS 의 check)를 병렬로 부르고, URL 승인 결속과 SAST 예외 해시, 재생성이 고치지 않는
 * 손 결속 원장 확인(LEDGER_CHECKS)을 함께 본다. 새 판정을 더하지 않는다 — 운영 계약·codegen 게이트가 같은 생성물·원장을 다시 본다.
 * pre-push 가 이것을 맨 앞에서 돌려, 낡은 생성물과 잊은 손 결속 값을 11분짜리 운영 계약 뒤가 아니라 수십 초 안에 알린다.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { GENERATORS, HARNESS_MANIFEST, HARNESS_MANIFEST_TOOL, URL_APPROVAL, URL_CENSUS, rebindApprovalText } from './merge-main-regenerate.mjs';
import { sourceHash } from './sast-exceptions.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const SAST_LEDGER = 'config/security/false-positive-review.json';
/** 마지막 생성기. 하네스 기준선을 이 앞에 끼운다. */
export const ATLAS_STEP = 'atlas';
const REVIEW_NOTE = /^Re-reviewed \d{4}-\d{2}-\d{2}: \S.{19,}$/s;

/** 배선 census 는 위반마다 `  - [코드] operation: 메시지` 머리줄을 쓴다 — 긴 목록이 붙어도 머리줄은 남긴다. */
function censusErrorHeadlines(output) {
  const headlines = output.split(/\r?\n/).filter(line => /^ {2}- \[[A-Z_]+\]/.test(line));
  return headlines.length ? headlines.join('\n') : output;
}

/** IA 처분 계약 CLI 는 JSON 요약을 쓴다 — 실패 판정인 structuralErrors 만 꺼낸다(뒤의 승인 차단 표본은 판정이 아니다). */
function dispositionStructuralErrors(output) {
  try {
    const errors = JSON.parse(output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1)).structuralErrors;
    if (Array.isArray(errors) && errors.length) return errors.join('\n');
  } catch { /* 요약을 읽지 못하면 원래 출력을 보인다. */ }
  return output;
}

/*
 * 손 결속 원장 확인(--check 전용, 쓰지 않는다). 재생성이 고치지 않는 사람이 맞추는 수·해시 — 배선 census 원장의 operation 수와 소비 래칫
 * (config/governance/operation-consumer-census.json 의 expected, OPERATION_COUNT_DRIFT 등), IA 처분 제안 원장의 라우트 원장 결속 해시
 * (manifestRef.sha256 ← config/ui-route-capabilities.json) — 를 잊은 push 가 운영 계약
 * (약 8~14분) 뒤에야 붉었다. 같은 CLI 를 운영 계약의 시험(operation-consumer-census.test.mjs·ui-navigation-disposition-contract.test.mjs)이
 * 그대로 다시 보므로 새 판정이 아니고 운영 계약에서 걷지 않는다. 둘 다 읽기만 하고 단독 실행이 수 초다(2026-10-28 실측 약 4초·1초 미만).
 * 게이트 원장의 Java 태그 집합 대조(governance-gates-contract)는 단독으로 싸게 부를 진입점이 없어 넣지 않았다.
 * 실패는 regen 으로 고쳐지지 않는다 — 출력대로 원장이나 원인을 고친다. 래칫을 올리거나 해시만 다시 결속해 신호를 지우지 않는다(H2).
 * 이 파일은 처분 제안 원장의 파일 이름을 적지 않는다 — 처분 계약은 그 이름을 담은 실행 소스를 미등록 소비자로 막는다(이 명령은 CLI 를
 * 부를 뿐 원장을 읽지 않는다).
 */
export const LEDGER_CHECKS = Object.freeze([
  Object.freeze({
    id: 'operation-consumer-census',
    requires: 'scripts/operation-consumer-census.mjs',
    command: ['node', ['scripts/operation-consumer-census.mjs']],
    excerpt: censusErrorHeadlines,
    hint: 'operation 수·래칫은 config/governance/operation-consumer-census.json 의 expected 가 정본이다 — regen 이 고치지 않는다.'
      + ' 표면 증감이면 expected.operationCount 를 맞추고, 래칫 초과는 원인을 고친다(상한을 올리면 사유를 남긴다, H2).',
  }),
  Object.freeze({
    id: 'ia-disposition-binding',
    requires: 'scripts/ui-navigation-disposition-contract.mjs',
    command: ['node', ['scripts/ui-navigation-disposition-contract.mjs']],
    excerpt: dispositionStructuralErrors,
    hint: 'IA 처분 제안 원장의 결속은 regen 밖이다 — 라우트 원장의 처분 범위가 정당하게 바뀌었을 때만 출력의 expected 값으로'
      + ' 다시 결속한다(오케스트레이션 프로토콜 §6.4).',
  }),
]);

function generatorStep(generator) {
  return {
    id: generator.id,
    kind: 'generator',
    requires: generator.requires,
    command: generator.command,
    check: generator.check ?? [],
    rebindUrlApproval: generator.rebindUrlApproval === true,
    // 슬롯 레지스트리처럼 출력이 디스크에서 정해지는 생성기가 있어 부를 때마다 읽는다.
    files: () => [...generator.outputs, ...(generator.touches ?? [])],
  };
}

/**
 * 재생성 단계 — GENERATORS 를 그 순서로 두고, Atlas 앞에 SAST 예외 해시 확인과 하네스 기준선을 끼운다(머리 주석의 순서 근거).
 * Atlas 가 없는 저장소(재사용 생성물)에서는 기준선이 마지막이다.
 */
export function regenerationSteps(generators = GENERATORS) {
  const atlasAt = generators.findIndex(generator => generator.id === ATLAS_STEP);
  const head = atlasAt < 0 ? generators : generators.slice(0, atlasAt);
  const tail = atlasAt < 0 ? [] : generators.slice(atlasAt);
  return [
    ...head.map(generatorStep),
    { id: 'sast-exceptions', kind: 'sast', requires: SAST_LEDGER, files: () => [] },
    {
      id: 'harness-baseline', kind: 'generator', requires: HARNESS_MANIFEST_TOOL,
      command: ['node', [HARNESS_MANIFEST_TOOL, '--write']], check: [['node', [HARNESS_MANIFEST_TOOL, '--check']]],
      rebindUrlApproval: false, files: () => [HARNESS_MANIFEST],
    },
    ...tail.map(generatorStep),
  ];
}

// ---------------------------------------------------------------- SAST 예외 원장

/** 결속 해시가 지금 소스와 다른 SAST 예외 항목 — `[{ id, files }]`. 원장을 쓰지 않는다. 소스가 없으면 그 파일을 낡은 것으로 본다. */
export function staleSastExceptions(cwd, ledger = JSON.parse(fs.readFileSync(path.join(cwd, SAST_LEDGER), 'utf8'))) {
  const current = (file, scope) => { try { return sourceHash(cwd, file, scope); } catch { return undefined; } };
  const stale = [];
  for (const entry of ledger.findings ?? []) {
    const files = [];
    if (current(entry.file) !== entry.sourceSha256) files.push(entry.file);
    for (const source of entry.supportingSources ?? []) if (current(source.file, source.scope) !== source.sha256) files.push(source.file);
    if (files.length) stale.push({ id: entry.id, files });
  }
  return stale;
}

/**
 * 사람이 재검토한 항목만 다시 결속한 원장 원문을 돌려준다. 재검토 문장은 `Re-reviewed YYYY-MM-DD: …` 형식이어야 하고 사유 끝에 붙는다.
 * 낡지 않은 항목·모르는 항목·지금 없는 소스는 거부한다 — 결속할 것이 없는 항목에 재검토 기록을 남기지 않는다.
 */
export function rebindSastLedgerText(ledgerText, { ids, note, cwd }) {
  if (!Array.isArray(ids) || ids.length === 0) throw new Error('--rebind-sast 에 재검토한 항목 id 를 쉼표로 준다');
  if (typeof note !== 'string' || !REVIEW_NOTE.test(note.trim())) {
    throw new Error('--note 는 "Re-reviewed YYYY-MM-DD: <바뀐 것과 그대로인 방어>" 형식이어야 한다(20자 이상)');
  }
  const ledger = JSON.parse(ledgerText);
  const stale = new Map(staleSastExceptions(cwd, ledger).map(entry => [entry.id, entry.files]));
  for (const id of ids) if (!stale.has(id)) throw new Error(`${id} 는 결속 해시가 낡은 항목이 아니다 — 다시 결속할 것이 없다`);
  for (const entry of ledger.findings) {
    if (!ids.includes(entry.id)) continue;
    entry.sourceSha256 = sourceHash(cwd, entry.file);
    for (const source of entry.supportingSources ?? []) source.sha256 = sourceHash(cwd, source.file, source.scope);
    entry.reason = `${entry.reason} ${note.trim()}`;
  }
  const text = `${JSON.stringify(ledger, null, 2)}\n`;
  return ledgerText.includes('\r\n') ? text.replaceAll('\n', '\r\n') : text;
}

function sastGuidance(stale) {
  return [
    'SAST 예외의 결속 해시가 낡았다 — 자동으로 다시 승인하지 않는다(H2):',
    ...stale.map(({ id, files }) => `  - ${id}: ${files.join(', ')}`),
    '  바뀐 소스가 그 예외의 방어 경계(사유에 적힌 방어)를 그대로 두는지 재검토한 뒤 그 항목만 다시 결속하고, 이 명령을 다시 돌린다:',
    `  npm run regen -- --rebind-sast ${stale.map(({ id }) => id).join(',')} --note "Re-reviewed ${new Date().toISOString().slice(0, 10)}: <바뀐 것과 그대로인 방어>"`,
  ].join('\n');
}

// ---------------------------------------------------------------- 실행

function executable(command) {
  return command === 'node' ? process.execPath : command;
}

function runSync(cwd, [command, args]) {
  // npm·pnpm 은 Windows 에서 .cmd 셸 스크립트라 셸로만 실행된다(merge-main-regenerate.mjs 와 같은 규칙).
  const shell = process.platform === 'win32' && (command === 'npm' || command === 'pnpm');
  const result = spawnSync(executable(command), args, { cwd, encoding: 'utf8', shell, maxBuffer: 64 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} 실패(${result.status})\n${result.stdout}${result.stderr}`);
  return result;
}

function runAsync(cwd, [command, args]) {
  return new Promise(resolve => {
    const shell = process.platform === 'win32' && (command === 'npm' || command === 'pnpm');
    const child = spawn(executable(command), args, { cwd, shell, windowsHide: true });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', error => resolve({ ok: false, output: `${output}${error.message}` }));
    child.on('close', code => resolve({ ok: code === 0, output }));
  });
}

const normalized = file => { try { return fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'); } catch { return undefined; } };

function snapshot(cwd, files) {
  return new Map(files.map(file => [file, normalized(path.join(cwd, file))]));
}

const available = (cwd, step) => !step.requires || fs.existsSync(path.join(cwd, step.requires));

/**
 * 다시 쓴다. 반환: `{ status: 'ready' | 'sast-stale', changed, stale }`. 시험은 `steps`·`runCommand`·`log` 를 바꿔 넘긴다.
 * 바뀐 파일은 단계의 출력 파일을 실행 전후로 비교해 고른다(줄 끝만 다른 것은 바뀐 것으로 보지 않는다).
 */
export function regenerate({ cwd = repoRoot, steps = regenerationSteps(), runCommand = runSync, log = console.log } = {}) {
  const watched = () => [...new Set(steps.flatMap(step => step.files()))].sort();
  const before = snapshot(cwd, watched());
  const changed = () => watched().filter(file => before.get(file) !== normalized(path.join(cwd, file)));
  for (const step of steps) {
    if (!available(cwd, step)) { log(`건너뜀: ${step.id} — ${step.requires} 이 이 저장소에 없다.`); continue; }
    if (step.kind === 'sast') {
      const stale = staleSastExceptions(cwd);
      if (stale.length) {
        log(sastGuidance(stale));
        log(`멈췄다 — 하네스 기준선과 그 뒤 단계를 쓰지 않았다. 지금까지 바뀐 파일: ${changed().join(', ') || '없음'}`);
        return { status: 'sast-stale', changed: changed(), stale };
      }
      log('확인: sast-exceptions — 결속 해시가 모두 현재 소스와 같다.');
      continue;
    }
    log(`재생성: ${step.id}`);
    runCommand(cwd, step.command);
    if (step.rebindUrlApproval) {
      const approval = path.join(cwd, URL_APPROVAL);
      fs.writeFileSync(approval, rebindApprovalText(fs.readFileSync(approval, 'utf8'), fs.readFileSync(path.join(cwd, URL_CENSUS), 'utf8')));
    }
  }
  const result = changed();
  log(result.length
    ? `바뀐 파일(${result.length}):\n${result.map(file => `  - ${file}`).join('\n')}\n`
      + 'diff 를 확인하고 함께 커밋한다 — 래칫 수치 상승·새 예외는 재생성으로 받아들이지 않는다(§6.4·H2).'
    : '바뀐 생성물이 없다.');
  return { status: 'ready', changed: result };
}

/** 손 결속 원장 확인 하나의 검사 일. 실패하면 판정 줄만 추리고 regen 이 고치지 않는다는 안내를 끝에 붙인다. */
function ledgerTask(cwd, check) {
  return { id: check.id, label: [check.command[0], ...check.command[1]].join(' '), run: async () => {
    const result = await runAsync(cwd, check.command);
    return result.ok ? result : { ok: false, output: `${check.excerpt(result.output).trimEnd()}\n→ ${check.hint}` };
  } };
}

/** 검사할 일 목록. 검사 명령이 없는 생성기는 낡았는지 알 수 없으므로 통과시키지 않는다. 원장 확인은 그 스크립트가 있는 저장소에서만 돈다. */
export function checkTasks(cwd, steps = regenerationSteps(), ledgerChecks = LEDGER_CHECKS) {
  const tasks = [];
  for (const step of steps) {
    if (!available(cwd, step)) continue;
    if (step.kind === 'sast') {
      tasks.push({ id: step.id, label: SAST_LEDGER, run: async () => {
        const stale = staleSastExceptions(cwd);
        return { ok: stale.length === 0, output: stale.length ? sastGuidance(stale) : '' };
      } });
      continue;
    }
    if (!step.check.length) throw new Error(`${step.id}: 검사 명령(check)이 없다 — merge-main-regenerate.mjs 의 GENERATORS 에 그 생성기의 검사 모드를 적는다`);
    for (const command of step.check) {
      tasks.push({ id: step.id, label: [command[0], ...command[1]].join(' '), run: () => runAsync(cwd, command) });
    }
    if (step.rebindUrlApproval) {
      tasks.push({ id: `${step.id}:approval`, label: `${URL_APPROVAL} ↔ ${URL_CENSUS}`, run: async () => {
        const approval = fs.readFileSync(path.join(cwd, URL_APPROVAL), 'utf8');
        const bound = rebindApprovalText(approval, fs.readFileSync(path.join(cwd, URL_CENSUS), 'utf8')) === approval;
        return { ok: bound, output: bound ? '' : `${URL_APPROVAL} 의 결속 해시가 ${URL_CENSUS} 와 다르다` };
      } });
    }
  }
  for (const check of ledgerChecks) if (available(cwd, check)) tasks.push(ledgerTask(cwd, check));
  return tasks;
}

/** 쓰지 않고 검사한다. 일은 서로 읽기만 하므로 동시에 돈다. 반환: `{ ok, results, seconds }`. */
export async function checkGenerated({ cwd = repoRoot, steps = regenerationSteps(), tasks = checkTasks(cwd, steps), log = console.log,
  concurrency = Math.max(2, (os.availableParallelism?.() ?? os.cpus().length) - 1) } = {}) {
  const started = Date.now();
  const results = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const index = next++;
      const taskStarted = Date.now();
      let outcome;
      try { outcome = await tasks[index].run(); } catch (error) { outcome = { ok: false, output: error.message }; }
      results[index] = { ...tasks[index], ...outcome, seconds: (Date.now() - taskStarted) / 1000 };
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  const seconds = (Date.now() - started) / 1000;
  for (const result of results) {
    log(`${result.ok ? '  ✔' : '  ✘'} ${result.id} (${result.label}) ${result.seconds.toFixed(1)}초`);
    if (!result.ok) {
      log(result.output.trimEnd().split(/\r?\n/).slice(-15)
        .map(line => `      ${line.length > 300 ? `${line.slice(0, 300)}…` : line}`).join('\n'));
    }
  }
  const ok = results.every(result => result.ok);
  log(ok
    ? `생성물이 모두 최신이다(${results.length}개 검사, ${seconds.toFixed(1)}초).`
    : `낡은 생성물·해시 결속이 있다(${seconds.toFixed(1)}초). \`npm run regen\` 으로 다시 만들고 diff 를 확인한 뒤 함께 커밋한다.`
      + ' 다시 만들어도 남으면 그 검사의 출력이 원인이다.');
  return { ok, results, seconds };
}

const USAGE = '사용법: npm run regen [-- --check | -- --rebind-sast <id,…> --note "Re-reviewed YYYY-MM-DD: …"]';

/*
 * npm 이 이 명령의 플래그를 자기 설정으로 삼킨 흔적. PowerShell 의 npm 래퍼는 `npm run regen -- --check` 의 `--` 를 지워, npm 이
 * `--check` 를 `npm_config_check=true` 로 먹고 스크립트에는 인자가 하나도 오지 않는다(2026-10-28 npm 11.6 실측). 인자 없는 실행은
 * 쓰기 재생성이므로, 검사만 하려던 명령이 생성물을 조용히 다시 쓴다. `--rebind-sast`·`--note` 도 같은 길로 사라질 수 있다.
 */
const NPM_SWALLOWED_FLAGS = Object.freeze(['npm_config_check', 'npm_config_rebind_sast', 'npm_config_note']);

/** npm 스크립트로 인자 없이 불렸는데 이 명령의 플래그가 npm 설정으로 남았으면 그 이름들 — 비었으면 정상 실행이다. */
export function swallowedNpmFlags(argv, env) {
  if (argv.length !== 0 || !env.npm_lifecycle_event) return [];
  return NPM_SWALLOWED_FLAGS.filter(name => env[name] !== undefined);
}

export async function main(argv, { cwd = repoRoot, log = console.log, error = console.error, env = process.env,
  write = options => regenerate(options) } = {}) {
  const swallowed = swallowedNpmFlags(argv, env);
  if (swallowed.length) {
    error([
      `npm 이 이 명령의 인자를 설정(${swallowed.join(', ')})으로 삼켜 인자 없이 불렸다 — 쓰기 재생성을 돌리지 않고 멈춘다.`,
      'PowerShell 의 npm 래퍼는 `--` 를 지운다. 검사는 `node scripts/regenerate.mjs --check` 로 직접 부르고,',
      'SAST 재결속은 `node scripts/regenerate.mjs --rebind-sast <id,…> --note "Re-reviewed YYYY-MM-DD: …"` 로 부른다.',
    ].join('\n'));
    return 2;
  }
  if (argv.length === 0) return write({ cwd, log }).status === 'ready' ? 0 : 1;
  if (argv.length === 1 && argv[0] === '--check') return (await checkGenerated({ cwd, log })).ok ? 0 : 1;
  const at = name => argv.indexOf(name);
  if (argv.length === 4 && at('--rebind-sast') >= 0 && at('--note') >= 0) {
    const ids = argv[at('--rebind-sast') + 1]?.split(',').map(id => id.trim()).filter(Boolean);
    const note = argv[at('--note') + 1];
    const file = path.join(cwd, SAST_LEDGER);
    fs.writeFileSync(file, rebindSastLedgerText(fs.readFileSync(file, 'utf8'), { ids, note, cwd }));
    log(`다시 결속했다: ${ids.join(', ')}. 이제 \`npm run regen\` 으로 하네스 기준선과 Atlas 를 다시 만든다.`);
    return 0;
  }
  error(USAGE);
  return 2;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (failure) {
    console.error(failure.message);
    process.exitCode = 1;
  }
}
