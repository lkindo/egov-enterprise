// Upstream test-only leak detector checking surviving scripts and package.json aliases via TypeScript AST and fs.globSync.
import { globSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join, posix, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectStrictChild, isPathCoveredBy } from './reusable-asset-removal.mjs';

const ts = createRequire(new URL('../frontend/package.json', import.meta.url))('typescript');
const ARTIFACT_MARKERS = new Set(['reusable-base-lock.json', 'config/governance/reusable-governance-projection.json']);
const ARTIFACT_GUARDS = Object.freeze(['isArtifact', 'artifact']);
const SCRIPT_EXT_RE = /\.(?:mjs|js|cjs|mts|cts|ts)$/iu;
const DECL_TS_RE = /\.d\.(?:ts|mts|cts)$/iu;
const NODE_CMD_RE = /^node(?:\.exe)?$/iu;
const CJS_EXTS = ['.js', '.json', '.node'], CJS_INDEX = CJS_EXTS.map(e => `/index${e}`);
const TS_SRC_EXT = Object.freeze({ '.js': '.ts', '.mjs': '.mts', '.cjs': '.cts' });
const BARE_TEST_GLOBS = ['**/*.{test,spec}.{mjs,cjs,js,mts,cts,ts}', '**/*{.,_,-}test.{mjs,cjs,js,mts,cts,ts}', '**/test{,-*}.{mjs,cjs,js,mts,cts,ts}', '**/test/**/*.{mjs,cjs,js,mts,cts,ts}'];
const GLOB_EXCLUDE = ['node_modules/**', '**/node_modules/**', '.git/**', '**/.git/**', '.gradle/**', '**/build/**'];
const SKIP_DIRS = new Set(['node_modules', '.git']);
const NON_EXEC_CMDS = new Set(['echo', 'printf', ':', 'true', 'false']);
const PM_DIR_FLAGS = new Set(['-C', '--prefix', '--cwd', '--dir']);
const PM_VALUE_FLAGS = new Set(['--workspace', '-w', '--filter', '--userconfig', '--registry']);
const PRELOAD_FLAGS = new Set(['-r', '--require', '--import', '--loader', '--experimental-loader']);
const ESM_PRELOAD_FLAGS = new Set(['--import', '--loader', '--experimental-loader']);
const NODE_VALUE_FLAGS = new Set(['-C', '--conditions', '--env-file', '--env-file-if-exists', '--input-type', '--test-reporter', '--test-reporter-destination', '--test-name-pattern']);

const isRelative = v => v === '.' || v === '..' || v.startsWith('./') || v.startsWith('../');
const isInsideRoot = rel => Boolean(rel) && rel !== '.' && rel !== '..' && !rel.startsWith('../');
const stripSuffix = s => { const i = s.search(/[?#]/u); return i < 0 ? s : s.slice(0, i); };
const safeDecode = s => { try { return decodeURIComponent(s); } catch { return s; } };
const readTextOptional = f => { try { return readFileSync(f, 'utf8'); } catch (e) { if (e?.code === 'ENOENT') return null; throw e; } };
const unwrap = node => { while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node))) node = node.expression; return node; };
const strVal = node => { const n = unwrap(node); return n && ts.isStringLiteralLike(n) ? n.text : null; };
const calleeName = expr => { const n = unwrap(expr); return n && ts.isIdentifier(n) ? n.text : (n && ts.isPropertyAccessExpression(n) ? n.name.text : null); };

function guardFacts(expr, branch) {
  const n = unwrap(expr);
  if (!n) return [];
  if (ts.isIdentifier(n)) return [branch ? n.text : `! ${n.text}`];
  if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken) return guardFacts(n.operand, !branch);
  if (ts.isBinaryExpression(n) && ((n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && branch) || (n.operatorToken.kind === ts.SyntaxKind.BarBarToken && !branch))) {
    return [...guardFacts(n.left, branch), ...guardFacts(n.right, branch)];
  }
  return [];
}
const withFacts = (proven, expr, branch) => { const s = new Set(proven); for (const f of guardFacts(expr, branch)) s.add(f); return s; };

