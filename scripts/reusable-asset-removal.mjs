/*
 * Shared multi-ledger asset removal engine, ledger disjointness validator, and survival leak detector.
 */
import { lstatSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, posix, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

function assertCleanRelativePath(value, context) {
  if (typeof value !== 'string' || !value.length || value.trim() !== value) {
    throw new Error(`제거 원장의 ${context} 경로는 비어 있지 않은 상대 경로여야 한다: ${JSON.stringify(value)}`);
  }
  if (value.includes('\\') || value.includes('\0') || value.includes(':')
    || isAbsolute(value) || posix.isAbsolute(value)
    || value.startsWith('/') || value.endsWith('/')) {
    throw new Error(`제거 원장의 ${context} 경로는 안전한 POSIX 상대 경로여야 한다: ${value}`);
  }
  const segments = value.split('/');
  if (segments.some(seg => seg === '' || seg === '.' || seg === '..')) {
    throw new Error(`제거 원장의 ${context} 경로가 상위·빈 세그먼트를 포함할 수 없다: ${value}`);
  }
  return value;
}

function assertStrictSubpath(rootReal, candidateReal, relPath, context) {
  const rel = relative(rootReal, candidateReal);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error(`제거 원장의 ${context} 대상이 출력 루트 밖을 가리킨다: ${relPath}`);
  }
}

function inspectStrictChild(outputRoot, rootReal, relPath, context, { requireFile = false } = {}) {
  assertCleanRelativePath(relPath, context);
  const segments = relPath.split('/');
  let cur = outputRoot;
  let lastStat = null;
  let lastReal = null;
  for (let idx = 0; idx < segments.length; idx += 1) {
    cur = join(cur, segments[idx]);
    let stat;
    try {
      stat = lstatSync(cur, { bigint: true });
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return {
          exists: false,
          target: idx === segments.length - 1 ? cur : null,
          realPath: null,
          nlink: 0,
          dev: 0n,
          ino: 0n,
          isFile: false,
          isDirectory: false,
        };
      }
      throw error;
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`제거 원장의 ${context} 대상이 심볼릭 링크/정션을 지난다: ${relPath}`);
    }
    lastReal = realpathSync(cur);
    assertStrictSubpath(rootReal, lastReal, relPath, context);
    lastStat = stat;
  }
  if (requireFile && !lastStat?.isFile()) {
    throw new Error(`제거 원장의 ${context} 대상은 일반 파일이어야 한다: ${relPath}`);
  }
  return {
    exists: true,
    target: cur,
    realPath: lastReal,
    nlink: Number(lastStat?.nlink ?? 0n),
    dev: lastStat?.dev ?? 0n,
    ino: lastStat?.ino ?? 0n,
    isFile: Boolean(lastStat?.isFile()),
    isDirectory: Boolean(lastStat?.isDirectory()),
  };
}

/** Parse and validate a removal ledger string or object (`assets`, optional `aliases`, optional `gates`). */
export function parseRemovalLedger(raw, ledgerPath = 'removal-ledger') {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`제거 원장은 JSON 객체여야 한다: ${ledgerPath}`);
  }
  if (!Array.isArray(parsed.assets)) {
    throw new Error(`제거 원장의 assets 는 배열이어야 한다: ${ledgerPath}`);
  }
  const assets = parsed.assets.map(asset => assertCleanRelativePath(asset, 'assets'));

  let aliases = [];
  if (parsed.aliases !== undefined) {
    if (!Array.isArray(parsed.aliases)
      || parsed.aliases.some(alias => typeof alias !== 'string' || !alias.trim() || alias.trim() !== alias)) {
      throw new Error(`제거 원장의 aliases 는 비어 있지 않은 문자열 배열이어야 한다: ${ledgerPath}`);
    }
    aliases = [...parsed.aliases];
  }

  let gates = [];
  if (parsed.gates !== undefined) {
    if (!Array.isArray(parsed.gates)
      || parsed.gates.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
      throw new Error(`제거 원장의 gates 는 객체 배열이어야 한다: ${ledgerPath}`);
    }
    gates = parsed.gates.map(row => ({
      ...row,
      file: assertCleanRelativePath(row.file, 'gates[].file'),
    }));
  }

  return { ...parsed, assets, aliases, gates };
}

/** Read and validate a removal ledger file within `root` without following symlinks/junctions or escapes. */
export function readRemovalLedger(root, ledgerPath) {
  const rootReal = realpathSync(root);
  const inspected = inspectStrictChild(root, rootReal, ledgerPath, '원장 파일', { requireFile: true });
  if (!inspected.exists) {
    const err = new Error(`제거 원장을 찾을 수 없다: ${ledgerPath}`);
    err.code = 'ENOENT';
    throw err;
  }
  return parseRemovalLedger(readFileSync(inspected.target, 'utf8'), ledgerPath);
}

/** Missing assets or package.json script aliases indicating a stale removal ledger. */
export function staleRemovalLedgerEntries(ledger, has, scripts) {
  return [
    ...(ledger.assets ?? []).filter(asset => !has(asset)),
    ...(ledger.aliases ?? []).filter(alias => !Object.hasOwn(scripts ?? {}, alias)),
  ];
}

/** Return true when `candidate` equals `asset` or lives strictly beneath directory `asset/`. */
export function isPathCoveredBy(candidate, asset, { caseInsensitive = false } = {}) {
  const left = caseInsensitive ? candidate.toLowerCase() : candidate;
  const right = caseInsensitive ? asset.toLowerCase() : asset;
  return left === right || left.startsWith(`${right}/`);
}

/**
 * Remove assets, gate files, and script aliases listed in `ledgerPath` from `output`.
 * Validates relative path safety, strict output-root containment (including `package.json` hardlinks & file IDs),
 * regular-file gate type, and ledger completeness before any deletion or write.
 */
export function pruneAssetLedger(output, { ledgerPath, label = '제거 원장' }) {
  const ledger = readRemovalLedger(output, ledgerPath);
  if (ledger.assets.some(asset => asset.toLowerCase() === 'package.json')
    || ledger.gates.some(row => row.file.toLowerCase() === 'package.json')) {
    throw new Error(`${label}은 package.json 을 제거 대상으로 포함할 수 없다`);
  }
  const rootReal = realpathSync(output);
  const pkgInspect = inspectStrictChild(output, rootReal, 'package.json', 'package.json', { requireFile: true });
  if (!pkgInspect.exists) {
    throw new Error(`${label}이 낡았다: package.json 이 없다`);
  }
  if (pkgInspect.nlink > 1) {
    throw new Error(`제거 원장의 package.json 은 하드 링크(nlink > 1)일 수 없다`);
  }
  const pkg = JSON.parse(readFileSync(pkgInspect.target, 'utf8'));

  const gateTargets = ledger.gates.map(row => ({
    file: row.file,
    inspected: inspectStrictChild(output, rootReal, row.file, 'gates[].file', { requireFile: true }),
  }));
  const assetTargets = ledger.assets.map(asset => ({
    asset,
    inspected: inspectStrictChild(output, rootReal, asset, 'assets'),
  }));
  const isSameAsPackageJson = inspected => inspected.exists && (
    (pkgInspect.ino !== 0n && inspected.dev === pkgInspect.dev && inspected.ino === pkgInspect.ino)
    || (inspected.realPath && pkgInspect.realPath && inspected.realPath.toLowerCase() === pkgInspect.realPath.toLowerCase())
  );
  if (gateTargets.some(item => isSameAsPackageJson(item.inspected))
    || assetTargets.some(item => isSameAsPackageJson(item.inspected))) {
    throw new Error(`${label}은 package.json 을 제거 대상으로 포함할 수 없다`);
  }

  const existingAssets = new Set(assetTargets.filter(item => item.inspected.exists).map(item => item.asset));
  const stale = staleRemovalLedgerEntries(ledger, asset => existingAssets.has(asset), pkg.scripts);
  if (stale.length) throw new Error(`${label}이 낡았다: ${stale.join(', ')}`);

  const existingGates = gateTargets
    .filter(item => item.inspected.exists)
    .sort((left, right) => left.file.localeCompare(right.file));
  for (const gate of existingGates) {
    rmSync(gate.inspected.target, { force: true });
  }
  for (const item of assetTargets) {
    rmSync(item.inspected.target, { recursive: true, force: true });
  }
  for (const alias of ledger.aliases) delete pkg.scripts[alias];
  writeFileSync(pkgInspect.target, `${JSON.stringify(pkg, null, 2)}\n`);
  return {
    files: existingGates.map(item => item.file),
    assets: [...ledger.assets],
    aliases: [...ledger.aliases],
  };
}

/**
 * Verify multiple removal ledgers are pairwise disjoint across assets and gates (including
 * directory prefixes and Windows case collisions), and script aliases.
 */
export function findLedgerOverlapErrors(namedLedgers) {
  const errors = [];
  for (let i = 0; i < namedLedgers.length; i += 1) {
    const left = namedLedgers[i];
    const leftPaths = [
      ...(left.ledger.assets ?? []).map(path => ({ kind: 'asset', path })),
      ...(left.ledger.gates ?? []).map(row => ({ kind: 'gate', path: row.file })),
    ];
    for (let j = i + 1; j < namedLedgers.length; j += 1) {
      const right = namedLedgers[j];
      const rightPaths = [
        ...(right.ledger.assets ?? []).map(path => ({ kind: 'asset', path })),
        ...(right.ledger.gates ?? []).map(row => ({ kind: 'gate', path: row.file })),
      ];
      for (const l of leftPaths) {
        for (const r of rightPaths) {
          if (isPathCoveredBy(l.path, r.path, { caseInsensitive: true })
            || isPathCoveredBy(r.path, l.path, { caseInsensitive: true })) {
            const label = l.kind === r.kind ? l.kind : 'asset/gate';
            const detail = l.path === r.path && l.kind === 'gate' && r.kind === 'gate'
              ? l.path
              : `${l.path} <-> ${r.path}`;
            errors.push(`removal ledger ${label} overlap (${left.name} vs ${right.name}): ${detail}`);
          }
        }
      }
      const rightAliases = new Set(right.ledger.aliases ?? []);
      for (const alias of left.ledger.aliases ?? []) {
        if (rightAliases.has(alias)) {
          errors.push(`removal ledger alias overlap (${left.name} vs ${right.name}): ${alias}`);
        }
      }
    }
  }
  return errors;
}

const THREE_CHAR_OPS = new Set(['===', '!==', '>>>', '...', '&&=', '||=', '??=']);
const TWO_CHAR_OPS = new Set(['??', '&&', '||', '=>', '<=', '>=', '==', '!=', '<<', '>>', '**', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=']);
const BINARY_OP_WORDS = new Set(['instanceof', 'in']);
const BINARY_OP_PUNCTS = new Set(['===', '!==', '==', '!=', '<=', '>=', '<', '>', '<<', '>>', '>>>', '+', '-', '*', '/', '%', '**', '&', '|', '^']);
const UNARY_PREFIX_WORDS = new Set(['await', 'typeof', 'void', 'delete']);
const UNARY_PREFIX_PUNCTS = new Set(['!', '+', '-', '~', '++', '--']);
const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '&&=', '||=', '??=']);
const NON_LITERAL_STMT_STOP = new Set([';', '}']);

function stepNewline(source, index, line) {
  const ch = source[index];
  if (ch === '\r') {
    return { nextLine: line + 1, nextIndex: source[index + 1] === '\n' ? index + 2 : index + 1 };
  }
  if (ch === '\n' || ch === '\u2028' || ch === '\u2029') {
    return { nextLine: line + 1, nextIndex: index + 1 };
  }
  return null;
}

function isLineTerminator(ch) {
  return ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029';
}

function skipRegexLiteral(source, start) {
  let inCharacterClass = false;
  for (let i = start + 1; i < source.length; i += 1) {
    const ch = source[i];
    if (isLineTerminator(ch)) return undefined;
    if (ch === '\\') {
      const next = source[i + 1];
      if (next === undefined || isLineTerminator(next)) return undefined;
      i += 1;
      continue;
    }
    if (ch === '[') {
      inCharacterClass = true;
    } else if (ch === ']') {
      inCharacterClass = false;
    } else if (ch === '/' && !inCharacterClass) {
      let end = i + 1;
      while (end < source.length && /[A-Za-z]/u.test(source[end])) end += 1;
      return end;
    }
  }
  return undefined;
}

function decodeEscape(source, backslashPos, line) {
  const next = source[backslashPos + 1];
  if (next === undefined) return { text: '', nextIndex: backslashPos + 1, nextLine: line };
  const nl = stepNewline(source, backslashPos + 1, line);
  if (nl) return { text: '', nextIndex: nl.nextIndex, nextLine: nl.nextLine };
  const simple = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v' };
  if (Object.hasOwn(simple, next)) return { text: simple[next], nextIndex: backslashPos + 2, nextLine: line };
  if (next === '0' && !/[0-9]/u.test(source[backslashPos + 2] ?? '')) {
    return { text: '\0', nextIndex: backslashPos + 2, nextLine: line };
  }
  if (next === 'x') {
    const hex = source.slice(backslashPos + 2, backslashPos + 4);
    if (/^[0-9a-fA-F]{2}$/u.test(hex)) {
      return { text: String.fromCharCode(Number.parseInt(hex, 16)), nextIndex: backslashPos + 4, nextLine: line };
    }
  }
  if (next === 'u') {
    if (source[backslashPos + 2] === '{') {
      const close = source.indexOf('}', backslashPos + 3);
      if (close > backslashPos + 3) {
        const hex = source.slice(backslashPos + 3, close);
        if (/^[0-9a-fA-F]+$/u.test(hex)) {
          const cp = Number.parseInt(hex, 16);
          if (cp <= 0x10ffff) {
            return { text: String.fromCodePoint(cp), nextIndex: close + 1, nextLine: line };
          }
        }
      }
    } else {
      const hex = source.slice(backslashPos + 2, backslashPos + 6);
      if (/^[0-9a-fA-F]{4}$/u.test(hex)) {
        return { text: String.fromCharCode(Number.parseInt(hex, 16)), nextIndex: backslashPos + 6, nextLine: line };
      }
    }
  }
  return { text: next, nextIndex: backslashPos + 2, nextLine: line };
}

function readQuotedString(source, open, quote, startLine) {
  let raw = '';
  let line = startLine;
  for (let i = open + 1; i < source.length;) {
    const ch = source[i];
    if (ch === '\\') {
      const esc = decodeEscape(source, i, line);
      raw += esc.text;
      i = esc.nextIndex;
      line = esc.nextLine;
    } else if (ch === quote) {
      return { value: raw, next: i + 1, endLine: line };
    } else {
      const nl = stepNewline(source, i, line);
      if (nl) {
        line = nl.nextLine;
        raw += source.slice(i, nl.nextIndex);
        i = nl.nextIndex;
      } else {
        raw += ch;
        i += 1;
      }
    }
  }
  return { value: raw, next: source.length, endLine: line };
}

function skipWsAndComments(source, startPos, startLine) {
  let i = startPos;
  let line = startLine;
  if (i === 0 && source[0] === '#' && source[1] === '!') {
    while (i < source.length && !isLineTerminator(source[i])) i += 1;
  }
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    const nl = stepNewline(source, i, line);
    if (nl) {
      line = nl.nextLine;
      i = nl.nextIndex;
    } else if (/\s/u.test(ch)) {
      i += 1;
    } else if (ch === '/' && next === '/') {
      i += 2;
      while (i < source.length && !isLineTerminator(source[i])) i += 1;
    } else if (ch === '/' && next === '*') {
      i += 2;
      while (i < source.length) {
        if (source[i] === '*' && source[i + 1] === '/') {
          i += 2;
          break;
        }
        const bnl = stepNewline(source, i, line);
        if (bnl) {
          line = bnl.nextLine;
          i = bnl.nextIndex;
          continue;
        }
        i += 1;
      }
    } else {
      break;
    }
  }
  return { pos: i, line };
}

function decodeUnicodeEscape(source, backslashPos) {
  if (source[backslashPos] !== '\\' || source[backslashPos + 1] !== 'u') return null;
  if (source[backslashPos + 2] === '{') {
    const close = source.indexOf('}', backslashPos + 3);
    if (close <= backslashPos + 3) return null;
    const hex = source.slice(backslashPos + 3, close);
    if (!/^[0-9a-fA-F]+$/u.test(hex)) return null;
    const cp = Number.parseInt(hex, 16);
    if (cp > 0x10ffff) return null;
    return { ch: String.fromCodePoint(cp), nextIndex: close + 1 };
  }
  const hex = source.slice(backslashPos + 2, backslashPos + 6);
  if (!/^[0-9a-fA-F]{4}$/u.test(hex)) return null;
  return { ch: String.fromCharCode(Number.parseInt(hex, 16)), nextIndex: backslashPos + 6 };
}

const IDENT_START_RE = /^[\p{ID_Start}$_]$/u;
const IDENT_CONTINUE_RE = /^[\p{ID_Continue}$\u200C\u200D]$/u;

function readIdentifier(source, startPos) {
  if (source[startPos] !== '\\') {
    const identRe = /[\p{ID_Start}$_][\p{ID_Continue}$\u200C\u200D]*/uy;
    identRe.lastIndex = startPos;
    const match = identRe.exec(source);
    if (!match) return null;
    const afterFast = startPos + match[0].length;
    if (source[afterFast] !== '\\') {
      return { value: match[0], nextPos: afterFast, hasEscape: false };
    }
  }
  let i = startPos;
  let value = '';
  let hasEscape = false;
  let isFirst = true;
  while (i < source.length) {
    let ch;
    let next;
    if (source[i] === '\\') {
      const esc = decodeUnicodeEscape(source, i);
      if (!esc) break;
      ch = esc.ch;
      next = esc.nextIndex;
      hasEscape = true;
    } else {
      const cp = source.codePointAt(i);
      ch = String.fromCodePoint(cp);
      next = i + ch.length;
    }
    if (isFirst ? !IDENT_START_RE.test(ch) : !IDENT_CONTINUE_RE.test(ch)) break;
    value += ch;
    i = next;
    isFirst = false;
  }
  return isFirst ? null : { value, nextPos: i, hasEscape };
}

/** Pull lexer driven by recursive-descent expression/statement expectations (`allowRegex`). */
function createLexer(source) {
  const state = { pos: 0, line: 1 };
  let cache = null;

  function scanToken(allowRegex) {
    const { pos: tokStart, line } = skipWsAndComments(source, state.pos, state.line);
    if (tokStart >= source.length) {
      return { tok: null, nextPos: tokStart, nextLine: line, allowRegex };
    }
    const ch = source[tokStart];
    const next = source[tokStart + 1];

    if (allowRegex && ch === '/') {
      const regexEnd = skipRegexLiteral(source, tokStart);
      if (regexEnd !== undefined) {
        return { tok: { kind: 'regex', line, start: tokStart }, nextPos: regexEnd, nextLine: line, allowRegex: true };
      }
    }
    if (ch === '"' || ch === "'") {
      const quoted = readQuotedString(source, tokStart, ch, line);
      return { tok: { kind: 'string', value: quoted.value, line, start: tokStart }, nextPos: quoted.next, nextLine: quoted.endLine, allowRegex };
    }
    if (ch === '`') {
      return { tok: { kind: 'template-open', line, start: tokStart }, nextPos: tokStart + 1, nextLine: line, allowRegex };
    }
    if (/[0-9]/u.test(ch) || (ch === '.' && /[0-9]/u.test(next ?? ''))) {
      let end = tokStart + 1;
      while (end < source.length && /[0-9a-zA-Z_.]/u.test(source[end])) end += 1;
      if ((source[end] === '+' || source[end] === '-') && /[eE]/u.test(source[end - 1] ?? '')) {
        end += 1;
        while (end < source.length && /[0-9a-zA-Z_]/u.test(source[end])) end += 1;
      }
      return { tok: { kind: 'number', line, start: tokStart }, nextPos: end, nextLine: line, allowRegex };
    }
    if (ch === '\\' || /[A-Za-z_$\u0080-\uFFFF]/u.test(ch)) {
      const ident = readIdentifier(source, tokStart);
      if (ident) {
        return {
          tok: { kind: 'word', value: ident.value, hasEscape: ident.hasEscape, line, start: tokStart },
          nextPos: ident.nextPos,
          nextLine: line,
          allowRegex,
        };
      }
    }
    if (ch === '?' && next === '.' && !/[0-9]/u.test(source[tokStart + 2] ?? '')) {
      return { tok: { kind: 'punct', value: '?.', line, start: tokStart }, nextPos: tokStart + 2, nextLine: line, allowRegex };
    }
    if (source.slice(tokStart, tokStart + 4) === '>>>=') {
      return { tok: { kind: 'punct', value: '>>>=', line, start: tokStart }, nextPos: tokStart + 4, nextLine: line, allowRegex };
    }
    const three = source.slice(tokStart, tokStart + 3);
    if (THREE_CHAR_OPS.has(three)) {
      return { tok: { kind: 'punct', value: three, line, start: tokStart }, nextPos: tokStart + 3, nextLine: line, allowRegex };
    }
    const two = source.slice(tokStart, tokStart + 2);
    if (TWO_CHAR_OPS.has(two)) {
      return { tok: { kind: 'punct', value: two, line, start: tokStart }, nextPos: tokStart + 2, nextLine: line, allowRegex };
    }
    return { tok: { kind: 'punct', value: ch, line, start: tokStart }, nextPos: tokStart + 1, nextLine: line, allowRegex };
  }

  return {
    get pos() { return state.pos; },
    get line() { return state.line; },
    save() { return { pos: state.pos, line: state.line }; },
    restore(saved) { state.pos = saved.pos; state.line = saved.line; cache = null; },
    invalidate() { cache = null; },
    setCursor(pos, line) { state.pos = pos; state.line = line; cache = null; },
    peek(allowRegex = false) {
      if (!cache || (allowRegex && !cache.allowRegex && cache.tok?.kind === 'punct' && cache.tok.value === '/')) {
        cache = scanToken(allowRegex);
      }
      return cache.tok;
    },
    next(allowRegex = false) {
      const tok = this.peek(allowRegex);
      if (cache) {
        state.pos = cache.nextPos;
        state.line = cache.nextLine;
        cache = null;
      }
      return tok;
    },
    consumeTemplateSegment() {
      let decoded = '';
      let i = state.pos;
      let line = state.line;
      while (i < source.length) {
        const ch = source[i];
        if (ch === '\\') {
          const esc = decodeEscape(source, i, line);
          decoded += esc.text;
          i = esc.nextIndex;
          line = esc.nextLine;
        } else if (ch === '`') {
          state.pos = i + 1;
          state.line = line;
          cache = null;
          return { kind: 'end', value: decoded };
        } else if (ch === '$' && source[i + 1] === '{') {
          state.pos = i + 2;
          state.line = line;
          cache = null;
          return { kind: 'expr', value: decoded };
        } else {
          const nl = stepNewline(source, i, line);
          if (nl) {
            line = nl.nextLine;
            decoded += source.slice(i, nl.nextIndex);
            i = nl.nextIndex;
          } else {
            decoded += ch;
            i += 1;
          }
        }
      }
      state.pos = source.length;
      state.line = line;
      cache = null;
      return { kind: 'end', value: decoded };
    },
  };
}

function isWord(tok, word) {
  return tok?.kind === 'word' && !tok.hasEscape && tok.value === word;
}

function isPunct(tok, value) {
  return tok?.kind === 'punct' && tok.value === value;
}

function unionSets(left, right) {
  if (!right || right.size === 0) return left;
  const merged = new Set(left);
  for (const item of right) merged.add(item);
  return merged;
}

function provenOf(expr, branch, shadowed) {
  if (!expr) return new Set();
  if (expr.kind === 'id') {
    if (shadowed.has(expr.name)) return new Set();
    return new Set([branch === 'true' ? expr.name : `! ${expr.name}`]);
  }
  if (expr.kind === 'not') {
    return provenOf(expr.arg, branch === 'true' ? 'false' : 'true', shadowed);
  }
  if (expr.kind === 'and') {
    if (branch === 'false') return new Set();
    return unionSets(provenOf(expr.left, 'true', shadowed), provenOf(expr.right, 'true', shadowed));
  }
  if (expr.kind === 'or') {
    if (branch === 'true') return new Set();
    return unionSets(provenOf(expr.left, 'false', shadowed), provenOf(expr.right, 'false', shadowed));
  }
  return new Set();
}

const REGEX_AFTER_WORDS = new Set([
  'return', 'throw', 'case', 'default', 'delete', 'void', 'typeof',
  'await', 'yield', 'in', 'instanceof', 'of', 'new', 'else', 'do',
]);
const NON_REGEX_END_PUNCTS = new Set([')', ']', '++', '--']);
const ASI_CONTINUE_WORDS = new Set(['in', 'instanceof', 'as', 'satisfies']);
const ASI_CONTINUE_PUNCTS = new Set([
  '.', '?.', '[', '(', ',', '?', ':', '&&', '||', '??', '=>',
  ...BINARY_OP_PUNCTS,
  ...ASSIGN_OPS,
]);
const EMPTY_SET = new Set();

function allowsRegexAfter(tok) {
  if (!tok) return true;
  if (tok.kind === 'number' || tok.kind === 'string' || tok.kind === 'regex' || tok.kind === 'template-end') {
    return false;
  }
  if (tok.kind === 'word') return !tok.hasEscape && REGEX_AFTER_WORDS.has(tok.value);
  if (tok.kind === 'punct') return !NON_REGEX_END_PUNCTS.has(tok.value);
  return true;
}

function canEndExprToken(tok) {
  if (!tok) return false;
  if (tok.kind === 'string' || tok.kind === 'number' || tok.kind === 'regex' || tok.kind === 'template-end') {
    return true;
  }
  if (tok.kind === 'word') return tok.hasEscape || !REGEX_AFTER_WORDS.has(tok.value) || tok.value === 'yield';
  if (tok.kind === 'punct') {
    return tok.value === ')' || tok.value === ']' || tok.value === '}' || tok.value === '++' || tok.value === '--';
  }
  return false;
}

function isScalarLiteral(ast) {
  if (!ast) return false;
  if (ast.kind === 'literal' || ast.kind === 'string') return true;
  if (ast.kind === 'not') return isScalarLiteral(ast.arg);
  return false;
}

