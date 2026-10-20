#!/usr/bin/env node
/**
 * CodeQL JavaScript 규칙 셋의 로컬 근사 — push 전에 몇 초 안에 미리 알린다. 권위는 CI 의 CodeQL(secure-coding · sast-scope)이다.
 *
 * 2026-09~10 사람 PR 의 secure-coding 실패는 거의 모두 scripts/*.mjs 의 같은 세 규칙이었고(file-system-race 9회, redos 2회,
 * incomplete-sanitization 3회), 이 PC 에는 CodeQL CLI 가 없어 실패 한 번이 CI 왕복 한 번이었다. 여기서는 그 세 규칙이 잡는 모양만
 * 구문 트리로 근사한다. 근사는 CodeQL 의 데이터 흐름 분석이 아니다.
 * - 근사가 통과해도 CodeQL 은 다른 이유로 막을 수 있다. 근사를 통과했다는 이유로 CodeQL 예외 원장(config/security/false-positive-review.json,
 *   DEC-OPS-075)을 늘리지 않는다(H2).
 * - 근사가 CodeQL 이 통과시키는 코드를 막으면 근사 규칙을 좁힌다. 이 파일에 예외 목록·무시 표기를 두지 않는다.
 *
 * 모집단은 CodeQL 이 JavaScript 로 읽는 경로(config/security/codeql.yml 의 paths)의 JS·TS 파일이다 — 근사가 CodeQL 이 보지 않는
 * 파일(tools/ 등)을 따로 막지 않게, 그리고 CodeQL 이 넓어지면 함께 넓어지게 그 설정을 읽는다.
 * 실행: pre-push 는 push 가 바꾼 파일만(`--stdin`), `npm run verify`(fast·push·full)는 모집단 전체를 본다(`npm run sast:approx`).
 * CI 는 이 근사를 돌리지 않는다 — CI 에는 CodeQL 자체가 있다. 근사 규칙의 붉음 증명은 운영 계약(sast-approximation.test.mjs)이 CI 에서도 돈다.
 *
 * 규칙(판정은 scripts/sast-approximation.test.mjs 가 고정한다):
 * 1. js/file-system-race — 같은 함수 안에서 fs 의 확인 호출(exists·stat·lstat·access·open 과 그 Sync·promises 판)이 경로 P 를 본 뒤,
 *    그 확인이 반드시 먼저 실행되는 자리에서 같은 P(같은 식별자·속성 경로·문자열)를 fs 의 사용 호출(readFile·writeFile·appendFile·
 *    unlink·rmdir·rm 과 그 Sync 판)로 다시 연다. 확인 콜백 안의 사용도 같다. 열어 둔 기술자(fd)로 읽는 것은 경로를 다시 열지 않는다.
 *    고친 예: scripts/restore-drill.mjs 의 openRegularFile(열고 fstat 한 기술자로만 읽는다), slot-registry.mjs 의 readRegistryText
 *    (읽기를 시도하고 ENOENT 만 부재로 본다).
 * 2. js/incomplete-sanitization — 백슬래시를 이스케이프하지 않는 이스케이프(`/[{}]/g` → '\\$&', `/[$]/g` → '\\$')와, 메타 문자 하나를
 *    전역 플래그 없이 바꿔 첫 번째만 바꾸는 치환(`.replace('\\', '/')`). 정규식에 넣을 값은 /[.*+?^${}()|[\]\\]/g 로 모두 이스케이프한다.
 * 3. js/redos — 같은 문자열을 두 갈래로 읽으며 같은 자리로 돌아오는 반복(지수 역추적, 예: `(\w+[^\n]*\n)*`, `(\s*x\s*(y)?\s*)*`).
 *    문자 집합을 표본 문자로 근사한 Glushkov 자동자에서 대각선 상태와 비대각선 상태가 한 강결합 요소에 있으면 붉다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const CODEQL_CONFIG = 'config/security/codeql.yml';
export const APPROXIMATED_RULES = Object.freeze(['js/file-system-race', 'js/incomplete-sanitization', 'js/redos']);

const SCRIPT_KINDS = Object.freeze({
  '.ts': 'TS', '.mts': 'TS', '.cts': 'TS', '.tsx': 'TSX', '.js': 'JS', '.mjs': 'JS', '.cjs': 'JS', '.jsx': 'JSX',
});
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.next', 'build', 'dist', 'coverage', 'out', 'test-results', 'playwright-report']);

let typescript;
function ts() {
  typescript ??= createRequire(new URL('../frontend/package.json', import.meta.url))('typescript');
  return typescript;
}

// ─── 모집단 ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** CodeQL 설정의 paths 목록. 형식이 바뀌어 읽지 못하면 실패한다(빈 모집단으로 조용히 통과하지 않는다). */
export function codeqlPaths(root = REPO_ROOT) {
  const lines = readFileSync(join(root, CODEQL_CONFIG), 'utf8').replace(/\r\n?/gu, '\n').split('\n');
  const start = lines.findIndex((line) => line === 'paths:');
  if (start < 0) throw new Error(`${CODEQL_CONFIG}: paths 목록이 없다`);
  const paths = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\s*#/u.test(line) || line.trim() === '') continue;
    const item = /^\s+-\s+(\S+)\s*$/u.exec(line);
    if (!item) break;
    paths.push(item[1]);
  }
  if (paths.length === 0) throw new Error(`${CODEQL_CONFIG}: paths 목록이 비었다`);
  return paths;
}

