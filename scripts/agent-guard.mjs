#!/usr/bin/env node
/**
 * 에이전트가 셸 명령을 실행하기 전에 거치는 공용 가드 — Claude Code·Codex·Antigravity 가 같은 규칙을 쓴다.
 *
 * 규칙은 아래 RULES 하나다. 각 규칙은 이 저장소에서 실제로 반복된 실수에서 왔고(why), 대신 쓸 방법을 알려 준다(fix) —
 * 에이전트 한쪽의 기억에 글로만 남아 있던 함정을 어느 에이전트가 작업해도 걸리는 장치로 옮긴 것이다(pstack /correct 방식).
 * 도구별 연결은 얇은 어댑터 셋이다: `.claude/settings.json`(PreToolUse), `.codex/hooks.json`(PreToolUse),
 * `.agents/hooks.json`(Antigravity PreToolUse). 판정은 모두 이 파일이 한다.
 *
 * 병합 권위는 required CI 이고, 이 가드는 그 앞에서 같은 실수를 일찍 막는 보조다. 그래서 입력을 읽지 못하거나 판정 중 오류가 나면
 * 아무 판정도 내지 않는다(평소 권한 흐름 그대로). 막지 않은 명령에도 승인을 대신 내리지 않는다.
 *
 *   deny — 막고 이유와 대신 쓸 방법을 에이전트에게 돌려준다.
 *   ask  — 사용자에게 묻는다(AGENTS.md 가 사전 승인을 요구하는 작업). Codex 는 묻는 판정이 없어 막고 "사용자 승인 후 직접 실행"을 안내한다.
 *
 * 사용: node scripts/agent-guard.mjs --agent claude|codex|antigravity   (stdin 으로 각 도구의 PreToolUse 입력 JSON)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { delimiter, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AGENTS = new Set(['claude', 'codex', 'antigravity']);

/**
 * heredoc·PowerShell here-string 의 본문을 지운다 — 커밋 메시지 속 문구가 규칙에 걸리지 않게 한다.
 * here-string 끝줄의 뒤쪽(`'@ | git commit -F -`)은 명령이라 남긴다.
 */