function concatStringAst(left, right) {
  if (!left || !right) return { kind: 'other' };
  if (left.kind === 'string' && right.kind === 'string') {
    return { kind: 'string', value: `${left.value}${right.value}` };
  }
  const isConcatable = node => node.kind === 'string' || node.kind === 'cond-expr' || node.kind === 'concat';
  if (isConcatable(left) && isConcatable(right)) {
    return { kind: 'concat', left, right };
  }
  return { kind: 'other' };
}

function mergeProvenSets(left, right) {
  if (!right || right.size === 0) return left;
  const merged = new Set(left);
  for (const item of right) {
    const negated = item.startsWith('! ') ? item.slice(2) : `! ${item}`;
    if (merged.has(negated)) return null;
    merged.add(item);
  }
  return merged;
}

function extractDynamicTargets(ast, fallbackProven, { maxTargets = 512 } = {}) {
  const dedupTargets = items => {
    const seen = new Set();
    const out = [];
    for (const item of items) {
      const key = `${item.value}\0${[...item.proven].sort().join('\0')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
      if (out.length > maxTargets) {
        return { targets: out.slice(0, maxTargets), overflow: true };
      }
    }
    return { targets: out, overflow: false };
  };

  function expand(node, proven) {
    if (!node) return { targets: [], overflow: false };
    if (node.kind === 'string') {
      return { targets: [{ value: node.value, proven }], overflow: false };
    }
    if (node.kind === 'cond-expr') {
      const out = [];
      if (node.cons) {
        const nextProven = mergeProvenSets(proven, node.trueProven);
        if (nextProven) {
          const left = expand(node.cons, nextProven);
          if (left.overflow) return left;
          out.push(...left.targets);
        }
      }
      if (node.alt) {
        const nextProven = mergeProvenSets(proven, node.falseProven);
        if (nextProven) {
          const right = expand(node.alt, nextProven);
          if (right.overflow) return right;
          out.push(...right.targets);
        }
      }
      return dedupTargets(out);
    }
    if (node.kind === 'concat') {
      const left = expand(node.left, proven);
      if (left.overflow) return left;
      const right = expand(node.right, proven);
      if (right.overflow) return right;
      const out = [];
      const seen = new Set();
      for (const l of left.targets) {
        for (const r of right.targets) {
          const combinedProven = mergeProvenSets(l.proven, r.proven);
          if (!combinedProven) continue;
          const val = `${l.value}${r.value}`;
          const key = `${val}\0${[...combinedProven].sort().join('\0')}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ value: val, proven: combinedProven });
          if (out.length > maxTargets) {
            return { targets: out.slice(0, maxTargets), overflow: true };
          }
        }
      }
      return { targets: out, overflow: false };
    }
    return { targets: [], overflow: false };
  }

  const res = expand(ast, fallbackProven);
  return {
    targets: res.targets.map(item => ({ value: item.value, proven: [...item.proven] })),
    overflow: res.overflow,
  };
}

function stripEsmSuffix(specifier) {
  const cut = specifier.search(/[?#]/u);
  return cut < 0 ? specifier : specifier.slice(0, cut);
}

function safeDecodeEsmSpecifier(specifier) {
  try {
    return decodeURIComponent(specifier);
  } catch {
    return specifier;
  }
}

function isInsideRootRelative(relPath) {
  return Boolean(relPath) && relPath !== '.' && relPath !== '..' && !relPath.startsWith('../');
}

function joinInsideRepo(basePath, relSegment) {
  if (basePath === null || typeof relSegment !== 'string') return null;
  if (relSegment.includes('\0') || relSegment.includes(':') || relSegment.startsWith('/') || relSegment.startsWith('\\')) {
    return null;
  }
  const parts = basePath === '.' ? [] : basePath.split('/');
  for (const seg of relSegment.replaceAll('\\', '/').split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (parts.length === 0) return null;
      parts.pop();
    } else {
      parts.push(seg);
    }
  }
  return parts.length ? parts.join('/') : '.';
}

function resolveRelativeUrlAgainstFile(fromFile, rawRelUrl) {
  const stripped = stripEsmSuffix(rawRelUrl);
  if (stripped === '') {
    return { path: fromFile, isDir: false };
  }
  if (/%2f|%5c/iu.test(stripped)) return null;
  const decoded = safeDecodeEsmSpecifier(stripped);
  if (decoded.includes('\0') || decoded.includes('\\') || decoded.includes(':') || decoded.startsWith('/')) {
    return null;
  }
  const isDir = decoded === '.' || decoded === '..'
    || decoded.endsWith('/') || decoded.endsWith('/.') || decoded.endsWith('/..');
  const resolved = joinInsideRepo(posix.dirname(fromFile), decoded);
  if (resolved === null) return null;
  return { path: resolved, isDir };
}

function mapAbsolutePathToRepoRel(root, rootReal, absPath) {
  if (!absPath || typeof absPath !== 'string' || absPath.includes('\0')) return null;
  if (absPath.includes('*') || absPath.includes('?')) return null;
  for (const base of [rootReal, root]) {
    const rel = relative(base, absPath);
    if (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)) {
      const posixRel = rel.replaceAll('\\', '/');
      const norm = posix.normalize(posixRel).replace(/\/+$/u, '') || '.';
      if (norm !== '..' && !norm.startsWith('../')) return norm;
    }
  }
  if (process.platform === 'win32') {
    const targetLower = absPath.toLowerCase();
    for (const base of [rootReal, root]) {
      const baseNorm = base.replace(/[\\/]+$/u, '');
      const baseLower = baseNorm.toLowerCase();
      if (targetLower === baseLower) return '.';
      if (targetLower.startsWith(`${baseLower}\\`) || targetLower.startsWith(`${baseLower}/`)) {
        const sliced = absPath.slice(baseNorm.length + 1).replaceAll('\\', '/');
        const norm = posix.normalize(sliced).replace(/\/+$/u, '') || '.';
        if (norm !== '..' && !norm.startsWith('../')) return norm;
      }
    }
  }
  return null;
}

const TYPE_CONTINUE_PUNCTS = new Set(['|', '&', '.', '?.', '[', '<', ':', '=>']);
const TYPE_CONTINUE_WORDS = new Set(['extends', 'is']);
const TYPE_STOP_BINARY_PUNCTS = new Set(['&&', '||', '??', '===', '!==', '==', '!=', '<=', '>=', '+', '-', '*', '/', '%', '?', ':']);
const ARTIFACT_LOCK_MARKERS = new Set(['reusable-base-lock.json', 'config/governance/reusable-governance-projection.json']);
const NODE_BUILTIN_FS = new Set(['node:fs', 'fs']);
const NODE_BUILTIN_PATH = new Set(['node:path', 'path']);
const NODE_BUILTIN_MODULE = new Set(['node:module', 'module']);
const NODE_BUILTIN_URL = new Set(['node:url', 'url']);

/**
 * Recursive-descent JS/ESM/CommonJS dependency & soundness analyzer.
 * Preserves exact JS precedence (`? :` vs `&&`/`||`), dangling-`else` binding, identifier shadowing,
 * hoisting/TDZ rules, approved artifact lock polarity, `createRequire` anchors, and regex handling.
 */
