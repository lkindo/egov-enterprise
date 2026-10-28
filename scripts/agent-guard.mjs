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
 * 아무 판정도 내지 않는다(평소 권한 흐름 그대로). 막지 않은 명령에도 승인을 대신 내리지 않는다. 다만 "걸린 규칙 없음"과 구분되도록
 * 실패한 규칙 id(또는 단계 이름)와 오류 이름만 stderr 에 한 줄 남긴다 — 명령 원문·인자·오류 메시지는 비밀이 섞일 수 있어 남기지 않는다.
 * 어댑터가 살아 있는지는 `echo AGENT_GUARD_CANARY` 가 막히는지로 본다(guard-canary 규칙).
 *
 *   deny — 막고 이유와 대신 쓸 방법을 에이전트에게 돌려준다.
 *   ask  — 사용자에게 묻는다(AGENTS.md 가 사전 승인을 요구하는 작업). Codex 는 묻는 판정이 없어 막고 "사용자 승인 후 직접 실행"을 안내한다.
 *
 * 사용: node scripts/agent-guard.mjs --agent claude|codex|antigravity   (stdin 으로 각 도구의 PreToolUse 입력 JSON)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, delimiter, dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const AGENTS = new Set(['claude', 'codex', 'antigravity']);

/** 한 줄에서 heredoc 시작(`<<EOF`·`<<-'EOF'`)의 구분자. 같은 줄에서 닫히는 문자열 안의 `<<`(예: `-m "Fix << EOF"`)는 세지 않는다. */
function heredocDelimiter(line) {
  const literals = [];
  for (const match of line.matchAll(/'[^']*'|"(?:\\.|[^"\\])*"/g)) {
    // `<<'EOF'` 의 따옴표는 구분자 표기라 문자열 리터럴이 아니다.
    if (/<<-?\s*$/.test(line.slice(0, match.index))) continue;
    literals.push([match.index, match.index + match[0].length]);
  }
  for (const match of line.matchAll(/<<-?\s*(['"]?)([A-Za-z_][\w-]*)\1/g)) {
    if (line[match.index - 1] === '<') continue; // `<<<` here-string
    if (literals.some(([start, end]) => match.index > start && match.index < end)) continue;
    return match[2];
  }
  return null;
}

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
    const delimiter = heredocDelimiter(line);
    if (delimiter) { out.push(line); terminator = new RegExp(`^\\s*${delimiter}\\s*$`); continue; }
    const hereString = /@(['"])\s*$/.exec(line);
    // 여는 표시(`@'`)도 공백으로 바꾼다 — 남기면 따옴표 가리기가 그 `'` 를 문자열 시작으로 읽어 뒤를 모두 가린다.
    // here-string 규칙은 원문 전체(command)에서 여는 표시를 따로 본다.
    out.push(hereString ? line.slice(0, hereString.index) + ' '.repeat(line.length - hereString.index) : line);
    if (hereString) terminator = new RegExp(`^${hereString[1]}@(.*)$`);
  }
  return out.join('\n');
}

/**
 * 따옴표 안의 내용은 같은 길이의 밑줄로, 셸 주석(`#` 뒤)은 공백으로 가린다 — 메시지·주석 속 문구를 명령으로 읽지 않는다.
 * 문자를 하나씩 읽어 주석 속 아포스트로피(`# Let's …`)가 다음 줄 명령까지 문자열로 삼키지 않게 한다.
 * 큰따옴표 안의 `\"`·PowerShell 의 `` `" `` 는 문자열을 닫지 않는다.
 */
export function maskQuoted(text) {
  let out = '';
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (quote === '"' && (char === '\\' || char === '`') && index + 1 < text.length) { out += '__'; index += 1; continue; }
      if (char === quote) { out += char; quote = null; continue; }
      out += '_';
      continue;
    }
    if (char === '#' && (index === 0 || /\s/.test(text[index - 1]))) {
      const end = text.indexOf('\n', index);
      const stop = end < 0 ? text.length : end;
      out += ' '.repeat(stop - index);
      index = stop - 1;
      continue;
    }
    if (char === '\'' || char === '"') quote = char;
    out += char;
  }
  return out;
}

/**
 * 줄 이음(bash 의 `\`+줄바꿈, PowerShell 의 `` ` ``+줄바꿈)을 같은 길이의 공백으로 바꾼다 — 여러 줄로 쓴 한 명령을 한 조각으로 읽는다.
 * 길이를 보존해 원문과 가린 판의 위치가 그대로 맞는다. heredoc 본문을 지운 뒤에 쓴다(본문 끝의 `\` 가 끝줄을 삼키지 않게).
 */
export function joinContinuations(text) {
  return text.replace(/[\\`]\r?\n/g, (match) => ' '.repeat(match.length));
}

/** 셸 구분자(&&·||·;·|·줄바꿈)로 나눈 명령 조각. 원문(heredoc 본문 제외)과 따옴표를 가린 판을 짝으로 돌려준다. */
export function segments(command) {
  return splitSegments(withoutHeredocBodies(command));
}

/**
 * heredoc 본문을 이미 지운 원문을 조각으로 나눈다. withoutHeredocBodies 는 두 번 적용하면 안 된다(끝줄을 지운 뒤라 뒤를 모두 본문으로 읽는다).
 * 각 조각은 원문 안의 위치(start·end)도 갖는다 — 명령 치환이 어느 조각 뒤에서 실행되는지 가른다.
 */
function splitSegments(raw) {
  const masked = maskQuoted(raw);
  const parts = [];
  let start = 0;
  const separator = /&&|\|\||[;|\n]/g;
  for (let match; (match = separator.exec(masked));) {
    parts.push({ raw: raw.slice(start, match.index), code: masked.slice(start, match.index), start, end: match.index });
    start = match.index + match[0].length;
  }
  parts.push({ raw: raw.slice(start), code: masked.slice(start), start, end: raw.length });
  return parts.filter((part) => part.code.trim());
}

const tokens = (text) => text.trim().split(/\s+/).filter(Boolean);
const unquote = (value) => value.replace(/^(['"])(.*)\1$/s, '$2');

/** 뒤 단어를 명령 자리에 두는 셸 예약어 — `for …; do git …`·`if …; then …; else …` 의 조각은 예약어 다음이 명령이다. */
const SHELL_KEYWORDS = new Set(['do', 'then', 'else', 'elif', 'if', 'while', 'until']);

/** 조각의 명령 단어 위치 — 앞의 환경 변수 대입(`K=V`), PowerShell 호출 연산자(`&`), 셸 예약어를 건너뛴다. */
function commandAt(words) {
  let index = 0;
  while (index < words.length && (/^[A-Za-z_]\w*=/.test(words[index]) || words[index] === '&' || SHELL_KEYWORDS.has(words[index]))) index += 1;
  return index;
}

/** Git Bash 의 `/d/…` 경로를 Windows 경로(`d:/…`)로 바꾼다. 다른 플랫폼은 그대로다. */
const fromMsysPath = (path) => (process.platform === 'win32' ? path.replace(/^\/([A-Za-z])(\/|$)/, '$1:/') : path);

/**
 * git 호출이면 하위 명령·인자와 `-C` 디렉터리. `git -C dir -c k=v commit …` 형태를 읽는다.
 * git 은 명령 자리에 있을 때만 센다 — `rg git commit docs` 의 git 은 검색어다.
 */
/** 값을 다음 단어로 받는 git 전역 옵션 — 그 값(`--git-dir <경로>` 의 경로)을 하위 명령으로 읽지 않는다. */
// `--exec-path` 는 값 없이 쓰면 경로를 출력하고 `--config-env` 는 `=` 형태만 받으므로 넣지 않는다.
const GIT_VALUE_OPTIONS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--super-prefix']);

export function gitInvocation(code) {
  const words = tokens(code);
  const at = commandAt(words);
  if (!/(^|[\\/])git(\.exe)?$/i.test(words[at] ?? '')) return null;
  let index = at + 1;
  let dir = null;
  while (index < words.length && words[index].startsWith('-')) {
    if (words[index] === '-C') dir = words[index + 1] ?? null;
    index += GIT_VALUE_OPTIONS.has(words[index]) ? 2 : 1;
  }
  if (index >= words.length) return null;
  return { sub: words[index], args: words.slice(index + 1), dir };
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

/**
 * 지우려는 로컬 브랜치의 끝 커밋이 모두 원격 추적 ref 에 있는가 — 그러면 강제 삭제(-D)로 잃는 로컬 전용 커밋이 없다.
 * squash 병합 뒤에는 `git branch -d` 가 "not fully merged" 로 거부하므로, 병합한 브랜치의 로컬 정리는 이 판정으로 묻지 않고 통과한다.
 * 이름을 읽지 못하거나 git 이 실패하면 false(묻는다)다.
 */
function branchTipsPushed(args, cwd) {
  const names = args.filter((arg) => !arg.startsWith('-'));
  if (!names.length) return false;
  return names.every((name) => {
    const tip = spawnSync('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`], { cwd, encoding: 'utf8', windowsHide: true });
    if (tip.status !== 0) return false;
    const remotes = spawnSync('git', ['for-each-ref', '--contains', tip.stdout.trim(), '--format=%(refname)', 'refs/remotes'],
      { cwd, encoding: 'utf8', windowsHide: true });
    return remotes.status === 0 && remotes.stdout.trim().length > 0;
  });
}