/** Extract static/dynamic ESM imports, CJS `require`/`createRequire` calls, and artifact guards via TS AST. */
export function extractLocalScriptReferences(source, { fileRel = null } = {}) {
  const kind = /\.tsx$/iu.test(fileRel ?? '') ? ts.ScriptKind.TSX : (/\.(?:ts|mts|cts)$/iu.test(fileRel ?? '') ? ts.ScriptKind.TS : (/\.jsx$/iu.test(fileRel ?? '') ? ts.ScriptKind.JSX : ts.ScriptKind.JS));
  const sf = ts.createSourceFile(fileRel || 'script.mjs', source, ts.ScriptTarget.Latest, true, kind);
  const baseDir = fileRel ? posix.dirname(posix.normalize(fileRel.replaceAll('\\', '/')).replace(/^\.\//u, '')) : 'scripts';
  const staticRefs = [], staticEntries = [], dynamicRefs = [], dynamicCalls = [];
  const topLevelConstGuards = new Set(), topLevelArtifactGuards = new Set(), customRequires = new Map();
  const rootVars = new Set(), fsNamespaces = new Set(), fsExistsFns = new Set();
  const pushStatic = (specifier, refKind, baseSpecifier = null) => {
    staticRefs.push(specifier);
    staticEntries.push(baseSpecifier ? { specifier, kind: refKind, baseSpecifier } : { specifier, kind: refKind });
  };
  const metaUrlRel = node => (ts.isNewExpression(node) && calleeName(node.expression) === 'URL' && node.arguments?.length >= 2 && unwrap(node.arguments[1])?.getText(sf) === 'import.meta.url') ? strVal(node.arguments[0]) : null;
  const extractCreateRequireBase = callNode => {
    const call = unwrap(callNode);
    if (!call || !ts.isCallExpression(call) || calleeName(call.expression) !== 'createRequire' || !call.arguments.length) return null;
    let arg = unwrap(call.arguments[0]);
    if (arg && ts.isCallExpression(arg) && calleeName(arg.expression) === 'fileURLToPath' && arg.arguments.length === 1) arg = unwrap(arg.arguments[0]);
    const txt = arg?.getText(sf);
    if (txt === 'import.meta.url' || txt === 'import.meta.filename' || txt === '__filename') return { baseSpecifier: null };
    if (txt === 'import.meta.dirname' || txt === '__dirname') return { baseSpecifier: { kind: 'relative', value: '../' } };
    const metaRel = metaUrlRel(arg);
    if (metaRel && !/^file:/iu.test(metaRel)) return { baseSpecifier: { kind: 'relative', value: metaRel } };
    const u = metaRel ?? (arg && ts.isNewExpression(arg) && calleeName(arg.expression) === 'URL' && arg.arguments?.length ? strVal(arg.arguments[0]) : strVal(arg));
    return u && /^file:/iu.test(u) ? { baseSpecifier: { kind: 'file-url', value: u } } : null;
  };
  const isApprovedLockExpr = expr => {
    const n = unwrap(expr);
    if (!n) return false;
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.BarBarToken) return isApprovedLockExpr(n.left) && isApprovedLockExpr(n.right);
    if (!ts.isCallExpression(n) || n.arguments.length !== 1) return false;
    const fn = unwrap(n.expression);
    const trustedFs = (fn && ts.isIdentifier(fn) && fsExistsFns.has(fn.text)) || (fn && ts.isPropertyAccessExpression(fn) && fn.name.text === 'existsSync' && ts.isIdentifier(fn.expression) && fsNamespaces.has(fn.expression.text));
    if (!trustedFs) return false;
    const arg = unwrap(n.arguments[0]), metaRel = metaUrlRel(arg);
    if (metaRel) return ARTIFACT_MARKERS.has(posix.normalize(posix.join(baseDir, metaRel)));
    return Boolean(arg && ts.isCallExpression(arg) && (calleeName(arg.expression) === 'join' || calleeName(arg.expression) === 'resolve') && arg.arguments.length === 2
      && ts.isIdentifier(unwrap(arg.arguments[0])) && rootVars.has(unwrap(arg.arguments[0]).text) && ARTIFACT_MARKERS.has(strVal(arg.arguments[1]) ?? ''));
  };
  const visitDynamicTarget = (argNode, proven, line) => {
    const n = unwrap(argNode);
    if (!n) return false;
    if (ts.isConditionalExpression(n)) {
      const a = visitDynamicTarget(n.whenTrue, withFacts(proven, n.condition, true), line);
      const b = visitDynamicTarget(n.whenFalse, withFacts(proven, n.condition, false), line);
      return a || b;
    }
    const metaRel = metaUrlRel(n);
    const spec = metaRel ? (!metaRel.includes(':') && !metaRel.startsWith('/') ? (isRelative(metaRel) ? metaRel : `./${metaRel}`) : null) : strVal(n);
    if (spec && isRelative(spec)) { dynamicRefs.push(spec); dynamicCalls.push({ specifier: spec, line, proven: [...proven] }); return true; }
    return false;
  };
  const visit = (node, proven) => {
    if (!node) return;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      const spec = strVal(node.moduleSpecifier);
      if (spec && isRelative(spec)) pushStatic(spec, 'esm');
      if (node.parent === sf && (spec === 'node:fs' || spec === 'fs')) {
        if (node.importClause?.name) fsNamespaces.add(node.importClause.name.text);
        const nb = node.importClause?.namedBindings;
        if (nb && ts.isNamespaceImport(nb)) fsNamespaces.add(nb.name.text);
        if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) if ((el.propertyName ?? el.name).text === 'existsSync') fsExistsFns.add(el.name.text);
      }
      return;
    }
    if (ts.isVariableDeclaration(node) && node.initializer) {
      const init = unwrap(node.initializer);
      const isTopConst = node.parent?.parent?.parent === sf && (node.parent.flags & ts.NodeFlags.Const);
      if (isTopConst) {
        const plainFs = ts.isCallExpression(init) && calleeName(init.expression) === 'require' && /^(?:node:)?fs$/u.test(strVal(init.arguments[0]) ?? '') && !/\bconst\s+require\b/u.test(sf.text.slice(0, init.pos));
        if (ts.isObjectBindingPattern(node.name) && plainFs) { for (const el of node.name.elements) if (ts.isIdentifier(el.name) && (el.propertyName ?? el.name).text === 'existsSync') fsExistsFns.add(el.name.text); }
        else if (ts.isIdentifier(node.name)) {
          const name = node.name.text;
          if (plainFs) fsNamespaces.add(name);
          else if (ts.isCallExpression(init) && (calleeName(init.expression) === 'resolve' || calleeName(init.expression) === 'join') && init.arguments.length === 2
            && strVal(init.arguments[1]) === '..' && /\b(?:import\.meta\.(?:url|dirname)|__dirname)\b/u.test(unwrap(init.arguments[0])?.getText(sf) ?? '')) rootVars.add(name);
          topLevelConstGuards.add(name);
          if (isApprovedLockExpr(init)) topLevelArtifactGuards.add(name);
        }
      }
      if (ts.isIdentifier(node.name)) { const reqBase = extractCreateRequireBase(init); if (reqBase) customRequires.set(node.name.text, reqBase); }
    }
    if (ts.isIfStatement(node) || ts.isConditionalExpression(node)) {
      const cond = node.expression ?? node.condition, alt = node.elseStatement ?? node.whenFalse;
      visit(cond, proven);
      visit(node.thenStatement ?? node.whenTrue, withFacts(proven, cond, true));
      if (alt) visit(alt, withFacts(proven, cond, false));
      return;
    }
    if (ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken || node.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
      visit(node.left, proven);
      visit(node.right, withFacts(proven, node.left, node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken));
      return;
    }
    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length >= 1) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        if (!visitDynamicTarget(node.arguments[0], proven, line)) visit(node.arguments[0], proven);
        for (const extra of node.arguments.slice(1)) visit(extra, proven);
        return;
      }
      const callee = unwrap(node.expression), spec = strVal(node.arguments[0]);
      if (spec && isRelative(spec)) {
        if (callee && ts.isIdentifier(callee) && customRequires.has(callee.text)) pushStatic(spec, 'cjs', customRequires.get(callee.text).baseSpecifier);
        else if (callee && ts.isIdentifier(callee) && callee.text === 'require') pushStatic(spec, 'cjs');
        else if (callee && ts.isCallExpression(callee)) { const ir = extractCreateRequireBase(callee); if (ir) pushStatic(spec, 'cjs', ir.baseSpecifier); }
      }
    }
    ts.forEachChild(node, child => visit(child, proven));
  };
  visit(sf, new Set());
  return { staticRefs: [...new Set(staticRefs)], staticEntries, dynamicRefs: [...new Set(dynamicRefs)], dynamicCalls, topLevelConstGuards: [...topLevelConstGuards], topLevelArtifactGuards: [...topLevelArtifactGuards] };
}