export function extractLocalScriptReferences(source, { fileRel = null } = {}) {
  const lexer = createLexer(source);
  const normalizedFileRel = fileRel ? posix.normalize(fileRel.replaceAll('\\', '/')).replace(/^\.\//u, '') : null;
  const fileDir = normalizedFileRel ? posix.dirname(normalizedFileRel) : null;
  const staticRefs = [];
  const staticEntries = [];
  const dynamicRefs = [];
  const dynamicCalls = [];
  const dynamicOverflows = [];
  const topLevelConstGuards = new Set();
  const topLevelArtifactGuards = new Set();
  const topLevelArtifactGuardFamilies = new Map();
  const mutatedTopLevelIds = new Set();
  const activeLocalConstGuards = new Set();
  const scopeGuardStack = [];
  const builtinBindings = new Map();
  const builtinAliasModule = new Map();
  const taintedBuiltinModules = new Set();
  const customRequireBindings = new Map();
  const knownPathBindings = new Map();
  const ambientShadowed = new Map();
  const scopedStateStack = [];
  const frameDeclaredNames = new WeakMap();
  const scopeDeferredStack = [];
  let functionDepth = 0;
  let colonExpectedDepth = 0;

  const isRelative = value => value === '.' || value === '..' || value.startsWith('./') || value.startsWith('../');
  const pushStatic = (specifier, kind, baseSpecifier = null) => {
    staticRefs.push(specifier);
    staticEntries.push(baseSpecifier ? { specifier, kind, baseSpecifier } : { specifier, kind });
  };

  function pushDeferredScope(declaredNames, fnDepthAtScope) {
    scopeDeferredStack.push({
      declaredNames: new Set(declaredNames),
      bindings: new Map(),
      calls: [],
      fnDepth: fnDepthAtScope,
    });
  }

  function popDeferredScope() {
    const scope = scopeDeferredStack.pop();
    if (!scope) return;
    const parent = scopeDeferredStack.length ? scopeDeferredStack[scopeDeferredStack.length - 1] : null;
    for (const call of scope.calls) {
      if (scope.bindings.has(call.calleeName) && call.fromFnDepth > scope.fnDepth) {
        const binding = scope.bindings.get(call.calleeName);
        for (const target of call.targets) {
          if (isRelative(target.value)) pushStatic(target.value, 'cjs', binding.baseSpecifier);
        }
        if (call.overflow) {
          dynamicOverflows.push({ kind: 'cjs', line: call.line, proven: call.proven });
        }
      } else if (scope.declaredNames.has(call.calleeName)) {
        continue;
      } else if (parent) {
        parent.calls.push(call);
      }
    }
  }

  function saveScopedEntry(map, key, frame) {
    if (!frame.has(map)) frame.set(map, new Map());
    const entries = frame.get(map);
    if (!entries.has(key)) {
      entries.set(key, map.has(key) ? { existed: true, value: map.get(key) } : { existed: false });
    }
  }

  function setScopedEntry(map, key, value, frame) {
    if (frame) saveScopedEntry(map, key, frame);
    map.set(key, value);
  }

  function deleteScopedEntry(map, key, frame) {
    if (!map.has(key)) return;
    if (frame) saveScopedEntry(map, key, frame);
    map.delete(key);
  }

  function shadowScopedNames(names, frame) {
    if (!frame) return;
    for (const name of names) {
      deleteScopedEntry(builtinBindings, name, frame);
      deleteScopedEntry(builtinAliasModule, name, frame);
      deleteScopedEntry(customRequireBindings, name, frame);
      deleteScopedEntry(knownPathBindings, name, frame);
      setScopedEntry(ambientShadowed, name, true, frame);
    }
  }

  function isTopLevelBinding(name) {
    for (let idx = scopedStateStack.length - 1; idx >= 0; idx -= 1) {
      if (frameDeclaredNames.get(scopedStateStack[idx])?.has(name)) return false;
    }
    return true;
  }

  function setBindingForAssignment(map, name, value) {
    for (let idx = scopedStateStack.length - 1; idx >= 0; idx -= 1) {
      const f = scopedStateStack[idx];
      if (frameDeclaredNames.get(f)?.has(name)) {
        setScopedEntry(map, name, value, f);
        return;
      }
      if (f.has(map)) f.get(map).delete(name);
    }
    map.set(name, value);
  }

  function invalidateBinding(name) {
    const trackedMaps = [builtinBindings, builtinAliasModule, customRequireBindings, knownPathBindings];
    for (let idx = scopedStateStack.length - 1; idx >= 0; idx -= 1) {
      const f = scopedStateStack[idx];
      if (frameDeclaredNames.get(f)?.has(name)) {
        for (const map of trackedMaps) deleteScopedEntry(map, name, f);
        return;
      }
      for (const map of trackedMaps) {
        if (f.has(map)) f.get(map).delete(name);
      }
    }
    for (const map of trackedMaps) map.delete(name);
  }

  function builtinModuleFamily(kind) {
    if (kind === 'fs-ns' || kind === 'fs-existsSync') return 'fs';
    if (kind === 'path-ns' || kind === 'path-join' || kind === 'path-resolve' || kind === 'path-dirname') return 'path';
    if (kind === 'url-ns' || kind === 'fileURLToPath' || kind === 'pathToFileURL' || kind === 'url-ctor') return 'url';
    return null;
  }

  function moduleFamilyOfId(name) {
    return builtinModuleFamily(builtinBindings.get(name)) ?? builtinAliasModule.get(name) ?? null;
  }

  function extractBuiltinAliasFamily(ast) {
    if (!ast) return null;
    if (ast.kind === 'builtin-alias') return ast.family;
    if (ast.kind === 'id') return moduleFamilyOfId(ast.name);
    if (ast.kind === 'member' && ast.prop === 'posix' && ast.object?.kind === 'id'
      && moduleFamilyOfId(ast.object.name) === 'path') {
      return 'path';
    }
    if (ast.kind === 'call' && !ast.isNew && ast.callee?.kind === 'id'
      && (customRequireBindings.has(ast.callee.name)
        || (ast.callee.name === 'require' && !ambientShadowed.has('require')))
      && ast.args[0]?.kind === 'string') {
      const reqSpec = ast.args[0].value;
      if (NODE_BUILTIN_FS.has(reqSpec)) return 'fs';
      if (NODE_BUILTIN_PATH.has(reqSpec)) return 'path';
      if (NODE_BUILTIN_URL.has(reqSpec)) return 'url';
    }
    return null;
  }

  function rootObjectId(expr) {
    let cur = expr;
    while (cur && cur.kind === 'member') cur = cur.object;
    return cur?.kind === 'id' ? cur.name : null;
  }

  function taintBuiltinById(name) {
    const family = moduleFamilyOfId(name);
    if (family) taintedBuiltinModules.add(family);
  }

  function markObjectMutated(rootId) {
    if (!rootId) return;
    taintBuiltinById(rootId);
    if (isTopLevelBinding(rootId)) mutatedTopLevelIds.add(rootId);
  }

  function popScopedFrame(frame) {
    for (const [map, entries] of frame) {
      for (const [key, entry] of entries) {
        if (entry.existed) map.set(key, entry.value);
        else map.delete(key);
      }
    }
  }

  function currentScopedFrame() {
    return scopedStateStack.length ? scopedStateStack[scopedStateStack.length - 1] : null;
  }

  function registerModuleBindings(modSpecifier, { defaultBinding, namespaceBinding, namedBindings }) {
    if (NODE_BUILTIN_FS.has(modSpecifier)) {
      if (defaultBinding) builtinBindings.set(defaultBinding, 'fs-ns');
      if (namespaceBinding) builtinBindings.set(namespaceBinding, 'fs-ns');
      for (const row of namedBindings) {
        if (row.imported === 'existsSync') builtinBindings.set(row.local, 'fs-existsSync');
      }
    } else if (NODE_BUILTIN_PATH.has(modSpecifier)) {
      if (defaultBinding) builtinBindings.set(defaultBinding, 'path-ns');
      if (namespaceBinding) builtinBindings.set(namespaceBinding, 'path-ns');
      for (const row of namedBindings) {
        if (row.imported === 'join') builtinBindings.set(row.local, 'path-join');
        else if (row.imported === 'resolve') builtinBindings.set(row.local, 'path-resolve');
        else if (row.imported === 'dirname') builtinBindings.set(row.local, 'path-dirname');
        else if (row.imported === 'posix') builtinAliasModule.set(row.local, 'path');
      }
    } else if (NODE_BUILTIN_MODULE.has(modSpecifier)) {
      if (defaultBinding) builtinBindings.set(defaultBinding, 'module-ns');
      if (namespaceBinding) builtinBindings.set(namespaceBinding, 'module-ns');
      for (const row of namedBindings) {
        if (row.imported === 'createRequire') builtinBindings.set(row.local, 'createRequire');
      }
    } else if (NODE_BUILTIN_URL.has(modSpecifier)) {
      if (defaultBinding) builtinBindings.set(defaultBinding, 'url-ns');
      if (namespaceBinding) builtinBindings.set(namespaceBinding, 'url-ns');
      for (const row of namedBindings) {
        if (row.imported === 'fileURLToPath') builtinBindings.set(row.local, 'fileURLToPath');
        else if (row.imported === 'pathToFileURL') builtinBindings.set(row.local, 'pathToFileURL');
        else if (row.imported === 'URL') builtinBindings.set(row.local, 'url-ctor');
      }
    }
  }

  function pathJoinCalleeKind(callee) {
    if (!callee || taintedBuiltinModules.has('path')) return null;
    if (callee.kind === 'id') {
      const b = builtinBindings.get(callee.name);
      if (b === 'path-join') return 'join';
      if (b === 'path-resolve') return 'resolve';
      return null;
    }
    if (callee.kind === 'member' && (callee.prop === 'join' || callee.prop === 'resolve')
      && callee.object?.kind === 'id' && builtinBindings.get(callee.object.name) === 'path-ns') {
      return callee.prop;
    }
    return null;
  }

  function isPathDirnameCallee(callee) {
    if (!callee || taintedBuiltinModules.has('path')) return false;
    if (callee.kind === 'id') return builtinBindings.get(callee.name) === 'path-dirname';
    if (callee.kind === 'member' && callee.prop === 'dirname' && callee.object?.kind === 'id') {
      return builtinBindings.get(callee.object.name) === 'path-ns';
    }
    return false;
  }

  function isUrlCtorCallee(callee) {
    if (!callee) return false;
    if (callee.kind === 'id') {
      if (callee.name !== 'URL') return false;
      if (builtinBindings.get('URL') === 'url-ctor') return !taintedBuiltinModules.has('url');
      return !ambientShadowed.has('URL');
    }
    if (callee.kind === 'member' && callee.prop === 'URL' && callee.object?.kind === 'id') {
      return !taintedBuiltinModules.has('url') && builtinBindings.get(callee.object.name) === 'url-ns';
    }
    return false;
  }

  function isFileUrlToPathCallee(callee) {
    if (!callee || taintedBuiltinModules.has('url')) return false;
    if (callee.kind === 'id') return builtinBindings.get(callee.name) === 'fileURLToPath';
    if (callee.kind === 'member' && callee.prop === 'fileURLToPath' && callee.object?.kind === 'id') {
      return builtinBindings.get(callee.object.name) === 'url-ns';
    }
    return false;
  }

  function isPathToFileUrlCallee(callee) {
    if (!callee || taintedBuiltinModules.has('url')) return false;
    if (callee.kind === 'id') return builtinBindings.get(callee.name) === 'pathToFileURL';
    if (callee.kind === 'member' && callee.prop === 'pathToFileURL' && callee.object?.kind === 'id') {
      return builtinBindings.get(callee.object.name) === 'url-ns';
    }
    return false;
  }

  function evaluateRepoPathInfo(ast) {
    if (!ast) return null;
    if (ast.kind === 'id') {
      if (knownPathBindings.has(ast.name)) return knownPathBindings.get(ast.name);
      if (normalizedFileRel !== null) {
        if (ast.name === '__dirname' && !ambientShadowed.has('__dirname')) {
          return { path: fileDir, isDir: false, isUrl: false, families: new Set() };
        }
        if (ast.name === '__filename' && !ambientShadowed.has('__filename')) {
          return { path: normalizedFileRel, isDir: false, isUrl: false, families: new Set() };
        }
      }
      return null;
    }
    if (ast.kind === 'import-meta-dirname' && normalizedFileRel !== null) {
      return { path: fileDir, isDir: false, isUrl: false, families: new Set() };
    }
    if (ast.kind === 'import-meta-filename' && normalizedFileRel !== null) {
      return { path: normalizedFileRel, isDir: false, isUrl: false, families: new Set() };
    }
    if (ast.kind === 'call' && ast.isNew && isUrlCtorCallee(ast.callee)
      && ast.args.length >= 1 && ast.args[0]?.kind === 'string') {
      const rawUrl = ast.args[0].value;
      if (/^file:/iu.test(rawUrl)) {
        return {
          path: null,
          fileUrl: rawUrl,
          isDir: stripEsmSuffix(rawUrl).endsWith('/'),
          isUrl: true,
          families: new Set(['url']),
        };
      }
      if (ast.args.length >= 2) {
        let anchorFile = null;
        let baseFamilies = [];
        if (ast.args[1]?.kind === 'import-meta-url' && normalizedFileRel !== null) {
          anchorFile = normalizedFileRel;
        } else {
          const baseInfo = evaluateRepoPathInfo(ast.args[1]);
          if (baseInfo?.isUrl && baseInfo.path !== null) {
            baseFamilies = [...baseInfo.families];
            if (baseInfo.isDir) {
              anchorFile = baseInfo.path === '.' ? '__dummy__' : `${baseInfo.path}/__dummy__`;
            } else if (baseInfo.path !== '.') {
              anchorFile = baseInfo.path;
            }
          }
        }
        if (anchorFile) {
          const urlRes = resolveRelativeUrlAgainstFile(anchorFile, rawUrl);
          if (urlRes) {
            return { path: urlRes.path, isDir: urlRes.isDir, isUrl: true, families: new Set([...baseFamilies, 'url']) };
          }
        }
      }
      return null;
    }
    if (ast.kind === 'call' && !ast.isNew && isFileUrlToPathCallee(ast.callee) && ast.args.length === 1) {
      if (ast.args[0]?.kind === 'import-meta-url' && normalizedFileRel !== null) {
        return { path: normalizedFileRel, isDir: false, isUrl: false, families: new Set(['url']) };
      }
      const inner = evaluateRepoPathInfo(ast.args[0]);
      if (inner?.isUrl && inner.path !== null) {
        return { path: inner.path, isDir: inner.isDir, isUrl: false, families: new Set([...inner.families, 'url']) };
      }
      return null;
    }
    if (ast.kind === 'call' && !ast.isNew && isPathToFileUrlCallee(ast.callee) && ast.args.length === 1) {
      const inner = evaluateRepoPathInfo(ast.args[0]);
      if (inner && !inner.isUrl && inner.path !== null) {
        return { path: inner.path, isDir: inner.isDir, isUrl: true, families: new Set([...inner.families, 'url']) };
      }
      return null;
    }
    if (ast.kind === 'call' && !ast.isNew && isPathDirnameCallee(ast.callee) && ast.args.length === 1) {
      const inner = evaluateRepoPathInfo(ast.args[0]);
      if (!inner || inner.isUrl || !inner.path || inner.path === '.') return null;
      return {
        path: posix.dirname(inner.path),
        isDir: false,
        isUrl: false,
        families: new Set([...inner.families, 'path']),
      };
    }
    const joinKind = !ast.isNew ? pathJoinCalleeKind(ast.callee) : null;
    if (ast.kind === 'call' && joinKind && ast.args.length >= 1) {
      const baseInfo = evaluateRepoPathInfo(ast.args[0]);
      if (!baseInfo || baseInfo.isUrl || baseInfo.path === null) return null;
      let cur = baseInfo.path;
      let lastNonEmpty = null;
      for (const arg of ast.args.slice(1)) {
        if (arg?.kind !== 'string') return null;
        if (arg.value !== '') lastNonEmpty = arg.value;
        cur = joinInsideRepo(cur, arg.value);
        if (cur === null) return null;
      }
      const isDir = joinKind === 'resolve'
        ? false
        : (lastNonEmpty !== null ? (lastNonEmpty.endsWith('/') || lastNonEmpty.endsWith('\\')) : baseInfo.isDir);
      return { path: cur, isDir, isUrl: false, families: new Set([...baseInfo.families, 'path']) };
    }
    return null;
  }

  function isFsExistsSyncCallee(callee) {
    if (!callee || taintedBuiltinModules.has('fs')) return false;
    if (callee.kind === 'id') return builtinBindings.get(callee.name) === 'fs-existsSync';
    if (callee.kind === 'member' && callee.prop === 'existsSync' && callee.object?.kind === 'id') {
      return builtinBindings.get(callee.object.name) === 'fs-ns';
    }
    return false;
  }

  function getApprovedArtifactLockFamilies(ast) {
    if (!ast) return null;
    if (ast.kind === 'or') {
      const leftFams = getApprovedArtifactLockFamilies(ast.left);
      const rightFams = getApprovedArtifactLockFamilies(ast.right);
      if (!leftFams || !rightFams) return null;
      return new Set([...leftFams, ...rightFams]);
    }
    if (ast.kind === 'call' && !ast.isNew && isFsExistsSyncCallee(ast.callee) && ast.args.length === 1) {
      const info = evaluateRepoPathInfo(ast.args[0]);
      if (info && !info.isDir && info.path && ARTIFACT_LOCK_MARKERS.has(info.path)) {
        return new Set(['fs', ...info.families]);
      }
    }
    return null;
  }

  function isCreateRequireCallee(callee) {
    if (!callee) return false;
    if (callee.kind === 'id') return builtinBindings.get(callee.name) === 'createRequire';
    if (callee.kind === 'member' && callee.prop === 'createRequire' && callee.object?.kind === 'id') {
      return builtinBindings.get(callee.object.name) === 'module-ns';
    }
    return false;
  }

  function extractCreateRequireBase(ast) {
    if (!ast || ast.kind !== 'call' || ast.isNew || !isCreateRequireCallee(ast.callee) || !ast.args.length) {
      return null;
    }
    let arg = ast.args[0];
    if (arg?.kind === 'call' && !arg.isNew && isFileUrlToPathCallee(arg.callee) && arg.args.length === 1) {
      arg = arg.args[0];
    }
    if (arg?.kind === 'import-meta-url' || arg?.kind === 'import-meta-filename'
      || (arg?.kind === 'id' && arg.name === '__filename' && !ambientShadowed.has('__filename'))) {
      return { baseSpecifier: null };
    }
    if (arg?.kind === 'call' && arg.isNew && isUrlCtorCallee(arg.callee) && arg.args[0]?.kind === 'string') {
      const rawUrl = arg.args[0].value;
      if (/^file:/iu.test(rawUrl)) return { baseSpecifier: { kind: 'file-url', value: rawUrl } };
      if (arg.args[1]?.kind === 'import-meta-url') return { baseSpecifier: { kind: 'relative', value: rawUrl } };
    }
    if (arg?.kind === 'string') {
      if (/^file:/iu.test(arg.value)) return { baseSpecifier: { kind: 'file-url', value: arg.value } };
      if (isAbsolute(arg.value) || posix.isAbsolute(arg.value)) {
        return { baseSpecifier: { kind: 'abs-path', value: arg.value } };
      }
      return null;
    }
    const pathInfo = evaluateRepoPathInfo(arg);
    if (pathInfo) {
      if (pathInfo.fileUrl) return { baseSpecifier: { kind: 'file-url', value: pathInfo.fileUrl } };
      if (pathInfo.path !== null) {
        return { baseSpecifier: { kind: 'repo-rel', value: pathInfo.path, isDir: Boolean(pathInfo.isDir) } };
      }
    }
    return null;
  }

  function unwrapUrlStringifier(node) {
    if (!node) return node;
    let inner = null;
    if (node.kind === 'member' && node.prop === 'href') {
      inner = node.object;
    } else if (node.kind === 'call' && !node.isNew && node.args.length === 0
      && node.callee?.kind === 'member' && node.callee.prop === 'toString') {
      inner = node.callee.object;
    } else if (node.kind === 'call' && !node.isNew && node.callee?.kind === 'id'
      && node.callee.name === 'String' && !ambientShadowed.has('String') && node.args.length === 1) {
      inner = node.args[0];
    }
    if (!inner) return node;
    const isUrlNode = (inner.kind === 'call' && ((inner.isNew && isUrlCtorCallee(inner.callee))
      || (!inner.isNew && isPathToFileUrlCallee(inner.callee))))
      || (inner.kind === 'id' && knownPathBindings.get(inner.name)?.isUrl === true);
    return isUrlNode ? inner : node;
  }

  function extractImportTargets(ast, fallbackProven) {
    const out = [];
    let overflow = false;

    const visit = (rawNode, proven) => {
      const node = unwrapUrlStringifier(rawNode);
      if (!node || !proven) return;
      if (node.kind === 'cond-expr') {
        if (node.cons) {
          const nextProven = mergeProvenSets(proven, node.trueProven);
          if (nextProven) visit(node.cons, nextProven);
        }
        if (node.alt) {
          const nextProven = mergeProvenSets(proven, node.falseProven);
          if (nextProven) visit(node.alt, nextProven);
        }
        return;
      }
      if (node.kind === 'call' && node.isNew && isUrlCtorCallee(node.callee) && node.args.length >= 1) {
        const dyn = extractDynamicTargets(node.args[0], proven);
        if (dyn.overflow) overflow = true;
        const baseArg = node.args[1];
        let anchorFile = null;
        if (baseArg?.kind === 'import-meta-url' && normalizedFileRel !== null) {
          anchorFile = normalizedFileRel;
        } else if (baseArg) {
          const baseInfo = evaluateRepoPathInfo(baseArg);
          if (baseInfo?.isUrl && baseInfo.path !== null) {
            if (baseInfo.isDir) {
              anchorFile = baseInfo.path === '.' ? '__dummy__' : `${baseInfo.path}/__dummy__`;
            } else if (baseInfo.path !== '.') {
              anchorFile = baseInfo.path;
            }
          }
        }
        for (const t of dyn.targets) {
          if (/^file:/iu.test(t.value)) {
            out.push({
              specifier: t.value,
              targetKind: 'file-url',
              isDir: stripEsmSuffix(t.value).endsWith('/'),
              proven: t.proven,
            });
          } else if (anchorFile) {
            const urlRes = resolveRelativeUrlAgainstFile(anchorFile, t.value);
            if (urlRes && isInsideRootRelative(urlRes.path)) {
              out.push({
                specifier: urlRes.path,
                targetKind: 'repo-rel',
                isDir: urlRes.isDir,
                proven: t.proven,
              });
            }
          } else if (!normalizedFileRel && isRelative(t.value)) {
            out.push({ specifier: t.value, targetKind: 'relative', isDir: false, proven: t.proven });
          }
        }
        return;
      }
      if (node.kind === 'call' && !node.isNew && isPathToFileUrlCallee(node.callee) && node.args.length === 1) {
        const info = evaluateRepoPathInfo(node.args[0]);
        if (info && !info.isUrl && info.path && isInsideRootRelative(info.path)) {
          out.push({
            specifier: info.path,
            targetKind: 'repo-rel',
            isDir: Boolean(info.isDir),
            proven: [...proven],
          });
        }
        return;
      }
      if (node.kind === 'id' && knownPathBindings.has(node.name)) {
        const info = knownPathBindings.get(node.name);
        if (info?.isUrl) {
          if (info.fileUrl) {
            out.push({
              specifier: info.fileUrl,
              targetKind: 'file-url',
              isDir: Boolean(info.isDir),
              proven: [...proven],
            });
          } else if (info.path && isInsideRootRelative(info.path)) {
            out.push({
              specifier: info.path,
              targetKind: 'repo-rel',
              isDir: Boolean(info.isDir),
              proven: [...proven],
            });
          }
          return;
        }
      }
      const dyn = extractDynamicTargets(node, proven);
      if (dyn.overflow) overflow = true;
      for (const t of dyn.targets) {
        if (isRelative(t.value)) {
          out.push({ specifier: t.value, targetKind: 'relative', isDir: false, proven: t.proven });
        } else if (/^file:/iu.test(t.value)) {
          out.push({
            specifier: t.value,
            targetKind: 'file-url',
            isDir: stripEsmSuffix(t.value).endsWith('/'),
            proven: t.proven,
          });
        }
      }
    };

    visit(ast, fallbackProven);
    return { targets: out, overflow };
  }

  function skipTemplateExprOnly() {
    while (true) {
      const seg = lexer.consumeTemplateSegment();
      if (seg.kind === 'end') break;
      let depth = 1;
      let prev = null;
      while (depth > 0 && lexer.peek(allowsRegexAfter(prev))) {
        const allowRegex = allowsRegexAfter(prev);
        const t = lexer.next(allowRegex);
        if (t.kind === 'template-open') {
          skipTemplateExprOnly();
          prev = { kind: 'template-end', line: lexer.line };
        } else {
          if (isPunct(t, '{')) depth += 1;
          else if (isPunct(t, '}')) depth -= 1;
          prev = t;
        }
      }
    }
  }

  function skipBalanced(openChar, closeChar) {
    if (!isPunct(lexer.peek(true), openChar)) return;
    lexer.next(true);
    let depth = 1;
    let prev = null;
    while (depth > 0 && lexer.peek(allowsRegexAfter(prev))) {
      const allowRegex = allowsRegexAfter(prev);
      const tok = lexer.next(allowRegex);
      if (tok.kind === 'template-open') {
        skipTemplateExprOnly();
        prev = { kind: 'template-end', line: lexer.line };
      } else {
        if (isPunct(tok, openChar)) depth += 1;
        else if (isPunct(tok, closeChar)) depth -= 1;
        prev = tok;
      }
    }
  }

  function skipBalancedDefaultExpr() {
    let paren = 0;
    let bracket = 0;
    let brace = 0;
    let prev = null;
    while (lexer.peek(allowsRegexAfter(prev))) {
      const allowRegex = allowsRegexAfter(prev);
      const t = lexer.peek(allowRegex);
      if (paren === 0 && bracket === 0 && brace === 0 && (isPunct(t, ',') || isPunct(t, '}') || isPunct(t, ']') || isPunct(t, ')'))) {
        break;
      }
      lexer.next(allowRegex);
      if (t.kind === 'template-open') {
        skipTemplateExprOnly();
        prev = { kind: 'template-end', line: lexer.line };
      } else {
        if (isPunct(t, '(')) paren += 1;
        else if (isPunct(t, ')')) paren -= 1;
        else if (isPunct(t, '[')) bracket += 1;
        else if (isPunct(t, ']')) bracket -= 1;
        else if (isPunct(t, '{')) brace += 1;
        else if (isPunct(t, '}')) brace -= 1;
        prev = t;
      }
    }
  }

  function skipTypeTokens({
    stopAtAssign = true,
    stopAtBodyBrace = false,
    stopAtArrow = false,
    allowNestedArrow = true,
    stopAtBinary = false,
  } = {}) {
    let paren = 0;
    let bracket = 0;
    let brace = 0;
    let angle = 0;
    let canStartObjType = true;
    let sawExtends = false;
    let condTypeColon = 0;
    let prev = null;
    while (lexer.peek(allowsRegexAfter(prev))) {
      const t = lexer.peek(allowsRegexAfter(prev));
      if (paren === 0 && bracket === 0 && brace === 0 && angle === 0) {
        if (isPunct(t, ';') || isPunct(t, ')') || isPunct(t, ']') || isPunct(t, ',') || isPunct(t, '}')) break;
        if (stopAtAssign && isPunct(t, '=')) break;
        if (stopAtBodyBrace && isPunct(t, '{') && !canStartObjType) break;
        if (stopAtBinary && t.kind === 'punct' && TYPE_STOP_BINARY_PUNCTS.has(t.value)) break;
        if (stopAtArrow && isPunct(t, '=>')) {
          if (allowNestedArrow && prev && isPunct(prev, ')')) {
            const look = lexer.save();
            lexer.next(false);
            skipTypeTokens({
              stopAtAssign,
              stopAtBodyBrace,
              stopAtArrow: true,
              allowNestedArrow: false,
              stopAtBinary,
            });
            const hasOuterArrow = isPunct(lexer.peek(false), '=>');
            lexer.restore(look);
            if (!hasOuterArrow) break;
          } else {
            break;
          }
        }
        const hadExtends = sawExtends;
        if (prev && t.line > prev.line && !canStartObjType) {
          const continues = (t.kind === 'punct' && (TYPE_CONTINUE_PUNCTS.has(t.value) || (t.value === '?' && hadExtends)))
            || (t.kind === 'word' && !t.hasEscape && TYPE_CONTINUE_WORDS.has(t.value));
          if (!continues) break;
        }
        if (stopAtArrow && isPunct(t, '?')) {
          if (!sawExtends) break;
          sawExtends = false;
          condTypeColon += 1;
        } else if (stopAtArrow && isPunct(t, ':')) {
          if (condTypeColon > 0) condTypeColon -= 1;
          else break;
        }
        if (isWord(t, 'extends')) sawExtends = true;
      }
      lexer.next(allowsRegexAfter(prev));
      if (t.kind === 'template-open') {
        skipTemplateExprOnly();
        canStartObjType = false;
        prev = { kind: 'template-end', line: lexer.line };
        continue;
      }
      if (isPunct(t, '(')) { paren += 1; canStartObjType = true; }
      else if (isPunct(t, ')')) { if (paren > 0) paren -= 1; canStartObjType = false; }
      else if (isPunct(t, '[')) { bracket += 1; canStartObjType = true; }
      else if (isPunct(t, ']')) { if (bracket > 0) bracket -= 1; canStartObjType = false; }
      else if (isPunct(t, '{')) { brace += 1; canStartObjType = true; }
      else if (isPunct(t, '}')) { if (brace > 0) brace -= 1; canStartObjType = false; }
      else if (isPunct(t, '<') && paren === 0 && bracket === 0 && brace === 0) {
        angle += 1;
        canStartObjType = true;
      } else if (isPunct(t, '>') && angle > 0 && paren === 0 && bracket === 0 && brace === 0) {
        angle -= 1;
        canStartObjType = false;
      } else if (isPunct(t, '>>') && angle >= 2 && paren === 0 && bracket === 0 && brace === 0) {
        angle -= 2;
        canStartObjType = false;
      } else if (isPunct(t, '>>>') && angle >= 3 && paren === 0 && bracket === 0 && brace === 0) {
        angle -= 3;
        canStartObjType = false;
      } else {
        canStartObjType = isPunct(t, '|') || isPunct(t, '&') || isPunct(t, '=>')
          || isPunct(t, ':') || isPunct(t, ',') || isPunct(t, '<')
          || isPunct(t, '?') || isWord(t, 'extends');
      }
      prev = t;
    }
  }

  function skipTypeAnnotation(options = {}) {
    if (!isPunct(lexer.peek(false), ':')) return;
    lexer.next(false);
    skipTypeTokens(options);
  }

  function skipAngleBrackets() {
    if (!isPunct(lexer.peek(false), '<')) return;
    lexer.next(false);
    let angle = 1;
    while (angle > 0 && lexer.peek(false)) {
      const t = lexer.next(false);
      if (isPunct(t, '<')) angle += 1;
      else if (isPunct(t, '>')) angle -= 1;
      else if (isPunct(t, '>>')) angle = Math.max(0, angle - 2);
      else if (isPunct(t, '>>>')) angle = Math.max(0, angle - 3);
    }
  }

  function scanBindingPatternNames(out = []) {
    const first = lexer.peek(false);
    if (!first) return out;
    if (first.kind === 'word') {
      lexer.next(false);
      out.push(first.value);
      return out;
    }
    if (isPunct(first, '{')) {
      lexer.next(false);
      while (lexer.peek(false) && !isPunct(lexer.peek(false), '}')) {
        const cur = lexer.pos;
        if (isPunct(lexer.peek(false), '...')) lexer.next(false);
        const key = lexer.peek(false);
        if (key?.kind === 'word') {
          lexer.next(false);
          if (isPunct(lexer.peek(false), ':')) {
            lexer.next(false);
            scanBindingPatternNames(out);
          } else {
            out.push(key.value);
          }
        } else if (isPunct(key, '[')) {
          skipBalanced('[', ']');
          if (isPunct(lexer.peek(false), ':')) {
            lexer.next(false);
            scanBindingPatternNames(out);
          }
        } else if (key?.kind === 'string' || key?.kind === 'number') {
          lexer.next(false);
          if (isPunct(lexer.peek(false), ':')) {
            lexer.next(false);
            scanBindingPatternNames(out);
          }
        }
        if (isPunct(lexer.peek(false), '=')) {
          lexer.next(false);
          skipBalancedDefaultExpr();
        }
        if (isPunct(lexer.peek(false), ',')) lexer.next(false);
        else if (lexer.pos === cur) lexer.next(false);
      }
      if (isPunct(lexer.peek(false), '}')) lexer.next(false);
      return out;
    }
    if (isPunct(first, '[')) {
      lexer.next(false);
      while (lexer.peek(false) && !isPunct(lexer.peek(false), ']')) {
        const cur = lexer.pos;
        if (isPunct(lexer.peek(false), '...')) lexer.next(false);
        if (isPunct(lexer.peek(false), ',')) {
          lexer.next(false);
          continue;
        }
        scanBindingPatternNames(out);
        if (isPunct(lexer.peek(false), '=')) {
          lexer.next(false);
          skipBalancedDefaultExpr();
        }
        if (isPunct(lexer.peek(false), ',')) lexer.next(false);
        else if (lexer.pos === cur) lexer.next(false);
      }
      if (isPunct(lexer.peek(false), ']')) lexer.next(false);
      return out;
    }
    return out;
  }

  function scanParamListNames() {
    const saved = lexer.save();
    const names = [];
    try {
      if (!isPunct(lexer.peek(false), '(')) return names;
      lexer.next(false);
      while (lexer.peek(false) && !isPunct(lexer.peek(false), ')')) {
        const cur = lexer.pos;
        if (isPunct(lexer.peek(false), '...')) lexer.next(false);
        if (isWord(lexer.peek(false), 'this')) {
          lexer.next(false);
        } else {
          scanBindingPatternNames(names);
        }
        if (isPunct(lexer.peek(false), '?') || isPunct(lexer.peek(false), '!')) lexer.next(false);
        if (isPunct(lexer.peek(false), ':')) skipTypeAnnotation({ stopAtAssign: true });
        if (isPunct(lexer.peek(false), '=')) {
          lexer.next(false);
          skipBalancedDefaultExpr();
        }
        if (isPunct(lexer.peek(false), ',')) lexer.next(false);
        else if (lexer.pos === cur) lexer.next(false);
      }
      if (isPunct(lexer.peek(false), ')')) lexer.next(false);
    } finally {
      lexer.restore(saved);
    }
    return names;
  }

  function collectBindingNames(out = [], proven = new Set(), shadowed = new Set(), propMap = null) {
    const first = lexer.peek(false);
    if (!first) return out;
    if (first.kind === 'word') {
      lexer.next(false);
      out.push(first.value);
      return out;
    }
    if (isPunct(first, '{')) {
      lexer.next(false);
      while (lexer.peek(false) && !isPunct(lexer.peek(false), '}')) {
        const cur = lexer.pos;
        if (isPunct(lexer.peek(false), '...')) lexer.next(false);
        const key = lexer.peek(false);
        if (key?.kind === 'word') {
          lexer.next(false);
          if (isPunct(lexer.peek(false), ':')) {
            lexer.next(false);
            const targetTok = lexer.peek(false);
            if (propMap && targetTok?.kind === 'word') propMap.set(targetTok.value, key.value);
            collectBindingNames(out, proven, shadowed);
          } else {
            out.push(key.value);
            if (propMap) propMap.set(key.value, key.value);
          }
        } else if (isPunct(key, '[')) {
          lexer.next(true);
          parseExpression(proven, shadowed);
          if (isPunct(lexer.peek(false), ']')) lexer.next(false);
          if (isPunct(lexer.peek(false), ':')) {
            lexer.next(false);
            collectBindingNames(out, proven, shadowed);
          }
        } else if (key?.kind === 'string' || key?.kind === 'number') {
          lexer.next(false);
          if (isPunct(lexer.peek(false), ':')) {
            lexer.next(false);
            const targetTok = lexer.peek(false);
            if (propMap && key.kind === 'string' && targetTok?.kind === 'word') propMap.set(targetTok.value, key.value);
            collectBindingNames(out, proven, shadowed);
          }
        }
        if (isPunct(lexer.peek(false), '=')) {
          lexer.next(false);
          parseAssignment(proven, shadowed);
        }
        if (isPunct(lexer.peek(false), ',')) lexer.next(false);
        else if (lexer.pos === cur) lexer.next(false);
      }
      if (isPunct(lexer.peek(false), '}')) lexer.next(false);
      return out;
    }
    if (isPunct(first, '[')) {
      lexer.next(false);
      while (lexer.peek(false) && !isPunct(lexer.peek(false), ']')) {
        const cur = lexer.pos;
        if (isPunct(lexer.peek(false), '...')) lexer.next(false);
        if (isPunct(lexer.peek(false), ',')) {
          lexer.next(false);
          continue;
        }
        collectBindingNames(out, proven, shadowed);
        if (isPunct(lexer.peek(false), '=')) {
          lexer.next(false);
          parseAssignment(proven, shadowed);
        }
        if (isPunct(lexer.peek(false), ',')) lexer.next(false);
        else if (lexer.pos === cur) lexer.next(false);
      }
      if (isPunct(lexer.peek(false), ']')) lexer.next(false);
      return out;
    }
    return out;
  }

  function parseParameterNames(paramShadowed = new Set(), paramListTokensEndCheck = false) {
    const names = [];
    if (!isPunct(lexer.peek(false), '(')) return names;
    lexer.next(false);
    while (lexer.peek(false) && !isPunct(lexer.peek(false), ')')) {
      const cur = lexer.pos;
      if (isPunct(lexer.peek(false), '...')) lexer.next(false);
      if (isWord(lexer.peek(false), 'this')) {
        lexer.next(false);
      } else {
        collectBindingNames(names, new Set(), paramShadowed);
      }
      if (isPunct(lexer.peek(false), '?') || isPunct(lexer.peek(false), '!')) lexer.next(false);
      if (isPunct(lexer.peek(false), ':')) skipTypeAnnotation({ stopAtAssign: true });
      if (isPunct(lexer.peek(false), '=')) {
        lexer.next(false);
        parseAssignment(new Set(), paramShadowed);
      }
      if (isPunct(lexer.peek(false), ',')) lexer.next(false);
      else if (lexer.pos === cur) {
        if (paramListTokensEndCheck) return null;
        lexer.next(false);
      }
    }
    if (isPunct(lexer.peek(false), ')')) lexer.next(false);
    return names;
  }

  function countRemainingColonsAfterArrowBody(neededColons) {
    let unmatchedColons = 0;
    let innerTernary = 0;
    let paren = 0;
    let bracket = 0;
    let brace = 0;
    let prev = null;
    if (isPunct(lexer.peek(true), '{')) {
      skipBalanced('{', '}');
      prev = { kind: 'punct', value: '}', line: lexer.line };
    }
    while (lexer.peek(allowsRegexAfter(prev))) {
      const allowRegex = allowsRegexAfter(prev);
      const t = lexer.peek(allowRegex);
      if (paren === 0 && bracket === 0 && brace === 0) {
        if (isPunct(t, ';') || isPunct(t, ',') || isPunct(t, ')') || isPunct(t, ']') || isPunct(t, '}')) break;
        if (isPunct(t, '?')) {
          innerTernary += 1;
        } else if (isPunct(t, ':')) {
          if (innerTernary > 0) {
            innerTernary -= 1;
          } else {
            unmatchedColons += 1;
            if (unmatchedColons >= neededColons) return true;
          }
        }
        if (prev && t.line > prev.line && canEndExprToken(prev)) {
          const continues = (t.kind === 'punct' && ASI_CONTINUE_PUNCTS.has(t.value))
            || (t.kind === 'word' && !t.hasEscape && ASI_CONTINUE_WORDS.has(t.value))
            || t.kind === 'template-open';
          if (!continues) break;
        }
      }
      lexer.next(allowRegex);
      if (t.kind === 'template-open') {
        skipTemplateExprOnly();
        prev = { kind: 'template-end', line: lexer.line };
      } else {
        if (isPunct(t, '(')) paren += 1;
        else if (isPunct(t, ')')) { if (paren > 0) paren -= 1; }
        else if (isPunct(t, '[')) bracket += 1;
        else if (isPunct(t, ']')) { if (bracket > 0) bracket -= 1; }
        else if (isPunct(t, '{')) brace += 1;
        else if (isPunct(t, '}')) { if (brace > 0) brace -= 1; }
        prev = t;
      }
    }
    return unmatchedColons >= neededColons;
  }

  function tryArrowFunction(shadowed) {
    const saved = lexer.save();
    const first = lexer.peek(true);
    let asyncSkip = false;
    if (isWord(first, 'async')) {
      const asyncLine = first.line;
      lexer.next(true);
      const afterAsync = lexer.peek(false);
      if (!afterAsync || afterAsync.line > asyncLine || (!isPunct(afterAsync, '(') && afterAsync.kind !== 'word')) {
        lexer.restore(saved);
        return null;
      }
      asyncSkip = true;
    }
    const start = lexer.peek(true);
    let paramNames = [];
    const arrowFrame = new Map();
    let hasReturnType = false;
    let pushedParamScope = false;
    if (start?.kind === 'word') {
      const wordTok = lexer.next(false);
      const arrow = lexer.peek(false);
      if (!isPunct(arrow, '=>') || arrow.line > wordTok.line) {
        lexer.restore(saved);
        return null;
      }
      paramNames = [wordTok.value];
      frameDeclaredNames.set(arrowFrame, new Set(paramNames));
      shadowScopedNames(paramNames, arrowFrame);
    } else if (isPunct(start, '(')) {
      let depth = 0;
      let ok = false;
      let prev = lexer.next(false);
      depth = 1;
      while (depth > 0 && lexer.peek(allowsRegexAfter(prev))) {
        const allowRegex = allowsRegexAfter(prev);
        const t = lexer.next(allowRegex);
        if (t.kind === 'template-open') {
          skipTemplateExprOnly();
          prev = { kind: 'template-end', line: lexer.line };
        } else {
          if (isPunct(t, '(')) depth += 1;
          else if (isPunct(t, ')')) {
            depth -= 1;
            if (depth === 0) ok = true;
          }
          prev = t;
        }
      }
      let arrow = ok ? lexer.peek(false) : null;
      if (ok && isPunct(arrow, ':')) {
        const beforeRet = lexer.save();
        skipTypeAnnotation({ stopAtAssign: true, stopAtBodyBrace: true, stopAtArrow: true });
        const maybeArrow = lexer.peek(false);
        if (isPunct(maybeArrow, '=>')) {
          if (colonExpectedDepth === 0) {
            hasReturnType = true;
            arrow = maybeArrow;
          } else {
            const afterArrowCheck = lexer.save();
            lexer.next(false); // '=>'
            const hasColons = countRemainingColonsAfterArrowBody(colonExpectedDepth);
            lexer.restore(afterArrowCheck);
            if (hasColons) {
              hasReturnType = true;
              arrow = maybeArrow;
            } else {
              lexer.restore(beforeRet);
            }
          }
        } else {
          lexer.restore(beforeRet);
        }
      }
      if (!ok || !isPunct(arrow, '=>')) {
        lexer.restore(saved);
        return null;
      }
      lexer.restore(saved);
      if (asyncSkip) lexer.next(true);
      const preNames = scanParamListNames();
      frameDeclaredNames.set(arrowFrame, new Set(preNames));
      shadowScopedNames(preNames, arrowFrame);
      functionDepth += 1;
      pushDeferredScope(preNames, functionDepth);
      pushedParamScope = true;
      try {
        const paramShadowed = unionSets(shadowed, new Set(preNames));
        paramNames = parseParameterNames(paramShadowed) ?? [];
        if (hasReturnType && isPunct(lexer.peek(false), ':')) {
          skipTypeAnnotation({ stopAtAssign: true, stopAtBodyBrace: true, stopAtArrow: true });
        }
      } catch (error) {
        popDeferredScope();
        functionDepth -= 1;
        popScopedFrame(arrowFrame);
        throw error;
      }
    } else {
      lexer.restore(saved);
      return null;
    }

    if (!isPunct(lexer.peek(false), '=>')) {
      if (pushedParamScope) {
        popDeferredScope();
        functionDepth -= 1;
      }
      popScopedFrame(arrowFrame);
      lexer.restore(saved);
      return null;
    }
    lexer.next(false); // consume '=>'
    const prevColon = colonExpectedDepth;
    colonExpectedDepth = 0;
    if (!pushedParamScope) {
      functionDepth += 1;
      pushDeferredScope(paramNames, functionDepth);
    }
    scopedStateStack.push(arrowFrame);
    try {
      const fnShadowed = unionSets(shadowed, new Set(paramNames));
      if (isPunct(lexer.peek(true), '{')) {
        parseBlockStatement(new Set(), fnShadowed, false, { hoistVar: true });
      } else {
        parseAssignment(new Set(), fnShadowed);
      }
    } finally {
      scopedStateStack.pop();
      popDeferredScope();
      functionDepth -= 1;
      colonExpectedDepth = prevColon;
      popScopedFrame(arrowFrame);
    }
    return { kind: 'other' };
  }

  function parseFunctionTail(shadowed) {
    if (isPunct(lexer.peek(false), '*')) lexer.next(false);
    let fnName = null;
    if (lexer.peek(false)?.kind === 'word') fnName = lexer.next(false).value;
    if (isPunct(lexer.peek(false), '<')) skipAngleBrackets();
    const nameShadowed = fnName ? unionSets(shadowed, new Set([fnName])) : shadowed;
    const preParamNames = scanParamListNames();
    const fnFrame = new Map();
    const allFnScoped = fnName ? [fnName, ...preParamNames] : preParamNames;
    frameDeclaredNames.set(fnFrame, new Set(allFnScoped));
    shadowScopedNames(allFnScoped, fnFrame);
    const prevColon = colonExpectedDepth;
    colonExpectedDepth = 0;
    functionDepth += 1;
    pushDeferredScope(allFnScoped, functionDepth);
    scopedStateStack.push(fnFrame);
    try {
      const paramShadowed = unionSets(nameShadowed, new Set(preParamNames));
      const paramNames = [];
      if (isPunct(lexer.peek(false), '(')) {
        lexer.next(false);
        while (lexer.peek(false) && !isPunct(lexer.peek(false), ')')) {
          const cur = lexer.pos;
          if (isPunct(lexer.peek(false), '...')) lexer.next(false);
          if (isWord(lexer.peek(false), 'this')) {
            lexer.next(false);
          } else {
            collectBindingNames(paramNames, new Set(), paramShadowed);
          }
          if (isPunct(lexer.peek(false), '?') || isPunct(lexer.peek(false), '!')) lexer.next(false);
          if (isPunct(lexer.peek(false), ':')) skipTypeAnnotation({ stopAtAssign: true });
          if (isPunct(lexer.peek(false), '=')) {
            lexer.next(false);
            parseAssignment(new Set(), paramShadowed);
          }
          if (isPunct(lexer.peek(false), ',')) lexer.next(false);
          else if (lexer.pos === cur) lexer.next(false);
        }
        if (isPunct(lexer.peek(false), ')')) lexer.next(false);
      }
      if (isPunct(lexer.peek(false), ':')) {
        skipTypeAnnotation({ stopAtAssign: false, stopAtBodyBrace: true });
      }
      const fnShadowed = unionSets(nameShadowed, new Set(paramNames));
      if (isPunct(lexer.peek(true), '{')) {
        parseBlockStatement(new Set(), fnShadowed, false, { hoistVar: true });
      }
    } finally {
      scopedStateStack.pop();
      popDeferredScope();
      functionDepth -= 1;
      colonExpectedDepth = prevColon;
      popScopedFrame(fnFrame);
    }
    return { kind: 'other' };
  }

  function parseClassTail(shadowed) {
    let className = null;
    const maybeName = lexer.peek(false);
    if (maybeName?.kind === 'word' && !isWord(maybeName, 'extends') && !isWord(maybeName, 'implements')) {
      className = lexer.next(false).value;
    }
    const bodyShadowed = className ? unionSets(shadowed, new Set([className])) : shadowed;
    const clsFrame = new Map();
    const clsDecl = className ? [className] : [];
    frameDeclaredNames.set(clsFrame, new Set(clsDecl));
    if (className) shadowScopedNames([className], clsFrame);
    const prevColon = colonExpectedDepth;
    colonExpectedDepth = 0;
    pushDeferredScope(clsDecl, functionDepth);
    scopedStateStack.push(clsFrame);
    try {
      if (isPunct(lexer.peek(false), '<')) skipAngleBrackets();
      if (isWord(lexer.peek(false), 'extends')) {
        lexer.next(false);
        parseLeftHandSide(new Set(), bodyShadowed);
        if (isPunct(lexer.peek(false), '<')) skipAngleBrackets();
      }
      if (isWord(lexer.peek(false), 'implements')) {
        lexer.next(false);
        while (lexer.peek(false) && !isPunct(lexer.peek(false), '{')) lexer.next(false);
      }
      if (isPunct(lexer.peek(true), '{')) {
        lexer.next(true);
        while (lexer.peek(true) && !isPunct(lexer.peek(true), '}')) {
          const cur = lexer.pos;
          const tok = lexer.peek(true);
          if (isPunct(tok, ';')) {
            lexer.next(true);
            continue;
          }
          if (isWord(tok, 'static') && (lexer.next(true), isPunct(lexer.peek(true), '{'))) {
            parseBlockStatement(new Set(), bodyShadowed, false, { hoistVar: true });
            continue;
          }
          while (lexer.peek(true) && !isPunct(lexer.peek(true), '(') && !isPunct(lexer.peek(true), '=')
            && !isPunct(lexer.peek(true), ';') && !isPunct(lexer.peek(true), '}')) {
            const inner = lexer.next(true);
            if (isPunct(inner, '[')) {
              parseExpression(new Set(), bodyShadowed);
              if (isPunct(lexer.peek(false), ']')) lexer.next(false);
            } else if (isPunct(inner, ':')) {
              lexer.restore({ pos: inner.start, line: inner.line });
              skipTypeAnnotation({ stopAtAssign: true, stopAtBodyBrace: true });
              break;
            }
          }
          if (isPunct(lexer.peek(false), '(')) {
            parseFunctionTail(bodyShadowed);
          } else if (isPunct(lexer.peek(false), '=')) {
            lexer.next(false);
            parseAssignment(new Set(), bodyShadowed);
          } else if (lexer.pos === cur) {
            lexer.next(true);
          }
        }
        if (isPunct(lexer.peek(true), '}')) lexer.next(true);
      }
    } finally {
      scopedStateStack.pop();
      popDeferredScope();
      colonExpectedDepth = prevColon;
      popScopedFrame(clsFrame);
    }
    return { kind: 'other' };
  }

  function parseTemplateLiteral(proven, shadowed) {
    let acc = null;
    while (true) {
      const seg = lexer.consumeTemplateSegment();
      const segAst = { kind: 'string', value: seg.value };
      acc = acc === null ? segAst : concatStringAst(acc, segAst);
      if (seg.kind === 'end') return acc;
      const exprAst = parseExpression(proven, shadowed);
      acc = concatStringAst(acc, exprAst);
      if (isPunct(lexer.peek(true), '}')) {
        const closeBrace = lexer.peek(true);
        lexer.setCursor(closeBrace.start + 1, closeBrace.line);
      }
    }
  }

  function collectTargetRef(ast, patternNames, patternMemberRoots) {
    if (!ast) return;
    if (ast.kind === 'id') patternNames.push(ast.name);
    else if (ast.kind === 'member') {
      const rootId = rootObjectId(ast.object);
      if (rootId) patternMemberRoots.push(rootId);
    }
    if (ast.patternNames?.length) patternNames.push(...ast.patternNames);
    if (ast.patternMemberRoots?.length) patternMemberRoots.push(...ast.patternMemberRoots);
  }

  function parseObjectLiteral(proven, shadowed) {
    lexer.next(true); // '{'
    const prevColon = colonExpectedDepth;
    colonExpectedDepth = 0;
    const patternNames = [];
    const patternMemberRoots = [];
    try {
      while (lexer.peek(true) && !isPunct(lexer.peek(true), '}')) {
        const cur = lexer.pos;
        if (isPunct(lexer.peek(true), '...')) {
          lexer.next(true);
          collectTargetRef(parseAssignment(proven, shadowed), patternNames, patternMemberRoots);
        } else {
          let sawModifier = false;
          while (isWord(lexer.peek(false), 'async') || isWord(lexer.peek(false), 'get')
            || isWord(lexer.peek(false), 'set') || isPunct(lexer.peek(false), '*')) {
            const maybeMod = lexer.next(false);
            if (isPunct(lexer.peek(false), ':') || isPunct(lexer.peek(false), ',')
              || isPunct(lexer.peek(false), '}') || isPunct(lexer.peek(false), '(')
              || isPunct(lexer.peek(false), '=')) {
              if (isPunct(lexer.peek(false), '(')) {
                parseFunctionTail(shadowed);
                sawModifier = true;
              } else if (isPunct(lexer.peek(false), '=')) {
                lexer.next(false);
                parseAssignment(proven, shadowed);
                if (maybeMod?.kind === 'word') patternNames.push(maybeMod.value);
                sawModifier = true;
              } else if (maybeMod?.kind === 'word') {
                if (isPunct(lexer.peek(false), ':')) {
                  lexer.next(false);
                  collectTargetRef(parseAssignment(proven, shadowed), patternNames, patternMemberRoots);
                } else {
                  patternNames.push(maybeMod.value);
                }
                sawModifier = true;
              }
              break;
            }
            sawModifier = true;
            if (maybeMod) void 0;
          }
          if (!sawModifier || (lexer.peek(true) && !isPunct(lexer.peek(true), ',') && !isPunct(lexer.peek(true), '}'))) {
            const keyTok = lexer.peek(true);
            if (isPunct(keyTok, '[')) {
              lexer.next(true);
              parseExpression(proven, shadowed);
              if (isPunct(lexer.peek(false), ']')) lexer.next(false);
            } else if (keyTok?.kind === 'template-open') {
              lexer.next(true);
              parseTemplateLiteral(proven, shadowed);
            } else if (keyTok && !isPunct(keyTok, ':') && !isPunct(keyTok, '(') && !isPunct(keyTok, ',')) {
              lexer.next(true);
            }
            if (isPunct(lexer.peek(false), '(')) {
              parseFunctionTail(shadowed);
            } else if (isPunct(lexer.peek(false), ':') || isPunct(lexer.peek(false), '=')) {
              const isDefaultEq = isPunct(lexer.peek(false), '=');
              lexer.next(false);
              const valAst = parseAssignment(proven, shadowed);
              if (isDefaultEq && keyTok?.kind === 'word') patternNames.push(keyTok.value);
              else collectTargetRef(valAst, patternNames, patternMemberRoots);
            } else if (keyTok?.kind === 'word') {
              patternNames.push(keyTok.value);
            }
          }
        }
        if (isPunct(lexer.peek(false), ',')) lexer.next(false);
        else if (lexer.pos === cur) lexer.next(true);
      }
      if (isPunct(lexer.peek(true), '}')) lexer.next(true);
    } finally {
      colonExpectedDepth = prevColon;
    }
    return patternNames.length || patternMemberRoots.length
      ? { kind: 'other', patternNames, patternMemberRoots }
      : { kind: 'other' };
  }

  function parseArrayLiteral(proven, shadowed) {
    lexer.next(true); // '['
    const prevColon = colonExpectedDepth;
    colonExpectedDepth = 0;
    const patternNames = [];
    const patternMemberRoots = [];
    try {
      while (lexer.peek(true) && !isPunct(lexer.peek(true), ']')) {
        const cur = lexer.pos;
        if (isPunct(lexer.peek(true), ',')) {
          lexer.next(true);
          continue;
        }
        if (isPunct(lexer.peek(true), '...')) lexer.next(true);
        collectTargetRef(parseAssignment(proven, shadowed), patternNames, patternMemberRoots);
        if (isPunct(lexer.peek(false), ',')) lexer.next(false);
        else if (lexer.pos === cur) lexer.next(true);
      }
      if (isPunct(lexer.peek(false), ']')) lexer.next(false);
    } finally {
      colonExpectedDepth = prevColon;
    }
    return patternNames.length || patternMemberRoots.length
      ? { kind: 'other', patternNames, patternMemberRoots }
      : { kind: 'other' };
  }

  function parsePrimary(proven, shadowed) {
    const arrow = tryArrowFunction(shadowed);
    if (arrow) return arrow;

    const tok = lexer.peek(true);
    if (!tok) return null;
    if (tok.kind === 'string') {
      lexer.next(true);
      return { kind: 'string', value: tok.value };
    }
    if (tok.kind === 'number' || tok.kind === 'regex') {
      lexer.next(true);
      return { kind: 'literal' };
    }
    if (tok.kind === 'template-open') {
      lexer.next(true);
      return parseTemplateLiteral(proven, shadowed);
    }
    if (isPunct(tok, '(')) {
      lexer.next(true);
      const prevColon = colonExpectedDepth;
      colonExpectedDepth = 0;
      let inner;
      try {
        inner = isPunct(lexer.peek(true), ')') ? { kind: 'other' } : parseExpression(proven, shadowed);
        if (isPunct(lexer.peek(false), ')')) lexer.next(false);
      } finally {
        colonExpectedDepth = prevColon;
      }
      return inner;
    }
    if (isPunct(tok, '[')) return parseArrayLiteral(proven, shadowed);
    if (isPunct(tok, '{')) return parseObjectLiteral(proven, shadowed);
    if (tok.kind === 'word') {
      if (!tok.hasEscape && (tok.value === 'true' || tok.value === 'false' || tok.value === 'null' || tok.value === 'undefined')) {
        lexer.next(true);
        return { kind: 'literal' };
      }
      if (!tok.hasEscape && tok.value === 'function') {
        lexer.next(true);
        return parseFunctionTail(shadowed);
      }
      if (!tok.hasEscape && tok.value === 'async') {
        const saved = lexer.save();
        lexer.next(true);
        if (isWord(lexer.peek(false), 'function')) {
          lexer.next(false);
          return parseFunctionTail(shadowed);
        }
        lexer.restore(saved);
      }
      if (!tok.hasEscape && tok.value === 'class') {
        lexer.next(true);
        return parseClassTail(shadowed);
      }
      if (!tok.hasEscape && tok.value === 'import') {
        lexer.next(true);
        if (isPunct(lexer.peek(false), '.')) {
          lexer.next(false);
          if (lexer.peek(false)?.kind === 'word') {
            const metaWord = lexer.next(false).value;
            if (metaWord === 'meta' && isPunct(lexer.peek(false), '.')) {
              lexer.next(false);
              const subWord = lexer.peek(false);
              if (subWord?.kind === 'word') {
                lexer.next(false);
                if (subWord.value === 'url') return { kind: 'import-meta-url' };
                if (subWord.value === 'filename') return { kind: 'import-meta-filename' };
                if (subWord.value === 'dirname') return { kind: 'import-meta-dirname' };
              }
            }
          }
          return { kind: 'other' };
        }
        return { kind: 'import-keyword', line: tok.line };
      }
      lexer.next(true);
      return { kind: 'id', name: tok.value, line: tok.line };
    }
    return null;
  }

  function parseCallArgs(proven, shadowed) {
    lexer.next(false); // '('
    const prevColon = colonExpectedDepth;
    colonExpectedDepth = 0;
    const args = [];
    try {
      while (lexer.peek(true) && !isPunct(lexer.peek(true), ')')) {
        const cur = lexer.pos;
        if (isPunct(lexer.peek(true), '...')) {
          lexer.next(true);
          args.push(parseAssignment(proven, shadowed));
        } else {
          args.push(parseAssignment(proven, shadowed));
        }
        if (isPunct(lexer.peek(false), ',')) lexer.next(false);
        else if (lexer.pos === cur) lexer.next(true);
      }
      if (isPunct(lexer.peek(false), ')')) lexer.next(false);
    } finally {
      colonExpectedDepth = prevColon;
    }
    return args;
  }

  function parseLeftHandSide(proven, shadowed) {
    let sawNew = false;
    if (isWord(lexer.peek(true), 'new')) {
      lexer.next(true);
      if (isPunct(lexer.peek(false), '.')) {
        lexer.next(false);
        if (lexer.peek(false)?.kind === 'word') lexer.next(false);
        return { kind: 'other' };
      }
      sawNew = true;
    }
    let expr = parsePrimary(proven, shadowed);
    if (!expr) return null;

    while (lexer.peek(false)) {
      const next = lexer.peek(false);
      if (isPunct(next, '.') || isPunct(next, '?.')) {
        lexer.next(false);
        if (!isPunct(lexer.peek(false), '(') && !isPunct(lexer.peek(false), '[')) {
          const prop = lexer.peek(false);
          if (prop?.kind === 'word') {
            lexer.next(false);
            expr = { kind: 'member', object: expr, prop: prop.value };
          } else {
            expr = { kind: 'other' };
          }
          continue;
        }
      }
      if (isPunct(lexer.peek(false), '[')) {
        lexer.next(false);
        const prevColon = colonExpectedDepth;
        colonExpectedDepth = 0;
        try {
          parseExpression(proven, shadowed);
          if (isPunct(lexer.peek(false), ']')) lexer.next(false);
        } finally {
          colonExpectedDepth = prevColon;
        }
        expr = { kind: 'member', object: expr, prop: null };
      } else if (isPunct(lexer.peek(false), '(')) {
        const callee = expr;
        const callLine = lexer.peek(false).line;
        const args = parseCallArgs(proven, shadowed);
        const callNew = sawNew;
        sawNew = false;
        if (callee.kind === 'import-keyword') {
          const dyn = extractImportTargets(args[0], proven);
          for (const target of dyn.targets) {
            dynamicRefs.push(target.specifier);
            dynamicCalls.push({
              specifier: target.specifier,
              targetKind: target.targetKind,
              isDir: target.isDir,
              line: callee.line,
              proven: target.proven,
            });
          }
          if (dyn.overflow) {
            dynamicOverflows.push({ kind: 'esm', line: callee.line, proven: [...proven] });
          }
          expr = { kind: 'other' };
        } else if (!callNew && callee.kind === 'id' && customRequireBindings.has(callee.name)) {
          const binding = customRequireBindings.get(callee.name);
          const dyn = extractDynamicTargets(args[0], proven);
          for (const target of dyn.targets) {
            if (isRelative(target.value)) pushStatic(target.value, 'cjs', binding.baseSpecifier);
          }
          if (dyn.overflow) {
            dynamicOverflows.push({ kind: 'cjs', line: callee.line ?? callLine, proven: [...proven] });
          }
          expr = { kind: 'call', isNew: false, callee, args };
        } else if (!callNew && callee.kind === 'id' && callee.name === 'require' && !ambientShadowed.has('require')) {
          const dyn = extractDynamicTargets(args[0], proven);
          for (const target of dyn.targets) {
            if (isRelative(target.value)) pushStatic(target.value, 'cjs');
          }
          if (dyn.overflow) {
            dynamicOverflows.push({ kind: 'cjs', line: callee.line ?? callLine, proven: [...proven] });
          }
          expr = { kind: 'call', isNew: false, callee, args };
        } else if (!callNew && callee.kind === 'call') {
          const inlineReq = extractCreateRequireBase(callee);
          if (inlineReq) {
            const dyn = extractDynamicTargets(args[0], proven);
            for (const target of dyn.targets) {
              if (isRelative(target.value)) pushStatic(target.value, 'cjs', inlineReq.baseSpecifier);
            }
            if (dyn.overflow) {
              dynamicOverflows.push({ kind: 'cjs', line: callLine, proven: [...proven] });
            }
          }
          expr = { kind: 'call', isNew: false, callee, args };
        } else {
          if (!callNew && callee.kind === 'member' && callee.object?.kind === 'id' && args.length >= 1
            && ((callee.object.name === 'Object' && (callee.prop === 'assign' || callee.prop === 'defineProperty' || callee.prop === 'defineProperties'))
              || (callee.object.name === 'Reflect' && (callee.prop === 'set' || callee.prop === 'defineProperty' || callee.prop === 'deleteProperty')))) {
            const targetId = rootObjectId(args[0]);
            if (targetId) markObjectMutated(targetId);
          }
          if (!callNew && callee.kind === 'id' && functionDepth > 0 && args.length > 0 && scopeDeferredStack.length) {
            const dyn = extractDynamicTargets(args[0], proven);
            if (dyn.targets.length > 0 || dyn.overflow) {
              scopeDeferredStack[scopeDeferredStack.length - 1].calls.push({
                calleeName: callee.name,
                targets: dyn.targets,
                overflow: dyn.overflow,
                line: callee.line ?? callLine,
                proven: [...proven],
                fromFnDepth: functionDepth,
              });
            }
          }
          expr = { kind: 'call', isNew: callNew, callee, args };
        }
      } else if (lexer.peek(false)?.kind === 'template-open') {
        lexer.next(false);
        parseTemplateLiteral(proven, shadowed);
        expr = { kind: 'other' };
      } else if (isPunct(lexer.peek(false), '++') || isPunct(lexer.peek(false), '--')) {
        lexer.next(false);
        if (expr?.kind === 'id') invalidateBinding(expr.name);
        else if (expr?.kind === 'member') {
          const rootId = rootObjectId(expr.object);
          if (rootId) {
            markObjectMutated(rootId);
            invalidateBinding(rootId);
          }
        }
        expr = { kind: 'other' };
      } else {
        break;
      }
    }
    return expr;
  }

  function parseUnary(proven, shadowed) {
    const tok = lexer.peek(true);
    if (!tok) return null;
    if (isPunct(tok, '!')) {
      lexer.next(true);
      const arg = parseUnary(proven, shadowed);
      return { kind: 'not', arg };
    }
    if ((tok.kind === 'word' && !tok.hasEscape && UNARY_PREFIX_WORDS.has(tok.value))
      || (tok.kind === 'punct' && UNARY_PREFIX_PUNCTS.has(tok.value))) {
      lexer.next(true);
      const target = parseUnary(proven, shadowed);
      if (tok.kind === 'word' && tok.value === 'delete' && target?.kind === 'member') {
        const rootId = rootObjectId(target.object);
        if (rootId) {
          markObjectMutated(rootId);
          invalidateBinding(rootId);
        }
      }
      return { kind: 'other' };
    }
    return parseLeftHandSide(proven, shadowed);
  }

  function parseBinary(proven, shadowed) {
    let left = parseUnary(proven, shadowed);
    if (!left) return null;
    while (lexer.peek(false)) {
      const tok = lexer.peek(false);
      if (tok.kind === 'word' && !tok.hasEscape && (tok.value === 'as' || tok.value === 'satisfies')) {
        const savedAs = lexer.save();
        lexer.next(false);
        const nextTok = lexer.peek(false);
        if (nextTok && (nextTok.kind === 'word' || nextTok.kind === 'string' || nextTok.kind === 'number'
          || isPunct(nextTok, '{') || isPunct(nextTok, '[') || isPunct(nextTok, '('))) {
          skipTypeTokens({ stopAtAssign: true, stopAtBodyBrace: true, stopAtArrow: true, stopAtBinary: true });
          continue;
        }
        lexer.restore(savedAs);
        break;
      }
      if ((tok.kind === 'word' && !tok.hasEscape && BINARY_OP_WORDS.has(tok.value))
        || (tok.kind === 'punct' && BINARY_OP_PUNCTS.has(tok.value))) {
        lexer.next(false);
        const right = parseUnary(proven, shadowed);
        if (tok.value === '+' && (left.kind === 'string' || left.kind === 'cond-expr' || left.kind === 'concat')
          && (right?.kind === 'string' || right?.kind === 'cond-expr' || right?.kind === 'concat')) {
          left = concatStringAst(left, right);
        } else {
          left = { kind: 'other' };
        }
      } else {
        break;
      }
    }
    return left;
  }

  function parseLogicalAnd(proven, shadowed) {
    let left = parseBinary(proven, shadowed);
    if (!left) return null;
    while (isPunct(lexer.peek(false), '&&')) {
      lexer.next(false);
      const right = parseBinary(unionSets(proven, provenOf(left, 'true', shadowed)), shadowed);
      left = { kind: 'and', left, right };
    }
    return left;
  }

  function parseLogicalOr(proven, shadowed) {
    let left = parseLogicalAnd(proven, shadowed);
    if (!left) return null;
    while (isPunct(lexer.peek(false), '||')) {
      lexer.next(false);
      const right = parseLogicalAnd(unionSets(proven, provenOf(left, 'false', shadowed)), shadowed);
      left = { kind: 'or', left, right };
    }
    return left;
  }

  function parseCoalesce(proven, shadowed) {
    let left = parseLogicalOr(proven, shadowed);
    if (!left) return null;
    while (isPunct(lexer.peek(false), '??')) {
      lexer.next(false);
      parseLogicalOr(proven, shadowed);
      left = { kind: 'other' };
    }
    return left;
  }

  function parseConditional(proven, shadowed) {
    const test = parseCoalesce(proven, shadowed);
    if (!test) return null;
    if (isPunct(lexer.peek(false), '?')) {
      lexer.next(false);
      const trueProven = unionSets(proven, provenOf(test, 'true', shadowed));
      colonExpectedDepth += 1;
      let cons;
      try {
        cons = parseAssignment(trueProven, shadowed);
      } finally {
        colonExpectedDepth -= 1;
      }
      let falseProven = proven;
      let alt = null;
      if (isPunct(lexer.peek(false), ':')) {
        lexer.next(false);
        falseProven = unionSets(proven, provenOf(test, 'false', shadowed));
        alt = parseAssignment(falseProven, shadowed);
      }
      return { kind: 'cond-expr', cons, alt, trueProven, falseProven };
    }
    return test;
  }

  function parseAssignment(proven, shadowed) {
    const arrow = tryArrowFunction(shadowed);
    if (arrow) return arrow;
    const left = parseConditional(proven, shadowed);
    if (!left) return null;
    const op = lexer.peek(false);
    if (op?.kind === 'punct' && ASSIGN_OPS.has(op.value)) {
      if (left.kind === 'id') {
        invalidateBinding(left.name);
      } else if (left.kind === 'member') {
        const rootId = rootObjectId(left.object);
        if (rootId) {
          markObjectMutated(rootId);
          invalidateBinding(rootId);
        }
      }
      if (left.patternNames?.length) {
        for (const name of left.patternNames) invalidateBinding(name);
      }
      if (left.patternMemberRoots?.length) {
        for (const rootId of left.patternMemberRoots) {
          markObjectMutated(rootId);
          invalidateBinding(rootId);
        }
      }
      lexer.next(false);
      const rhsAst = parseAssignment(proven, shadowed);
      if (left.kind === 'id' && (op.value === '=' || op.value === '||=' || op.value === '&&=' || op.value === '??=')) {
        const aliasFamily = extractBuiltinAliasFamily(rhsAst);
        if (aliasFamily) {
          setBindingForAssignment(builtinAliasModule, left.name, aliasFamily);
          if (isTopLevelBinding(left.name) && mutatedTopLevelIds.has(left.name)) {
            taintedBuiltinModules.add(aliasFamily);
          }
          return { kind: 'builtin-alias', family: aliasFamily };
        }
      }
      return { kind: 'other' };
    }
    return left;
  }

  function parseExpression(proven, shadowed) {
    let last = parseAssignment(proven, shadowed);
    if (!last) return null;
    while (isPunct(lexer.peek(false), ',')) {
      lexer.next(false);
      last = parseAssignment(proven, shadowed);
    }
    return last;
  }

  function consumeOptionalSemicolon() {
    if (isPunct(lexer.peek(true), ';')) lexer.next(true);
  }

  function consumeModuleFromClause() {
    lexer.next(false); // 'from' already verified followed by string
    const mod = lexer.peek(false);
    const modSpecifier = mod?.kind === 'string' ? mod.value : null;
    if (modSpecifier && isRelative(modSpecifier)) pushStatic(modSpecifier, 'esm');
    if (mod?.kind === 'string') lexer.next(false);
    if (isWord(lexer.peek(false), 'with') || isWord(lexer.peek(false), 'assert')) {
      lexer.next(false);
      skipBalanced('{', '}');
    }
    consumeOptionalSemicolon();
    return modSpecifier;
  }

  function parseImportDeclaration() {
    // 'import' word already verified next
    const saved = lexer.save();
    lexer.next(true); // 'import'
    const next = lexer.peek(false);
    if (isPunct(next, '(') || isPunct(next, '.')) {
      lexer.restore(saved);
      return false;
    }
    if (next?.kind === 'string') {
      if (isRelative(next.value)) pushStatic(next.value, 'esm');
      lexer.next(false);
      if (isWord(lexer.peek(false), 'with') || isWord(lexer.peek(false), 'assert')) {
        lexer.next(false);
        skipBalanced('{', '}');
      }
      consumeOptionalSemicolon();
      return true;
    }

    let isTypeOnly = false;
    let defaultBinding = null;
    let namespaceBinding = null;
    const namedBindings = [];

    if (isWord(lexer.peek(false), 'type')) {
      const afterType = lexer.save();
      lexer.next(false);
      const t2 = lexer.peek(false);
      if (isPunct(t2, '{') || isPunct(t2, '*')
        || (t2?.kind === 'word' && !isWord(t2, 'from') && !isWord(t2, 'as'))) {
        isTypeOnly = true;
      } else {
        lexer.restore(afterType);
      }
    }

    const maybeDefault = lexer.peek(false);
    if (maybeDefault?.kind === 'word') {
      let treatAsFromKeyword = false;
      if (isWord(maybeDefault, 'from')) {
        const sFrom = lexer.save();
        lexer.next(false);
        treatAsFromKeyword = lexer.peek(false)?.kind === 'string';
        lexer.restore(sFrom);
      }
      if (!treatAsFromKeyword) {
        defaultBinding = lexer.next(false).value;
        if (isPunct(lexer.peek(false), ',')) lexer.next(false);
      }
    }

    if (isPunct(lexer.peek(false), '*')) {
      lexer.next(false);
      if (isWord(lexer.peek(false), 'as')) lexer.next(false);
      if (lexer.peek(false)?.kind === 'word') namespaceBinding = lexer.next(false).value;
    } else if (isPunct(lexer.peek(false), '{')) {
      lexer.next(false);
      while (lexer.peek(false) && !isPunct(lexer.peek(false), '}')) {
        const cur = lexer.pos;
        if (isWord(lexer.peek(false), 'type')) {
          const st = lexer.save();
          lexer.next(false);
          const afterTypeSpec = lexer.peek(false);
          if ((afterTypeSpec?.kind === 'word' || afterTypeSpec?.kind === 'string') && !isWord(afterTypeSpec, 'as')) {
            lexer.next(false);
            if (isWord(lexer.peek(false), 'as')) {
              lexer.next(false);
              if (lexer.peek(false)?.kind === 'word') lexer.next(false);
            }
            if (isPunct(lexer.peek(false), ',')) lexer.next(false);
            continue;
          }
          lexer.restore(st);
        }
        const idTok = lexer.peek(false);
        if (idTok?.kind === 'word' || idTok?.kind === 'string') {
          const imported = lexer.next(false).value;
          if (isWord(lexer.peek(false), 'as')) {
            lexer.next(false);
            const aliasTok = lexer.peek(false);
            if (aliasTok?.kind === 'word') {
              namedBindings.push({ imported, local: lexer.next(false).value });
            }
          } else if (idTok.kind === 'word') {
            namedBindings.push({ imported, local: imported });
          }
        }
        if (isPunct(lexer.peek(false), ',')) lexer.next(false);
        else if (lexer.pos === cur) lexer.next(false);
      }
      if (isPunct(lexer.peek(false), '}')) lexer.next(false);
    }

    while (lexer.peek(false)) {
      const cur = lexer.pos;
      const t = lexer.peek(false);
      if (isPunct(t, ';')) {
        lexer.next(false);
        return true;
      }
      if (isWord(t, 'from')) {
        const afterFrom = lexer.save();
        lexer.next(false);
        if (lexer.peek(false)?.kind === 'string') {
          lexer.restore(afterFrom);
          const modSpec = consumeModuleFromClause();
          if (!isTypeOnly && modSpec) {
            registerModuleBindings(modSpec, { defaultBinding, namespaceBinding, namedBindings });
          }
          return true;
        }
        continue;
      }
      if (isPunct(t, '{')) skipBalanced('{', '}');
      else lexer.next(false);
      if (lexer.pos === cur) lexer.next(false);
    }
    return true;
  }

  function parseExportDeclaration(proven, shadowed, isTopLevel, blockState = null) {
    lexer.next(true); // 'export'
    let t = lexer.peek(true);
    if (!t) return;
    if (isWord(t, 'default')) {
      lexer.next(true);
      const after = lexer.peek(true);
      if (isWord(after, 'function') || isWord(after, 'class')
        || (isWord(after, 'async') && (() => { const s = lexer.save(); lexer.next(true); const w = isWord(lexer.peek(false), 'function'); lexer.restore(s); return w; })())) {
        parseStatement(proven, shadowed, isTopLevel, blockState);
        return;
      }
      parseAssignment(proven, shadowed);
      consumeOptionalSemicolon();
      return;
    }
    if (isWord(t, 'const') || isWord(t, 'let') || isWord(t, 'var') || isWord(t, 'function') || isWord(t, 'class') || isWord(t, 'async')) {
      parseStatement(proven, shadowed, isTopLevel, blockState);
      return;
    }
    if (isWord(t, 'interface')) {
      lexer.next(true);
      while (lexer.peek(true) && !isPunct(lexer.peek(true), '{') && !isPunct(lexer.peek(true), ';') && !isPunct(lexer.peek(true), '}')) {
        lexer.next(true);
      }
      if (isPunct(lexer.peek(true), '{')) skipBalanced('{', '}');
      return;
    }
    if (isWord(t, 'type')) {
      lexer.next(true);
      t = lexer.peek(true);
      if (!t || (!isPunct(t, '*') && !isPunct(t, '{'))) {
        if (t?.kind === 'word') lexer.next(false);
        if (isPunct(lexer.peek(false), '<')) skipAngleBrackets();
        if (isPunct(lexer.peek(false), '=')) {
          lexer.next(false);
          skipTypeAnnotation({ stopAtAssign: false, stopAtBodyBrace: false });
          consumeOptionalSemicolon();
          return;
        }
        consumeOptionalSemicolon();
        return;
      }
    }
    if (isPunct(t, '*')) {
      lexer.next(true);
      if (isWord(lexer.peek(false), 'as')) {
        lexer.next(false);
        if (lexer.peek(false)?.kind === 'word') lexer.next(false);
      }
      if (isWord(lexer.peek(false), 'from')) {
        const afterFrom = lexer.save();
        lexer.next(false);
        if (lexer.peek(false)?.kind === 'string') {
          lexer.restore(afterFrom);
          consumeModuleFromClause();
          return;
        }
      }
      consumeOptionalSemicolon();
      return;
    }
    if (isPunct(t, '{')) {
      skipBalanced('{', '}');
      if (isWord(lexer.peek(false), 'from')) {
        const afterFrom = lexer.save();
        lexer.next(false);
        if (lexer.peek(false)?.kind === 'string') {
          lexer.restore(afterFrom);
          consumeModuleFromClause();
          return;
        }
      }
      consumeOptionalSemicolon();
    }
  }

  function prescanBlockBindings({ includeVarHoist = false, stopAtBrace = true, isSwitchBody = false } = {}) {
    const saved = lexer.save();
    const unconditional = new Set();
    const tdzConst = new Set();

    function skipStructuralExpr({ stopAtComma = false, stopAtColon = false } = {}) {
      let paren = 0;
      let bracket = 0;
      let brace = 0;
      let ternaryDepth = 0;
      let prev = null;
      while (lexer.peek(allowsRegexAfter(prev))) {
        const allowRegex = allowsRegexAfter(prev);
        const t = lexer.peek(allowRegex);
        if (paren === 0 && bracket === 0 && brace === 0) {
          if (isPunct(t, ';')) break;
          if (isPunct(t, '}')) break;
          if (stopAtComma && isPunct(t, ',')) break;
          if (stopAtColon) {
            if (isPunct(t, '?')) {
              ternaryDepth += 1;
            } else if (isPunct(t, ':')) {
              if (ternaryDepth === 0) break;
              ternaryDepth -= 1;
            }
          }
          if (prev && t.line > prev.line && canEndExprToken(prev)) {
            const continues = (t.kind === 'punct' && ASI_CONTINUE_PUNCTS.has(t.value))
              || (t.kind === 'word' && ASI_CONTINUE_WORDS.has(t.value))
              || t.kind === 'template-open';
            if (!continues) break;
          }
        }
        lexer.next(allowRegex);
        if (t.kind === 'template-open') {
          skipTemplateExprOnly();
          prev = { kind: 'template-end', line: lexer.line };
        } else {
          if (isPunct(t, '(')) paren += 1;
          else if (isPunct(t, ')')) { if (paren > 0) paren -= 1; }
          else if (isPunct(t, '[')) bracket += 1;
          else if (isPunct(t, ']')) { if (bracket > 0) bracket -= 1; }
          else if (isPunct(t, '{')) brace += 1;
          else if (isPunct(t, '}')) { if (brace > 0) brace -= 1; }
          prev = t;
        }
      }
    }

    function scanDeclList(declKind, isDirectBlock) {
      while (lexer.peek(true)) {
        const cur = lexer.pos;
        const firstPat = lexer.peek(false);
        const isDestructured = isPunct(firstPat, '{') || isPunct(firstPat, '[');
        const names = scanBindingPatternNames([]);
        if (declKind === 'var') {
          if (isDirectBlock || includeVarHoist) {
            for (const name of names) unconditional.add(name);
          }
        } else if (isDirectBlock) {
          if (declKind === 'const' && !isDestructured && names.length === 1) {
            if (!unconditional.has(names[0])) tdzConst.add(names[0]);
          } else {
            for (const name of names) unconditional.add(name);
          }
        }
        if (isPunct(lexer.peek(false), '!')) lexer.next(false);
        if (isPunct(lexer.peek(false), ':')) skipTypeAnnotation({ stopAtAssign: true });
        if (isPunct(lexer.peek(false), '=')) {
          lexer.next(false);
          skipStructuralExpr({ stopAtComma: true });
        }
        if (isPunct(lexer.peek(false), ',')) {
          lexer.next(false);
          continue;
        }
        if (lexer.pos === cur) break;
        break;
      }
    }

    function skipFunctionDef(isDirectBlock) {
      if (isPunct(lexer.peek(false), '*')) lexer.next(false);
      if (lexer.peek(false)?.kind === 'word') {
        const fnName = lexer.next(false).value;
        if (isDirectBlock) unconditional.add(fnName);
      }
      if (isPunct(lexer.peek(false), '<')) skipAngleBrackets();
      if (isPunct(lexer.peek(false), '(')) skipBalanced('(', ')');
      if (isPunct(lexer.peek(false), ':')) skipTypeAnnotation({ stopAtAssign: false, stopAtBodyBrace: true });
      if (isPunct(lexer.peek(true), '{')) skipBalanced('{', '}');
    }

    function skipClassDef(isDirectBlock) {
      const maybeName = lexer.peek(false);
      if (maybeName?.kind === 'word' && maybeName.value !== 'extends' && maybeName.value !== 'implements') {
        const clsName = lexer.next(false).value;
        if (isDirectBlock) unconditional.add(clsName);
      }
      while (lexer.peek(true) && !isPunct(lexer.peek(true), '{') && !isPunct(lexer.peek(true), '}')) {
        const next = lexer.peek(true);
        if (isPunct(next, '(')) skipBalanced('(', ')');
        else if (isPunct(next, '[')) skipBalanced('[', ']');
        else lexer.next(true);
      }
      if (isPunct(lexer.peek(true), '{')) skipBalanced('{', '}');
    }

    function prescanStmt(isDirectBlock, insideSwitch = false) {
      const tok = lexer.peek(true);
      if (!tok) return;
      if (stopAtBrace && isPunct(tok, '}')) return;
      if (isPunct(tok, ';')) { lexer.next(true); return; }
      if (insideSwitch && isWord(tok, 'case')) {
        lexer.next(true);
        skipStructuralExpr({ stopAtColon: true });
        if (isPunct(lexer.peek(false), ':')) lexer.next(false);
        return;
      }
      if (insideSwitch && isWord(tok, 'default')) {
        lexer.next(true);
        if (isPunct(lexer.peek(false), ':')) lexer.next(false);
        return;
      }
      if (isPunct(tok, '{')) {
        if (!includeVarHoist) {
          skipBalanced('{', '}');
          return;
        }
        lexer.next(true);
        while (lexer.peek(true) && !isPunct(lexer.peek(true), '}')) {
          const cur = lexer.pos;
          prescanStmt(false, false);
          if (lexer.pos === cur) lexer.next(true);
        }
        if (isPunct(lexer.peek(true), '}')) lexer.next(true);
        return;
      }
      if (isWord(tok, 'var') || isWord(tok, 'let') || isWord(tok, 'const')) {
        lexer.next(true);
        scanDeclList(tok.value, isDirectBlock);
        consumeOptionalSemicolon();
        return;
      }
      if (isWord(tok, 'function')) {
        lexer.next(true);
        skipFunctionDef(isDirectBlock);
        return;
      }
      if (isWord(tok, 'async')) {
        const after = lexer.save();
        lexer.next(true);
        if (isWord(lexer.peek(false), 'function')) {
          lexer.next(false);
          skipFunctionDef(isDirectBlock);
          return;
        }
        lexer.restore(after);
      }
      if (isWord(tok, 'class')) {
        lexer.next(true);
        skipClassDef(isDirectBlock);
        return;
      }
      if (isWord(tok, 'export')) {
        lexer.next(true);
        const after = lexer.peek(true);
        if (isWord(after, 'default')) {
          lexer.next(true);
          const defTok = lexer.peek(true);
          if (isWord(defTok, 'function')) { lexer.next(true); skipFunctionDef(isDirectBlock); return; }
          if (isWord(defTok, 'class')) { lexer.next(true); skipClassDef(isDirectBlock); return; }
          if (isWord(defTok, 'async')) {
            const s2 = lexer.save();
            lexer.next(true);
            if (isWord(lexer.peek(false), 'function')) { lexer.next(false); skipFunctionDef(isDirectBlock); return; }
            lexer.restore(s2);
          }
          skipStructuralExpr();
          consumeOptionalSemicolon();
          return;
        }
        if (isWord(after, 'var') || isWord(after, 'let') || isWord(after, 'const')) {
          lexer.next(true);
          scanDeclList(after.value, isDirectBlock);
          consumeOptionalSemicolon();
          return;
        }
        if (isWord(after, 'function') || isWord(after, 'class') || isWord(after, 'async')) {
          prescanStmt(isDirectBlock, false);
          return;
        }
        if (isWord(after, 'interface')) {
          lexer.next(true);
          while (lexer.peek(true) && !isPunct(lexer.peek(true), '{') && !isPunct(lexer.peek(true), ';') && !isPunct(lexer.peek(true), '}')) {
            lexer.next(true);
          }
          if (isPunct(lexer.peek(true), '{')) skipBalanced('{', '}');
          return;
        }
        if (isWord(after, 'type')) lexer.next(true);
        if (isPunct(lexer.peek(true), '{')) skipBalanced('{', '}');
        skipStructuralExpr();
        consumeOptionalSemicolon();
        return;
      }
      if (isWord(tok, 'import')) {
        const after = lexer.save();
        lexer.next(true);
        const n = lexer.peek(false);
        if (isPunct(n, '(') || isPunct(n, '.')) {
          lexer.restore(after);
        } else {
          if (n?.kind !== 'string' && isDirectBlock) {
            let isTypeImport = false;
            if (isWord(n, 'type')) {
              lexer.next(false);
              if (!isPunct(lexer.peek(false), ',') && !isWord(lexer.peek(false), 'from')) isTypeImport = true;
              else unconditional.add('type');
            }
            if (!isTypeImport) {
              const firstIdent = lexer.peek(false);
              if (firstIdent?.kind === 'word' && !isWord(firstIdent, 'from')) {
                unconditional.add(lexer.next(false).value);
                if (isPunct(lexer.peek(false), ',')) lexer.next(false);
              }
              if (isPunct(lexer.peek(false), '*')) {
                lexer.next(false);
                if (isWord(lexer.peek(false), 'as')) lexer.next(false);
                if (lexer.peek(false)?.kind === 'word') unconditional.add(lexer.next(false).value);
              } else if (isPunct(lexer.peek(false), '{')) {
                lexer.next(false);
                while (lexer.peek(false) && !isPunct(lexer.peek(false), '}')) {
                  const cur = lexer.pos;
                  if (isWord(lexer.peek(false), 'type')) {
                    const st = lexer.save();
                    lexer.next(false);
                    if (lexer.peek(false)?.kind === 'word' && !isWord(lexer.peek(false), 'as')) {
                      lexer.next(false);
                      if (isWord(lexer.peek(false), 'as')) { lexer.next(false); lexer.next(false); }
                      if (isPunct(lexer.peek(false), ',')) lexer.next(false);
                      continue;
                    }
                    lexer.restore(st);
                  }
                  const id = lexer.peek(false);
                  if (id?.kind === 'word' || id?.kind === 'string') {
                    const imported = lexer.next(false);
                    if (isWord(lexer.peek(false), 'as')) {
                      lexer.next(false);
                      if (lexer.peek(false)?.kind === 'word') unconditional.add(lexer.next(false).value);
                    } else if (imported.kind === 'word') {
                      unconditional.add(imported.value);
                    }
                  }
                  if (isPunct(lexer.peek(false), ',')) lexer.next(false);
                  else if (lexer.pos === cur) lexer.next(false);
                }
                if (isPunct(lexer.peek(false), '}')) lexer.next(false);
              }
            }
          }
          skipStructuralExpr();
          consumeOptionalSemicolon();
          return;
        }
      }
      if (isWord(tok, 'if')) {
        lexer.next(true);
        if (isPunct(lexer.peek(false), '(')) skipBalanced('(', ')');
        prescanStmt(false, false);
        if (isWord(lexer.peek(true), 'else')) {
          lexer.next(true);
          prescanStmt(false, false);
        }
        return;
      }
      if (isWord(tok, 'while') || isWord(tok, 'with')) {
        lexer.next(true);
        if (isPunct(lexer.peek(false), '(')) skipBalanced('(', ')');
        prescanStmt(false, false);
        return;
      }
      if (isWord(tok, 'do')) {
        lexer.next(true);
        prescanStmt(false, false);
        if (isWord(lexer.peek(true), 'while')) {
          lexer.next(true);
          if (isPunct(lexer.peek(false), '(')) skipBalanced('(', ')');
        }
        consumeOptionalSemicolon();
        return;
      }
      if (isWord(tok, 'for')) {
        lexer.next(true);
        if (isWord(lexer.peek(false), 'await')) lexer.next(false);
        if (isPunct(lexer.peek(false), '(')) {
          if (!includeVarHoist) {
            skipBalanced('(', ')');
          } else {
            lexer.next(false);
            if (isWord(lexer.peek(true), 'var')) {
              lexer.next(true);
              scanDeclList('var', false);
            }
            let depth = 1;
            let prev = null;
            while (depth > 0 && lexer.peek(allowsRegexAfter(prev))) {
              const t = lexer.next(allowsRegexAfter(prev));
              if (t.kind === 'template-open') {
                skipTemplateExprOnly();
                prev = { kind: 'template-end', line: lexer.line };
              } else {
                if (isPunct(t, '(')) depth += 1;
                else if (isPunct(t, ')')) depth -= 1;
                prev = t;
              }
            }
          }
        }
        prescanStmt(false, false);
        return;
      }
      if (isWord(tok, 'try')) {
        lexer.next(true);
        if (isPunct(lexer.peek(true), '{')) prescanStmt(false, false);
        if (isWord(lexer.peek(true), 'catch')) {
          lexer.next(true);
          if (isPunct(lexer.peek(false), '(')) skipBalanced('(', ')');
          if (isPunct(lexer.peek(true), '{')) prescanStmt(false, false);
        }
        if (isWord(lexer.peek(true), 'finally')) {
          lexer.next(true);
          if (isPunct(lexer.peek(true), '{')) prescanStmt(false, false);
        }
        return;
      }
      if (isWord(tok, 'switch')) {
        lexer.next(true);
        if (isPunct(lexer.peek(false), '(')) skipBalanced('(', ')');
        if (isPunct(lexer.peek(true), '{')) {
          if (!includeVarHoist) {
            skipBalanced('{', '}');
          } else {
            lexer.next(true);
            while (lexer.peek(true) && !isPunct(lexer.peek(true), '}')) {
              const cur = lexer.pos;
              prescanStmt(false, true);
              if (lexer.pos === cur) lexer.next(true);
            }
            if (isPunct(lexer.peek(true), '}')) lexer.next(true);
          }
        }
        return;
      }
      if (isWord(tok, 'return') || isWord(tok, 'throw')) {
        const kwLine = tok.line;
        lexer.next(true);
        const after = lexer.peek(true);
        if (after && after.line === kwLine && !NON_LITERAL_STMT_STOP.has(after.value)) {
          skipStructuralExpr();
        }
        consumeOptionalSemicolon();
        return;
      }
      if (isWord(tok, 'interface')) {
        const s = lexer.save();
        lexer.next(true);
        if (lexer.peek(false)?.kind === 'word') {
          while (lexer.peek(true) && !isPunct(lexer.peek(true), '{') && !isPunct(lexer.peek(true), ';') && !isPunct(lexer.peek(true), '}')) {
            lexer.next(true);
          }
          if (isPunct(lexer.peek(true), '{')) skipBalanced('{', '}');
          return;
        }
        lexer.restore(s);
      }
      if (isWord(tok, 'type')) {
        const s = lexer.save();
        lexer.next(true);
        if (lexer.peek(false)?.kind === 'word') {
          lexer.next(false);
          if (isPunct(lexer.peek(false), '<') || isPunct(lexer.peek(false), '=')) {
            skipStructuralExpr();
            consumeOptionalSemicolon();
            return;
          }
        }
        lexer.restore(s);
      }
      if (tok.kind === 'word') {
        const s = lexer.save();
        lexer.next(true);
        if (isPunct(lexer.peek(false), ':')) {
          lexer.next(false);
          prescanStmt(isDirectBlock, insideSwitch);
          return;
        }
        lexer.restore(s);
      }
      const beforeExpr = lexer.pos;
      skipStructuralExpr();
      if (lexer.pos === beforeExpr && lexer.peek(true) && !(stopAtBrace && isPunct(lexer.peek(true), '}'))) {
        lexer.next(true);
      } else {
        consumeOptionalSemicolon();
      }
    }

    try {
      while (lexer.peek(true)) {
        if (stopAtBrace && isPunct(lexer.peek(true), '}')) break;
        const cur = lexer.pos;
        prescanStmt(true, isSwitchBody);
        if (lexer.pos === cur) lexer.next(true);
      }
    } finally {
      lexer.restore(saved);
    }
    for (const name of unconditional) tdzConst.delete(name);
    return { unconditional, tdzConst };
  }

  function initBlockState(baseShadowed, { includeVarHoist = false, stopAtBrace = true, isSwitchBody = false } = {}) {
    const outerShadowed = new Set(baseShadowed);
    const { unconditional, tdzConst } = prescanBlockBindings({ includeVarHoist, stopAtBrace, isSwitchBody });
    const scopedShadowed = new Set(baseShadowed);
    for (const name of unconditional) scopedShadowed.add(name);
    const pendingTdz = new Set();
    for (const name of tdzConst) {
      if (!scopedShadowed.has(name)) {
        pendingTdz.add(name);
        scopedShadowed.add(name);
      }
    }
    const declaredNames = [...new Set([...unconditional, ...tdzConst])];
    return {
      scopedShadowed,
      declaredNames,
      blockState: { outerShadowed, unconditional, pendingTdz },
    };
  }

  function parseVarDeclaration(kind, proven, shadowed, isTopLevel, blockState = null) {
    lexer.next(true); // const | let | var
    const outerShadowed = blockState?.outerShadowed ?? EMPTY_SET;
    const unconditional = blockState?.unconditional ?? EMPTY_SET;
    const pendingTdz = blockState?.pendingTdz ?? null;
    while (lexer.peek(true)) {
      const cur = lexer.pos;
      const firstPat = lexer.peek(false);
      const isDestructured = isPunct(firstPat, '{') || isPunct(firstPat, '[');
      const propMap = isPunct(firstPat, '{') ? new Map() : null;
      const boundNames = collectBindingNames([], proven, shadowed, propMap);
      if (isPunct(lexer.peek(false), '!')) lexer.next(false);
      if (isPunct(lexer.peek(false), ':')) skipTypeAnnotation({ stopAtAssign: true });
      const hasInit = isPunct(lexer.peek(false), '=');
      let initAst = null;
      if (hasInit) {
        lexer.next(false);
        initAst = parseAssignment(proven, shadowed);
      }
      const singleName = !isDestructured && boundNames.length === 1 ? boundNames[0] : null;
      const shadowsEnclosing = singleName !== null
        && (outerShadowed.has(singleName) || unconditional.has(singleName)
          || topLevelConstGuards.has(singleName) || activeLocalConstGuards.has(singleName));
      const isFreshGuard = kind === 'const' && hasInit && singleName !== null
        && initAst && !isScalarLiteral(initAst)
        && (isTopLevel ? !unconditional.has(singleName) && !topLevelConstGuards.has(singleName) : !shadowsEnclosing);
      if (singleName !== null && pendingTdz?.has(singleName)) {
        pendingTdz.delete(singleName);
      }
      if (isFreshGuard) {
        shadowed.delete(singleName);
        if (isTopLevel) {
          topLevelConstGuards.add(singleName);
          const guardFamilies = getApprovedArtifactLockFamilies(initAst);
          if (guardFamilies) {
            topLevelArtifactGuards.add(singleName);
            topLevelArtifactGuardFamilies.set(singleName, guardFamilies);
          }
        } else if (scopeGuardStack.length) {
          activeLocalConstGuards.add(singleName);
          scopeGuardStack[scopeGuardStack.length - 1].push(singleName);
        }
      } else {
        for (const name of boundNames) shadowed.add(name);
      }

      const activeFrame = currentScopedFrame();
      let handledBinding = false;
      const reqBase = !isDestructured && singleName !== null ? extractCreateRequireBase(initAst) : null;
      if (reqBase) {
        setScopedEntry(customRequireBindings, singleName, reqBase, activeFrame);
        if (kind === 'const' && scopeDeferredStack.length) {
          scopeDeferredStack[scopeDeferredStack.length - 1].bindings.set(singleName, reqBase);
        }
        deleteScopedEntry(builtinBindings, singleName, activeFrame);
        deleteScopedEntry(builtinAliasModule, singleName, activeFrame);
        deleteScopedEntry(knownPathBindings, singleName, activeFrame);
        handledBinding = true;
      } else if (initAst?.kind === 'call' && !initAst.isNew && initAst.callee?.kind === 'id'
        && (customRequireBindings.has(initAst.callee.name)
          || (initAst.callee.name === 'require' && !ambientShadowed.has('require')))
        && initAst.args[0]?.kind === 'string') {
        const reqSpec = initAst.args[0].value;
        const reqFamily = NODE_BUILTIN_FS.has(reqSpec) ? 'fs'
          : (NODE_BUILTIN_PATH.has(reqSpec) ? 'path' : (NODE_BUILTIN_URL.has(reqSpec) ? 'url' : null));
        if (singleName !== null) {
          deleteScopedEntry(customRequireBindings, singleName, activeFrame);
          deleteScopedEntry(builtinAliasModule, singleName, activeFrame);
          deleteScopedEntry(knownPathBindings, singleName, activeFrame);
          if (kind === 'const' || NODE_BUILTIN_MODULE.has(reqSpec)) {
            if (activeFrame) saveScopedEntry(builtinBindings, singleName, activeFrame);
            registerModuleBindings(reqSpec, { defaultBinding: singleName, namespaceBinding: singleName, namedBindings: [] });
            if (!activeFrame && reqFamily && mutatedTopLevelIds.has(singleName)) {
              taintedBuiltinModules.add(reqFamily);
            }
            handledBinding = true;
          } else if (reqFamily) {
            setScopedEntry(builtinAliasModule, singleName, reqFamily, activeFrame);
            deleteScopedEntry(builtinBindings, singleName, activeFrame);
            if (!activeFrame && mutatedTopLevelIds.has(singleName)) {
              taintedBuiltinModules.add(reqFamily);
            }
            handledBinding = true;
          }
        } else if (propMap) {
          if (kind === 'const' || NODE_BUILTIN_MODULE.has(reqSpec)) {
            const named = [];
            for (const [local, imported] of propMap) {
              if (activeFrame) saveScopedEntry(builtinBindings, local, activeFrame);
              deleteScopedEntry(builtinAliasModule, local, activeFrame);
              deleteScopedEntry(knownPathBindings, local, activeFrame);
              deleteScopedEntry(customRequireBindings, local, activeFrame);
              named.push({ imported, local });
            }
            registerModuleBindings(reqSpec, { defaultBinding: null, namespaceBinding: null, namedBindings: named });
            handledBinding = true;
          } else if (reqFamily === 'path' && propMap.size) {
            for (const [local, imported] of propMap) {
              if (imported === 'posix') {
                setScopedEntry(builtinAliasModule, local, 'path', activeFrame);
                deleteScopedEntry(builtinBindings, local, activeFrame);
                deleteScopedEntry(knownPathBindings, local, activeFrame);
                deleteScopedEntry(customRequireBindings, local, activeFrame);
              }
            }
            handledBinding = true;
          }
        }
      } else if (kind === 'const' && !isDestructured && singleName !== null && initAst) {
        const evalInfo = evaluateRepoPathInfo(initAst);
        if (evalInfo !== null) {
          setScopedEntry(knownPathBindings, singleName, evalInfo, activeFrame);
          deleteScopedEntry(builtinBindings, singleName, activeFrame);
          deleteScopedEntry(builtinAliasModule, singleName, activeFrame);
          deleteScopedEntry(customRequireBindings, singleName, activeFrame);
          handledBinding = true;
        }
      }
      if (!handledBinding && !isDestructured && singleName !== null && initAst) {
        const aliasFamily = extractBuiltinAliasFamily(initAst);
        if (aliasFamily) {
          setScopedEntry(builtinAliasModule, singleName, aliasFamily, activeFrame);
          deleteScopedEntry(builtinBindings, singleName, activeFrame);
          deleteScopedEntry(customRequireBindings, singleName, activeFrame);
          deleteScopedEntry(knownPathBindings, singleName, activeFrame);
          if (!activeFrame && mutatedTopLevelIds.has(singleName)) {
            taintedBuiltinModules.add(aliasFamily);
          }
          handledBinding = true;
        }
      } else if (!handledBinding && propMap && initAst?.kind === 'id' && moduleFamilyOfId(initAst.name) === 'path') {
        for (const [local, imported] of propMap) {
          if (imported === 'posix') {
            setScopedEntry(builtinAliasModule, local, 'path', activeFrame);
            deleteScopedEntry(builtinBindings, local, activeFrame);
            deleteScopedEntry(customRequireBindings, local, activeFrame);
            deleteScopedEntry(knownPathBindings, local, activeFrame);
            if (!activeFrame && mutatedTopLevelIds.has(local)) {
              taintedBuiltinModules.add('path');
            }
          }
        }
      }
      if (!handledBinding) {
        if (activeFrame) {
          shadowScopedNames(boundNames, activeFrame);
        } else {
          for (const name of boundNames) {
            builtinBindings.delete(name);
            builtinAliasModule.delete(name);
            customRequireBindings.delete(name);
            knownPathBindings.delete(name);
          }
        }
      }

      if (isPunct(lexer.peek(false), ',')) {
        lexer.next(false);
        continue;
      }
      if (lexer.pos === cur) break;
      break;
    }
    consumeOptionalSemicolon();
  }

  function parseBlockStatement(proven, shadowed, isTopLevel = false, { hoistVar = false, extraScopedNames = [] } = {}) {
    lexer.next(true); // '{'
    const { scopedShadowed: blockShadowed, declaredNames, blockState } = initBlockState(shadowed, {
      includeVarHoist: hoistVar,
      stopAtBrace: true,
    });
    const prevColon = colonExpectedDepth;
    colonExpectedDepth = 0;
    const frame = [];
    const scopedFrame = new Map();
    const scopedDeclNames = [...declaredNames, ...extraScopedNames];
    frameDeclaredNames.set(scopedFrame, new Set(scopedDeclNames));
    shadowScopedNames(scopedDeclNames, scopedFrame);
    if (!isTopLevel) pushDeferredScope(scopedDeclNames, functionDepth);
    scopeGuardStack.push(frame);
    scopedStateStack.push(scopedFrame);
    try {
      while (lexer.peek(true) && !isPunct(lexer.peek(true), '}')) {
        const cur = lexer.pos;
        parseStatement(proven, blockShadowed, isTopLevel, blockState);
        if (lexer.pos === cur) lexer.next(true);
      }
      if (isPunct(lexer.peek(true), '}')) lexer.next(true);
    } finally {
      scopedStateStack.pop();
      scopeGuardStack.pop();
      if (!isTopLevel) popDeferredScope();
      colonExpectedDepth = prevColon;
      popScopedFrame(scopedFrame);
      for (const name of frame) activeLocalConstGuards.delete(name);
    }
  }

  function parseStatement(proven, shadowed, isTopLevel, blockState = null) {
    const tok = lexer.peek(true);
    if (!tok) return;
    if (isPunct(tok, ';')) {
      lexer.next(true);
      return;
    }
    if (isPunct(tok, '{')) {
      parseBlockStatement(proven, shadowed, false);
      return;
    }
    if (isWord(tok, 'import') && parseImportDeclaration()) return;
    if (isWord(tok, 'export')) {
      parseExportDeclaration(proven, shadowed, isTopLevel, blockState);
      return;
    }
    if (isWord(tok, 'const') || isWord(tok, 'let') || isWord(tok, 'var')) {
      parseVarDeclaration(tok.value, proven, shadowed, isTopLevel, blockState);
      return;
    }
    if (isWord(tok, 'if')) {
      lexer.next(true);
      if (isPunct(lexer.peek(false), '(')) lexer.next(false);
      const testAst = parseExpression(proven, shadowed);
      if (isPunct(lexer.peek(false), ')')) lexer.next(false);
      parseStatement(unionSets(proven, provenOf(testAst, 'true', shadowed)), shadowed, false);
      if (isWord(lexer.peek(true), 'else')) {
        lexer.next(true);
        parseStatement(unionSets(proven, provenOf(testAst, 'false', shadowed)), shadowed, false);
      }
      return;
    }
    if (isWord(tok, 'while') || isWord(tok, 'with')) {
      lexer.next(true);
      if (isPunct(lexer.peek(false), '(')) {
        lexer.next(false);
        parseExpression(proven, shadowed);
        if (isPunct(lexer.peek(false), ')')) lexer.next(false);
      }
      parseStatement(proven, shadowed, false);
      return;
    }
    if (isWord(tok, 'do')) {
      lexer.next(true);
      parseStatement(proven, shadowed, false);
      if (isWord(lexer.peek(true), 'while')) {
        lexer.next(true);
        if (isPunct(lexer.peek(false), '(')) {
          lexer.next(false);
          parseExpression(proven, shadowed);
          if (isPunct(lexer.peek(false), ')')) lexer.next(false);
        }
      }
      consumeOptionalSemicolon();
      return;
    }
    if (isWord(tok, 'for')) {
      lexer.next(true);
      if (isWord(lexer.peek(false), 'await')) lexer.next(false);
      const loopShadowed = new Set(shadowed);
      const preLoopNames = [];
      const loopFrame = new Map();
      let pushedLoopDecls = false;
      scopedStateStack.push(loopFrame);
      try {
        if (isPunct(lexer.peek(false), '(')) {
          lexer.next(false);
          const headTok = lexer.peek(true);
          if (isWord(headTok, 'const') || isWord(headTok, 'let') || isWord(headTok, 'var')) {
            const savedHead = lexer.save();
            lexer.next(true);
            while (lexer.peek(true)) {
              const hCur = lexer.pos;
              scanBindingPatternNames(preLoopNames);
              if (isPunct(lexer.peek(false), '!')) lexer.next(false);
              if (isPunct(lexer.peek(false), ':')) skipTypeAnnotation({ stopAtAssign: true });
              if (isPunct(lexer.peek(false), '=')) {
                lexer.next(false);
                let p = 0; let b = 0; let c = 0;
                let prev = null;
                while (lexer.peek(allowsRegexAfter(prev))) {
                  const allowRegex = allowsRegexAfter(prev);
                  const t = lexer.peek(allowRegex);
                  if (p === 0 && b === 0 && c === 0 && (isPunct(t, ',') || isPunct(t, ';') || isPunct(t, ')'))) break;
                  lexer.next(allowRegex);
                  if (t.kind === 'template-open') {
                    skipTemplateExprOnly();
                    prev = { kind: 'template-end', line: lexer.line };
                  } else {
                    if (isPunct(t, '(')) p += 1;
                    else if (isPunct(t, ')')) p -= 1;
                    else if (isPunct(t, '[')) b += 1;
                    else if (isPunct(t, ']')) b -= 1;
                    else if (isPunct(t, '{')) c += 1;
                    else if (isPunct(t, '}')) c -= 1;
                    prev = t;
                  }
                }
              }
              if (isPunct(lexer.peek(false), ',')) { lexer.next(false); continue; }
              if (lexer.pos === hCur || !isPunct(lexer.peek(false), ',')) break;
            }
            for (const name of preLoopNames) loopShadowed.add(name);
            frameDeclaredNames.set(loopFrame, new Set(preLoopNames));
            shadowScopedNames(preLoopNames, loopFrame);
            pushDeferredScope(preLoopNames, functionDepth);
            pushedLoopDecls = true;
            lexer.restore(savedHead);
          }
          while (lexer.peek(true) && !isPunct(lexer.peek(true), ')')) {
            const cur = lexer.pos;
            const head = lexer.peek(true);
            if (isWord(head, 'const') || isWord(head, 'let') || isWord(head, 'var')) {
              lexer.next(true);
              while (lexer.peek(true)) {
                const dCur = lexer.pos;
                const names = collectBindingNames([], proven, loopShadowed);
                for (const name of names) loopShadowed.add(name);
                if (isPunct(lexer.peek(false), '!')) lexer.next(false);
                if (isPunct(lexer.peek(false), ':')) skipTypeAnnotation({ stopAtAssign: true });
                if (isPunct(lexer.peek(false), '=')) {
                  lexer.next(false);
                  parseAssignment(proven, loopShadowed);
                }
                if (isPunct(lexer.peek(false), ',')) { lexer.next(false); continue; }
                if (lexer.pos === dCur) break;
                break;
              }
            } else if (isWord(head, 'of') || isWord(head, 'in') || isPunct(head, ';')) {
              lexer.next(true);
            } else {
              parseExpression(proven, loopShadowed);
            }
            if (lexer.pos === cur) lexer.next(true);
          }
          if (isPunct(lexer.peek(false), ')')) lexer.next(false);
        }
        parseStatement(proven, loopShadowed, false);
      } finally {
        scopedStateStack.pop();
        if (pushedLoopDecls) popDeferredScope();
        popScopedFrame(loopFrame);
      }
      return;
    }
    if (isWord(tok, 'switch')) {
      lexer.next(true);
      if (isPunct(lexer.peek(false), '(')) {
        lexer.next(false);
        parseExpression(proven, shadowed);
        if (isPunct(lexer.peek(false), ')')) lexer.next(false);
      }
      if (isPunct(lexer.peek(true), '{')) {
        lexer.next(true);
        const { scopedShadowed: switchShadowed, declaredNames, blockState: switchBlockState } = initBlockState(shadowed, {
          includeVarHoist: false,
          stopAtBrace: true,
          isSwitchBody: true,
        });
        const prevColon = colonExpectedDepth;
        colonExpectedDepth = 0;
        const switchFrame = new Map();
        frameDeclaredNames.set(switchFrame, new Set(declaredNames));
        shadowScopedNames(declaredNames, switchFrame);
        pushDeferredScope(declaredNames, functionDepth);
        scopedStateStack.push(switchFrame);
        try {
          while (lexer.peek(true) && !isPunct(lexer.peek(true), '}')) {
            const cur = lexer.pos;
            if (isWord(lexer.peek(true), 'case')) {
              lexer.next(true);
              colonExpectedDepth += 1;
              try {
                parseExpression(proven, switchShadowed);
              } finally {
                colonExpectedDepth -= 1;
              }
              if (isPunct(lexer.peek(false), ':')) lexer.next(false);
            } else if (isWord(lexer.peek(true), 'default')) {
              lexer.next(true);
              if (isPunct(lexer.peek(false), ':')) lexer.next(false);
            } else {
              parseStatement(proven, switchShadowed, false, switchBlockState);
            }
            if (lexer.pos === cur) lexer.next(true);
          }
          if (isPunct(lexer.peek(true), '}')) lexer.next(true);
        } finally {
          scopedStateStack.pop();
          popDeferredScope();
          colonExpectedDepth = prevColon;
          popScopedFrame(switchFrame);
        }
      }
      return;
    }
    if (isWord(tok, 'try')) {
      lexer.next(true);
      if (isPunct(lexer.peek(true), '{')) parseBlockStatement(proven, shadowed, false);
      if (isWord(lexer.peek(true), 'catch')) {
        lexer.next(true);
        const catchShadowed = new Set(shadowed);
        const preCatchNames = [];
        const catchFrame = new Map();
        let pushedCatchScope = false;
        scopedStateStack.push(catchFrame);
        try {
          if (isPunct(lexer.peek(false), '(')) {
            const savedCatch = lexer.save();
            lexer.next(false);
            scanBindingPatternNames(preCatchNames);
            lexer.restore(savedCatch);
            for (const name of preCatchNames) catchShadowed.add(name);
            frameDeclaredNames.set(catchFrame, new Set(preCatchNames));
            shadowScopedNames(preCatchNames, catchFrame);
            pushDeferredScope(preCatchNames, functionDepth);
            pushedCatchScope = true;
            lexer.next(false);
            collectBindingNames([], proven, catchShadowed);
            if (isPunct(lexer.peek(false), ':')) skipTypeAnnotation({ stopAtAssign: false });
            if (isPunct(lexer.peek(false), ')')) lexer.next(false);
          }
          if (isPunct(lexer.peek(true), '{')) {
            parseBlockStatement(proven, catchShadowed, false, { extraScopedNames: preCatchNames });
          }
        } finally {
          scopedStateStack.pop();
          if (pushedCatchScope) popDeferredScope();
          popScopedFrame(catchFrame);
        }
      }
      if (isWord(lexer.peek(true), 'finally')) {
        lexer.next(true);
        if (isPunct(lexer.peek(true), '{')) parseBlockStatement(proven, shadowed, false);
      }
      return;
    }
    if (isWord(tok, 'function')) {
      lexer.next(true);
      parseFunctionTail(shadowed);
      return;
    }
    if (isWord(tok, 'async')) {
      const saved = lexer.save();
      lexer.next(true);
      if (isWord(lexer.peek(false), 'function')) {
        lexer.next(false);
        parseFunctionTail(shadowed);
        return;
      }
      lexer.restore(saved);
    }
    if (isWord(tok, 'class')) {
      lexer.next(true);
      parseClassTail(shadowed);
      return;
    }
    if (isWord(tok, 'interface')) {
      const saved = lexer.save();
      lexer.next(true);
      if (lexer.peek(false)?.kind === 'word') {
        while (lexer.peek(true) && !isPunct(lexer.peek(true), '{') && !isPunct(lexer.peek(true), ';') && !isPunct(lexer.peek(true), '}')) {
          lexer.next(true);
        }
        if (isPunct(lexer.peek(true), '{')) skipBalanced('{', '}');
        return;
      }
      lexer.restore(saved);
    }
    if (isWord(tok, 'type')) {
      const saved = lexer.save();
      lexer.next(true);
      if (lexer.peek(false)?.kind === 'word') {
        lexer.next(false);
        if (isPunct(lexer.peek(false), '<')) skipAngleBrackets();
        if (isPunct(lexer.peek(false), '=')) {
          lexer.next(false);
          skipTypeAnnotation({ stopAtAssign: false, stopAtBodyBrace: false });
          consumeOptionalSemicolon();
          return;
        }
      }
      lexer.restore(saved);
    }
    if (isWord(tok, 'return') || isWord(tok, 'throw')) {
      const kwLine = tok.line;
      lexer.next(true);
      const after = lexer.peek(true);
      if (after && after.line === kwLine && !NON_LITERAL_STMT_STOP.has(after.value)) {
        parseExpression(proven, shadowed);
      }
      consumeOptionalSemicolon();
      return;
    }

    const expr = parseExpression(proven, shadowed);
    if (expr && isPunct(lexer.peek(false), ':')) {
      lexer.next(false); // label
      parseStatement(proven, shadowed, false);
      return;
    }
    if (expr === null && lexer.peek(true)) lexer.next(true);
    else consumeOptionalSemicolon();
  }

  const rootProven = new Set();
  const { scopedShadowed: rootShadowed, declaredNames: rootDeclaredNames, blockState: rootBlockState } = initBlockState(new Set(), {
    includeVarHoist: true,
    stopAtBrace: false,
  });
  for (const name of rootDeclaredNames) ambientShadowed.set(name, true);
  pushDeferredScope(rootDeclaredNames, 0);
  while (lexer.peek(true)) {
    const cur = lexer.pos;
    parseStatement(rootProven, rootShadowed, true, rootBlockState);
    if (lexer.pos === cur) lexer.next(true);
  }
  popDeferredScope();

  for (const [name, family] of builtinAliasModule) {
    if (mutatedTopLevelIds.has(name)) taintedBuiltinModules.add(family);
  }
  for (const [guardName, families] of topLevelArtifactGuardFamilies) {
    for (const family of families) {
      if (taintedBuiltinModules.has(family)) {
        topLevelArtifactGuards.delete(guardName);
        break;
      }
    }
  }

  return {
    staticRefs: [...new Set(staticRefs)],
    staticEntries,
    dynamicRefs: [...new Set(dynamicRefs)],
    dynamicCalls,
    dynamicOverflows,
    topLevelConstGuards: [...topLevelConstGuards],
    topLevelArtifactGuards: [...topLevelArtifactGuards],
  };
}

function readJsonOptional(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function readTextOptional(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

const CJS_IMPLICIT_FILE_EXTENSIONS = ['.js', '.json', '.node'];
const CJS_INDEX_EXTENSIONS = ['/index.js', '/index.json', '/index.node'];
const TS_SOURCE_EXT_MAP = Object.freeze({
  '.js': '.ts',
  '.mjs': '.mts',
  '.cjs': '.cts',
});

const CANDIDATE_SKIP_DIRS = new Set(['node_modules', '.git']);

function inspectCandidate(root, rootReal, cand) {
  if (cand.split('/').some(seg => CANDIDATE_SKIP_DIRS.has(seg))) {
    return { exists: false, target: null, realPath: null, nlink: 0, dev: 0n, ino: 0n, isFile: false, isDirectory: false };
  }
  return inspectStrictChild(root, rootReal, cand, '모듈 참조', { requireFile: false });
}

function probeCjsTargetList(root, rootReal, candidates, isGone) {
  for (const cand of candidates) {
    if (!isInsideRootRelative(cand)) continue;
    if (isGone(cand)) return { status: 'gone', target: cand };
    const inspected = inspectCandidate(root, rootReal, cand);
    if (inspected.exists && inspected.isFile) return { status: 'file', target: cand };
  }
  return null;
}

function resolveCjsTarget(root, rootReal, fromDir, rawSpec, isGone) {
  const forceDirectory = rawSpec === '.' || rawSpec === '..'
    || rawSpec.endsWith('/') || rawSpec.endsWith('/.') || rawSpec.endsWith('/..');
  const base = posix.normalize(posix.join(fromDir, rawSpec)).replace(/\/+$/u, '') || '.';
  const isRootDir = base === '.';
  if (!isRootDir && !isInsideRootRelative(base)) return { target: base, gone: false, enqueueable: false };

  const baseInspect = isRootDir
    ? { exists: true, isFile: false, isDirectory: true }
    : inspectCandidate(root, rootReal, base);
  if (!forceDirectory && !isRootDir) {
    if (baseInspect.exists && baseInspect.isFile) {
      return isGone(base)
        ? { target: base, gone: true, enqueueable: false }
        : { target: base, gone: false, enqueueable: true };
    }
    if (!baseInspect.exists && posix.extname(base) && isGone(base)) {
      return { target: base, gone: true, enqueueable: false };
    }

    const fileMatch = probeCjsTargetList(
      root,
      rootReal,
      CJS_IMPLICIT_FILE_EXTENSIONS.map(ext => `${base}${ext}`),
      isGone,
    );
    if (fileMatch) {
      return {
        target: fileMatch.target,
        gone: fileMatch.status === 'gone',
        enqueueable: fileMatch.status === 'file',
      };
    }
  }

  if (!isRootDir && isGone(base)) return { target: base, gone: true, enqueueable: false };

  const pkgRel = isRootDir ? 'package.json' : `${base}/package.json`;
  if (isGone(pkgRel)) return { target: pkgRel, gone: true, enqueueable: false };
  if (baseInspect.exists && baseInspect.isDirectory) {
    const pkgInspect = inspectCandidate(root, rootReal, pkgRel);
    if (pkgInspect.exists && pkgInspect.isFile) {
      const pkg = readJsonOptional(pkgInspect.target);
      if (typeof pkg?.main === 'string' && pkg.main.trim()) {
        const mainRaw = pkg.main.trim().replaceAll('\\', '/');
        const mainForceDir = mainRaw === '.' || mainRaw === '..'
          || mainRaw.endsWith('/') || mainRaw.endsWith('/.') || mainRaw.endsWith('/..');
        const mainBase = posix.normalize(posix.join(base, mainRaw)).replace(/\/+$/u, '') || '.';
        const mainIsRoot = mainBase === '.';
        if (mainIsRoot || isInsideRootRelative(mainBase)) {
          if (!mainForceDir && !mainIsRoot) {
            const mainFileMatch = probeCjsTargetList(
              root,
              rootReal,
              [mainBase, ...CJS_IMPLICIT_FILE_EXTENSIONS.map(ext => `${mainBase}${ext}`)],
              isGone,
            );
            if (mainFileMatch) {
              return {
                target: mainFileMatch.target,
                gone: mainFileMatch.status === 'gone',
                enqueueable: mainFileMatch.status === 'file',
              };
            }
          }
          const mainIndexMatch = probeCjsTargetList(
            root,
            rootReal,
            CJS_INDEX_EXTENSIONS.map(ext => (mainIsRoot ? ext.slice(1) : `${mainBase}${ext}`)),
            isGone,
          );
          if (mainIndexMatch) {
            return {
              target: mainIndexMatch.target,
              gone: mainIndexMatch.status === 'gone',
              enqueueable: mainIndexMatch.status === 'file',
            };
          }
        }
      }
    }
  }

  const indexMatch = probeCjsTargetList(
    root,
    rootReal,
    CJS_INDEX_EXTENSIONS.map(ext => (isRootDir ? ext.slice(1) : `${base}${ext}`)),
    isGone,
  );
  if (indexMatch) {
    return {
      target: indexMatch.target,
      gone: indexMatch.status === 'gone',
      enqueueable: indexMatch.status === 'file',
    };
  }

  return { target: base, gone: false, enqueueable: false };
}

function resolveEsmTarget(root, rootReal, fromFile, fromDir, rawSpec, isGone) {
  const stripped = stripEsmSuffix(rawSpec);
  if (/%2f|%5c/iu.test(stripped)) {
    return { target: rawSpec, gone: false, enqueueable: false };
  }
  const decoded = safeDecodeEsmSpecifier(stripped);
  if (decoded.includes('\0') || decoded.includes('\\')) {
    return { target: rawSpec, gone: false, enqueueable: false };
  }
  const hasTrailingSlash = decoded.endsWith('/');
  const base = posix.normalize(posix.join(fromDir, decoded)).replace(/\/+$/u, '');
  if (!isInsideRootRelative(base)) return { target: base, gone: false, enqueueable: false };
  if (isGone(base)) return { target: base, gone: true, enqueueable: false };
  if (hasTrailingSlash) return { target: base, gone: false, enqueueable: false };

  const inspected = inspectCandidate(root, rootReal, base);
  if (inspected.exists) {
    return { target: base, gone: false, enqueueable: inspected.isFile };
  }

  if (/\.(?:ts|mts|cts)$/iu.test(fromFile)) {
    const ext = posix.extname(base).toLowerCase();
    const mappedExt = TS_SOURCE_EXT_MAP[ext];
    if (mappedExt) {
      const tsCand = `${base.slice(0, -ext.length)}${mappedExt}`;
      if (isGone(tsCand)) return { target: tsCand, gone: true, enqueueable: false };
      const tsInspect = inspectCandidate(root, rootReal, tsCand);
      if (tsInspect.exists) {
        return { target: tsCand, gone: false, enqueueable: tsInspect.isFile };
      }
    }
  }

  return { target: base, gone: false, enqueueable: false };
}

function resolveLocalTarget(root, rootReal, fromFile, refEntry, isGone) {
  let effectiveDir = posix.dirname(fromFile);
  const rawSpec = typeof refEntry === 'string' ? refEntry : refEntry.specifier;
  const kind = typeof refEntry === 'string' ? 'esm' : refEntry.kind;
  const targetKind = typeof refEntry === 'object' ? refEntry.targetKind : null;
  const baseSpecifier = typeof refEntry === 'object' ? refEntry.baseSpecifier : null;
  if (kind === 'esm' && targetKind === 'repo-rel') {
    const relSpec = refEntry.isDir && !rawSpec.endsWith('/') ? `${rawSpec}/` : rawSpec;
    return resolveEsmTarget(root, rootReal, fromFile, '.', relSpec, isGone);
  }
  if (kind === 'esm' && targetKind === 'file-url') {
    let fsPath;
    try {
      fsPath = fileURLToPath(rawSpec);
    } catch {
      return { target: rawSpec, gone: false, enqueueable: false };
    }
    const mapped = mapAbsolutePathToRepoRel(root, rootReal, fsPath);
    if (!mapped || !isInsideRootRelative(mapped)) return { target: rawSpec, gone: false, enqueueable: false };
    const relSpec = stripEsmSuffix(rawSpec).endsWith('/') ? `${mapped}/` : mapped;
    return resolveEsmTarget(root, rootReal, fromFile, '.', relSpec, isGone);
  }
  if (baseSpecifier) {
    if (typeof baseSpecifier === 'string') {
      const urlRes = resolveRelativeUrlAgainstFile(fromFile, baseSpecifier);
      if (!urlRes) return { target: rawSpec, gone: false, enqueueable: false };
      effectiveDir = urlRes.isDir ? urlRes.path : (urlRes.path === '.' ? '.' : posix.dirname(urlRes.path));
    } else if (baseSpecifier.kind === 'file-url') {
      let fsPath;
      try {
        fsPath = fileURLToPath(baseSpecifier.value);
      } catch {
        return { target: rawSpec, gone: false, enqueueable: false };
      }
      const mapped = mapAbsolutePathToRepoRel(root, rootReal, fsPath);
      if (!mapped) return { target: rawSpec, gone: false, enqueueable: false };
      const isDirAnchor = stripEsmSuffix(baseSpecifier.value).endsWith('/');
      effectiveDir = isDirAnchor ? mapped : (mapped === '.' ? '.' : posix.dirname(mapped));
    } else if (baseSpecifier.kind === 'abs-path') {
      const mapped = mapAbsolutePathToRepoRel(root, rootReal, baseSpecifier.value);
      if (!mapped) return { target: rawSpec, gone: false, enqueueable: false };
      const isDirAnchor = baseSpecifier.value.endsWith('/') || baseSpecifier.value.endsWith('\\');
      effectiveDir = isDirAnchor ? mapped : (mapped === '.' ? '.' : posix.dirname(mapped));
    } else if (baseSpecifier.kind === 'repo-rel') {
      const relVal = baseSpecifier.value || '.';
      if (relVal === '.' && !baseSpecifier.isDir) {
        return { target: rawSpec, gone: false, enqueueable: false };
      }
      effectiveDir = baseSpecifier.isDir ? relVal : posix.dirname(relVal);
    } else if (baseSpecifier.kind === 'relative') {
      const urlRes = resolveRelativeUrlAgainstFile(fromFile, baseSpecifier.value);
      if (!urlRes) return { target: rawSpec, gone: false, enqueueable: false };
      effectiveDir = urlRes.isDir ? urlRes.path : (urlRes.path === '.' ? '.' : posix.dirname(urlRes.path));
    }
  }
  if (kind === 'cjs') return resolveCjsTarget(root, rootReal, effectiveDir, rawSpec, isGone);
  return resolveEsmTarget(root, rootReal, fromFile, effectiveDir, rawSpec, isGone);
}

const ARTIFACT_GUARD_CANDIDATES = Object.freeze(['isArtifact', 'artifact']);

function hasArtifactGuard(call, topLevelArtifactGuards) {
  const validIds = new Set(topLevelArtifactGuards);
  return ARTIFACT_GUARD_CANDIDATES.some(name => validIds.has(name) && call.proven.includes(`! ${name}`));
}

const NPM_VALUE_FLAGS = new Set(['--userconfig', '--registry', '--location', '--loglevel', '--cache']);
const NPM_DIR_FLAGS = new Set(['-C', '--prefix', '--cwd', '--dir']);
const NPM_SCOPE_FLAGS = new Set(['--workspace', '-w', '--filter']);
const SHELL_ENV_WRAPPERS = new Set(['env', 'cross-env', 'command', 'exec', 'time', 'nohup']);
const NODE_CJS_PRELOAD_FLAGS = new Set(['-r', '--require']);
const NODE_ESM_PRELOAD_FLAGS = new Set(['--import', '--loader', '--experimental-loader']);
const NODE_TEST_VALUE_FLAGS = new Set([
  '--allow-fs-read',
  '--allow-fs-write',
  '--build-snapshot-config',
  '-C',
  '--conditions',
  '--cpu-prof-dir',
  '--cpu-prof-interval',
  '--cpu-prof-name',
  '--diagnostic-dir',
  '--disable-proto',
  '--disable-warning',
  '--dns-result-order',
  '--env-file',
  '--env-file-if-exists',
  '-e',
  '--eval',
  '--experimental-config-file',
  '--experimental-default-type',
  '--experimental-loader',
  '--loader',
  '--experimental-sea-config',
  '--experimental-test-isolation',
  '--heap-prof-dir',
  '--heap-prof-interval',
  '--heap-prof-name',
  '--heapsnapshot-near-heap-limit',
  '--heapsnapshot-signal',
  '--icu-data-dir',
  '--import',
  '--input-type',
  '--debug-port',
  '--inspect-port',
  '--inspect-publish-uid',
  '--localstorage-file',
  '--max-http-header-size',
  '--max-old-space-size-percentage',
  '--network-family-autoselection-attempt-timeout',
  '--openssl-config',
  '--redirect-warnings',
  '--report-directory',
  '--report-dir',
  '--report-filename',
  '--report-signal',
  '-r',
  '--require',
  '--run',
  '--secure-heap',
  '--secure-heap-min',
  '--snapshot-blob',
  '--test-concurrency',
  '--test-coverage-branches',
  '--test-coverage-exclude',
  '--test-coverage-functions',
  '--test-coverage-include',
  '--test-coverage-lines',
  '--test-name-pattern',
  '--test-reporter',
  '--test-reporter-destination',
  '--test-shard',
  '--test-skip-pattern',
  '--test-timeout',
  '--title',
  '--tls-cipher-list',
  '--tls-keylog',
  '--trace-event-categories',
  '--trace-event-file-pattern',
  '--trace-require-module',
  '--unhandled-rejections',
  '--use-largepages',
  '--v8-pool-size',
  '--watch-kill-signal',
  '--watch-path',
]);
const NODE_CMD_PATTERN = /^node(?:\.exe)?$/iu;
const LOCAL_JS_FILE_PATTERN = /\.(?:mjs|js|cjs|mts|cts|ts)$/iu;
const DECL_TS_PATTERN = /\.d\.(?:ts|mts|cts)$/iu;
const NODE_22_TEST_FILE_PATTERN = /^(?:test(?:-.*)?|.*(?:[._-]test))\.(?:mjs|cjs|js|mts|cts|ts)$/iu;

function isTrackableScriptPath(relPath) {
  return LOCAL_JS_FILE_PATTERN.test(relPath) && !DECL_TS_PATTERN.test(relPath);
}

function resolveSegmentDir(baseCwd, dirValue, root = null, rootReal = null) {
  if (baseCwd === null || dirValue === undefined) return null;
  const trimmed = dirValue.trim();
  if (!trimmed || trimmed.startsWith('~') || trimmed.includes('$')) return null;
  const slashNorm = trimmed.replaceAll('\\', '/');
  if (isAbsolute(trimmed) || posix.isAbsolute(slashNorm)) {
    return root && rootReal ? mapAbsolutePathToRepoRel(root, rootReal, trimmed) : null;
  }
  const joined = posix.normalize(baseCwd === '.' ? slashNorm : `${baseCwd}/${slashNorm}`).replace(/\/+$/u, '') || '.';
  if (joined === '..' || joined.startsWith('../')) return null;
  return joined;
}

function findCommandContext(tokens, initialCwd, root = null, rootReal = null) {
  let idx = 0;
  let effectiveCwd = initialCwd;
  while (idx < tokens.length) {
    const tok = tokens[idx];
    if (!tok) { idx += 1; continue; }
    if (tok === '!' || /^[A-Za-z_][A-Za-z0-9_]*=/u.test(tok)) {
      idx += 1;
      continue;
    }
    if (SHELL_ENV_WRAPPERS.has(tok)) {
      idx += 1;
      if (tok === 'env') {
        while (idx < tokens.length) {
          const flag = tokens[idx];
          if (flag === '--') { idx += 1; break; }
          if (flag === '-C' || flag === '--chdir') {
            effectiveCwd = resolveSegmentDir(effectiveCwd, tokens[idx + 1], root, rootReal);
            idx += 2;
            continue;
          }
          if (flag.startsWith('--chdir=')) {
            effectiveCwd = resolveSegmentDir(effectiveCwd, flag.slice(8), root, rootReal);
            idx += 1;
            continue;
          }
          if (flag.startsWith('-C') && flag.length > 2) {
            effectiveCwd = resolveSegmentDir(effectiveCwd, flag.startsWith('-C=') ? flag.slice(3) : flag.slice(2), root, rootReal);
            idx += 1;
            continue;
          }
          if (flag === '-u' || flag === '--unset') { idx += 2; continue; }
          if (flag.startsWith('-')) { idx += 1; continue; }
          break;
        }
      } else if (tok === 'command' || tok === 'exec') {
        while (idx < tokens.length && tokens[idx].startsWith('-')) idx += 1;
      }
      continue;
    }
    if (tok === 'npx' && tokens[idx + 1] === 'cross-env') {
      idx += 2;
      continue;
    }
    break;
  }
  return { cmdIdx: idx, effectiveCwd };
}

function applyDirChangeToState(state, cmd, root, rootReal) {
  let idx = cmd.cmdIdx + 1;
  let target = null;
  while (idx < cmd.tokens.length) {
    const arg = cmd.tokens[idx];
    idx += 1;
    if (arg === '--') {
      target = cmd.tokens[idx] ?? null;
      break;
    }
    if (arg === '-') {
      target = '-';
      break;
    }
    if (arg.startsWith('-')) continue;
    target = arg;
    break;
  }
  if (cmd.name === 'popd') {
    if (state.dirStack.length > 0) {
      return { cwd: state.dirStack[state.dirStack.length - 1], prevCwd: state.cwd, dirStack: state.dirStack.slice(0, -1) };
    }
    return { cwd: null, prevCwd: state.cwd, dirStack: [] };
  }
  if (cmd.name === 'cd' && target === '-') {
    return { cwd: state.prevCwd, prevCwd: state.cwd, dirStack: [...state.dirStack] };
  }
  if (target === null) {
    return { cwd: null, prevCwd: state.cwd, dirStack: [...state.dirStack] };
  }
  const nextCwd = resolveSegmentDir(state.cwd, target, root, rootReal);
  const nextStack = cmd.name === 'pushd' ? [...state.dirStack, state.cwd] : [...state.dirStack];
  return { cwd: nextCwd, prevCwd: state.cwd, dirStack: nextStack };
}

function mergeShellStates(...lists) {
  const out = [];
  const seen = new Set();
  for (const list of lists) {
    if (!list) continue;
    for (const st of list) {
      const stackKey = st.dirStack.map(d => d ?? '<null>').join('\x01');
      const key = `${st.cwd ?? '<null>'}\0${st.prevCwd ?? '<null>'}\0${stackKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(st);
      if (out.length >= 8) return out;
    }
  }
  return out;
}

function parseShellSegmentsWithCwd(command, root = null, rootReal = null) {
  const segments = [];
  let inSingle = false;
  let inDouble = false;
  let curToken = '';
  let hasToken = false;
  let tokens = [];
  let activeStates = [{ cwd: '.', prevCwd: '.', dirStack: [] }];
  let pendingSuccessStates = [];
  let pendingFailStates = [];
  let hasPendingCompound = false;
  let inPipe = false;
  const subshellStack = [];

  const flushToken = () => {
    if (hasToken) {
      tokens.push(curToken);
      curToken = '';
      hasToken = false;
    }
  };

  const transitionAfterCommand = (op, cmdSuccess, cmdFail) => {
    if (op === '&&') {
      activeStates = mergeShellStates(pendingSuccessStates, cmdSuccess);
      pendingFailStates = mergeShellStates(pendingFailStates, cmdFail);
      pendingSuccessStates = [];
    } else if (op === '||') {
      activeStates = mergeShellStates(pendingFailStates, cmdFail);
      pendingSuccessStates = mergeShellStates(pendingSuccessStates, cmdSuccess);
      pendingFailStates = [];
    } else {
      const next = mergeShellStates(pendingSuccessStates, cmdSuccess);
      activeStates = next.length > 0 ? next : pendingFailStates;
      pendingSuccessStates = [];
      pendingFailStates = [];
    }
  };

  const flushSegment = ({ op = ';', isPipeEnd = false } = {}) => {
    flushToken();
    if (!tokens.length) {
      if (hasPendingCompound && !isPipeEnd) {
        hasPendingCompound = false;
        transitionAfterCommand(op, activeStates, activeStates);
      }
      return;
    }
    hasPendingCompound = false;
    const segTokens = tokens;
    tokens = [];
    let primaryCmdIdx = segTokens.length;
    const emittedPairs = new Set();
    for (const st of activeStates) {
      const { cmdIdx, effectiveCwd } = findCommandContext(segTokens, st.cwd, root, rootReal);
      primaryCmdIdx = cmdIdx;
      const pairKey = `${st.cwd ?? '<null>'}\0${effectiveCwd ?? '<null>'}`;
      if (emittedPairs.has(pairKey)) continue;
      emittedPairs.add(pairKey);
      segments.push({ tokens: segTokens, cmdIdx, segCwd: st.cwd, cwd: effectiveCwd });
    }
    if (isPipeEnd) return;
    if (activeStates.length === 0) {
      primaryCmdIdx = findCommandContext(segTokens, '.', root, rootReal).cmdIdx;
    }
    const cmdName = primaryCmdIdx < segTokens.length
      ? posix.basename(segTokens[primaryCmdIdx].replaceAll('\\', '/'))
      : '';
    let cmdSuccess = activeStates;
    let cmdFail = activeStates;
    if (!inPipe && (cmdName === 'cd' || cmdName === 'pushd' || cmdName === 'popd')) {
      cmdSuccess = mergeShellStates(activeStates.map(st => applyDirChangeToState(st, { name: cmdName, tokens: segTokens, cmdIdx: primaryCmdIdx }, root, rootReal)));
      cmdFail = activeStates;
    } else if (!inPipe && (cmdName === 'exit' || cmdName === 'return')) {
      cmdSuccess = [];
      cmdFail = [];
    }
    transitionAfterCommand(op, cmdSuccess, cmdFail);
  };

  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i];
    if (inSingle) {
      if (ch === "'") inSingle = false;
      else curToken += ch;
      continue;
    }
    if (inDouble) {
      if (ch === '"') {
        inDouble = false;
      } else if (ch === '\\') {
        const next = command[i + 1];
        if (next === '\r' && command[i + 2] === '\n') {
          i += 2;
        } else if (next === '\n') {
          i += 1;
        } else if (next === '"' || next === '\\' || next === '$' || next === '`') {
          curToken += next;
          i += 1;
        } else {
          curToken += ch;
        }
      } else {
        curToken += ch;
      }
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      hasToken = true;
    } else if (ch === '"') {
      inDouble = true;
      hasToken = true;
    } else if (ch === '\\' && (command[i + 1] === '\n' || command[i + 1] === '\r')) {
      if (command[i + 1] === '\r' && command[i + 2] === '\n') i += 2;
      else i += 1;
    } else if (/\s/u.test(ch)) {
      flushToken();
      if (ch === '\n' || ch === '\r') {
        flushSegment({ op: ';', isPipeEnd: false });
        inPipe = false;
      }
    } else if (ch === '&' && command[i + 1] === '&') {
      flushSegment({ op: '&&', isPipeEnd: false });
      inPipe = false;
      i += 1;
    } else if (ch === '|' && command[i + 1] === '|') {
      flushSegment({ op: '||', isPipeEnd: false });
      inPipe = false;
      i += 1;
    } else if (ch === '|') {
      flushSegment({ op: '|', isPipeEnd: true });
      inPipe = true;
    } else if (ch === ';' || ch === '&') {
      flushSegment({ op: ';', isPipeEnd: false });
      inPipe = false;
    } else if (ch === '(') {
      flushSegment({ op: ';', isPipeEnd: false });
      inPipe = false;
      subshellStack.push({ activeStates, pendingSuccessStates, pendingFailStates });
      activeStates = activeStates.map(st => ({ cwd: st.cwd, prevCwd: st.prevCwd, dirStack: [...st.dirStack] }));
      pendingSuccessStates = [];
      pendingFailStates = [];
    } else if (ch === ')') {
      flushSegment({ op: ';', isPipeEnd: false });
      inPipe = false;
      if (subshellStack.length > 0) {
        const prev = subshellStack.pop();
        activeStates = prev.activeStates;
        pendingSuccessStates = prev.pendingSuccessStates;
        pendingFailStates = prev.pendingFailStates;
        hasPendingCompound = true;
      }
    } else {
      curToken += ch;
      hasToken = true;
    }
  }
  flushSegment({ op: ';', isPipeEnd: false });
  return segments;
}

function evalPmDirFlags(tokens, startIndex, initialCwd, { scanWholeSegment = false, root = null, rootReal = null } = {}) {
  let curDir = initialCwd;
  let scoped = false;
  let j = startIndex;
  while (j < tokens.length) {
    const flag = tokens[j];
    if (flag === '--') break;
    if (!flag.startsWith('-')) {
      if (!scanWholeSegment) break;
      j += 1;
      continue;
    }
    const eq = flag.indexOf('=');
    const key = eq > 0 ? flag.slice(0, eq) : flag;
    if (NPM_SCOPE_FLAGS.has(key)) {
      scoped = true;
      j += eq > 0 ? 1 : 2;
    } else if (NPM_DIR_FLAGS.has(key)) {
      const val = eq > 0 ? flag.slice(eq + 1) : tokens[j + 1];
      curDir = resolveSegmentDir(curDir, val, root, rootReal);
      j += eq > 0 ? 1 : 2;
    } else if (eq < 0 && NPM_VALUE_FLAGS.has(key)) {
      j += 2;
    } else {
      j += 1;
    }
  }
  return { nextIndex: j, effectiveDir: curDir, isRootCwd: !scoped && curDir === '.' };
}

function parseScriptInvocations(command, allAliases, root = null, rootReal = null) {
  const invoked = [];
  for (const seg of parseShellSegmentsWithCwd(command, root, rootReal)) {
    const { tokens, cmdIdx, cwd } = seg;
    if (cmdIdx < 0 || cmdIdx >= tokens.length) continue;
    const cmd = posix.basename(tokens[cmdIdx].replaceAll('\\', '/'));
    if (cmd !== 'npm' && cmd !== 'pnpm' && cmd !== 'yarn') continue;

    if (cmd === 'npm') {
      const whole = evalPmDirFlags(tokens, cmdIdx + 1, cwd, { scanWholeSegment: true, root, rootReal });
      if (!whole.isRootCwd) continue;
      const before = evalPmDirFlags(tokens, cmdIdx + 1, cwd, { scanWholeSegment: false, root, rootReal });
      const sub = tokens[before.nextIndex];
      if (!sub) continue;
      if (sub === 'run' || sub === 'run-script') {
        const after = evalPmDirFlags(tokens, before.nextIndex + 1, cwd, { scanWholeSegment: false, root, rootReal });
        let argIdx = after.nextIndex;
        if (tokens[argIdx] === '--') argIdx += 1;
        if (tokens[argIdx] && allAliases.has(tokens[argIdx])) invoked.push(tokens[argIdx]);
      } else if (sub === 'test') {
        if (allAliases.has('test')) invoked.push('test');
      }
      continue;
    }

    const before = evalPmDirFlags(tokens, cmdIdx + 1, cwd, { scanWholeSegment: false, root, rootReal });
    const sub = tokens[before.nextIndex];
    if (!sub) continue;
    if (sub === 'run' || sub === 'run-script') {
      const after = evalPmDirFlags(tokens, before.nextIndex + 1, before.effectiveDir, { scanWholeSegment: false, root, rootReal });
      if (!before.effectiveDir || !after.isRootCwd) continue;
      let argIdx = after.nextIndex;
      if (tokens[argIdx] === '--') argIdx += 1;
      if (tokens[argIdx] && allAliases.has(tokens[argIdx])) invoked.push(tokens[argIdx]);
    } else if (sub === 'test') {
      if (before.isRootCwd && allAliases.has('test')) invoked.push('test');
    } else if (before.isRootCwd && allAliases.has(sub)) {
      invoked.push(sub);
    }
  }
  return invoked;
}

function hasBraceAlternation(pattern) {
  let depth = 0;
  const hasCommaStack = [];
  for (let i = 0; i < pattern.length; i += 1) {
    const ch = pattern[i];
    if (ch === '{') {
      depth += 1;
      hasCommaStack.push(false);
    } else if (ch === '}') {
      if (depth > 0) {
        const hasComma = hasCommaStack.pop();
        depth -= 1;
        if (hasComma) return true;
      }
    } else if (ch === ',' && depth > 0) {
      hasCommaStack[hasCommaStack.length - 1] = true;
    }
  }
  return false;
}

function hasGlobMeta(pattern) {
  return /[*?]/u.test(pattern) || /\[[^\]]+\]/u.test(pattern) || hasBraceAlternation(pattern);
}