/**
 * 이 조각이 훅을 끄는 환경 변수(SKIP_HOOKS·SKIP_HARNESS — .githooks 는 값이 비어 있지 않으면 건너뛴다)를 비어 있지 않은 값으로 정하는가.
 * 명령 자리의 대입만 본다: 명령 앞 `K=V`, `export`·`set`·`env` 뒤의 `K=V`, PowerShell `$env:K = V`. 검색어·인자 속 문구는 세지 않는다.
 */
function setsHookSkipVariable(raw) {
  const words = tokens(raw);
  const skip = /^(SKIP_HOOKS|SKIP_HARNESS)$/i;
  const empty = (value) => value === undefined || ['', '""', "''"].includes(value);
  const ps = /^\$env:([A-Za-z_]\w*)\s*=\s*(.*)$/i.exec(raw.trim());
  if (ps) return skip.test(ps[1]) && !empty(ps[2].trim());
  // `export`·`set`·`env` 와, SOP §6.2 가 가르치는 셸 공용 형태 `npx cross-env K=V …` 의 앞 단어를 건너뛴다.
  let index = 0;
  while (index < words.length && ['export', 'set', 'env', 'npx', 'cross-env', 'cross-env-shell'].includes(words[index].toLowerCase())) index += 1;
  // CMD 의 `set "K=V"` 처럼 따옴표 친 대입도 같은 대입이다.
  for (; index < words.length && /^[A-Za-z_]\w*=/.test(unquote(words[index])); index += 1) {
    const [name, ...rest] = unquote(words[index]).split('=');
    if (skip.test(name) && !empty(rest.join('='))) return true;
  }
  return false;
}

/**
 * 따옴표를 가린 판(code)의 단어 경계로 원문(raw)을 자른다. 가리기는 길이를 보존하므로 따옴표 속 공백이 단어를 나누지 않고,
 * 가린 주석은 단어가 되지 않는다. 각 단어는 판정용 가린 판(`code`)과 따옴표를 벗긴 원문 값(`value`)을 함께 갖는다.
 */
function alignedWords(code, raw) {
  return [...code.matchAll(/\S+/g)].map((match) => {
    const end = match.index + match[0].length;
    const text = raw.slice(match.index, end);
    return { code: match[0], text, value: unquote(text), end };
  });
}