function inspectCandidate(root, rootReal, cand) {
  if (cand.split('/').some(seg => SKIP_DIRS.has(seg))) return { exists: false, isFile: false, isDirectory: false };
  return inspectStrictChild(root, rootReal, cand, '모듈 참조');
}

function resolveCjsTarget(root, rootReal, fromDir, rawSpec, isGone) {
  const forceDir = rawSpec === '.' || rawSpec === '..' || rawSpec.endsWith('/') || rawSpec.endsWith('/.') || rawSpec.endsWith('/..');
  const base = posix.normalize(posix.join(fromDir, rawSpec)).replace(/\/+$/u, '') || '.';
  if (base !== '.' && !isInsideRoot(base)) return { target: base, gone: false, enqueueable: false };
  const probe = list => {
    for (const c of list) {
      if (!isInsideRoot(c)) continue;
      if (isGone(c)) return { target: c, gone: true, enqueueable: false };
      const info = inspectCandidate(root, rootReal, c);
      if (info.exists && info.isFile) return { target: c, gone: false, enqueueable: true };
    }
    return null;
  };
  const baseInfo = base === '.' ? { exists: true, isDirectory: true } : inspectCandidate(root, rootReal, base);
  if (!forceDir && base !== '.') {
    if (baseInfo.exists && baseInfo.isFile) return { target: base, gone: isGone(base), enqueueable: !isGone(base) };
    const hit = (!baseInfo.exists && posix.extname(base) && isGone(base)) ? { target: base, gone: true, enqueueable: false } : probe(CJS_EXTS.map(e => `${base}${e}`));
    if (hit) return hit;
  }
  if (base !== '.' && isGone(base)) return { target: base, gone: true, enqueueable: false };
  const pkgRel = base === '.' ? 'package.json' : `${base}/package.json`;
  if (isGone(pkgRel)) return { target: pkgRel, gone: true, enqueueable: false };
  const pkgInfo = baseInfo.exists && baseInfo.isDirectory ? inspectCandidate(root, rootReal, pkgRel) : { exists: false };
  const pkg = pkgInfo.exists && pkgInfo.isFile ? JSON.parse(readTextOptional(pkgInfo.target) ?? 'null') : null;
  const atBase = (b, s) => (b === '.' ? s.slice(1) : `${b}${s}`);
  if (typeof pkg?.main === 'string' && pkg.main.trim()) {
    const mainBase = posix.normalize(posix.join(base, pkg.main.trim().replaceAll('\\', '/'))).replace(/\/+$/u, '') || '.';
    const mainHit = probe([...(mainBase === '.' ? [] : [mainBase, ...CJS_EXTS.map(e => `${mainBase}${e}`)]), ...CJS_INDEX.map(e => atBase(mainBase, e))]);
    if (mainHit) return mainHit;
  }
  return probe(CJS_INDEX.map(e => atBase(base, e))) ?? { target: base, gone: false, enqueueable: false };
}