function parseGlobCharClass(pattern, openIdx, limit = pattern.length) {
  let i = openIdx + 1;
  if (i >= limit) return null;
  let negated = false;
  if (pattern[i] === '!' || pattern[i] === '^') {
    negated = true;
    i += 1;
  }
  if (i >= limit) return null;
  const chars = new Set();
  const ranges = [];
  let first = true;
  let closed = false;
  while (i < limit) {
    const ch = pattern[i];
    if (ch === ']' && !first) {
      closed = true;
      i += 1;
      break;
    }
    first = false;
    if (i + 2 < limit && pattern[i + 1] === '-' && pattern[i + 2] !== ']') {
      const lo = pattern.codePointAt(i);
      const hi = pattern.codePointAt(i + 2);
      if (lo <= hi) ranges.push([lo, hi]);
      i += 3;
    } else {
      chars.add(ch);
      i += 1;
    }
  }
  if (!closed) return null;
  return { atom: { kind: 'class', negated, chars, ranges }, nextIdx: i };
}

function findMatchingBraceWithComma(pattern, openIdx, limit = pattern.length) {
  let depth = 0;
  let hasComma = false;
  const splits = [];
  for (let i = openIdx; i < limit; i += 1) {
    const ch = pattern[i];
    if (ch === '[') {
      const cls = parseGlobCharClass(pattern, i, limit);
      if (cls) {
        i = cls.nextIdx - 1;
        continue;
      }
    }
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return hasComma ? { closeIdx: i, splits } : null;
      }
    } else if (ch === ',' && depth === 1) {
      hasComma = true;
      splits.push(i);
    }
  }
  return null;
}