/** CodeQL 이 JavaScript 로 읽는 경로의 JS·TS 파일(저장소 상대 경로, 정렬). Java 경로는 JS 파일이 없어 저절로 빠진다. */
export function approximationFiles(root = REPO_ROOT) {
  const files = [];
  const walk = (relative) => {
    let entries;
    try { entries = readdirSync(join(root, relative), { withFileTypes: true }); } catch (error) {
      if (error?.code === 'ENOENT') return;
      if (error?.code === 'ENOTDIR') {
        if (SCRIPT_KINDS[extname(relative)]) files.push(relative);
        return;
      }
      throw error;
    }
    for (const entry of entries) {
      const path = `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) walk(path);
      } else if (entry.isFile() && SCRIPT_KINDS[extname(entry.name)] && !entry.name.endsWith('.d.ts')) files.push(path);
    }
  };
  for (const path of codeqlPaths(root)) walk(path.replace(/\/+$/u, ''));
  return [...new Set(files)].sort();
}

// ─── 규칙 1: js/file-system-race ──────────────────────────────────────────────────────────────────────────────────

const FS_MODULES = new Set(['fs', 'node:fs']);
const FS_PROMISE_MODULES = new Set(['fs/promises', 'node:fs/promises']);
const CHECK_MEMBERS = new Set(['exists', 'existsSync', 'stat', 'statSync', 'lstat', 'lstatSync', 'access', 'accessSync', 'open', 'openSync']);
// 지우기(rm·rmdir·unlink)는 CodeQL 이 막지 않았다(existsSync 뒤 rmSync·unlinkSync 가 main 에 여럿 있다, 2026-10-20 실측) — 사용으로 보지 않는다.
const USE_MEMBERS = new Set(['readFile', 'readFileSync', 'writeFile', 'writeFileSync', 'appendFile', 'appendFileSync']);

/** 이 파일에서 fs 멤버를 가리키는 이름 — named: 지역 이름 → 멤버, namespaces: fs 객체를 가리키는 지역 이름. */
function fsBindings(source, t) {
  const named = new Map();
  const namespaces = new Set();
  const moduleOf = (node) => (node && t.isStringLiteralLike(node) ? node.text : undefined);
  const isFsModule = (name) => FS_MODULES.has(name) || FS_PROMISE_MODULES.has(name);
  const visit = (node) => {
    if (t.isImportDeclaration(node) && isFsModule(moduleOf(node.moduleSpecifier))) {
      const clause = node.importClause;
      if (clause?.name) namespaces.add(clause.name.text);
      const bindings = clause?.namedBindings;
      if (bindings && t.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
      if (bindings && t.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          const member = (element.propertyName ?? element.name).text;
          if (member === 'promises') namespaces.add(element.name.text);
          else named.set(element.name.text, member);
        }
      }
    } else if (t.isVariableDeclaration(node) && node.initializer && t.isCallExpression(node.initializer)
      && t.isIdentifier(node.initializer.expression) && node.initializer.expression.text === 'require'
      && isFsModule(moduleOf(node.initializer.arguments[0]))) {
      if (t.isIdentifier(node.name)) namespaces.add(node.name.text);
      else if (t.isObjectBindingPattern(node.name)) {
        for (const element of node.name.elements) {
          if (!t.isIdentifier(element.name)) continue;
          const member = element.propertyName && t.isIdentifier(element.propertyName) ? element.propertyName.text : element.name.text;
          if (member === 'promises') namespaces.add(element.name.text);
          else named.set(element.name.text, member);
        }
      }
    }
    t.forEachChild(node, visit);
  };
  visit(source);
  return { named, namespaces };
}

/** 호출이 fs 멤버를 부르면 그 멤버 이름. `fs.x`, `fs.promises.x`, 이름으로 가져온 `x` 를 읽는다. */
function fsMember(call, bindings, t) {
  const callee = call.expression;
  if (t.isIdentifier(callee)) return bindings.named.get(callee.text);
  if (!t.isPropertyAccessExpression(callee)) return undefined;
  let owner = callee.expression;
  if (t.isPropertyAccessExpression(owner) && owner.name.text === 'promises') owner = owner.expression;
  return t.isIdentifier(owner) && bindings.namespaces.has(owner.text) ? callee.name.text : undefined;
}

/** 경로 인자의 열쇠 — 같은 식별자·같은 속성 경로·같은 문자열이면 같은 파일이다. 다른 식(호출 등)은 같다고 보지 않는다. */
function pathKey(node, t) {
  if (!node) return undefined;
  if (t.isParenthesizedExpression(node)) return pathKey(node.expression, t);
  if (t.isIdentifier(node)) return `id:${node.text}`;
  if (t.isStringLiteralLike(node)) return `str:${node.text}`;
  if (t.isPropertyAccessExpression(node)) {
    const owner = node.expression.kind === t.SyntaxKind.ThisKeyword ? 'this' : pathKey(node.expression, t)?.replace(/^(?:id|path):/u, '');
    return owner ? `path:${owner}.${node.name.text}` : undefined;
  }
  return undefined;
}

const isFunctionLike = (node, t) => t.isFunctionDeclaration(node) || t.isFunctionExpression(node) || t.isArrowFunction(node)
  || t.isMethodDeclaration(node) || t.isConstructorDeclaration(node) || t.isGetAccessorDeclaration(node)
  || t.isSetAccessorDeclaration(node) || t.isClassStaticBlockDeclaration(node);

function enclosingFunction(node, t) {
  for (let current = node.parent; current; current = current.parent) if (isFunctionLike(current, t) || t.isSourceFile(current)) return current;
  return undefined;
}

const within = (node, region) => Boolean(region) && node.pos >= region.pos && node.end <= region.end;

/** 문장이 늘 빠져나가는가(return·throw·break·continue, 또는 그것으로 끝나는 블록, 두 갈래가 모두 빠져나가는 if). */
function alwaysExits(statement, t) {
  if (!statement) return false;
  if (t.isReturnStatement(statement) || t.isThrowStatement(statement) || t.isBreakStatement(statement) || t.isContinueStatement(statement)) return true;
  if (t.isBlock(statement)) return alwaysExits(statement.statements.at(-1), t);
  if (t.isIfStatement(statement)) return alwaysExits(statement.thenStatement, t) && alwaysExits(statement.elseStatement, t);
  return false;
}

const isLogical = (node, t) => t.isBinaryExpression(node) && [t.SyntaxKind.AmpersandAmpersandToken, t.SyntaxKind.BarBarToken,
  t.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind);

/**
 * 조건식 expression 이 outcome(참·거짓)으로 끝났다면 그 안의 check 는 반드시 평가됐는가 — 단락 평가(&&·||·??)와 부정(!)을 따른다.
 * `if (a && statSync(p).isFile()) X` 의 X 는 statSync 를 지났고, `if (!a || !statSync(p).isFile()) Y else Z` 의 Z 도 그렇다.
 */
function evaluatedWhen(check, expression, outcome, t) {
  if (!within(check, expression)) return false;
  if (check === expression) return true;
  if (t.isParenthesizedExpression(expression)) return evaluatedWhen(check, expression.expression, outcome, t);
  if (t.isPrefixUnaryExpression(expression) && expression.operator === t.SyntaxKind.ExclamationToken) {
    return evaluatedWhen(check, expression.operand, !outcome, t);
  }
  if (isLogical(expression, t)) {
    if (within(check, expression.left)) return alwaysEvaluated(check, expression.left, t) || evaluatedWhen(check, expression.left, outcome, t);
    const kind = expression.operatorToken.kind;
    // 오른쪽은 && 가 참일 때, || 가 거짓일 때만 반드시 평가됐다(?? 는 알 수 없다).
    if (kind === t.SyntaxKind.AmpersandAmpersandToken && outcome) return evaluatedWhen(check, expression.right, true, t) || alwaysEvaluated(check, expression.right, t);
    if (kind === t.SyntaxKind.BarBarToken && !outcome) return evaluatedWhen(check, expression.right, false, t) || alwaysEvaluated(check, expression.right, t);
    return false;
  }
  return alwaysEvaluated(check, expression, t);
}

/** region 이 평가되면 그 안의 check 도 반드시 평가되는가(가는 길에 갈래·반복·단락 평가의 오른쪽·안쪽 함수가 없다). */
function alwaysEvaluated(check, region, t) {
  for (let child = check, parent = check.parent; child !== region; child = parent, parent = parent.parent) {
    if (!parent || isFunctionLike(parent, t)) return false;
    if (isLogical(parent, t) && child === parent.right) return false;
    if (t.isConditionalExpression(parent) && child !== parent.condition) return false;
    if (t.isIfStatement(parent) && child !== parent.expression) return false;
    if ((t.isForStatement(parent) && (child === parent.statement || child === parent.incrementor))
      || ((t.isForInStatement(parent) || t.isForOfStatement(parent) || t.isWhileStatement(parent)) && child === parent.statement)
      || (t.isTryStatement(parent) && child === parent.catchClause) || t.isCaseClause(parent) || t.isDefaultClause(parent)) return false;
  }
  return true;
}

/*
 * 확인이 사용보다 반드시 먼저 실행되는가(CodeQL 의 지배 관계 근사, 같은 함수 안). 확인에서 함수 몸통까지 올라가며 갈래를 만날 때마다
 * 사용이 그 갈래 안에 있거나, 갈래를 고르는 조건이 확인을 반드시 평가했어야 한다. if 의 한 갈래가 늘 빠져나가면(throw·return 등)
 * 그 뒤의 같은 블록은 다른 갈래를 지난 자리다. 끝나지 않을 수 있는 함수(`fail()`)는 빠져나감으로 보지 않는다.
 */
function checkDominatesUse(check, use, t) {
  if (check.end > use.getStart()) return false;
  for (let child = check, parent = check.parent; parent && !isFunctionLike(parent, t); child = parent, parent = parent.parent) {
    // 조건식 안을 올라가는 동안에는 판정을 미루고, 그 조건 전체(갈래를 고르는 식)에서 판정한다.
    if (isLogical(parent, t) || t.isParenthesizedExpression(parent)
      || (t.isPrefixUnaryExpression(parent) && parent.operator === t.SyntaxKind.ExclamationToken)) {
      if (within(use, parent) && !within(use, child)) {
        // 같은 조건식 안의 사용: 확인이 왼쪽에 반드시 평가되고 사용이 오른쪽에 있다.
        if (isLogical(parent, t) && child === parent.left && alwaysEvaluated(check, parent.left, t)) return true;
        return false;
      }
      continue;
    }
    const test = child;
    if (t.isIfStatement(parent)) {
      if (child === parent.expression) {
        if (within(use, parent.thenStatement)) return evaluatedWhen(check, test, true, t);
        if (within(use, parent.elseStatement)) return evaluatedWhen(check, test, false, t);
        if (!within(use, parent)) {
          const thenExits = alwaysExits(parent.thenStatement, t);
          const elseExits = alwaysExits(parent.elseStatement, t);
          if (thenExits && !evaluatedWhen(check, test, false, t)) return false;
          if (elseExits && !evaluatedWhen(check, test, true, t)) return false;
          if (!thenExits && !elseExits && !(evaluatedWhen(check, test, true, t) && evaluatedWhen(check, test, false, t))) return false;
          // 확인을 지난 뒤의 자리다 — if 문 밖으로 올라가 계속 판정한다.
          continue;
        }
        return false;
      }
      if (!within(use, child)) return false;
      return true;
    }
    if (t.isConditionalExpression(parent)) {
      if (child === parent.condition) {
        if (within(use, parent.whenTrue)) return evaluatedWhen(check, test, true, t);
        if (within(use, parent.whenFalse)) return evaluatedWhen(check, test, false, t);
        if (!(evaluatedWhen(check, test, true, t) && evaluatedWhen(check, test, false, t))) return false;
        continue;
      }
      return within(use, child);
    }
    if ((t.isWhileStatement(parent) && child === parent.expression) || (t.isForStatement(parent) && child === parent.condition)) {
      if (within(use, parent.statement)) return evaluatedWhen(check, test, true, t);
      if (!evaluatedWhen(check, test, false, t)) return false;
      continue;
    }
    if ((t.isForStatement(parent) && (child === parent.statement || child === parent.incrementor))
      || ((t.isForInStatement(parent) || t.isForOfStatement(parent) || t.isWhileStatement(parent)) && child === parent.statement)
      || (t.isTryStatement(parent) && child === parent.catchClause) || t.isCaseClause(parent) || t.isDefaultClause(parent)) {
      return within(use, child);
    }
  }
  return true;
}

/** CodeQL 이 막지 않는 짝 — 있는지만 묻고 읽는 것은 예외로 끝날 뿐이다(2026-10-20 main 실측: existsSync 뒤 readFileSync 가 여럿 통과). */
const BENIGN_PAIRS = new Set(['exists:readFile', 'existsSync:readFileSync', 'exists:readFileSync', 'existsSync:readFile']);

function fileSystemRaceFindings(path, source, t) {
  const bindings = fsBindings(source, t);
  if (bindings.named.size === 0 && bindings.namespaces.size === 0) return [];
  const checks = [];
  const uses = [];
  const visit = (node) => {
    if (t.isCallExpression(node)) {
      const member = fsMember(node, bindings, t);
      const key = pathKey(node.arguments[0], t);
      if (member && key) {
        if (CHECK_MEMBERS.has(member)) checks.push({ node, member, key, fn: enclosingFunction(node, t) });
        if (USE_MEMBERS.has(member)) uses.push({ node, member, key, fn: enclosingFunction(node, t) });
      }
    }
    t.forEachChild(node, visit);
  };
  visit(source);
  const findings = [];
  for (const use of uses) {
    const check = checks.find((candidate) => candidate.key === use.key && !BENIGN_PAIRS.has(`${candidate.member}:${use.member}`) && (
      (candidate.fn === use.fn && checkDominatesUse(candidate.node, use.node, t))
      // 확인 호출의 콜백 안에서 같은 경로를 쓴다.
      || candidate.node.arguments.some((argument) => isFunctionLike(argument, t) && use.node.pos >= argument.pos && use.node.end <= argument.end)));
    if (!check) continue;
    const line = (node) => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    const shown = use.node.arguments[0].getText(source);
    findings.push({
      rule: 'js/file-system-race', file: path, line: line(use.node),
      message: `${check.member}(${shown}) 로 확인한 뒤(${line(check.node)}줄) 같은 경로를 ${use.member} 로 다시 엽니다 — 확인과 사용 사이에 파일이 바뀔 수 있습니다. `
        + '확인하지 말고 바로 열거나 읽고 ENOENT 등을 처리하거나, 연 기술자로만 읽으십시오(scripts/restore-drill.mjs 의 openRegularFile).',
    });
  }
  return findings;
}

// ─── 정규식 해석(규칙 2·3 공용) ────────────────────────────────────────────────────────────────────────────────────

/*
 * 문자 집합은 표본 문자 위의 비트 집합(BigInt)으로 근사한다. 표본은 ASCII 인쇄 문자·탭·줄바꿈 계열과 몇몇 비ASCII 문자, 그리고 그 정규식에
 * 나오는 글자다. 두 집합이 표본에서 겹치면 겹친다고 본다.
 */
const BASE_SAMPLE = (() => {
  const chars = ['\t', '\n', '\r', '\v', '\f', '\u00a0', '\u2028', '\u2029', '\ufeff', 'é', 'Ω', '가', '中', '😀'];
  for (let code = 0x20; code <= 0x7e; code += 1) chars.push(String.fromCharCode(code));
  return chars;
})();

class CharSets {
  constructor(extra) {
    this.chars = [...new Set([...BASE_SAMPLE, ...extra])];
    this.all = (1n << BigInt(this.chars.length)) - 1n;
  }
  of(predicate) {
    let bits = 0n;
    this.chars.forEach((char, index) => { if (predicate(char)) bits |= 1n << BigInt(index); });
    return bits;
  }
}

const WORD = /[A-Za-z0-9_]/u;
const SPACE = /\s/u;
const LINE_TERMINATOR = /[\n\r\u2028\u2029]/u;

/** 정규식 원문을 구문 트리로 읽는다. 읽지 못하는 문법은 null 이다(근사가 모르는 것은 판정하지 않는다). */
function parseRegExp(pattern, flags) {
  const unicode = flags.includes('u') || flags.includes('v');
  let index = 0;
  const literalChars = new Set();
  const peek = () => pattern[index];
  const fail = () => { throw new SyntaxError('unsupported'); };

  const classEscape = () => {
    const char = pattern[index++];
    if (char === undefined) fail();
    switch (char) {
      case 'd': return { kind: 'pred', test: (c) => /[0-9]/u.test(c) };
      case 'D': return { kind: 'pred', test: (c) => !/[0-9]/u.test(c) };
      case 'w': return { kind: 'pred', test: (c) => WORD.test(c) };
      case 'W': return { kind: 'pred', test: (c) => !WORD.test(c) };
      case 's': return { kind: 'pred', test: (c) => SPACE.test(c) };
      case 'S': return { kind: 'pred', test: (c) => !SPACE.test(c) };
      case 'p': case 'P': {
        if (peek() === '{') { const end = pattern.indexOf('}', index); if (end < 0) fail(); index = end + 1; }
        return { kind: 'pred', test: (c) => /[A-Za-z]/u.test(c) || c.codePointAt(0) > 0x7f, negated: char === 'P' };
      }
      case 't': return { kind: 'char', char: '\t' };
      case 'n': return { kind: 'char', char: '\n' };
      case 'r': return { kind: 'char', char: '\r' };
      case 'v': return { kind: 'char', char: '\v' };
      case 'f': return { kind: 'char', char: '\f' };
      case '0': return { kind: 'char', char: '\0' };
      case 'b': return { kind: 'char', char: '\b' };
      case 'c': { const letter = pattern[index++] ?? fail(); return { kind: 'char', char: String.fromCharCode(letter.charCodeAt(0) % 32) }; }
      case 'x': { const hex = pattern.slice(index, index + 2); index += 2; return { kind: 'char', char: String.fromCharCode(parseInt(hex, 16)) }; }
      case 'u': {
        if (peek() === '{') { const end = pattern.indexOf('}', index); const code = parseInt(pattern.slice(index + 1, end), 16); index = end + 1; return { kind: 'char', char: String.fromCodePoint(code) }; }
        const hex = pattern.slice(index, index + 4); index += 4; return { kind: 'char', char: String.fromCharCode(parseInt(hex, 16)) };
      }
      default: return { kind: 'char', char };
    }
  };

  const classAtom = () => {
    if (peek() === '\\') { index += 1; return classEscape(); }
    const char = String.fromCodePoint(pattern.codePointAt(index));
    index += char.length;
    return { kind: 'char', char };
  };

  const characterClass = () => {
    index += 1; // [
    let negated = false;
    if (peek() === '^') { negated = true; index += 1; }
    const items = [];
    while (index < pattern.length && peek() !== ']') {
      if (flags.includes('v') && (peek() === '[' || pattern.startsWith('&&', index) || pattern.startsWith('--', index))) fail();
      const from = classAtom();
      if (from.kind === 'char' && peek() === '-' && pattern[index + 1] !== ']' && pattern[index + 1] !== undefined) {
        index += 1;
        const to = classAtom();
        if (to.kind !== 'char') fail();
        items.push({ kind: 'range', from: from.char, to: to.char });
        literalChars.add(from.char); literalChars.add(to.char);
      } else {
        items.push(from);
        if (from.kind === 'char') literalChars.add(from.char);
      }
    }
    if (peek() !== ']') fail();
    index += 1;
    const member = (c) => items.some((item) => (item.kind === 'char' ? item.char === c
      : item.kind === 'range' ? c >= item.from && c <= item.to
        : item.negated ? !item.test(c) : item.test(c)));
    return { type: 'set', test: negated ? (c) => !member(c) : member, single: !negated && items.length === 1 && items[0].kind === 'char' ? items[0].char : undefined };
  };

  const quantifier = () => {
    const char = peek();
    let min; let max;
    if (char === '*') { min = 0; max = Infinity; index += 1; }
    else if (char === '+') { min = 1; max = Infinity; index += 1; }
    else if (char === '?') { min = 0; max = 1; index += 1; }
    else if (char === '{') {
      const match = /^\{(\d+)(?:(,)(\d*))?\}/u.exec(pattern.slice(index));
      if (!match) return undefined;
      min = Number(match[1]);
      max = match[2] ? (match[3] === '' ? Infinity : Number(match[3])) : min;
      index += match[0].length;
    } else return undefined;
    if (peek() === '?') index += 1;
    return { min, max, counted: char === '{' };
  };

  const disjunction = () => {
    const alternatives = [alternative()];
    while (peek() === '|') { index += 1; alternatives.push(alternative()); }
    return alternatives.length === 1 ? alternatives[0] : { type: 'alt', alternatives };
  };

  const alternative = () => {
    const terms = [];
    while (index < pattern.length && peek() !== '|' && peek() !== ')') {
      const atom = term();
      if (atom) terms.push(atom);
    }
    return { type: 'seq', terms };
  };

  const term = () => {
    const char = peek();
    let atom;
    if (char === '^' || char === '$') { index += 1; return { type: flags.includes('m') ? 'empty' : 'anchor' }; }
    if (char === '(') {
      index += 1;
      if (pattern.startsWith('?=', index) || pattern.startsWith('?!', index) || pattern.startsWith('?<=', index) || pattern.startsWith('?<!', index)) {
        index += pattern.startsWith('?<', index) ? 3 : 2;
        disjunction();
        if (peek() !== ')') fail();
        index += 1;
        quantifier();
        return { type: 'empty' }; // 둘러보기는 글자를 먹지 않는다.
      }
      if (pattern.startsWith('?:', index)) index += 2;
      else if (pattern.startsWith('?<', index)) { const end = pattern.indexOf('>', index); if (end < 0) fail(); index = end + 1; }
      else if (peek() === '?') fail();
      atom = disjunction();
      if (peek() !== ')') fail();
      index += 1;
    } else if (char === '[') atom = characterClass();
    else if (char === '.') { index += 1; atom = { type: 'set', test: flags.includes('s') ? () => true : (c) => !LINE_TERMINATOR.test(c) }; }
    else if (char === '\\') {
      index += 1;
      const next = peek();
      if (next === 'b' || next === 'B') { index += 1; return { type: 'empty' }; }
      if (/[1-9]/u.test(next ?? '')) { while (/\d/u.test(peek() ?? '')) index += 1; return { type: 'empty' }; }
      if (next === 'k' && pattern[index + 1] === '<') { const end = pattern.indexOf('>', index); index = end + 1; return { type: 'empty' }; }
      const escaped = classEscape();
      if (escaped.kind === 'char') literalChars.add(escaped.char);
      atom = escaped.kind === 'char' ? { type: 'set', test: (c) => c === escaped.char, single: escaped.char }
        : { type: 'set', test: escaped.negated ? (c) => !escaped.test(c) : escaped.test };
    } else if (char === '*' || char === '+' || char === '?' || (char === '{' && unicode)) fail();
    else {
      const literal = String.fromCodePoint(pattern.codePointAt(index));
      index += literal.length;
      literalChars.add(literal);
      atom = { type: 'set', test: (c) => c === literal, single: literal };
    }
    const repeat = quantifier();
    return repeat ? { type: 'repeat', body: atom, ...repeat } : atom;
  };

  try {
    const tree = disjunction();
    if (index !== pattern.length) return null;
    return { tree, literalChars };
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

// ─── 규칙 3: js/redos ──────────────────────────────────────────────────────────────────────────────────────────────

const MAX_POSITIONS = 400;
const MAX_COUNTED_COPIES = 24;

/*
 * Glushkov 위치 자동자. 각 위치는 문자 집합 하나다. 횟수 지정 반복({n}·{n,m}·{n,})은 그 횟수대로 펼친다(너무 크면 판정하지 않는다).
 * 여러 줄 플래그가 없는 ^·$ 는 글자를 먹은 뒤에는 지날 수 없는 자리라 그 앞뒤를 잇지 않는다(여러 줄이면 빈 자리로 본다).
 */
function glushkov(tree, charSets, ignoreCase) {
  const positions = [];
  const counted = [];
  let countedDepth = 0;
  const foldCase = (test) => (ignoreCase ? (c) => test(c) || test(c.toLowerCase()) || test(c.toUpperCase()) : test);
  const build = (node) => {
    switch (node.type) {
      case 'empty': return { nullable: true, first: [], last: [], follow: [] };
      case 'anchor': return { nullable: false, first: [], last: [], follow: [] };
      case 'set': {
        if (positions.length >= MAX_POSITIONS) throw new RangeError('too large');
        const id = positions.push(charSets.of(foldCase(node.test))) - 1;
        counted[id] = countedDepth > 0;
        return { nullable: false, first: [id], last: [id], follow: [] };
      }
      case 'seq': {
        let result = { nullable: true, first: [], last: [], follow: [] };
        for (const term of node.terms) result = concat(result, build(term));
        return result;
      }
      case 'alt': {
        const parts = node.alternatives.map(build);
        return {
          nullable: parts.some((part) => part.nullable), first: parts.flatMap((part) => part.first),
          last: parts.flatMap((part) => part.last), follow: parts.flatMap((part) => part.follow),
        };
      }
      case 'repeat': {
        const { min, max } = node;
        if (node.counted && (min > MAX_COUNTED_COPIES || (max !== Infinity && max > MAX_COUNTED_COPIES))) throw new RangeError('too large');
        if (node.counted) countedDepth += 1;
        let result = { nullable: true, first: [], last: [], follow: [] };
        for (let copy = 0; copy < min; copy += 1) result = concat(result, build(node.body));
        if (max === Infinity) {
          const body = build(node.body);
          const loop = [...body.follow, ...body.last.flatMap((from) => body.first.map((to) => [from, to]))];
          result = concat(result, { nullable: true, first: body.first, last: body.last, follow: loop });
        } else {
          for (let copy = min; copy < max; copy += 1) {
            const body = build(node.body);
            result = concat(result, { ...body, nullable: true });
          }
        }
        if (node.counted) countedDepth -= 1;
        return result;
      }
      default: throw new Error(`unknown node ${node.type}`);
    }
  };
  const concat = (left, right) => ({
    nullable: left.nullable && right.nullable,
    first: left.nullable ? [...left.first, ...right.first] : left.first,
    last: right.nullable ? [...left.last, ...right.last] : right.last,
    follow: [...left.follow, ...right.follow, ...left.last.flatMap((from) => right.first.map((to) => [from, to]))],
  });
  const result = build(tree);
  const next = positions.map(() => new Set());
  // 같은 위치 쌍을 두 번 잇는 간선(`(a*)*` 의 안쪽 반복과 바깥 반복)은 같은 글자를 두 갈래로 읽는다 — 겹친 간선으로 따로 남긴다.
  const seen = new Set();
  const parallel = [];
  for (const [from, to] of result.follow) {
    const key = `${from}>${to}`;
    if (seen.has(key)) parallel.push([from, to]); else seen.add(key);
    next[from].add(to);
  }
  return { positions, counted, accepting: new Set(result.last), parallel, next: next.map((set) => [...set]) };
}

/*
 * 지수 역추적: 위치 쌍 그래프에서 대각선 쌍 (p,p) 와 비대각선 쌍이 같은 강결합 요소에 있는가 — 같은 위치에서 같은 글자열을 두 갈래로
 * 읽어 같은 위치로 돌아온다. 갈라지는 쌍의 한쪽이 횟수 지정 반복 안의 위치인 것(`(?:\n {10,}[^\n]*)*` 의 ` {10,}` 꼬리)은 세지 않는다 —
 * CodeQL 이 main 에서 그 모양을 막지 않았다(2026-10-20 실측). 근사는 CodeQL 보다 넓게 막지 않는다.
 * 반복 안의 어느 자리에서든 그대로 끝낼 수 있으면(패턴이 반복으로 끝난다) 역추적이 깊어지기 전에 일치로 끝나 지수 역추적이 아니다
 * (거부시킬 뒷부분이 없다) — 그런 요소는 세지 않는다.
 */
function exponentialAmbiguity(automaton) {
  const { positions, counted, accepting, parallel, next } = automaton;
  const n = positions.length;
  // 겹친 간선이 순환 위에 있으면(끝 위치에서 시작 위치로 돌아갈 수 있다) 같은 글자열을 두 갈래로 되풀이한다.
  const reaches = (from, to) => {
    const seenPositions = new Set([from]);
    const queue = [from];
    while (queue.length) {
      const at = queue.shift();
      if (at === to) return true;
      for (const following of next[at]) if (!seenPositions.has(following)) { seenPositions.add(following); queue.push(following); }
    }
    return false;
  };
  for (const [from, to] of parallel) {
    if (counted[from] || counted[to] || accepting.has(from) || accepting.has(to)) continue;
    if (reaches(to, from)) return true;
  }
  const id = (p, q) => p * n + q;
  const edges = (node) => {
    const p = Math.floor(node / n); const q = node % n;
    const out = [];
    for (const p2 of next[p]) for (const q2 of next[q]) if ((positions[p2] & positions[q2]) !== 0n) out.push(id(p2, q2));
    return out;
  };
  // Tarjan(반복형) — 쌍 그래프는 크지만 실제로 닿는 쌍만 만든다. 시작은 모든 대각선 쌍이다.
  const index = new Map(); const low = new Map(); const onStack = new Set(); const stack = [];
  let counter = 0;
  for (let p = 0; p < n; p += 1) {
    const start = id(p, p);
    if (index.has(start)) continue;
    const work = [[start, edges(start), 0]];
    index.set(start, counter); low.set(start, counter); counter += 1; stack.push(start); onStack.add(start);
    while (work.length) {
      const frame = work[work.length - 1];
      const [node, out] = frame;
      if (frame[2] < out.length) {
        const target = out[frame[2]++];
        if (!index.has(target)) {
          index.set(target, counter); low.set(target, counter); counter += 1; stack.push(target); onStack.add(target);
          work.push([target, edges(target), 0]);
        } else if (onStack.has(target)) low.set(node, Math.min(low.get(node), index.get(target)));
        continue;
      }
      work.pop();
      if (work.length) { const parent = work[work.length - 1][0]; low.set(parent, Math.min(low.get(parent), low.get(node))); }
      if (low.get(node) === index.get(node)) {
        const component = [];
        let member;
        do { member = stack.pop(); onStack.delete(member); component.push(member); } while (member !== node);
        if (component.length > 1 || edges(node).includes(node)) {
          const diagonal = component.some((value) => Math.floor(value / n) === value % n);
          const offDiagonal = component.some((value) => {
            const p = Math.floor(value / n); const q = value % n;
            return p !== q && !counted[p] && !counted[q];
          });
          const canStop = component.some((value) => accepting.has(Math.floor(value / n)) || accepting.has(value % n));
          if (diagonal && offDiagonal && !canStop) return true;
        }
      }
    }
  }
  return false;
}

/** 정규식 원문이 지수 역추적을 품는가. 근사가 읽지 못하는 문법이나 너무 큰 정규식은 false(판정하지 않음)다. */
export function hasExponentialBacktracking(pattern, flags = '') {
  const parsed = parseRegExp(pattern, flags);
  if (!parsed) return false;
  try {
    const charSets = new CharSets(parsed.literalChars);
    return exponentialAmbiguity(glushkov(parsed.tree, charSets, flags.includes('i')));
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

// ─── 규칙 2: js/incomplete-sanitization ───────────────────────────────────────────────────────────────────────────

const METACHARACTERS = new Set(['\'', '"', '\\', '&', '<', '>', '\n', '\r', '\t', '*', '|', '{', '}', '[', ']', '%', '$']);

/** 정규식이 백슬래시를 맞출 수 있는가(원문에 이스케이프한 백슬래시가 있다). */
const matchesBackslash = (pattern) => pattern.includes('\\\\');

/** 정규식이 정확히 한 글자만 맞추면 그 글자. */
function singleCharacter(pattern, flags) {
  const parsed = parseRegExp(pattern, flags);
  const tree = parsed?.tree;
  if (!tree) return undefined;
  const only = tree.type === 'seq' && tree.terms.length === 1 ? tree.terms[0] : tree;
  return only.type === 'set' ? only.single : undefined;
}

function regexLiteralParts(node, source, t) {
  if (!t.isRegularExpressionLiteral(node)) return undefined;
  const text = node.getText(source);
  const end = text.lastIndexOf('/');
  return { pattern: text.slice(1, end), flags: text.slice(end + 1) };
}

/** receiver 가 이미 백슬래시를 이스케이프했는가(앞선 전역 치환이 백슬래시를 맞추거나 JSON.stringify). */
function escapesBackslashes(node, source, t) {
  if (!t.isCallExpression(node) || !t.isPropertyAccessExpression(node.expression)) return false;
  const name = node.expression.name.text;
  if (name === 'stringify' && t.isIdentifier(node.expression.expression) && node.expression.expression.text === 'JSON') return true;
  if (name !== 'replace' && name !== 'replaceAll') return false;
  const regex = regexLiteralParts(node.arguments[0], source, t);
  if (regex && matchesBackslash(regex.pattern) && (name === 'replaceAll' || regex.flags.includes('g'))) return true;
  return escapesBackslashes(node.expression.expression, source, t);
}

function sanitizationFindings(path, source, t) {
  const findings = [];
  const visit = (node) => {
    if (t.isCallExpression(node) && t.isPropertyAccessExpression(node.expression) && node.arguments.length >= 2
      && ['replace', 'replaceAll'].includes(node.expression.name.text)) {
      const all = node.expression.name.text === 'replaceAll';
      const [target, replacement] = node.arguments;
      const regex = regexLiteralParts(target, source, t);
      const global = all || Boolean(regex?.flags.includes('g'));
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      const replacementText = t.isStringLiteralLike(replacement) ? replacement.text : undefined;
      const single = regex ? singleCharacter(regex.pattern, regex.flags) : t.isStringLiteralLike(target) ? target.text : undefined;
      const escapes = replacementText !== undefined && (/^\\\$(?:&|\d)$/u.test(replacementText)
        || (single !== undefined && replacementText === `\\${single}`));
      if (regex && global && escapes && !matchesBackslash(regex.pattern) && !escapesBackslashes(node.expression.expression, source, t)) {
        findings.push({ rule: 'js/incomplete-sanitization', file: path, line,
          message: `${target.getText(source)} 를 이스케이프하면서 백슬래시는 이스케이프하지 않습니다 — 정규식에 넣을 값은 /[.*+?^\${}()|[\\]\\\\]/g 로 모두 이스케이프하십시오.` });
      } else if (!global && single !== undefined && single.length === 1 && METACHARACTERS.has(single)) {
        findings.push({ rule: 'js/incomplete-sanitization', file: path, line,
          message: `${target.getText(source)} 의 첫 번째만 바꿉니다 — 모두 바꾸려면 전역 플래그(g)나 replaceAll 을 쓰십시오.` });
      }
    }
    t.forEachChild(node, visit);
  };
  visit(source);
  return findings;
}

function redosFindings(path, source, t) {
  const findings = [];
  const report = (node, pattern, flags) => {
    if (!hasExponentialBacktracking(pattern, flags)) return;
    findings.push({ rule: 'js/redos', file: path, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      message: `/${pattern.length > 80 ? `${pattern.slice(0, 77)}...` : pattern}/ 는 같은 글자열을 두 갈래로 읽으며 반복합니다(지수 역추적) — `
        + '반복 안팎의 수량자가 같은 글자를 나눠 먹지 않게 고치십시오(예: 각 반복을 고정 글자로 시작).' });
  };
  const visit = (node) => {
    const regex = regexLiteralParts(node, source, t);
    if (regex) report(node, regex.pattern, regex.flags);
    else if ((t.isNewExpression(node) || t.isCallExpression(node)) && t.isIdentifier(node.expression) && node.expression.text === 'RegExp'
      && node.arguments?.[0] && t.isStringLiteralLike(node.arguments[0])) {
      const flags = node.arguments[1] && t.isStringLiteralLike(node.arguments[1]) ? node.arguments[1].text : '';
      report(node, node.arguments[0].text, flags);
    }
    t.forEachChild(node, visit);
  };
  visit(source);
  return findings;
}

// ─── 실행 ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** 한 파일의 근사 판정. { rule, file, line, message } 목록(줄 순). */
export function inspectSource(path, text) {
  const kind = SCRIPT_KINDS[extname(path)];
  if (!kind) throw new Error(`JS·TS 파일이 아니다: ${path}`);
  const t = ts();
  const source = t.createSourceFile(path, text, t.ScriptTarget.Latest, true, t.ScriptKind[kind]);
  return [...fileSystemRaceFindings(path, source, t), ...sanitizationFindings(path, source, t), ...redosFindings(path, source, t)]
    .sort((left, right) => left.line - right.line || left.rule.localeCompare(right.rule));
}

export function inspectRepository(root = REPO_ROOT, files = approximationFiles(root)) {
  return files.flatMap((path) => inspectSource(path, readFileSync(join(root, path), 'utf8')));
}

export const formatFinding = ({ rule, file, line, message }) => `${file}:${line}: [${rule} 근사] ${message}`;

/**
 * 판정할 파일. listed: --stdin 으로 받은 저장소 상대 경로(줄마다 하나). 세 규칙은 함수·정규식 안의 판정이라 바뀐 파일만 보면 된다 —
 * 모집단 밖·지운 파일은 거른다. 목록이 비면(push 범위를 모른다) 모집단 전체를 본다(fail-closed).
 */
export function selectedFiles(listed, population = approximationFiles()) {
  const wanted = listed.map((line) => line.trim().replaceAll('\\', '/').replace(/^\.\//u, '')).filter(Boolean);
  if (wanted.length === 0) return population;
  const known = new Set(population);
  return [...new Set(wanted)].filter((file) => known.has(file)).sort();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const started = Date.now();
  const files = process.argv.includes('--stdin')
    ? selectedFiles(readFileSync(0, 'utf8').split(/\r?\n/u))
    : approximationFiles();
  const findings = inspectRepository(REPO_ROOT, files);
  for (const finding of findings) console.error(formatFinding(finding));
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (findings.length) {
    console.error(`❌ CodeQL 근사 ${findings.length}건(${files.length}개 파일, ${seconds}초) — CI CodeQL(secure-coding)이 같은 모양을 막아 왔습니다. 근사를 통과해도 판정 권위는 CI CodeQL 입니다.`);
    process.exit(1);
  }
  console.log(`✅ CodeQL 근사(${APPROXIMATED_RULES.join('·')}) 0건 — ${files.length}개 파일, ${seconds}초. 판정 권위는 CI CodeQL 입니다.`);
}