function resolveLocalTarget(root, rootReal, fromFile, refEntry, isGone) {
  let dir = posix.dirname(fromFile);
  const baseSpec = refEntry?.baseSpecifier;
  if (baseSpec?.kind === 'file-url') {
    let fsPath;
    try { fsPath = fileURLToPath(baseSpec.value); } catch { return { target: refEntry.specifier, gone: false, enqueueable: false }; }
    const r = relative(rootReal, fsPath).replaceAll('\\', '/'), relRoot = r.startsWith('..') || isAbsolute(r) ? relative(root, fsPath).replaceAll('\\', '/') : r;
    if (!relRoot || relRoot.startsWith('..') || isAbsolute(relRoot)) return { target: refEntry.specifier, gone: false, enqueueable: false };
    const norm = posix.normalize(relRoot).replace(/\/+$/u, '') || '.';
    dir = stripSuffix(baseSpec.value).endsWith('/') ? norm : (norm === '.' ? '.' : posix.dirname(norm));
  } else if (baseSpec?.kind === 'relative') {
    const val = safeDecode(stripSuffix(baseSpec.value)), joined = posix.normalize(posix.join(dir, val)).replace(/\/+$/u, '') || '.';
    dir = (val === '.' || val === '..' || val.endsWith('/') || val.endsWith('/.') || val.endsWith('/..')) ? joined : (joined === '.' ? '.' : posix.dirname(joined));
  }
  if (refEntry.kind === 'cjs') return resolveCjsTarget(root, rootReal, dir, refEntry.specifier, isGone);

  const stripped = stripSuffix(refEntry.specifier), decoded = safeDecode(stripped);
  if (/%2f|%5c/iu.test(stripped) || decoded.includes('\0') || decoded.includes('\\')) return { target: refEntry.specifier, gone: false, enqueueable: false };
  const base = posix.normalize(posix.join(dir, decoded)).replace(/\/+$/u, '');
  if (!isInsideRoot(base) || isGone(base) || decoded.endsWith('/')) return { target: base, gone: isInsideRoot(base) && isGone(base), enqueueable: false };
  const inspected = inspectCandidate(root, rootReal, base);
  if (inspected.exists) return { target: base, gone: false, enqueueable: inspected.isFile };
  const mapped = /\.(?:ts|mts|cts)$/iu.test(fromFile) ? TS_SRC_EXT[posix.extname(base).toLowerCase()] : null;
  if (mapped) {
    const tsCand = `${base.slice(0, -posix.extname(base).length)}${mapped}`;
    if (isGone(tsCand)) return { target: tsCand, gone: true, enqueueable: false };
    const tsInfo = inspectCandidate(root, rootReal, tsCand);
    if (tsInfo.exists) return { target: tsCand, gone: false, enqueueable: tsInfo.isFile };
  }
  return { target: base, gone: false, enqueueable: false };
}