function parseSegmentGlobAtoms(pattern, start = 0, end = pattern.length) {
  const atoms = [];
  let i = start;
  while (i < end) {
    const ch = pattern[i];
    if (ch === '*') {
      atoms.push({ kind: 'star' });
      i += 1;
    } else if (ch === '?') {
      atoms.push({ kind: 'any' });
      i += 1;
    } else if (ch === '[') {
      const cls = parseGlobCharClass(pattern, i, end);
      if (cls) {
        atoms.push(cls.atom);
        i = cls.nextIdx;
      } else {
        atoms.push({ kind: 'char', value: ch });
        i += 1;
      }
    } else if (ch === '{') {
      const brace = findMatchingBraceWithComma(pattern, i, end);
      if (brace) {
        const branches = [];
        let segStart = i + 1;
        for (const commaIdx of brace.splits) {
          branches.push(parseSegmentGlobAtoms(pattern, segStart, commaIdx));
          segStart = commaIdx + 1;
        }
        branches.push(parseSegmentGlobAtoms(pattern, segStart, brace.closeIdx));
        atoms.push({ kind: 'group', branches });
        i = brace.closeIdx + 1;
      } else {
        atoms.push({ kind: 'char', value: ch });
        i += 1;
      }
    } else {
      atoms.push({ kind: 'char', value: ch });
      i += 1;
    }
  }
  return atoms;
}