/** 셸 단어 하나를 그 셸이 넘길 값으로 푼다 — 작은따옴표는 그대로, 큰따옴표는 `\"`·`` `" `` 같은 이스케이프를 푼다. */
function shellWordValue(text) {
  const single = /^'(.*)'$/s.exec(text);
  if (single) return single[1];
  const double = /^"(.*)"$/s.exec(text);
  return double ? double[1].replace(/\\(["\\$`])|`(["`$])/g, '$1$2') : text;
}

const SHELL_WRAPPER = /(?:^|[\\/])(bash|sh|zsh|dash|pwsh|powershell|cmd)(?:\.exe)?$/i;

/**
 * 명시적 셸 래퍼(`bash -c '…'`·`pwsh -Command "…"`·`cmd /c …`)가 실행할 스크립트. 래퍼가 아니거나 스크립트를 넘기지 않으면 null.
 * bash 계열은 `-c`(·`-lc` 같은 묶음) 다음 한 단어가 스크립트이고, PowerShell·cmd 는 `-Command`·`/c` 뒤 나머지 전체가 명령이다.
 * 일반 셸 파서가 아니다 — `xargs`·`env`·`sudo` 같은 접두 명령은 보지 않는다.
 */
export function wrappedScript(code, raw) {
  const words = alignedWords(code, raw);
  const at = commandAt(words.map((word) => word.code));
  const shell = SHELL_WRAPPER.exec(words[at]?.value ?? '')?.[1].toLowerCase();
  if (!shell) return null;
  const rest = (index) => {
    const tail = words.slice(index + 1);
    if (!tail.length) return null;
    return tail.length === 1 ? shellWordValue(tail[0].text) : raw.slice(words[index].end).trim();
  };
  for (let index = at + 1; index < words.length; index += 1) {
    const option = words[index].code;
    if (shell === 'cmd') {
      if (/^\/[ck]$/i.test(option)) return rest(index);
      continue;
    }
    if (shell === 'pwsh' || shell === 'powershell') {
      if (/^-(?:c|command)$/i.test(option)) return rest(index);
      continue;
    }
    if (/^[-+]o$/i.test(option)) { index += 1; continue; } // `-o pipefail` 의 값
    if (/^-[A-Za-z]*c[A-Za-z]*$/.test(option)) return words[index + 1] ? shellWordValue(words[index + 1].text) : null;
    if (!/^[-+]/.test(option)) return null; // 스크립트 파일을 실행한다
  }
  return null;
}

/**
 * 따옴표 밖의 이 `#` 이 셸 주석을 여는가 — 단어의 첫 글자일 때만이다(bash·PowerShell 공통). 앞이 공백·`;`·`&`·`|`·`(` 이거나 텍스트 처음이면
 * 주석이고, `a#b`·`$#`·`${#x}`·`)#` 처럼 단어 중간이면 아니다.
 */
const opensComment = (text, index) => text[index] === '#' && (index === 0 || /[\s;&|(]/.test(text[index - 1]));

/** 주석이 끝나는 위치(줄바꿈 바로 앞). 줄바꿈이 없으면 텍스트 끝이다. */
const commentEnd = (text, index) => {
  const end = text.indexOf('\n', index);
  return end < 0 ? text.length : end;
};

/** `$(` 바로 뒤(from)에서 시작해 짝이 맞는 `)` 의 위치. 따옴표·주석 안의 괄호는 세지 않는다. 닫히지 않으면 끝 위치다. */
function closingParen(text, from) {
  let depth = 1;
  let quote = null;
  for (let index = from; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = null;
      else if (quote === '"' && (char === '\\' || char === '`')) index += 1;
      continue;
    }
    if (char === '\\' || char === '`') { index += 1; continue; }
    if (opensComment(text, index)) { index = commentEnd(text, index) - 1; continue; }
    if (char === '\'' || char === '"') quote = char;
    else if (char === '(') depth += 1;
    else if (char === ')' && (depth -= 1) === 0) return index;
  }
  return text.length;
}

/**
 * 명령 치환 `$( … )` 들의 위치(`$` 의 start, 닫는 `)` 의 end)와 안쪽 명령(text). 바깥 치환만 돌려주고 안쪽 치환은 재귀 판정이 다시 찾는다.
 * 큰따옴표 안의 치환은 bash·PowerShell 이 실행하므로 센다. 작은따옴표 안, `\$`·`` `$ `` 로 이스케이프한 `$`, 따옴표 밖 셸 주석
 * (`git status # $(…)`) 안은 치환이 아니다.
 */
function substitutionSpans(text) {
  const found = [];
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote === '\'') {
      if (char === '\'') quote = null;
      continue;
    }
    if (char === '\\' || char === '`') { index += 1; continue; }
    if (char === '"') { quote = quote ? null : '"'; continue; }
    if (!quote && char === '\'') { quote = '\''; continue; }
    if (!quote && opensComment(text, index)) { index = commentEnd(text, index) - 1; continue; }
    if (char !== '$' || text[index + 1] !== '(') continue;
    const end = closingParen(text, index + 2);
    found.push({ start: index, end, text: text.slice(index + 2, end) });
    index = end;
  }
  return found;
}

/** 명령 치환 `$( … )` 의 안쪽 명령들(substitutionSpans 의 text). */
export function commandSubstitutions(text) {
  return substitutionSpans(text).map((span) => span.text);
}

/** git 호출의 하위 명령 앞 전역 옵션 값(`-c k=v`·`--config-env=…`)과 하위 명령 뒤 인자를 원문 단어로 돌려준다(gitInvocation 과 같은 자리). */
function gitWords(code, raw) {
  const words = alignedWords(code, raw);
  let index = commandAt(words.map((word) => word.code)) + 1;
  const options = [];
  while (index < words.length && words[index].code.startsWith('-')) {
    const width = GIT_VALUE_OPTIONS.has(words[index].code) ? 2 : 1;
    options.push(...words.slice(index, index + width).map((word) => word.value));
    index += width;
  }
  return { options, args: words.slice(index + 1) };
}

/**
 * 이 git 호출이 작업 디렉터리가 아닌 저장소를 고르는가 — `--git-dir`·`--work-tree` 옵션이나 명령 앞 `GIT_DIR=`·`GIT_WORK_TREE=` 대입.
 * 그러면 cwd 로 본 판정(브랜치 끝 커밋이 원격에 있는가)이 실제 대상과 다를 수 있다. `-C` 는 evaluate 가 cwd 로 이미 옮긴다.
 */
function selectsOtherRepository(code, raw) {
  const { options } = gitWords(code, raw);
  if (options.some((option) => /^--(?:git-dir|work-tree)(?:=|$)/i.test(option))) return true;
  const words = alignedWords(code, raw);
  const at = commandAt(words.map((word) => word.code));
  return words.slice(0, at).some((word) => /^GIT_(?:DIR|WORK_TREE|COMMON_DIR)=/i.test(word.value));
}

/** 작업 트리 전체를 가리키는 pathspec — 이 경로로 `--only` 커밋하면 다른 작업의 변경이 모두 들어간다. */
const WHOLE_TREE_PATHSPECS = new Set(['.', './', './*', '..', '../', '*', ':', ':/', ':/*', ':(top)', ':(top).', ':(top)/', ':(top)*']);
const isWholeTreePathspec = (value) => WHOLE_TREE_PATHSPECS.has(value.replaceAll('\\', '/').toLowerCase());

/**
 * 이 git 호출의 경로 인자(`--` 가 있으면 그 뒤 전부, 없으면 옵션과 옵션 값이 아닌 단어) 가운데 작업 트리 전체를 가리키는 것이 있는가.
 * 값은 원문에서 읽어 따옴표 친 `":/"`·`'*'` 도 잡고, 옵션·`--` 는 가린 판으로 가려 메시지·주석 속 문구를 경로로 읽지 않는다.
 */
function namesWholeTree(code, raw, valued = new Set()) {
  const { args } = gitWords(code, raw);
  const dashes = args.findIndex((word) => word.code === '--');
  const paths = dashes >= 0
    ? args.slice(dashes + 1)
    : args.filter((word, index) => !word.code.startsWith('-') && !valued.has(args[index - 1]?.code));
  return paths.some((word) => isWholeTreePathspec(word.value));
}

/**
 * 병합·cherry-pick·revert·rebase(·am)가 충돌로 멈춘 상태인가. 이때 git 은 경로를 준 부분 커밋을 거부하므로
 * ("cannot do a partial commit during a merge/cherry-pick/rebase") `--only <경로>` 를 요구하면 안 된다.
 */
function sequencerInProgress(cwd) {
  const markers = ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply'];
  const result = spawnSync('git', ['rev-parse', ...markers.flatMap((marker) => ['--git-path', marker])], { cwd, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return false;
  return result.stdout.split(/\r?\n/).filter(Boolean).some((path) => existsSync(resolve(cwd, path.trim())));
}

/** bash `rm` 의 짧은 옵션 묶음 가운데 재귀(-r·-R)를 담은 것(-rf·-fR …). PowerShell `-Force` 는 다른 글자가 섞여 걸리지 않는다. */
const RM_RECURSIVE_CLUSTER = /^-[rRfidIv]*[rR][rRfidIv]*$/;
/** PowerShell 의 `-Recurse` 와 그 접두 약어(`-r`·`-rec`), `-Recurse:$true`. */
const PS_RECURSE = /^-r(?:e(?:c(?:u(?:r(?:s(?:e)?)?)?)?)?)?(?::\$true)?$/i;

/**
 * 이 조각이 재귀로 지우는 대상 경로들(원문 값). 재귀 삭제가 아니면 빈 목록이다.
 * `rm -r`·`Remove-Item -Recurse`(별칭 ri·rd·rmdir·del·erase)·cmd `rmdir /s`, 그리고 `recursive: true` 를 준 node `rmSync`·`rmdirSync`·`rm` 을 본다.
 */
function recursiveDeleteTargets(code, raw) {
  const words = alignedWords(code, raw);
  const at = commandAt(words.map((word) => word.code));
  const name = (words[at]?.value ?? '').replace(/^.*[\\/]/, '').replace(/\.exe$/i, '').toLowerCase();
  const args = words.slice(at + 1);
  if (name === 'node') {
    if (!/\b(?:rmSync|rmdirSync|rm|rmdir)\s*\(/.test(raw) || !/\brecursive\s*:\s*true\b/.test(raw)) return [];
    // 스크립트 속 문자열 리터럴은 따옴표 종류마다 따로 짝지어 읽는다(바깥 큰따옴표가 안쪽 작은따옴표 경로를 삼키지 않게).
    const literals = ['\'', '"', '`'].flatMap((quote) => [...raw.matchAll(new RegExp(`${quote}([^${quote}]*)${quote}`, 'g'))].map((match) => match[1]));
    const absolute = [...raw.matchAll(/[A-Za-z]:[\\/][^'"`\s,;()]*/g)].map((match) => match[0]);
    return [...literals, ...absolute].map((value) => value.replace(/\\\\/g, '\\'));
  }
  if (name === 'rm') {
    const recursive = args.some((word) => RM_RECURSIVE_CLUSTER.test(word.code) || /^--recursive$/i.test(word.code) || PS_RECURSE.test(word.code));
    return recursive ? args.filter((word) => !word.code.startsWith('-')).map((word) => word.value) : [];
  }
  if (['remove-item', 'ri', 'rd', 'rmdir', 'del', 'erase'].includes(name)) {
    // cmd 스위치는 띄어 쓰거나 붙여 쓴다(`/s /q`·`/s/q`).
    const switches = (word) => /^(?:\/[a-z])+$/i.test(word.code);
    const recursive = args.some((word) => PS_RECURSE.test(word.code) || (switches(word) && /\/s/i.test(word.code)));
    return recursive ? args.filter((word) => !word.code.startsWith('-') && !switches(word)).map((word) => word.value) : [];
  }
  return [];
}

/** 경로 비교용 정규형 — 절대 경로, 끝 구분자 없음, Windows 는 대소문자를 무시한다. */
function comparablePath(path) {
  const absolute = resolve(path).replace(/[\\/]+$/, '');
  return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
}

/** 이 저장소의 작업 트리들(`git worktree list --porcelain`, 원본 checkout 포함)과 그 부모 디렉터리. 저장소가 아니면 빈 목록이다. */
function worktreeLayout(cwds) {
  const trees = new Set();
  for (const cwd of cwds) {
    const result = spawnSync('git', ['worktree', 'list', '--porcelain'], { cwd, encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) continue;
    for (const line of result.stdout.split(/\r?\n/)) if (line.startsWith('worktree ')) trees.add(comparablePath(line.slice('worktree '.length)));
  }
  return { trees: [...trees], parents: [...new Set([...trees].map((tree) => dirname(tree)))] };
}

/**
 * 이 경로를 재귀로 지우면 작업 트리가 사라지는가 — 등록된 작업 트리이거나 그 조상, 작업 트리와 나란한 `wt-*` 디렉터리(등록이 풀린 잔재 포함),
 * `.git` 이 파일인 디렉터리(다른 저장소의 작업 트리). 저장소 안의 build/·임시 디렉터리는 해당하지 않는다.
 */
function deletesWorktree(target, layout) {
  const path = comparablePath(target);
  const inside = path.endsWith(sep) ? path : `${path}${sep}`;
  if (layout.trees.some((tree) => tree === path || tree.startsWith(inside))) return true;
  if (/^wt-/i.test(basename(path)) && layout.parents.includes(dirname(path))) return true;
  try { return statSync(join(path, '.git')).isFile(); } catch { return false; }
}

/**
 * 작업 디렉터리를 정할 수 없을 때(`cd $dir` 뒤 등) 이 상대 삭제 대상이 작업 트리일 수 있는가 — 보수적으로 묻는다. 지우는 마지막 이름이
 * 등록된 작업 트리의 이름이거나 `wt-*` 이면, 또는 이름 없이 디렉터리 자체(`.`·`..`·`*`)를 지우면 그렇다. 절대 경로는 cwd 와 무관해
 * deletesWorktree 가 그대로 본다.
 */
function mayDeleteWorktreeFromUnknownCwd(value, layout) {
  const path = fromMsysPath(value.replace(/^(?:\$\{?PWD\}?|\$\(pwd\)|%cd%)(?=[\\/]|$)/i, '.'));
  if (isAbsolute(path) || /^[A-Za-z]:/.test(path)) return false;
  const name = basename(normalize(path.replace(/[\\/]\*$/, '')));
  if (['', '.', '..', '*'].includes(name)) return true;
  const comparable = process.platform === 'win32' ? name.toLowerCase() : name;
  return /^wt-/i.test(name) || layout.trees.some((tree) => basename(tree) === comparable);
}

/** 삭제 대상 원문 값을 cwd 기준 절대 경로로 바꾼다. 디렉터리 안 전체(`dir/*`·`*`)는 그 디렉터리를 비우는 것이라 디렉터리로 본다. */
function deleteTargetPath(value, cwd) {
  const path = fromMsysPath(expandWorkingDir(value, cwd));
  return resolve(cwd, path === '*' ? '.' : path.replace(/[\\/]\*$/, ''));
}

/** 기본 test 태스크에서 빠지는 태그(api-server/build.gradle 의 excludeTags)가 붙은 시험 클래스. */
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

/** 값을 다음 단어로 받는 Gradle 옵션 — 그 값(`--warning-mode fail` 의 fail)을 태스크로 읽지 않는다. */
const GRADLE_VALUE_OPTIONS = new Set(['--warning-mode', '--console', '-p', '--project-dir', '-x', '--exclude-task', '-I', '--init-script',
  '-c', '--settings-file', '-b', '--build-file', '-g', '--gradle-user-home', '--include-build', '--priority', '-F',
  '--dependency-verification', '--max-workers', '-D', '-P']);

/** 태그 시험을 빼는 기본 test 태스크(api-server/build.gradle 의 excludeTags)와, 그것을 포함하는 루트 집계 test 를 부르는 이름. */
const DEFAULT_TEST_TASKS = new Set(['test', ':test', 'api-server:test', ':api-server:test']);

/** `--tests` 값마다 그 값을 받는 Gradle 태스크(바로 앞 태스크)를 짝짓는다. */
function gradleTestFilters(raw) {
  const words = tokens(raw);
  const pairs = [];
  let task = null;
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (word === '--tests' && index + 1 < words.length) { pairs.push({ task, filter: unquote(words[index + 1]) }); index += 1; }
    else if (word.startsWith('--tests=')) pairs.push({ task, filter: unquote(word.slice('--tests='.length)) });
    else if (GRADLE_VALUE_OPTIONS.has(word)) index += 1;
    else if (!word.startsWith('-') && !/gradlew/i.test(word)) task = word;
  }
  return pairs;
}

/** 하네스·스키마 태그 시험을 가리키는 필터인가. `Class`·`pkg.Class`·`pkg.Class.method`·`*Class*` 를 받는다. */
function namesTaggedClass(filter, tagged) {
  const parts = filter.split('.').map((part) => part.replace(/\*/g, ''));
  const candidates = parts.slice(-2).filter(Boolean);
  return candidates.some((simple) => [...tagged.keys()].some((name) => name === simple || (filter.includes('*') && name.includes(simple))));
}

/** `$PWD`·`${PWD}`·`$(pwd)`·`%cd%` 로 시작하는 마운트 원천을 작업 디렉터리로 바꾼다. */
const expandWorkingDir = (source, cwd) => source.replace(/^(?:\$\{?PWD\}?|\$\(pwd\)|%cd%)/i, cwd.replaceAll('\\', '/'));

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
    id: 'git-hook-bypass', decision: 'ask',
    why: '`--no-verify` 말고도 훅을 끄는 길이 있다 — SKIP_HOOKS·SKIP_HARNESS 환경 변수, `git -c core.hooksPath=…`, core.hooksPath 해제·변경(.githooks/README.md 「우회」). SOP §6.2 는 사용자가 명시적으로 지시한 경우만 허락한다.',
    fix: '훅이 막은 원인을 고친다. 우회가 꼭 필요하면 사용자에게 설명하고 지시를 받는다. core.hooksPath 는 상대 경로 `.githooks` 로만 둔다(SOP §6.6).',
    match: ({ git, code, raw }) => {
      if (setsHookSkipVariable(raw)) return true;
      if (!git) return false;
      // 하위 명령 앞 전역 옵션만 본다 — 커밋 메시지에 적은 `-c core.hooksPath=…` 는 명령이 아니다.
      const { options, args } = gitWords(code, raw);
      // `-c k=v` 와 값을 붙인 `-ck=v`, `--config-env=k=ENV` 를 모두 읽는다.
      if (options.some((option) => /^(?:-c|--config-env=)?core\.hookspath=/i.test(option))) return true;
      if (git.sub !== 'config') return false;
      // 값은 원문에서 읽고 동작은 위치로 가린다 — 값 자체가 `get` 인 `git config core.hooksPath get` 은 설정이다.
      // Git 2.46 의 하위 명령 형태(`get`·`set`·`unset`)와 섹션째 지우기·이름 바꾸기도 본다.
      const flags = args.filter((word) => word.code.startsWith('-')).map((word) => word.value.toLowerCase());
      const positional = args.filter((word) => !word.code.startsWith('-')).map((word) => word.value);
      const verbs = ['get', 'set', 'unset', 'list', 'remove-section', 'rename-section'];
      const verb = verbs.includes(positional[0]?.toLowerCase()) ? positional.shift().toLowerCase() : null;
      const lower = positional.map((value) => value.toLowerCase());
      const sectionOp = ['remove-section', 'rename-section'].includes(verb) || flags.some((flag) => /^--(?:remove|rename)-section$/.test(flag));
      if (sectionOp) return lower[0] === 'core';
      const at = lower.indexOf('core.hookspath');
      if (at < 0) return false;
      if (['get', 'list'].includes(verb) || flags.some((flag) => ['--get', '--get-all', '--get-regexp', '--list', '-l'].includes(flag))) return false;
      if (verb === 'unset' || flags.some((flag) => ['--unset', '--unset-all'].includes(flag))) return true;
      // 읽기(값 없음)와 상대 경로 `.githooks` 로 되돌리는 설정만 통과한다.
      return positional[at + 1] !== undefined && positional[at + 1] !== '.githooks';
    },
  },
  {
    id: 'git-force-push', decision: 'ask',
    why: '강제 푸시는 원격 이력을 덮는다 — AGENTS.md 가 사전 설명과 승인을 요구한다.',
    fix: '대상 브랜치·덮이는 커밋을 사용자에게 설명하고 승인을 받는다.',
    match: ({ git, code, raw }) => {
      if (git?.sub !== 'push') return false;
      if (hasFlag(git.args, '--force', '--force-with-lease', '--force-if-includes') || hasShortFlag(git.args, 'f')) return true;
      // refspec 앞의 `+` 는 그 ref 를 강제로 덮는다. 값은 원문에서 읽어 따옴표 친 `"+main"` 도 잡고, 값을 받는 옵션의 값(`-o "+x"`)은 refspec 이 아니다.
      const valued = new Set(['-o', '--push-option', '--repo', '--receive-pack', '--exec']);
      const { args } = gitWords(code, raw);
      return args.some((word, index) => !word.code.startsWith('-') && !valued.has(args[index - 1]?.code) && word.value.startsWith('+'));
    },
  },
  {
    id: 'git-discard-worktree', decision: 'ask',
    why: '작업 트리·브랜치를 되돌릴 수 없게 지운다 — 같은 워킹트리를 쓰는 다른 에이전트·사용자의 WIP 가 함께 사라진다(AGENTS 공유 워킹트리).',
    fix: '지울 대상을 git status·git diff 로 확인해 사용자에게 보이고 승인을 받는다. 자기 변경만 되돌리려면 경로를 지정한다. 병합한 브랜치는 끝 커밋이 원격 추적 ref 에 남아 있을 때(git fetch --prune 전) -D 로 지우면 묻지 않는다. 작업 트리 디렉터리(git worktree remove)는 그 삭제의 승인을 따로 받는다.',
    match: ({ git, cwd, code, raw }) => {
      if (!git) return false;
      const { sub, args } = git;
      if (sub === 'reset') return hasFlag(args, '--hard');
      if (sub === 'clean') return hasFlag(args, '--force') || hasShortFlag(args, 'f');
      // 강제 전환은 로컬 변경을 버린다(checkout -f·switch -f·--discard-changes).
      if ((sub === 'checkout' || sub === 'switch') && (hasFlag(args, '--force', '--discard-changes') || hasShortFlag(args, 'f'))) return true;
      // `.` 말고도 `:/`·`*`·`..`·`./*`·`:(top)` 같은 작업 트리 전체 경로(따옴표 친 형태 포함)가 있다. `frontend/` 같은 디렉터리는 전체가 아니다.
      if (sub === 'checkout') return namesWholeTree(code, raw, new Set(['-b', '-B', '--orphan', '--conflict', '--pathspec-from-file']));
      if (sub === 'restore') {
        return namesWholeTree(code, raw, new Set(['-s', '--source', '--conflict', '--pathspec-from-file']))
          && !(hasFlag(args, '--staged', '-S') && !hasFlag(args, '--worktree', '-W'));
      }
      // 병합한 작업 브랜치의 로컬 정리는 AGENTS 상시 승인 범위다 — 끝 커밋이 원격에 있으면 묻지 않는다(DEC-OPS-387).
      if (sub === 'branch') {
        const forced = args.includes('-D')
          || ((hasFlag(args, '--delete') || hasShortFlag(args, 'd')) && (hasFlag(args, '--force') || hasShortFlag(args, 'f')));
        // 다른 저장소를 고르는 호출은 cwd 판정이 대상과 다를 수 있으니 면제하지 않는다(2026-10-27 독립 검토).
        return forced && (selectsOtherRepository(code, raw) || !branchTipsPushed(args, cwd));
      }
      if (sub === 'stash') return ['drop', 'clear'].includes(args[0]);
      // 작업 트리 디렉터리와 그 안의 미추적 산출물 삭제는 브랜치 삭제와 별개로 사용자 승인이 필요하다(AGENTS 공유 워킹트리와 Git, SOP §6.6).
      if (sub === 'worktree') return args[0] === 'remove';
      return false;
    },
  },
  {
    id: 'worktree-recursive-delete', decision: 'ask',
    why: '작업 트리 디렉터리를 재귀로 지운다 — 안의 node_modules 같은 링크(junction)를 먼저 끊지 않으면 링크 너머 원본 checkout 의 파일까지 지울 수 있고, 다른 도구(Codex 등)가 쓰는 작업 트리는 프로세스 목록에 드러나지 않는다(2026-10-25).',
    fix: '링크(junction)를 먼저 끊고 그 작업 트리가 직접 만든 것인지 확인한 뒤 사용자 승인을 받는다(SOP §6.6). 저장소 안의 build/·임시 디렉터리 삭제는 묻지 않는다.',
    match: ({ code, raw, cwd, root, cwdUnknown }) => {
      const targets = recursiveDeleteTargets(code, raw);
      if (!targets.length) return false;
      const layout = worktreeLayout([...new Set([cwd, root])]);
      // 변수·명령 치환·`cd -` 로 옮긴 뒤에는 cwd 를 모른다 — 상대 대상은 이름으로 보수적으로 판정한다(2026-10-29 교차 검토).
      return targets.some((value) => deletesWorktree(deleteTargetPath(value, cwd), layout)
        || (cwdUnknown && mayDeleteWorktreeFromUnknownCwd(value, layout)));
    },
  },
  {
    id: 'git-commit-without-only', decision: 'deny',
    why: '공유 워킹트리에서 index 전체를 커밋하면 다른 작업의 변경이 섞인다(AGENTS 공유 워킹트리와 Git).',
    fix: '자기 경로만 git commit --only -m "…" -- <paths> 로 커밋한다(-m 은 -- 앞에 둔다). `.`·`:/` 같은 작업 트리 전체 경로와 -a 는 쓰지 않는다. 병합·cherry-pick·revert·rebase 가 충돌로 멈춘 동안의 커밋은 그대로 된다(git 이 그때 부분 커밋을 거부한다).',
    match: ({ git, cwd, raw, code }) => {
      if (git?.sub !== 'commit' || hasFlag(git.args, '--dry-run') || sequencerInProgress(cwd)) return false;
      if (!hasFlag(git.args, '--only') && !hasShortFlag(git.args, 'o')) return true;
      // `--only` 여도 경로가 작업 트리 전체(`.`·`:/`·`..`·`:(top)` 등)이거나 -a 를 함께 주면 다른 작업의 변경이 모두 들어간다.
      if (hasFlag(git.args, '--all') || hasShortFlag(git.args, 'a')) return true;
      // 경로는 원문 값으로 읽고(`":/"`·`.\`), `--` 구분자와 옵션은 가린 판으로 가린다 — 메시지 `-m "--"` 나 주석 `# .` 를 경로로 읽지 않는다.
      const valued = new Set(['-m', '-F', '-C', '-c', '-t', '--author', '--date', '--fixup', '--squash', '--template', '--file', '--message']);
      const { args } = gitWords(code, raw);
      const dashes = args.findIndex((word) => word.code === '--');
      const paths = dashes >= 0
        ? args.slice(dashes + 1)
        : args.filter((word, index) => !word.code.startsWith('-') && !valued.has(args[index - 1]?.code));
      return paths.some((word) => isWholeTreePathspec(word.value));
    },
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
    // 명령 자리만 본다 — 파이프 뒤는 조각 나누기, `$( … )` 안은 재귀 판정이 명령 자리로 만든다. bash 의 백틱 치환은 PowerShell 의
    // 이스케이프 문자와 겹쳐 일반 재귀로 읽지 않고 jq 에 한해 백틱 바로 뒤의 jq 를 본다.
    match: ({ code }) => {
      const words = tokens(code);
      const head = /(^|[\\/])jq(\.exe)?$/i.test(words[commandAt(words)] ?? '');
      return (head || /`\s*(?:\S*[\\/])?jq(?:\.exe)?(?=[\s`]|$)/i.test(code)) && !onPath('jq');
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
    // gradlew 를 부르는 조각에서만 본다 — 다른 에이전트에게 준 프롬프트 속 플래그를 명령으로 읽지 않는다. 값은 원문 단어에서
    // 따옴표를 벗겨 읽어 PowerShell 의 `"-Dopenapi.export.path=…"` 형태도 잡는다.
    match: ({ raw, code }) => {
      if (!/gradlew/i.test(code)) return false;
      return tokens(raw).map(unquote).some((word) => {
        const value = /^-Dopenapi\.export\.path=(.*)$/.exec(word)?.[1];
        return value !== undefined && !/^([A-Za-z]:[\\/]|\/)/.test(unquote(value));
      });
    },
  },
  {
    id: 'tagged-test-on-default-task', decision: 'deny',
    why: '@Tag("governance-harness")·@Tag("schema-validation") 시험은 기본 test 태스크에서 빠진다 — 그 태스크에 --tests 로 걸면 0건이 돌고도 BUILD SUCCESSFUL 이다(2026-09-05).',
    fix: '하네스 시험은 :api-server:harnessTest --tests, 스키마 시험은 :api-server:schemaValidationTest --tests 로 돌린다(한 호출에 함께 걸 수 있다).',
    match: ({ raw, code, cwd }) => {
      if (!/gradlew/i.test(code) || !/--tests/.test(code)) return false;
      // excludeTags 는 api-server 의 test 태스크에만 있다 — 그 태스크와 그것을 포함하는 루트 집계 `test` 만 본다.
      // `:business-core:test --tests "*Authorization*"` 처럼 다른 모듈의 test 는 태그 시험과 이름이 겹쳐도 통과한다.
      const filters = gradleTestFilters(raw).filter(({ task }) => DEFAULT_TEST_TASKS.has(task));
      if (!filters.length) return false;
      const tagged = taggedClasses(cwd);
      return filters.some(({ filter }) => namesTaggedClass(filter, tagged));
    },
  },
  {
    id: 'worktree-name-collides-with-e2e', decision: 'deny',
    // `setup` 프로젝트 매처는 `/.*\.setup\.ts/` 라 디렉터리 이름으로는 걸리지 않는다 — 디렉터리에 걸리는 셋만 본다.
    why: 'Playwright 매처(`contracts/…spec.ts`·`(journeys|quality)/…spec.ts`)와 E2E 선별 계획기가 spec 의 절대 경로에 정규식을 적용해, 경로의 디렉터리 이름이 quality·journeys·contracts 로 끝나면 소유가 모호하다고 붉다(2026-10-19).',
    fix: '작업 트리는 D:\\wt-<짧은 이름> 으로 두되 그 셋으로 끝나는 디렉터리 이름을 쓰지 않는다(SOP §6.6).',
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
      return path !== null && path.split(/[\\/]/).some((part) => /(quality|journeys|contracts)$/i.test(part));
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
        const source = expandWorkingDir(mount, cwd).replace(/:[\\/][^:]*(?::[a-z]+)?$/i, '')
          .replace(/^\/([A-Za-z])\//, process.platform === 'win32' ? '$1:/' : '/$1/');
        const dir = isAbsolute(source) || /^[A-Za-z]:/.test(source) ? source : resolve(cwd, source);
        try { return statSync(join(dir, '.git')).isFile(); } catch { return false; }
      });
    },
  },
  {
    id: 'guard-canary', decision: 'deny',
    why: '가드가 살아 있는지 보는 무해한 확인 명령이다 — 가드는 판정하지 못하면 조용히 통과하므로(fail-open) 어댑터가 끊긴 것을 평소 명령으로는 알 수 없다.',
    fix: '막혔으면 이 도구의 어댑터가 동작한다. 통과해 AGENT_GUARD_CANARY 가 출력되면 어댑터가 끊긴 것이니 그 도구의 훅 설정(AGENTS.md 도구별 진입점)을 확인한다.',
    match: ({ raw }) => raw.trim() === 'echo AGENT_GUARD_CANARY',
  },
]);

/** 오류의 이름만 고른다. 이름이 식별자 꼴이 아니면(명령 문구를 이름에 넣은 오류 등) 종류만 남긴다. */
function errorName(error) {
  const name = error?.name;
  return typeof name === 'string' && /^[A-Za-z_$][\w$]{0,63}$/.test(name) ? name : typeof error;
}

/**
 * 판정 실패를 stderr 에 한 줄로 남긴다 — 고정 식별자(규칙 id·단계 이름)와 오류 이름만 쓴다. 명령 원문·인자·오류 메시지는 비밀이 섞일 수 있어
 * 쓰지 않는다. 판정은 그대로 fail-open 이다(DEC-OPS-386 ②). 같은 식별자는 한 번만 알린다.
 */
function reportFailure(where, error, reported) {
  if (reported?.has(where)) return;
  reported?.add(where);
  try { process.stderr.write(`[agent-guard] ${where} 판정 실패(${errorName(error)}) — 막지 않고 통과한다(fail-open)\n`); } catch { /* 진단을 못 써도 판정 흐름은 그대로다 */ }
}

/** 셸 래퍼·명령 치환을 따라 들어가는 깊이 상한 — 비정상 입력이 판정 시간을 늘리지 않게 한다. */
const MAX_NESTING = 4;

/** 정규화를 보태는 단계는 실패해도 기본 판정을 지우지 않도록 따로 감싼다. */
function guarded(state, where, action) {
  try { action(); } catch (error) { reportFailure(where, error, state.reported); }
}

/**
 * 명령 텍스트 하나를 판정해 state.hits 에 걸린 규칙을 더한다. 원문 조각을 그대로 본 뒤, 줄 이음을 합친 판을 한 번 더 본다 —
 * 합친 판만 보면 PowerShell 에서 줄 끝 `\` 로 끝나는 경로(`cd D:\x\`) 뒤의 다음 명령을 놓친다.
 */
function inspect(command, cwd, depth, state, cwdUnknown = false) {
  const raw = withoutHeredocBodies(command);
  inspectView(raw, command, cwd, depth, state, cwdUnknown);
  guarded(state, 'line-continuation', () => {
    const joined = joinContinuations(raw);
    if (joined !== raw) inspectView(joined, command, cwd, depth, state, cwdUnknown);
  });
}

/** 디렉터리를 옮기는 명령(`cd`·`chdir`·`Set-Location`·`sl`, 스택을 쓰는 `pushd`·`Push-Location` 과 `popd`·`Pop-Location`). */
const CHANGES_DIRECTORY = /^(cd|chdir|set-location|sl|pushd|push-location|popd|pop-location)$/i;

/**
 * 디렉터리를 옮기는 조각 뒤의 작업 디렉터리. 대상이 변수·명령 치환·`~`(`cd $dir`·`cd "$(…)"`)이거나 `cd -`·인자 없는 `cd`·빈 스택의
 * `popd` 처럼 정할 수 없으면 unknown 이다. here 는 종전처럼 원문을 이어 붙인 값으로 두어 다른 규칙의 판정을 바꾸지 않는다.
 */
function changeDirectory(words, at, { here, unknown }, stack) {
  const verb = words[at].value.toLowerCase();
  if (verb === 'popd' || verb === 'pop-location') return stack.pop() ?? { here, unknown: true };
  const args = words.slice(at + 1);
  const operand = args.find((word) => !word.code.startsWith('-'));
  if (verb === 'pushd' || verb === 'push-location') stack.push({ here, unknown });
  if (!operand || args.some((word) => ['-', '+'].includes(word.value))) return { here, unknown: true };
  const target = fromMsysPath(expandWorkingDir(operand.value, here));
  const next = resolve(here, target);
  if (/[$%`]|^~/.test(target)) return { here: next, unknown: true };
  // 절대 경로로 옮기면 다시 알게 된다. 상대 경로는 모르는 곳에서 옮기면 여전히 모른다.
  return { here: next, unknown: isAbsolute(target) || /^[A-Za-z]:/.test(target) ? false : unknown };
}

function inspectView(view, command, cwd, depth, state, cwdUnknown = false) {
  let location = { here: cwd, unknown: cwdUnknown };
  const stack = [];
  // 명령 치환은 그 자리 앞에서 끝난 조각들의 cd 만 반영해 판정한다 — 같은 조각의 cd(`cd "$(…)"`)는 치환을 먼저 실행한 뒤 옮기고,
  // 뒤의 cd 는 아직 일어나지 않았다(2026-10-29 교차 검토: `cd ..; Write-Output $(Remove-Item -Recurse wt-x)` 를 처음 cwd 로 읽었다).
  const moves = [];
  let substitutions = [];
  guarded(state, 'command-substitution', () => { substitutions = substitutionSpans(view); });
  for (const part of splitSegments(view)) {
    // `cd <dir> && …`·`git -C <dir> …` 이 가리키는 디렉터리에서 판정한다(병합 중 여부·작업 트리 판정).
    const words = alignedWords(part.code, part.raw);
    const at = commandAt(words.map((word) => word.code));
    if (CHANGES_DIRECTORY.test(words[at]?.value ?? '')) {
      // 치환 안의 cd 는 그 하위 셸만 옮긴다 — 바깥 조각의 cwd 는 그대로이고, 안쪽은 재귀 판정이 따로 따라간다.
      if (substitutions.some((span) => part.start > span.start && part.start < span.end)) continue;
      location = changeDirectory(words, at, location, stack);
      moves.push({ end: part.end, ...location });
      continue;
    }
    const { here } = location;
    const git = gitInvocation(part.code);
    const gitDir = git?.dir ? /\s-C\s+("[^"]+"|'[^']+'|\S+)/.exec(part.raw)?.[1] : null;
    const context = { command, raw: part.raw, code: part.code, git, cwd: gitDir ? resolve(here, unquote(gitDir)) : here, root: state.root,
      cwdUnknown: location.unknown };
    for (const rule of state.rules) {
      if (state.hits.some((hit) => hit.id === rule.id)) continue;
      let matched = false;
      try { matched = Boolean(rule.match(context)); } catch (error) { reportFailure(rule.id, error, state.reported); }
      if (matched) state.hits.push(rule);
    }
    // 명시적 셸 래퍼(`bash -c '…'`·`pwsh -Command "…"`·`cmd /c …`)가 실행하는 스크립트도 같은 규칙으로 판정한다.
    if (depth < MAX_NESTING) {
      guarded(state, 'shell-wrapper', () => {
        const script = wrappedScript(part.code, part.raw);
        if (script?.trim()) inspect(script, here, depth + 1, state, location.unknown);
      });
    }
  }
  // 명령 치환 `$( … )` 의 안쪽은 셸이 먼저 실행한다 — 조각 경계(`;`)를 넘는 치환도 있어 조각이 아니라 텍스트 전체에서 찾는다.
  if (depth < MAX_NESTING) {
    guarded(state, 'command-substitution', () => {
      for (const span of substitutions) {
        if (!span.text.trim()) continue;
        const before = moves.filter((move) => move.end <= span.start).at(-1) ?? { here: cwd, unknown: cwdUnknown };
        inspect(span.text, before.here, depth + 1, state, before.unknown);
      }
    });
  }
}

/**
 * 명령 하나를 판정한다. 걸린 규칙이 없으면 null, 있으면 가장 강한 판정(deny > ask)과 사유들.
 * `rules` 는 시험이 던지는 규칙을 끼워 넣을 때만 준다.
 */
export function evaluate(command, { cwd = process.cwd(), rules = RULES } = {}) {
  if (typeof command !== 'string' || !command.trim()) return null;
  const state = { rules, root: cwd, hits: [], reported: new Set() };
  inspect(command, cwd, 0, state);
  const { hits } = state;
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
  // Codex 의 apply_patch 는 셸 명령이 아니라 파일 편집이다 — 본문의 `git commit …` 같은 줄을 명령으로 읽지 않는다.
  if (Array.isArray(raw) && /(^|[\\/])apply_patch(\.exe)?$/i.test(raw[0] ?? '')) return null;
  // Codex 는 명령을 셸 래퍼 배열(["powershell.exe","-Command","…"]·["bash","-lc","…"])로 넘긴다 — 셸에 넘긴 스크립트를 판정한다.
  const wrapped = Array.isArray(raw) && raw.length >= 3 && /(^|[\\/])(powershell|pwsh|bash|sh|zsh|cmd)(\.exe)?$/i.test(raw[0])
    && /^(-Command|-c|-lc|\/c)$/i.test(raw.at(-2));
  const command = Array.isArray(raw) ? (wrapped ? raw.at(-1) : raw.join(' ')) : raw;
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
  } catch (error) {
    // 판정할 수 없으면 막지 않는다 — 병합 권위는 CI 다. "걸린 규칙 없음"과 구분되게 단계 이름과 오류 이름만 남긴다.
    reportFailure('input', error);
  }
  if (output) process.stdout.write(output);
}

if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  await main(process.argv.slice(2));
}