function splitShellSegments(command) {
  const segs = [];
  let tokens = [], cur = '', quote = null;
  const pushSeg = () => { if (cur) { tokens.push(cur); cur = ''; } if (tokens.length) { segs.push(tokens); tokens = []; } };
  for (let i = 0; i < command.length; i += 1) {
    const ch = command[i];
    if (quote) { if (ch === quote) quote = null; else cur += ch; continue; }
    if (ch === "'" || ch === '"') quote = ch;
    else if (/\s/u.test(ch)) { if (cur) { tokens.push(cur); cur = ''; } if (ch === '\n' || ch === '\r') pushSeg(); }
    else if ((ch === '&' && command[i + 1] === '&') || (ch === '|' && command[i + 1] === '|')) { pushSeg(); i += 1; }
    else if (ch === ';' || ch === '|' || ch === '&') pushSeg();
    else cur += ch;
  }
  pushSeg();
  return segs;
}

function inspectScriptCommand(command, { root, rootReal, removedPaths, allAliases, isGone, enqueue, onLeaked }) {
  const calls = [];
  for (const tokens of splitShellSegments(command)) {
    let cmdIdx = 0;
    while (cmdIdx < tokens.length && (['!', 'env', 'cross-env', 'npx'].includes(tokens[cmdIdx]) || /^[A-Za-z_][A-Za-z0-9_]*=/u.test(tokens[cmdIdx]))) cmdIdx += 1;
    if (cmdIdx >= tokens.length) continue;
    const cmd = posix.basename(tokens[cmdIdx].replaceAll('\\', '/'));
    if (NON_EXEC_CMDS.has(cmd.toLowerCase())) continue;

    const isNodeCmd = NODE_CMD_RE.test(cmd);
    for (let i = 0; i < tokens.length; i += 1) {
      const prev = tokens[i - 1], clean = tokens[i].replace(/^['"]|['"]$/gu, '');
      if (isNodeCmd && i > cmdIdx && (prev === '-e' || prev === '--eval' || prev === '-p' || prev === '--print' || (PRELOAD_FLAGS.has(prev) && !/^(?:\.\.?\/|\/)/u.test(clean)))) continue;
      for (const c of [clean, clean.includes('=') ? clean.slice(clean.indexOf('=') + 1) : ''].filter(Boolean)) {
        const slash = c.replaceAll('\\', '/');
        if (isAbsolute(c) || posix.isAbsolute(slash) || slash.includes(':')) continue;
        const norm = posix.normalize(slash).replace(/^\.\//u, '').replace(/\/+$/u, '');
        const star = norm.search(/[*?\[{]/u), probe = star >= 0 ? norm.slice(0, star).replace(/\/+$/u, '') : norm;
        if (probe && removedPaths.some(asset => isPathCoveredBy(probe, asset, { caseInsensitive: true }))) onLeaked();
      }
    }

    if (isNodeCmd) {
      let hasTest = false, evalMode = false;
      const args = [], preloads = [];
      for (let i = cmdIdx + 1; i < tokens.length; i += 1) {
        const tok = tokens[i], eq = tok.indexOf('='), key = eq > 0 ? tok.slice(0, eq) : tok;
        if (tok === '--test') hasTest = true;
        else if (tok === '--') { args.push(...tokens.slice(i + 1)); break; }
        else if (PRELOAD_FLAGS.has(key)) {
          const val = (eq > 0 ? tok.slice(eq + 1) : tokens[++i] ?? '').replace(/^['"]|['"]$/gu, '').replaceAll('\\', '/');
          if (val.startsWith('./') || val.startsWith('../')) preloads.push({ specifier: val, kind: ESM_PRELOAD_FLAGS.has(key) ? 'esm' : 'cjs' });
        } else if (key === '-e' || key === '--eval') { evalMode = true; if (eq < 0) i += 1; }
        else if (key === '-p' || key === '--print') { evalMode = true; if (eq < 0 && tokens[i + 1] && !tokens[i + 1].startsWith('-')) i += 1; }
        else if (eq < 0 && NODE_VALUE_FLAGS.has(key)) i += 1;
        else if (!tok.startsWith('-')) args.push(tok.replace(/^['"]|['"]$/gu, ''));
      }
      for (const p of preloads) { const r = resolveLocalTarget(root, rootReal, 'package.json', p, isGone); if (r.gone) onLeaked(); else if (r.enqueueable) enqueue(r.target); }
      if (!evalMode && !hasTest && args[0]) {
        const e = args[0].replaceAll('\\', '/');
        const r = resolveLocalTarget(root, rootReal, 'package.json', { specifier: isRelative(e) ? e : `./${e}`, kind: 'cjs' }, isGone);
        if (r.gone) onLeaked(); else if (r.enqueueable) enqueue(r.target);
      } else if (!evalMode && hasTest) {
        for (const pat of (args.length ? args.map(a => a.replaceAll('\\', '/').replace(/^\.\//u, '')) : BARE_TEST_GLOBS)) {
          if (!/[*?\[{]/u.test(pat)) {
            const norm = posix.normalize(pat).replace(/^\.\//u, '');
            if (isInsideRoot(norm) && SCRIPT_EXT_RE.test(norm) && !DECL_TS_RE.test(norm)) { if (isGone(norm)) onLeaked(); else enqueue(norm); }
          } else {
            for (const hit of globSync(pat, { cwd: root, exclude: GLOB_EXCLUDE })) {
              const norm = hit.replaceAll('\\', '/').replace(/^\.\//u, '');
              if (SCRIPT_EXT_RE.test(norm) && !DECL_TS_RE.test(norm)) enqueue(norm);
            }
          }
        }
      }
      continue;
    }

    if (cmd !== 'npm' && cmd !== 'pnpm' && cmd !== 'yarn') continue;
    let rootCwd = true, subIdx = cmdIdx + 1;
    while (subIdx < tokens.length && tokens[subIdx].startsWith('-')) {
      const f = tokens[subIdx], eq = f.indexOf('='), k = eq > 0 ? f.slice(0, eq) : f;
      if (PM_DIR_FLAGS.has(k)) { if ((eq > 0 ? f.slice(eq + 1) : tokens[++subIdx]) !== '.') rootCwd = false; }
      else if (eq < 0 && PM_VALUE_FLAGS.has(k)) subIdx += 1;
      subIdx += 1;
    }
    const npmScoped = cmd === 'npm' && tokens.slice(subIdx + 1).some((t, i, arr) => PM_DIR_FLAGS.has(t.split('=')[0]) && (t.includes('=') ? t.split('=')[1] : arr[i + 1]) !== '.');
    if (!rootCwd || npmScoped) continue;
    const sub = tokens[subIdx];
    if (sub === 'run' || sub === 'run-script') { const ai = tokens[subIdx + 1] === '--' ? subIdx + 2 : subIdx + 1; if (tokens[ai] && allAliases.has(tokens[ai])) calls.push(tokens[ai]); }
    else if (sub === 'test' && allAliases.has('test')) calls.push('test');
    else if (cmd !== 'npm' && allAliases.has(sub)) calls.push(sub);
  }
  return calls;
}

/** Detect dangling static/dynamic/CJS imports or package.json aliases pointing to removed assets. */
export function findRemovalLeakErrors({
  root, ledgers = [], extraRemovedPaths = [], allowedAliases = [], allowedDynamicImports = [],
  artifactTestFiles = ['scripts/reusable-artifact-entrypoints-contract.test.mjs', 'scripts/reusable-ui-governance-contract.test.mjs'],
}) {
  const allowedDynamicGuards = new Map();
  for (const r of allowedDynamicImports) {
    if (!r || typeof r !== 'object' || typeof r.edge !== 'string' || !r.edge.trim() || typeof r.guard !== 'string' || !r.guard.trim()) throw new Error('allowedDynamicImports entries must be { edge, guard } objects with non-empty strings');
    allowedDynamicGuards.set(r.edge, [...(allowedDynamicGuards.get(r.edge) ?? []), r.guard]);
  }
  const rootReal = realpathSync(root);
  const removedPaths = [...new Set([...ledgers.flatMap(l => [...(l.assets ?? []), ...(l.gates ?? []).map(r => r.file)]), ...extraRemovedPaths])];
  const removedAliases = new Set(ledgers.flatMap(l => l.aliases ?? [])), allowedAliasSet = new Set(allowedAliases);
  const isGone = cand => removedPaths.some(asset => isPathCoveredBy(cand, asset, { caseInsensitive: true }));
  const brokenImports = [], pushBroken = item => { if (!brokenImports.includes(item)) brokenImports.push(item); };
  const artifactTestSet = new Set(artifactTestFiles), queue = [], queued = new Set(), targets = new Map();
  const enqueue = fileRel => {
    if (!fileRel || queued.has(fileRel) || isGone(fileRel)) return;
    const inspected = inspectStrictChild(root, rootReal, fileRel, '추적 스크립트', { requireFile: true });
    if (inspected.exists) { queued.add(fileRel); targets.set(fileRel, inspected.target); queue.push(fileRel); }
  };

  for (const dir of ['scripts', 'frontend/scripts']) {
    let entries = [];
    try { entries = readdirSync(join(root, ...dir.split('/')), { withFileTypes: true }).filter(e => e.isFile()).map(e => e.name); }
    catch (e) { if (e?.code !== 'ENOENT') throw e; }
    for (const name of entries.sort()) if (SCRIPT_EXT_RE.test(name) && !DECL_TS_RE.test(name) && !/\.test\./iu.test(name)) enqueue(`${dir}/${name}`);
  }
  for (const testRel of artifactTestFiles) enqueue(testRel);

  const leakedSet = new Set(), pkgInspect = inspectStrictChild(root, rootReal, 'package.json', 'package.json', { requireFile: true });
  const pkgRaw = pkgInspect.exists ? readTextOptional(pkgInspect.target) : null, pkg = pkgRaw !== null ? JSON.parse(pkgRaw) : null;
  const scriptEntries = Object.entries(pkg?.scripts ?? {}), allAliases = new Set([...scriptEntries.map(([a]) => a), ...removedAliases]), invokedBy = new Map();
  for (const [alias, command] of scriptEntries) {
    if (removedAliases.has(alias) || allowedAliasSet.has(alias) || typeof command !== 'string') continue;
    const calls = inspectScriptCommand(command, { root, rootReal, removedPaths, allAliases, isGone, enqueue, onLeaked: () => leakedSet.add(alias) });
    invokedBy.set(alias, calls);
    if (calls.some(callee => removedAliases.has(callee))) leakedSet.add(alias);
  }

  for (let qi = 0; qi < queue.length; qi += 1) {
    const fileRel = queue[qi], source = readTextOptional(targets.get(fileRel));
    if (source === null) continue;
    const { staticEntries, dynamicCalls, topLevelArtifactGuards } = extractLocalScriptReferences(source, { fileRel });
    const isArtifactTest = artifactTestSet.has(fileRel), guardSet = new Set(topLevelArtifactGuards);
    for (const ref of staticEntries) {
      const { target, gone, enqueueable } = resolveLocalTarget(root, rootReal, fileRel, ref, isGone);
      if (gone) pushBroken(isArtifactTest ? `${fileRel} (static) -> ${target}` : `${fileRel} -> ${target}`);
      else if (enqueueable) enqueue(target);
    }
    for (const call of dynamicCalls) {
      const { target, gone, enqueueable } = resolveLocalTarget(root, rootReal, fileRel, { specifier: call.specifier, kind: 'esm' }, isGone);
      if (!gone) { if (enqueueable) enqueue(target); continue; }
      if (isArtifactTest) {
        if (!ARTIFACT_GUARDS.some(g => guardSet.has(g) && call.proven.includes(`! ${g}`))) pushBroken(`${fileRel} (unguarded dynamic) -> ${target}`);
      } else if (!(allowedDynamicGuards.get(`${fileRel} -> ${target}`) ?? []).some(g => call.proven.includes(g))) pushBroken(`${fileRel} -> ${target}`);
    }
  }
  for (let changed = true; changed;) {
    changed = false;
    for (const [alias, calls] of invokedBy) if (!leakedSet.has(alias) && calls.some(c => leakedSet.has(c))) { leakedSet.add(alias); changed = true; }
  }
  const leakedAliases = [...leakedSet].sort((a, b) => a.localeCompare(b));
  return { brokenImports, leakedAliases, errors: [...brokenImports.map(i => `surviving script references removed asset: ${i}`), ...leakedAliases.map(a => `surviving package.json alias references removed asset: ${a}`)] };
}