export function withoutHeredocBodies(command) {
  const lines = command.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let terminator = null;
  for (const line of lines) {
    if (terminator) {
      const end = terminator.exec(line);
      out.push(end ? (end[1] ?? '') : '');
      if (end) terminator = null;
      continue;
    }
    out.push(line);
    const heredoc = /<<-?\s*(['"]?)([A-Za-z_][\w-]*)\1/.exec(line);
    if (heredoc) { terminator = new RegExp(`^\\s*${heredoc[2]}\\s*$`); continue; }
    const hereString = /@(['"])\s*$/.exec(line);
    if (hereString) terminator = new RegExp(`^${hereString[1]}@(.*)$`);
  }
  return out.join('\n');
}

/** 따옴표 안의 내용을 같은 길이의 밑줄로 가린다 — `-m "… --no-verify …"` 같은 메시지 속 문구를 플래그로 읽지 않는다. */
export function maskQuoted(text) {
  return text.replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, (quoted) => quoted[0] + '_'.repeat(Math.max(0, quoted.length - 2)) + quoted.at(-1));
}

/** 셸 구분자(&&·||·;·|·줄바꿈)로 나눈 명령 조각. 원문(heredoc 본문 제외)과 따옴표를 가린 판을 짝으로 돌려준다. */
export function segments(command) {
  const raw = withoutHeredocBodies(command);
  const masked = maskQuoted(raw);
  const parts = [];
  let start = 0;
  const separator = /&&|\|\||[;|\n]/g;
  for (let match; (match = separator.exec(masked));) {
    parts.push({ raw: raw.slice(start, match.index), code: masked.slice(start, match.index) });
    start = match.index + match[0].length;
  }
  parts.push({ raw: raw.slice(start), code: masked.slice(start) });
  return parts.filter((part) => part.code.trim());
}

const tokens = (text) => text.trim().split(/\s+/).filter(Boolean);
const unquote = (value) => value.replace(/^(['"])(.*)\1$/s, '$2');

/** git 호출이면 하위 명령과 그 뒤 인자. `git -C dir -c k=v commit …` 형태를 읽는다. */
export function gitInvocation(code) {
  const words = tokens(code);
  const at = words.findIndex((word) => /(^|[\\/])git(\.exe)?$/i.test(word));
  if (at < 0) return null;
  let index = at + 1;
  while (index < words.length && words[index].startsWith('-')) index += ['-C', '-c'].includes(words[index]) ? 2 : 1;
  if (index >= words.length) return null;
  return { sub: words[index], args: words.slice(index + 1) };
}

const hasFlag = (args, ...flags) => args.some((arg) => flags.includes(arg) || flags.some((flag) => flag.startsWith('--') && arg.startsWith(`${flag}=`)));
const hasShortFlag = (args, letter) => args.some((arg) => /^-[A-Za-z]+$/.test(arg) && arg.includes(letter));

function onPath(executable) {
  const names = process.platform === 'win32' ? [`${executable}.exe`, `${executable}.cmd`, executable] : [executable];
  return (process.env.PATH ?? '').split(delimiter).some((dir) => dir && names.some((name) => existsSync(join(dir, name))));
}

function repoTop(cwd) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? result.stdout.trim() : null;
}

function mergeInProgress(cwd) {
  const result = spawnSync('git', ['rev-parse', '--git-path', 'MERGE_HEAD'], { cwd, encoding: 'utf8', windowsHide: true });
  return result.status === 0 && existsSync(resolve(cwd, result.stdout.trim()));
}

/** 기본 test 태스크에서 빠지는 태그와 그 태그만 돌리는 태스크(api-server/build.gradle). */
const TAGGED_TASKS = Object.freeze({ 'governance-harness': 'harnessTest', 'schema-validation': 'schemaValidationTest' });

function taggedClasses(cwd) {
  const top = repoTop(cwd);
  const base = top && join(top, 'api-server', 'src', 'test', 'java');
  const found = new Map();
  if (!base || !existsSync(base)) return found;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.java')) {
        const tag = /@Tag\("(governance-harness|schema-validation)"\)/.exec(readFileSync(path, 'utf8'))?.[1];
        if (tag) found.set(entry.name.slice(0, -'.java'.length), tag);
      }
    }
  };
  walk(base);
  return found;
}

/** `--tests` 값마다 그 값을 받는 Gradle 태스크(바로 앞 태스크)를 짝짓는다. */
function gradleTestFilters(raw) {
  const words = tokens(raw);
  const pairs = [];
  let task = null;
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (word === '--tests' && index + 1 < words.length) { pairs.push({ task, filter: unquote(words[index + 1]) }); index += 1; }
    else if (word.startsWith('--tests=')) pairs.push({ task, filter: unquote(word.slice('--tests='.length)) });
    else if (!word.startsWith('-') && !/gradlew/i.test(word)) task = word;
  }
  return pairs;
}

/**
 * 규칙 표. 각 규칙은 명령 조각 하나와 맥락(cwd·원문 전체)을 받아 걸리면 사유를 돌려준다.
 * why 는 근거가 된 실제 사고, fix 는 대신 쓸 방법이다 — 오류 메시지가 고칠 방법을 말해야 같은 실수가 반복되지 않는다.
 */
export const RULES = Object.freeze([
  {
    id: 'git-no-verify', decision: 'ask',
    why: 'git 훅(gitleaks·pre-push 검증)을 건너뛴다 — 훅 우회는 사용자가 명시적으로 허락한 경우만 한다.',
    fix: '훅이 막은 원인을 고친다. 오탐이면 사용자에게 알리고 승인을 받는다.',
    match: ({ git }) => git && ['commit', 'push', 'merge', 'rebase', 'cherry-pick', 'revert', 'am', 'pull'].includes(git.sub)
      && (hasFlag(git.args, '--no-verify') || (git.sub === 'commit' && hasShortFlag(git.args, 'n'))),
  },
  {
    id: 'git-force-push', decision: 'ask',
    why: '강제 푸시는 원격 이력을 덮는다 — AGENTS.md 가 사전 설명과 승인을 요구한다.',
    fix: '대상 브랜치·덮이는 커밋을 사용자에게 설명하고 승인을 받는다.',
    match: ({ git }) => git?.sub === 'push' && (hasFlag(git.args, '--force', '--force-with-lease', '--force-if-includes')
      || hasShortFlag(git.args, 'f') || git.args.some((arg) => arg.startsWith('+'))),
  },
  {
    id: 'git-discard-worktree', decision: 'ask',
    why: '작업 트리·브랜치를 되돌릴 수 없게 지운다 — 같은 워킹트리를 쓰는 다른 에이전트·사용자의 WIP 가 함께 사라진다(AGENTS 공유 워킹트리).',
    fix: '지울 대상을 git status·git diff 로 확인해 사용자에게 보이고 승인을 받는다. 자기 변경만 되돌리려면 경로를 지정한다.',
    match: ({ git }) => {
      if (!git) return false;
      const { sub, args } = git;
      if (sub === 'reset') return hasFlag(args, '--hard');
      if (sub === 'clean') return hasFlag(args, '--force') || hasShortFlag(args, 'f');
      if (sub === 'checkout') return args.includes('.') || (args.includes('--') && args[args.indexOf('--') + 1] === '.');
      if (sub === 'restore') return args.includes('.') && !(hasFlag(args, '--staged', '-S') && !hasFlag(args, '--worktree', '-W'));
      if (sub === 'branch') return args.includes('-D') || (hasFlag(args, '--delete', '-d') && hasFlag(args, '--force', '-f'));
      if (sub === 'stash') return ['drop', 'clear'].includes(args[0]);
      return false;
    },
  },
  {
    id: 'git-commit-without-only', decision: 'deny',
    why: '공유 워킹트리에서 index 전체를 커밋하면 다른 작업의 변경이 섞인다(AGENTS 공유 워킹트리와 Git).',
    fix: '자기 경로만 git commit --only -m "…" -- <paths> 로 커밋한다(-m 은 -- 앞에 둔다). 병합 충돌을 푼 커밋은 그대로 된다.',
    match: ({ git, cwd }) => git?.sub === 'commit' && !hasFlag(git.args, '--only') && !hasShortFlag(git.args, 'o')
      && !hasFlag(git.args, '--dry-run') && !mergeInProgress(cwd),
  },
  {
    id: 'powershell-herestring-commit', decision: 'deny',
    why: 'PowerShell here-string 을 git commit -F - 의 stdin 으로 넘기면 전달되지 않아 커밋이 조용히 무산되고, 뒤의 push 는 "Everything up-to-date" 로 성공처럼 보인다(2026-08-19).',
    fix: '메시지를 파일로 써서 git commit -F <파일> 로 넘기거나 Bash 의 heredoc 을 쓴다. 커밋 뒤 git log --oneline -1 로 확인한다.',
    match: ({ git, command }) => git?.sub === 'commit' && /@['"]\s*\r?\n/.test(command)
      && (git.args.includes('-F') ? git.args[git.args.indexOf('-F') + 1] === '-' : hasFlag(git.args, '--file') && /--file(=|\s+)-(\s|$)/.test(command)),
  },
  {
    id: 'jq-not-installed', decision: 'deny',
    why: '이 PC 에는 jq 가 없다 — `gh … --json | jq` 감시는 오류 없이 빈 출력으로 계속 돌아 "아직 대기 중"과 "감시가 죽음"을 구분하지 못한다(2026-09-04).',
    fix: 'gh 의 --jq 옵션이나 node -e 로 JSON 을 읽는다. gh pr checks 는 탭 구분 기본 출력을 awk -F"\\t" 로 읽는다.',
    match: ({ code }) => {
      const words = tokens(code).filter((word) => !/^\w+=/.test(word));
      return /(^|[\\/])jq(\.exe)?$/i.test(words[0] ?? '') && !onPath('jq');
    },
  },
  {
    id: 'flyway-seed-dev', decision: 'deny',
    why: 'db/seed-dev 는 알려진 개발 자격(TEST1 비밀번호 1)과 가짜 감사 로그라 dev·e2e 일회용 DB 에만 넣는다. 공유 DB 이력에는 없어 넣으면 처음 적용된다.',
    fix: 'Flyway 위치는 db/migration 하나만 준다(docs/04-operations/shared-oci-migration-apply-log.md 절차).',
    match: ({ raw, code }) => /\bflyway\b/i.test(code) && /seed-dev/.test(raw) && /\b(migrate|repair|baseline)\b/i.test(code),
  },
  {
    id: 'openapi-relative-export-path', decision: 'deny',
    why: 'test JVM 의 작업 디렉터리는 api-server/ 라 상대 경로를 주면 루트 api-docs.json 은 그대로이고 api-server/api-docs.json 이 새로 생긴다(2026-09-08).',
    fix: '-Dopenapi.export.path 에 저장소 루트 기준 절대 경로를 준다.',
    // 플래그는 따옴표를 가린 판에서 찾고 값만 같은 자리의 원문에서 읽는다 — 프롬프트·메시지 속 문구를 명령으로 읽지 않는다.
    match: ({ raw, code }) => {
      const at = code.search(/-Dopenapi\.export\.path=/);
      if (at < 0) return false;
      const value = /^-Dopenapi\.export\.path=("[^"]*"|'[^']*'|\S+)/.exec(raw.slice(at))?.[1];
      return value !== undefined && !/^([A-Za-z]:[\\/]|\/)/.test(unquote(value));
    },
  },
  {
    id: 'tagged-test-on-default-task', decision: 'deny',
    why: '@Tag("governance-harness")·@Tag("schema-validation") 시험은 기본 test 태스크에서 빠진다 — 그 태스크에 --tests 로 걸면 0건이 돌고도 BUILD SUCCESSFUL 이다(2026-09-05).',
    fix: '하네스 시험은 :api-server:harnessTest --tests, 스키마 시험은 :api-server:schemaValidationTest --tests 로 돌린다(한 호출에 함께 걸 수 있다).',
    match: ({ raw, code, cwd }) => {
      if (!/gradlew/i.test(code) || !/--tests/.test(code)) return false;
      const filters = gradleTestFilters(raw).filter(({ task }) => task && /(^|:)test$/.test(task));
      if (!filters.length) return false;
      const tagged = taggedClasses(cwd);
      return filters.some(({ filter }) => {
        const simple = filter.split('.').at(-1).replace(/\*/g, '');
        return simple && [...tagged.keys()].some((name) => name === simple || (filter.includes('*') && name.includes(simple)));
      });
    },
  },
  {
    id: 'worktree-name-collides-with-e2e', decision: 'deny',
    why: 'Playwright 매처와 E2E 선별 계획기가 spec 의 절대 경로에 정규식을 적용해, 경로 이름에 quality·journeys·contracts·setup 이 있으면 소유가 모호하다고 붉다(2026-10-19).',
    fix: '작업 트리는 D:\\wt-<짧은 이름> 으로 두되 그 넷으로 끝나는 디렉터리 이름을 쓰지 않는다(SOP §6.6).',
    match: ({ git, raw }) => {
      if (git?.sub !== 'worktree' || git.args[0] !== 'add') return false;
      const words = tokens(raw);
      const at = words.findIndex((word) => word === 'add');
      const options = new Set(['-b', '-B', '--reason']);
      let path = null;
      for (let index = at + 1; index < words.length; index += 1) {
        if (options.has(words[index])) { index += 1; continue; }
        if (words[index].startsWith('-')) continue;
        path = unquote(words[index]);
        break;
      }
      return path !== null && path.split(/[\\/]/).some((part) => /(quality|journeys|contracts|setup)$/i.test(part));
    },
  },
  {
    id: 'gitleaks-worktree-mount', decision: 'deny',
    why: '작업 트리의 .git 은 원본을 가리키는 파일이라 그 경로만 마운트한 gitleaks 는 0바이트를 읽고 "no leaks" 를 낸다(2026-09-26).',
    fix: '원본 저장소 경로를 마운트하고 같은 --log-opts 로 검사하거나 git archive 로 꺼낸 파일을 검사한다. 출력의 scanned 바이트가 0 이 아닌지 본다.',
    match: ({ raw, code, cwd }) => {
      if (!/gitleaks/i.test(code) || !/\bdocker\b/.test(code)) return false;
      const mounts = [...raw.matchAll(/(?:-v|--volume)(?:\s+|=)("[^"]+"|'[^']+'|\S+)/g)].map((match) => unquote(match[1]));
      return mounts.some((mount) => {
        const source = mount.replace(/:[\\/][^:]*(?::[a-z]+)?$/i, '')
          .replace(/^\/([A-Za-z])\//, process.platform === 'win32' ? '$1:/' : '/$1/');
        const dir = isAbsolute(source) || /^[A-Za-z]:/.test(source) ? source : resolve(cwd, source);
        try { return statSync(join(dir, '.git')).isFile(); } catch { return false; }
      });
    },
  },
]);

/** 명령 하나를 판정한다. 걸린 규칙이 없으면 null, 있으면 가장 강한 판정(deny > ask)과 사유들. */
export function evaluate(command, { cwd = process.cwd() } = {}) {
  if (typeof command !== 'string' || !command.trim()) return null;
  const hits = [];
  for (const part of segments(command)) {
    const context = { command, raw: part.raw, code: part.code, git: gitInvocation(part.code), cwd };
    for (const rule of RULES) {
      if (hits.some((hit) => hit.id === rule.id)) continue;
      let matched = false;
      try { matched = Boolean(rule.match(context)); } catch { matched = false; }
      if (matched) hits.push(rule);
    }
  }
  if (!hits.length) return null;
  return {
    decision: hits.some((hit) => hit.decision === 'deny') ? 'deny' : 'ask',
    rules: hits.map((hit) => hit.id),
    reason: hits.map((hit) => `[agent-guard:${hit.id}] ${hit.why} → ${hit.fix}`).join('\n'),
  };
}

/** 각 도구의 PreToolUse 입력에서 명령 문자열과 작업 디렉터리를 꺼낸다. 셸 명령이 아니면 null. */
export function readHookInput(agent, input) {
  if (agent === 'antigravity') {
    const args = input?.toolCall?.args ?? {};
    const command = args.CommandLine ?? args.commandLine ?? args.command;
    return typeof command === 'string' ? { command, cwd: args.Cwd ?? args.cwd ?? input.workspacePaths?.[0] ?? process.cwd() } : null;
  }
  const raw = input?.tool_input?.command ?? input?.tool_input?.cmd;
  const command = Array.isArray(raw) ? raw.join(' ') : raw;
  return typeof command === 'string' ? { command, cwd: input.cwd ?? process.cwd() } : null;
}

/** 판정을 각 도구의 출력 형식으로 바꾼다. 판정이 없으면 평소 권한 흐름이 그대로 가도록 아무것도 정하지 않는다. */
export function renderVerdict(agent, verdict) {
  if (agent === 'antigravity') {
    return JSON.stringify(verdict ? { decision: verdict.decision === 'ask' ? 'force_ask' : 'deny', reason: verdict.reason } : {});
  }
  if (!verdict) return '';
  const decision = agent === 'codex' && verdict.decision === 'ask' ? 'deny' : verdict.decision;
  const reason = agent === 'codex' && verdict.decision === 'ask'
    ? `사용자 승인이 필요한 작업이다 — 사용자에게 설명하고 승인 후 사용자가 직접 실행한다.\n${verdict.reason}`
    : verdict.reason;
  return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason } });
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main(argv) {
  const at = argv.indexOf('--agent');
  const agent = at >= 0 ? argv[at + 1] : null;
  if (!AGENTS.has(agent)) {
    process.stderr.write('사용법: node scripts/agent-guard.mjs --agent claude|codex|antigravity\n');
    return;
  }
  let output = renderVerdict(agent, null);
  try {
    const hook = readHookInput(agent, JSON.parse(await readStdin()));
    if (hook) output = renderVerdict(agent, evaluate(hook.command, { cwd: hook.cwd }));
  } catch {
    // 판정할 수 없으면 막지 않는다 — 병합 권위는 CI 다.
  }
  if (output) process.stdout.write(output);
}

if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  await main(process.argv.slice(2));
}