function matchCharClassAtom(atom, ch) {
  let matched = atom.chars.has(ch);
  if (!matched && atom.ranges.length > 0) {
    const code = ch.codePointAt(0);
    for (const [lo, hi] of atom.ranges) {
      if (code >= lo && code <= hi) {
        matched = true;
        break;
      }
    }
  }
  return atom.negated ? !matched : matched;
}

function advanceGlobAtoms(atoms, startReach, value) {
  let reach = new Uint8Array(startReach);
  for (const atom of atoms) {
    const next = new Uint8Array(value.length + 1);
    if (atom.kind === 'star') {
      let seen = false;
      for (let pos = 0; pos <= value.length; pos += 1) {
        if (reach[pos]) seen = true;
        if (seen) next[pos] = 1;
      }
    } else if (atom.kind === 'any') {
      for (let pos = 0; pos < value.length; pos += 1) {
        if (reach[pos]) next[pos + 1] = 1;
      }
    } else if (atom.kind === 'char') {
      for (let pos = 0; pos < value.length; pos += 1) {
        if (reach[pos] && value[pos] === atom.value) next[pos + 1] = 1;
      }
    } else if (atom.kind === 'class') {
      for (let pos = 0; pos < value.length; pos += 1) {
        if (reach[pos] && matchCharClassAtom(atom, value[pos])) next[pos + 1] = 1;
      }
    } else if (atom.kind === 'group') {
      for (const branchAtoms of atom.branches) {
        const branchReach = advanceGlobAtoms(branchAtoms, reach, value);
        for (let pos = 0; pos <= value.length; pos += 1) {
          if (branchReach[pos]) next[pos] = 1;
        }
      }
    }
    reach = next;
    let anyAlive = false;
    for (let pos = 0; pos <= value.length; pos += 1) {
      if (reach[pos]) {
        anyAlive = true;
        break;
      }
    }
    if (!anyAlive) return next;
  }
  return reach;
}

function matchSegmentGlob(value, pattern) {
  const atoms = parseSegmentGlobAtoms(pattern);
  const startReach = new Uint8Array(value.length + 1);
  startReach[0] = 1;
  const finalReach = advanceGlobAtoms(atoms, startReach, value);
  return finalReach[value.length] === 1;
}

function matchPathParts(fileParts, patParts) {
  const fLen = fileParts.length;
  const pLen = patParts.length;
  const dp = Array.from({ length: pLen + 1 }, () => new Uint8Array(fLen + 1));
  dp[0][0] = 1;
  for (let pi = 1; pi <= pLen; pi += 1) {
    if (patParts[pi - 1] === '**') dp[pi][0] = dp[pi - 1][0];
  }
  for (let pi = 1; pi <= pLen; pi += 1) {
    const pSeg = patParts[pi - 1];
    for (let fi = 1; fi <= fLen; fi += 1) {
      if (pSeg === '**') {
        dp[pi][fi] = dp[pi - 1][fi] || dp[pi][fi - 1] ? 1 : 0;
      } else if (dp[pi - 1][fi - 1] && matchSegmentGlob(fileParts[fi - 1], pSeg)) {
        dp[pi][fi] = 1;
      }
    }
  }
  return dp[pLen][fLen] === 1;
}

function expandBracesWithMode(pattern, { maxExpansions = 4096, slashOnly = false } = {}) {
  let current = [pattern];
  let changed = true;
  while (changed) {
    changed = false;
    const next = [];
    for (const pat of current) {
      let i = 0;
      let expandedThis = false;
      while (i < pat.length) {
        const ch = pat[i];
        if (ch === '[') {
          const cls = parseGlobCharClass(pat, i);
          if (cls) {
            i = cls.nextIdx;
            continue;
          }
        }
        if (ch !== '{') {
          i += 1;
          continue;
        }
        const brace = findMatchingBraceWithComma(pat, i);
        if (!brace) {
          i += 1;
          continue;
        }
        const inner = pat.slice(i + 1, brace.closeIdx);
        if (!slashOnly || inner.includes('/')) {
          changed = true;
          expandedThis = true;
          const prefix = pat.slice(0, i);
          const suffix = pat.slice(brace.closeIdx + 1);
          const parts = [];
          let start = i + 1;
          for (const commaIdx of brace.splits) {
            parts.push(pat.slice(start, commaIdx));
            start = commaIdx + 1;
          }
          parts.push(pat.slice(start, brace.closeIdx));
          for (const part of parts) {
            next.push(`${prefix}${part}${suffix}`);
            if (next.length > maxExpansions) return { patterns: current, overflow: true };
          }
          break;
        }
        i = brace.closeIdx + 1;
      }
      if (!expandedThis) next.push(pat);
    }
    current = next;
  }
  return { patterns: current, overflow: false };
}

function expandGlobBraces(pattern, maxExpansions = 4096) {
  return expandBracesWithMode(pattern, { maxExpansions, slashOnly: false });
}

function expandSlashBraces(pattern, maxExpansions = 4096) {
  return expandBracesWithMode(pattern, { maxExpansions, slashOnly: true });
}

function walkRepoJsFiles(root, { includeFrontend = true, skipHiddenDirs = true, startRel = '' } = {}) {
  const found = [];
  const startAbs = startRel ? join(root, ...startRel.split('/')) : root;
  const stack = [{ abs: startAbs, rel: startRel }];
  while (stack.length) {
    const { abs, rel } = stack.pop();
    let entries;
    try {
      entries = readdirSync(abs, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') continue;
      throw error;
    }
    for (const ent of entries) {
      if (ent.isSymbolicLink()) continue;
      if (ent.isDirectory()) {
        if (CANDIDATE_SKIP_DIRS.has(ent.name)) continue;
        if (skipHiddenDirs && ent.name.startsWith('.')) continue;
        if (!rel && ent.name === 'frontend' && !includeFrontend) continue;
        const childRel = rel ? `${rel}/${ent.name}` : ent.name;
        stack.push({ abs: join(abs, ent.name), rel: childRel });
      } else if (ent.isFile() && isTrackableScriptPath(ent.name)) {
        found.push(rel ? `${rel}/${ent.name}` : ent.name);
      }
    }
  }
  return found.sort();
}

function isNodeDefaultTestFile(relPath) {
  const base = posix.basename(relPath);
  if (DECL_TS_PATTERN.test(base)) return false;
  if (NODE_22_TEST_FILE_PATTERN.test(base)) return true;
  return relPath.startsWith('test/') || relPath.includes('/test/');
}

function normalizeCliScriptTarget(root, rootReal, rawTarget, cwd = '.', { allowEsmSuffix = false } = {}) {
  if (!rawTarget) return null;
  const cleanedRaw = rawTarget.replace(/^['"]|['"]$/gu, '');
  if (!cleanedRaw || cleanedRaw.includes('\0')) return null;
  if (/^file:/iu.test(cleanedRaw)) {
    let fsPath;
    try {
      fsPath = fileURLToPath(cleanedRaw);
    } catch {
      return null;
    }
    const mapped = mapAbsolutePathToRepoRel(root, rootReal, fsPath);
    if (!mapped || !isInsideRootRelative(mapped) || DECL_TS_PATTERN.test(mapped)) return null;
    return mapped;
  }
  const suffixFree = allowEsmSuffix ? stripEsmSuffix(cleanedRaw) : cleanedRaw;
  if (!suffixFree) return null;
  const slashNorm = suffixFree.replaceAll('\\', '/');
  if (isAbsolute(suffixFree) || posix.isAbsolute(slashNorm)) {
    const mapped = mapAbsolutePathToRepoRel(root, rootReal, suffixFree);
    if (!mapped || !isInsideRootRelative(mapped) || DECL_TS_PATTERN.test(mapped)) return null;
    return mapped;
  }
  if (cwd === null || slashNorm.includes(':')) return null;
  const keepSlash = slashNorm.endsWith('/');
  const norm = posix.normalize(cwd === '.' ? slashNorm : `${cwd}/${slashNorm}`);
  const withSlash = keepSlash && !norm.endsWith('/') ? `${norm}/` : norm;
  const finalSpec = withSlash.replace(/^\.\//u, '');
  if (!finalSpec || finalSpec === '.' || finalSpec === '..' || finalSpec.startsWith('../')) return null;
  if (DECL_TS_PATTERN.test(finalSpec)) return null;
  return finalSpec;
}

function hasExplicitPathPrefix(rawTarget) {
  if (!rawTarget) return false;
  const cleaned = rawTarget.replace(/^['"]|['"]$/gu, '');
  if (/^file:/iu.test(cleaned)) return true;
  const slashNorm = cleaned.replaceAll('\\', '/');
  return slashNorm === '.' || slashNorm === '..'
    || slashNorm.startsWith('./') || slashNorm.startsWith('../')
    || isAbsolute(cleaned) || posix.isAbsolute(slashNorm);
}

function normalizePreloadTarget(root, rootReal, rawTarget, cwd = '.', { allowEsmSuffix = false } = {}) {
  if (!rawTarget) return null;
  const cleanedRaw = rawTarget.replace(/^['"]|['"]$/gu, '');
  if (!cleanedRaw || cleanedRaw.includes('\0')) return null;
  if (!hasExplicitPathPrefix(cleanedRaw)) return null;
  return normalizeCliScriptTarget(root, rootReal, cleanedRaw, cwd, { allowEsmSuffix });
}

function extractNodeRunTargetsFromCommand(root, rootReal, command, cache) {
  const testFiles = [];
  const explicitTestFiles = [];
  const nodeEntries = [];
  const nodeEntryKeys = new Set();
  const pushNodeEntry = (specifier, kind) => {
    const checkPath = kind === 'esm' ? stripEsmSuffix(specifier) : specifier;
    if (!checkPath || checkPath.includes('*') || checkPath.includes('?')) return;
    const key = `${kind}:${specifier}`;
    if (nodeEntryKeys.has(key)) return;
    nodeEntryKeys.add(key);
    nodeEntries.push({ specifier, kind });
  };
  const filesForCwd = cwd => {
    const key = cwd || '.';
    cache.byCwd ??= new Map();
    if (!cache.byCwd.has(key)) {
      cache.byCwd.set(key, walkRepoJsFiles(root, {
        includeFrontend: true,
        skipHiddenDirs: true,
        startRel: key === '.' ? '' : key,
      }));
    }
    return cache.byCwd.get(key);
  };
  const defaultFiles = () => filesForCwd('.');
  const allFiles = () => {
    cache.allFiles ??= walkRepoJsFiles(root, { includeFrontend: true, skipHiddenDirs: false });
    return cache.allFiles;
  };

  for (const seg of parseShellSegmentsWithCwd(command, root, rootReal)) {
    const { tokens, cmdIdx, cwd } = seg;
    if (cmdIdx < 0 || cmdIdx >= tokens.length) continue;
    const cmdTok = tokens[cmdIdx].replaceAll('\\', '/');
    if (cmdTok.includes('=') || !NODE_CMD_PATTERN.test(posix.basename(cmdTok))) continue;

    let hasTestFlag = false;
    let evalMode = false;
    let afterDoubleDash = false;
    const args = [];
    const pendingPreloads = [];

    for (let i = cmdIdx + 1; i < tokens.length; i += 1) {
      if (args.length > 0 && !hasTestFlag) break;
      const arg = tokens[i];
      if (!afterDoubleDash && arg === '--test') {
        hasTestFlag = true;
      } else if (!afterDoubleDash && arg === '--') {
        afterDoubleDash = true;
      } else if (!afterDoubleDash && arg.startsWith('-')) {
        const eq = arg.indexOf('=');
        const key = eq > 0 ? arg.slice(0, eq) : arg;
        if (NODE_CJS_PRELOAD_FLAGS.has(key) || NODE_ESM_PRELOAD_FLAGS.has(key)) {
          const isEsmPreload = NODE_ESM_PRELOAD_FLAGS.has(key);
          const val = eq > 0 ? arg.slice(eq + 1) : tokens[i + 1];
          const target = normalizePreloadTarget(root, rootReal, val, cwd, { allowEsmSuffix: isEsmPreload });
          if (target) {
            pendingPreloads.push({
              specifier: target,
              kind: isEsmPreload ? 'esm' : 'cjs',
            });
          }
          if (eq < 0) i += 1;
        } else if (key === '-p' || key === '--print') {
          evalMode = true;
          if (eq < 0 && i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) i += 1;
        } else if (eq < 0 && NODE_TEST_VALUE_FLAGS.has(key)) {
          if (key === '-e' || key === '--eval') evalMode = true;
          i += 1;
        } else if (/^-(?:e|p)=/u.test(arg) || key === '--eval') {
          evalMode = true;
        }
      } else {
        args.push(arg);
      }
    }

    for (const preload of pendingPreloads) pushNodeEntry(preload.specifier, preload.kind);
    if (evalMode) continue;

    if (!hasTestFlag) {
      const cliTarget = normalizeCliScriptTarget(root, rootReal, args[0], cwd);
      if (cliTarget) pushNodeEntry(cliTarget, 'cjs');
      continue;
    }

    if (args.length === 0) {
      if (cwd === null) continue;
      for (const candidate of filesForCwd(cwd)) {
        const relFromCwd = cwd === '.' ? candidate : candidate.slice(cwd.length + 1);
        if (isNodeDefaultTestFile(relFromCwd)) testFiles.push(candidate);
      }
      continue;
    }

    for (const rawArg of args) {
      const expanded = expandGlobBraces(rawArg, 4096);
      const rawPatterns = expanded.overflow ? expandSlashBraces(rawArg, 4096).patterns : expanded.patterns;
      for (const rawPattern of rawPatterns) {
        const cleaned = rawPattern.replaceAll('\\', '/');
        let pattern;
        if (isAbsolute(rawPattern) || posix.isAbsolute(cleaned)) {
          pattern = mapAbsolutePathToRepoRel(root, rootReal, rawPattern);
          if (!pattern) continue;
        } else {
          if (cwd === null) continue;
          pattern = posix.normalize(cwd === '.' ? cleaned : `${cwd}/${cleaned}`).replace(/^\.\//u, '');
        }
        if (!isInsideRootRelative(pattern)) continue;
        if (!hasGlobMeta(pattern)) {
          if (isTrackableScriptPath(pattern)) {
            testFiles.push(pattern);
            explicitTestFiles.push(pattern);
          }
        } else {
          const patParts = pattern.split('/');
          const relFromCwd = cwd && cwd !== '.' && pattern.startsWith(`${cwd}/`) ? pattern.slice(cwd.length + 1) : pattern;
          const includeHidden = relFromCwd.split('/').some(part => part !== '.' && part !== '..'
            && (part.startsWith('.') || part.startsWith('[.') || (part.includes('{') && (part.startsWith('{.') || part.includes(',.')))));
          const candidates = includeHidden
            ? allFiles()
            : (cwd && cwd !== '.' && pattern.startsWith(`${cwd}/`) ? filesForCwd(cwd) : defaultFiles());
          for (const candidate of candidates) {
            if (matchPathParts(candidate.split('/'), patParts)) testFiles.push(candidate);
          }
        }
      }
    }
  }
  return {
    testFiles: [...new Set(testFiles)],
    explicitTestFiles: [...new Set(explicitTestFiles)],
    nodeEntries,
  };
}

const NON_EXEC_SHELL_CMDS = new Set(['echo', 'printf', ':', 'true', 'false']);

function commandReferencesRemovedPath(normalizedCmd, removedPaths, root = null, rootReal = null) {
  const candidates = [];
  const pushCandidate = (raw, cwd) => {
    if (!raw || typeof raw !== 'string') return;
    const stripped = raw.replace(/^['"]|['"]$/gu, '');
    if (!stripped || stripped.includes('\0')) return;
    if (/^file:/iu.test(stripped)) {
      if (!root || !rootReal) return;
      let fsPath;
      try {
        fsPath = fileURLToPath(stripped);
      } catch {
        return;
      }
      const mapped = mapAbsolutePathToRepoRel(root, rootReal, fsPath);
      if (mapped && isInsideRootRelative(mapped)) candidates.push(mapped);
      return;
    }
    const slashNorm = stripped.replaceAll('\\', '/');
    if (isAbsolute(stripped) || posix.isAbsolute(slashNorm)) {
      if (!root || !rootReal) return;
      const mapped = mapAbsolutePathToRepoRel(root, rootReal, stripped);
      if (mapped && isInsideRootRelative(mapped)) candidates.push(mapped);
      return;
    }
    if (cwd === null || slashNorm.includes(':')) return;
    const joined = posix.normalize(cwd === '.' ? slashNorm : `${cwd}/${slashNorm}`).replace(/^\.\//u, '').replace(/\/+$/u, '');
    if (isInsideRootRelative(joined)) candidates.push(joined);
  };
  for (const seg of parseShellSegmentsWithCwd(normalizedCmd, root, rootReal)) {
    const { tokens, cmdIdx, segCwd, cwd } = seg;
    if (cmdIdx < 0 || cmdIdx >= tokens.length) continue;
    const cmdName = posix.basename(tokens[cmdIdx].replaceAll('\\', '/')).toLowerCase();
    if (NON_EXEC_SHELL_CMDS.has(cmdName)) continue;
    const isNodeCmd = NODE_CMD_PATTERN.test(cmdName);
    let afterDoubleDash = false;
    for (let j = 0; j < tokens.length; j += 1) {
      const rawTok = tokens[j];
      const tokCwd = j < cmdIdx ? segCwd : cwd;
      if (isNodeCmd && j > cmdIdx && !afterDoubleDash) {
        if (rawTok === '--') {
          afterDoubleDash = true;
          continue;
        }
        if (rawTok.startsWith('-')) {
          const eq = rawTok.indexOf('=');
          const key = eq > 0 ? rawTok.slice(0, eq) : rawTok;
          if (NODE_CJS_PRELOAD_FLAGS.has(key) || NODE_ESM_PRELOAD_FLAGS.has(key)) {
            const val = eq > 0 ? rawTok.slice(eq + 1) : tokens[j + 1];
            if (eq < 0 && j + 1 < tokens.length) j += 1;
            if (val && hasExplicitPathPrefix(val)) {
              const norm = normalizePreloadTarget(root, rootReal, val, tokCwd, { allowEsmSuffix: NODE_ESM_PRELOAD_FLAGS.has(key) });
              if (norm) candidates.push(norm);
            }
            continue;
          }
          if (key === '-p' || key === '--print') {
            if (eq < 0 && j + 1 < tokens.length && !tokens[j + 1].startsWith('-')) j += 1;
            continue;
          }
          if (key === '-e' || key === '--eval') {
            if (eq < 0 && j + 1 < tokens.length) j += 1;
            continue;
          }
          if (eq < 0 && NODE_TEST_VALUE_FLAGS.has(key)) {
            j += 1;
            continue;
          }
        }
      }
      pushCandidate(rawTok, tokCwd);
      const strippedRaw = rawTok.replace(/^['"]|['"]$/gu, '');
      const eq = strippedRaw.indexOf('=');
      if (eq > 0 && eq < strippedRaw.length - 1) {
        pushCandidate(strippedRaw.slice(eq + 1), tokCwd);
      }
    }
  }
  return candidates.some(candidate => {
    const star = candidate.search(/[*?\[{]/u);
    if (star >= 0) {
      const staticPrefix = candidate.slice(0, star).replace(/\/+$/u, '');
      if (!staticPrefix) return false;
      return removedPaths.some(asset => isPathCoveredBy(staticPrefix, asset, { caseInsensitive: true }));
    }
    return removedPaths.some(asset => isPathCoveredBy(candidate, asset, { caseInsensitive: true }));
  });
}

/**
 * Detect dangling imports or script aliases from surviving scripts / package.json to removed assets.
 * Traces surviving `scripts/*.{mjs,js,cjs,mts,cts,ts}`, `frontend/scripts/*.{mjs,js,cjs,mts,cts,ts}`,
 * `artifactTestFiles`, surviving alias test runners, and surviving alias entrypoints/preloads via
 * recursive-descent analysis.
 */
export function findRemovalLeakErrors({
  root,
  ledgers = [],
  extraRemovedPaths = [],
  artifactTestFiles = [
    'scripts/reusable-artifact-entrypoints-contract.test.mjs',
    'scripts/reusable-ui-governance-contract.test.mjs',
  ],
  allowedAliases = [],
  allowedDynamicImports = [],
}) {
  const allowedDynamicGuards = new Map();
  for (const rule of allowedDynamicImports) {
    if (!rule || typeof rule !== 'object' || typeof rule.edge !== 'string' || !rule.edge.trim()
      || typeof rule.guard !== 'string' || !rule.guard.trim()) {
      throw new Error('allowedDynamicImports entries must be { edge, guard } objects with non-empty strings');
    }
    const existing = allowedDynamicGuards.get(rule.edge) ?? [];
    existing.push(rule.guard);
    allowedDynamicGuards.set(rule.edge, existing);
  }

  const rootReal = realpathSync(root);
  const removedPaths = [...new Set([
    ...ledgers.flatMap(ledger => [...(ledger.assets ?? []), ...(ledger.gates ?? []).map(row => row.file)]),
    ...extraRemovedPaths,
  ])];
  const removedAliases = new Set(ledgers.flatMap(ledger => ledger.aliases ?? []));
  const allowedAliasSet = new Set(allowedAliases);
  const isGone = candidate => removedPaths.some(asset => isPathCoveredBy(candidate, asset, { caseInsensitive: true }));

  const brokenImports = [];
  const pushBroken = item => {
    if (!brokenImports.includes(item)) brokenImports.push(item);
  };

  const artifactTestSet = new Set(artifactTestFiles);
  const queue = [];
  const queued = new Set();
  const inspectedTargets = new Map();
  const enqueue = fileRel => {
    if (!fileRel || queued.has(fileRel) || isGone(fileRel)) return;
    const inspected = inspectStrictChild(root, rootReal, fileRel, '추적 스크립트', { requireFile: true });
    if (!inspected.exists) return;
    queued.add(fileRel);
    inspectedTargets.set(fileRel, inspected.target);
    queue.push(fileRel);
  };

  for (const scriptDir of ['scripts', 'frontend/scripts']) {
    const absDir = join(root, ...scriptDir.split('/'));
    let entries = [];
    try {
      entries = readdirSync(absDir, { withFileTypes: true }).filter(ent => ent.isFile()).map(ent => ent.name);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    for (const name of entries.sort()) {
      if (!isTrackableScriptPath(name) || /\.test\.(?:mjs|js|cjs|mts|cts|ts)$/iu.test(name)) continue;
      enqueue(`${scriptDir}/${name}`);
    }
  }
  for (const testRel of artifactTestFiles) enqueue(testRel);

  const leakedSet = new Set();
  const pkgInspect = inspectStrictChild(root, rootReal, 'package.json', 'package.json', { requireFile: true });
  const pkg = pkgInspect.exists ? readJsonOptional(pkgInspect.target) : null;
  const scriptEntries = Object.entries(pkg?.scripts ?? {});
  const allAliases = new Set([...scriptEntries.map(([alias]) => alias), ...removedAliases]);
  const invokedBy = new Map();
  const walkCache = {};

  for (const [alias, command] of scriptEntries) {
    if (removedAliases.has(alias) || allowedAliasSet.has(alias) || typeof command !== 'string') continue;
    const normalizedCmd = command.replaceAll('\\', '/');
    if (commandReferencesRemovedPath(normalizedCmd, removedPaths, root, rootReal)) {
      leakedSet.add(alias);
    }
    const calls = parseScriptInvocations(normalizedCmd, allAliases, root, rootReal);
    invokedBy.set(alias, calls);
    if (calls.some(callee => removedAliases.has(callee))) {
      leakedSet.add(alias);
    }
    const { testFiles, explicitTestFiles, nodeEntries } = extractNodeRunTargetsFromCommand(root, rootReal, command, walkCache);
    for (const testRel of explicitTestFiles) {
      if (isGone(testRel)) leakedSet.add(alias);
    }
    for (const testRel of testFiles) enqueue(testRel);
    for (const entry of nodeEntries) {
      const { target, gone, enqueueable } = resolveLocalTarget(root, rootReal, 'package.json', entry, isGone);
      if (gone) {
        leakedSet.add(alias);
      } else if (enqueueable) {
        enqueue(target);
      }
    }
  }

  for (let qi = 0; qi < queue.length; qi += 1) {
    const fileRel = queue[qi];
    const source = readTextOptional(inspectedTargets.get(fileRel));
    if (source === null) continue;
    const { staticEntries, staticRefs, dynamicCalls, dynamicOverflows, topLevelArtifactGuards } = extractLocalScriptReferences(source, { fileRel });
    const refsToCheck = staticEntries ?? staticRefs.map(specifier => ({ specifier, kind: 'esm' }));
    const isArtifactTest = artifactTestSet.has(fileRel);

    for (const refEntry of refsToCheck) {
      const { target, gone, enqueueable } = resolveLocalTarget(root, rootReal, fileRel, refEntry, isGone);
      if (gone) {
        pushBroken(isArtifactTest ? `${fileRel} (static) -> ${target}` : `${fileRel} -> ${target}`);
      } else if (enqueueable) {
        enqueue(target);
      }
    }

    for (const call of dynamicCalls) {
      const { target, gone, enqueueable } = resolveLocalTarget(
        root,
        rootReal,
        fileRel,
        {
          specifier: call.specifier,
          kind: 'esm',
          targetKind: call.targetKind ?? 'relative',
          isDir: Boolean(call.isDir),
        },
        isGone,
      );
      if (!gone) {
        if (enqueueable) enqueue(target);
        continue;
      }
      if (isArtifactTest) {
        if (!hasArtifactGuard(call, topLevelArtifactGuards)) {
          pushBroken(`${fileRel} (unguarded dynamic) -> ${target}`);
        }
      } else {
        const edge = `${fileRel} -> ${target}`;
        const allowedGuards = allowedDynamicGuards.get(edge) ?? [];
        if (!allowedGuards.some(guard => call.proven.includes(guard))) {
          pushBroken(edge);
        }
      }
    }

    for (const ov of dynamicOverflows) {
      if (isArtifactTest && ov.kind === 'esm' && hasArtifactGuard(ov, topLevelArtifactGuards)) continue;
      pushBroken(`${fileRel} (dynamic target limit exceeded at line ${ov.line})`);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const [alias, calls] of invokedBy) {
      if (leakedSet.has(alias)) continue;
      if (calls.some(callee => leakedSet.has(callee))) {
        leakedSet.add(alias);
        changed = true;
      }
    }
  }

  const leakedAliases = [...leakedSet].sort((left, right) => left.localeCompare(right));

  return {
    brokenImports,
    leakedAliases,
    errors: [
      ...brokenImports.map(item => `surviving script references removed asset: ${item}`),
      ...leakedAliases.map(alias => `surviving package.json alias references removed asset: ${alias}`),
    ],
  };
}
