#!/usr/bin/env node
/**
 * Frontend source reachability census.
 *
 * This is deliberately a deletion preflight, not a delete list. It uses only
 * Node built-ins so the root operational-contract job can run before frontend
 * dependencies are installed. Unknown import syntax and unresolved local
 * dependencies are errors; callers may inspect the partial census with
 * `failOnErrors: false`, but the CLI always fails closed.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_REPO_ROOT = resolve(dirname(SCRIPT_PATH), '..');

const MODULE_EXTENSIONS = Object.freeze([
  '.d.ts',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',
]);
const RESOLVABLE_EXTENSIONS = Object.freeze([
  ...MODULE_EXTENSIONS,
  '.json',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.woff',
  '.woff2',
]);
const NEXT_APP_ENTRY_NAMES = new Set([
  'page',
  'layout',
  'template',
  'loading',
  'error',
  'global-error',
  'not-found',
  'default',
  'route',
  'sitemap',
  'robots',
  'manifest',
  'icon',
  'apple-icon',
  'opengraph-image',
  'twitter-image',
]);
const ROOT_RUNTIME_ENTRY_NAMES = new Set([
  'proxy',
  'middleware',
  'instrumentation',
  'instrumentation-client',
]);
const IGNORED_FRONTEND_DIRECTORIES = new Set([
  'node_modules',
  '.next',
  'coverage',
  '.turbo',
  'dist',
  'build',
  'playwright-report',
  'test-results',
]);
const DELETION_CLASSES = new Set([
  'safe-candidate',
  'runtime-reachable',
  'test-only',
  'ambiguous',
]);

export const CURRENT_REPOSITORY_ASSERTIONS = Object.freeze({
  runtimeChains: [
    [
      'frontend/src/app/note/page.tsx',
      'frontend/src/app/components/ui/user-picker.tsx',
      'frontend/src/app/components/ui/virtual-scroll-list.tsx',
    ],
  ],
  runtimeReachable: [
    'frontend/src/app/admin/user/UserOrgHubClient.tsx',
  ],
  // [2026-08-23 m-2] test-only 였던 admin/user/manage/UserManageClient.tsx 는 전용 테스트와 함께
  // 삭제됐다(장식 카드·死버튼 정리 — 실제 라우트는 UserOrgHubClient 를 렌더한다).
  notRuntimeReachable: [],
  deletionClasses: {},
});

function normalizePath(path) {
  return path.split(sep).join('/');
}

function repoRelative(repoRoot, path) {
  return normalizePath(relative(repoRoot, path));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, 'en'));
}

function isInside(root, target) {
  const rel = relative(root, target);
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`));
}

function walkFiles(root, predicate = () => true, options = {}) {
  const output = [];
  if (!existsSync(root)) return output;
  const ignoredDirectories = options.ignoredDirectories ?? new Set();

  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) visit(path);
      } else if (entry.isFile() && predicate(path)) {
        output.push(resolve(path));
      }
    }
  }

  visit(root);
  return output.sort((left, right) => normalizePath(left).localeCompare(normalizePath(right), 'en'));
}

function isModuleFile(path) {
  return MODULE_EXTENSIONS.includes(extname(path).toLowerCase());
}

function isTestFile(path) {
  const normalized = normalizePath(path);
  return normalized.split('/').includes('__tests__')
    || /(?:^|\/)[^/]+\.(?:test|spec)\.(?:[cm]?[jt]sx?)$/.test(normalized);
}

function isStoryFile(path) {
  return /(?:^|\/)[^/]+\.(?:stories|story)\.(?:[cm]?[jt]sx?)$/.test(normalizePath(path));
}

function isTestHarnessEntry(path, frontendRoot) {
  if (isTestFile(path)) return true;
  const rel = normalizePath(relative(frontendRoot, path));
  return rel.startsWith('e2e/')
    || /^(?:vitest|playwright)(?:\.config|\.setup)?\.(?:[cm]?[jt]s)$/.test(basename(path));
}

function isNextRuntimeEntry(path, sourceRoot) {
  const relativeSource = normalizePath(relative(sourceRoot, path));
  const extension = extname(path);
  const stem = basename(path, extension);
  if (relativeSource.startsWith('app/') && NEXT_APP_ENTRY_NAMES.has(stem)) return true;
  return !relativeSource.includes('/') && ROOT_RUNTIME_ENTRY_NAMES.has(stem);
}

function isConfigEntry(path, frontendRoot) {
  const rel = normalizePath(relative(frontendRoot, path));
  if (rel.includes('/')) return false;
  return /(?:^|\.)(?:config)\.(?:[cm]?[jt]s)$/.test(basename(path))
    || /^(?:next|eslint|postcss|tailwind|vitest|playwright)\..*\.(?:[cm]?[jt]s)$/.test(basename(path))
    || /^(?:next|eslint|postcss|tailwind|vitest|playwright)\.config\.(?:[cm]?[jt]s)$/.test(basename(path));
}

function lineAt(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (source[index] === '\n') line += 1;
  return line;
}

function readQuoted(source, start, quote) {
  let value = '';
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === '\\') {
      if (index + 1 >= source.length) {
        return { end: source.length, value, closed: false };
      }
      const escaped = source[index + 1];
      const simple = {
        n: '\n',
        r: '\r',
        t: '\t',
        b: '\b',
        f: '\f',
        v: '\v',
        '0': '\0',
      };
      value += simple[escaped] ?? escaped;
      index += 1;
    } else if (char === quote) {
      return { end: index + 1, value, closed: true };
    } else {
      value += char;
    }
  }
  return { end: source.length, value, closed: false };
}

function skipLineComment(source, start) {
  const end = source.indexOf('\n', start + 2);
  return end < 0 ? source.length : end;
}

function skipBlockComment(source, start) {
  const close = source.indexOf('*/', start + 2);
  return close < 0 ? -1 : close + 2;
}

function readTemplate(source, start) {
  let expressionDepth = 0;
  let interpolated = false;
  let containsDependencyKeyword = false;
  let previousExpressionToken;

  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '\\') {
      index += 1;
      continue;
    }
    if (expressionDepth === 0) {
      if (char === '`') {
        return {
          end: index + 1,
          value: source.slice(start + 1, index),
          closed: true,
          interpolated,
          containsDependencyKeyword,
        };
      }
      if (char === '$' && next === '{') {
        interpolated = true;
        expressionDepth = 1;
        previousExpressionToken = undefined;
        index += 1;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      const quoted = readQuoted(source, index, char);
      index = quoted.end - 1;
      continue;
    }
    if (char === '`') {
      const nested = readTemplate(source, index);
      containsDependencyKeyword ||= nested.containsDependencyKeyword;
      index = nested.end - 1;
      continue;
    }
    if (char === '/' && next === '/') {
      index = skipLineComment(source, index) - 1;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = skipBlockComment(source, index);
      if (end < 0) return { end: source.length, value: '', closed: false, interpolated: true };
      index = end - 1;
      continue;
    }
    if (char === '/' && canStartRegexAfterValue(previousExpressionToken)) {
      const regex = readRegexLiteral(source, index);
      if (regex) {
        index = regex.end - 1;
        previousExpressionToken = 'literal';
        continue;
      }
    }
    if (/[A-Za-z_$]/.test(char)) {
      let end = index + 1;
      while (end < source.length && /[A-Za-z0-9_$]/.test(source[end])) end += 1;
      const word = source.slice(index, end);
      if (word === 'import' || word === 'require') containsDependencyKeyword = true;
      previousExpressionToken = word;
      index = end - 1;
      continue;
    }
    if (char === '{') expressionDepth += 1;
    else if (char === '}') expressionDepth -= 1;
    if (!/\s/.test(char)) previousExpressionToken = char;
  }

  return { end: source.length, value: '', closed: false, interpolated };
}

function canStartRegexAfterValue(previous) {
  return previous === undefined
    || ['(', '[', '{', ',', ';', ':', '=', '!', '?', '&', '|', '+', '-', '*', '%', '^', '~', '=>'].includes(previous)
    || ['return', 'throw', 'case', 'delete', 'void', 'typeof', 'instanceof', 'in', 'of', 'yield', 'await'].includes(previous);
}

function readRegexLiteral(source, start) {
  let inCharacterClass = false;
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === '\n' || char === '\r') return undefined;
    if (char === '\\') {
      index += 1;
      continue;
    }
    if (char === '[') inCharacterClass = true;
    else if (char === ']') inCharacterClass = false;
    else if (char === '/' && !inCharacterClass) {
      let end = index + 1;
      while (end < source.length && /[A-Za-z]/.test(source[end])) end += 1;
      return { end };
    }
  }
  return undefined;
}

/**
 * A dependency-oriented lexer. It intentionally tokenizes only identifiers,
 * string/template literals, and punctuation needed by import syntax. JSX and
 * regular-expression tokens remain harmless punctuation/identifiers; an import
 * declaration is accepted only when it satisfies the module grammar below.
 */
function tokenizeDependencies(source, file) {
  const tokens = [];
  const issues = [];
  let line = 1;

  for (let index = 0; index < source.length;) {
    const char = source[index];
    const next = source[index + 1];
    if (/\s/.test(char)) {
      if (char === '\n') line += 1;
      index += 1;
      continue;
    }
    if (char === '/' && next === '/') {
      index = skipLineComment(source, index);
      continue;
    }
    if (char === '/' && next === '*') {
      const end = skipBlockComment(source, index);
      if (end < 0) {
        issues.push({ code: 'UNTERMINATED_BLOCK_COMMENT', file, line });
        break;
      }
      line += source.slice(index, end).split('\n').length - 1;
      index = end;
      continue;
    }
    if (char === "'" || char === '"') {
      const quoted = readQuoted(source, index, char);
      tokens.push({ type: 'string', value: quoted.value, line, start: index, end: quoted.end });
      if (!quoted.closed) issues.push({ code: 'UNTERMINATED_STRING', file, line });
      line += source.slice(index, quoted.end).split('\n').length - 1;
      index = quoted.end;
      continue;
    }
    if (char === '`') {
      const template = readTemplate(source, index);
      tokens.push({
        type: 'template',
        value: template.value,
        interpolated: template.interpolated,
        line,
        start: index,
        end: template.end,
      });
      if (!template.closed) issues.push({ code: 'UNTERMINATED_TEMPLATE', file, line });
      if (template.containsDependencyKeyword) {
        issues.push({
          code: 'DEPENDENCY_EXPRESSION_IN_TEMPLATE_INTERPOLATION',
          file,
          line,
          detail: 'import/require inside a template interpolation is not silently ignored',
        });
      }
      line += source.slice(index, template.end).split('\n').length - 1;
      index = template.end;
      continue;
    }
    if (char === '/' && canStartRegexAfterValue(tokens.at(-1)?.value)) {
      const regex = readRegexLiteral(source, index);
      if (regex) {
        tokens.push({ type: 'regex', value: '<regex>', line, start: index, end: regex.end });
        index = regex.end;
        continue;
      }
    }
    if (/[A-Za-z_$]/.test(char)) {
      let end = index + 1;
      while (end < source.length && /[A-Za-z0-9_$-]/.test(source[end])) end += 1;
      tokens.push({ type: 'identifier', value: source.slice(index, end), line, start: index, end });
      index = end;
      continue;
    }
    if (source.startsWith('...', index)) {
      tokens.push({ type: 'punctuation', value: '...', line, start: index, end: index + 3 });
      index += 3;
      continue;
    }
    if (source.startsWith('=>', index)) {
      tokens.push({ type: 'punctuation', value: '=>', line, start: index, end: index + 2 });
      index += 2;
      continue;
    }
    tokens.push({ type: 'punctuation', value: char, line, start: index, end: index + 1 });
    index += 1;
  }

  return { tokens, issues };
}

function literalSpecifier(token) {
  if (token?.type === 'string') return { value: token.value };
  if (token?.type === 'template' && !token.interpolated) return { value: token.value };
  return undefined;
}

function findBalanced(tokens, start, open, close) {
  let depth = 0;
  for (let index = start; index < tokens.length; index += 1) {
    if (tokens[index].value === open) depth += 1;
    else if (tokens[index].value === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function namedImportClauseIsTypeOnly(tokens, open, close) {
  const clauses = [];
  let clause = [];
  for (let index = open + 1; index < close; index += 1) {
    if (tokens[index].value === ',') {
      if (clause.length > 0) clauses.push(clause);
      clause = [];
    } else {
      clause.push(tokens[index]);
    }
  }
  if (clause.length > 0) clauses.push(clause);
  return clauses.length > 0 && clauses.every((tokensInClause) => (
    tokensInClause[0]?.value === 'type' && tokensInClause.length > 1
  ));
}

function isTypeImportExpression(tokens, importIndex) {
  let previous = importIndex - 1;
  if ([':', 'as', 'satisfies'].includes(tokens[previous]?.value)) return true;
  if (tokens[previous]?.value === 'typeof') previous -= 1;

  let angleDepth = 0;
  for (let index = previous; index >= 0; index -= 1) {
    const value = tokens[index].value;
    if (value === '>') angleDepth += 1;
    else if (value === '<') {
      if (angleDepth === 0) return true;
      angleDepth -= 1;
    }
    if ([';', '{', '}'].includes(value)) break;
    if (value === '=' && tokens[index - 2]?.value === 'type') return true;
  }
  return false;
}

function dependencyIssue(code, file, token, detail) {
  return { code, file, line: token?.line ?? 1, detail };
}

function parseStaticImport(tokens, start, file) {
  let index = start + 1;
  let typeOnly = false;
  const first = tokens[index];
  const bare = literalSpecifier(first);
  if (bare) {
    return {
      nextIndex: index,
      reference: { kind: 'static-import', specifier: bare.value, typeOnly: false, line: tokens[start].line },
    };
  }
  if (first?.value === 'type') {
    typeOnly = true;
    index += 1;
  }

  const binding = tokens[index];
  if (!binding || !(
    binding.type === 'identifier'
    || binding.value === '{'
    || binding.value === '*'
  )) return undefined;

  if (binding.type === 'identifier') {
    index += 1;
    if (tokens[index]?.value === '=' && tokens[index + 1]?.value === 'require') {
      return undefined;
    }
    if (tokens[index]?.value === ',') index += 1;
    else if (tokens[index]?.value !== 'from') {
      return {
        nextIndex: index,
        issue: dependencyIssue('UNPARSEABLE_STATIC_IMPORT', file, tokens[start], 'expected from after default binding'),
      };
    }
  }

  if (tokens[index]?.value === '{') {
    const close = findBalanced(tokens, index, '{', '}');
    if (close < 0) {
      return {
        nextIndex: index,
        issue: dependencyIssue('UNPARSEABLE_STATIC_IMPORT', file, tokens[start], 'unclosed named import clause'),
      };
    }
    if (!typeOnly && binding.value === '{') typeOnly = namedImportClauseIsTypeOnly(tokens, index, close);
    index = close + 1;
  } else if (tokens[index]?.value === '*') {
    if (tokens[index + 1]?.value !== 'as' || tokens[index + 2]?.type !== 'identifier') {
      return {
        nextIndex: index,
        issue: dependencyIssue('UNPARSEABLE_STATIC_IMPORT', file, tokens[start], 'invalid namespace import clause'),
      };
    }
    index += 3;
  }

  if (tokens[index]?.value !== 'from') {
    return {
      nextIndex: index,
      issue: dependencyIssue('UNPARSEABLE_STATIC_IMPORT', file, tokens[start], 'missing from clause'),
    };
  }
  const specifier = literalSpecifier(tokens[index + 1]);
  if (!specifier) {
    return {
      nextIndex: index + 1,
      issue: dependencyIssue('UNPARSEABLE_STATIC_IMPORT', file, tokens[start], 'module specifier is not a literal'),
    };
  }
  return {
    nextIndex: index + 1,
    reference: { kind: 'static-import', specifier: specifier.value, typeOnly, line: tokens[start].line },
  };
}

function parseReExport(tokens, start, file) {
  let index = start + 1;
  let typeOnly = false;
  if (tokens[index]?.value === 'type') {
    typeOnly = true;
    index += 1;
  }
  if (tokens[index]?.value === '{') {
    const close = findBalanced(tokens, index, '{', '}');
    if (close < 0) {
      return {
        nextIndex: index,
        issue: dependencyIssue('UNPARSEABLE_RE_EXPORT', file, tokens[start], 'unclosed export clause'),
      };
    }
    index = close + 1;
    if (tokens[index]?.value !== 'from') return { nextIndex: close };
  } else if (tokens[index]?.value === '*') {
    index += 1;
    if (tokens[index]?.value === 'as') {
      if (tokens[index + 1]?.type !== 'identifier') {
        return {
          nextIndex: index,
          issue: dependencyIssue('UNPARSEABLE_RE_EXPORT', file, tokens[start], 'invalid namespace export'),
        };
      }
      index += 2;
    }
    if (tokens[index]?.value !== 'from') {
      return {
        nextIndex: index,
        issue: dependencyIssue('UNPARSEABLE_RE_EXPORT', file, tokens[start], 'missing from clause'),
      };
    }
  } else {
    return undefined;
  }

  const specifier = literalSpecifier(tokens[index + 1]);
  if (!specifier) {
    return {
      nextIndex: index + 1,
      issue: dependencyIssue('UNPARSEABLE_RE_EXPORT', file, tokens[start], 'module specifier is not a literal'),
    };
  }
  return {
    nextIndex: index + 1,
    reference: { kind: 're-export', specifier: specifier.value, typeOnly, line: tokens[start].line },
  };
}

/** Parse static imports, re-exports, literal dynamic imports, and require calls. */
export function parseModuleReferences(source, file = '<memory>') {
  const { tokens, issues } = tokenizeDependencies(source, file);
  const references = [];
  const createRequireAliases = new Set();

  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].value !== 'createRequire' || tokens[index + 1]?.value !== '(') continue;
    if (tokens[index - 1]?.value === '=' && tokens[index - 2]?.type === 'identifier') {
      createRequireAliases.add(tokens[index - 2].value);
    } else {
      issues.push(dependencyIssue(
        'UNSUPPORTED_CREATE_REQUIRE_ALIAS',
        file,
        tokens[index],
        'createRequire must be assigned to one local identifier for dependency tracking',
      ));
    }
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== 'identifier') continue;

    if (token.value === 'import') {
      if (tokens[index + 1]?.value === '.') {
        if (tokens[index + 2]?.value === 'meta' && tokens[index + 3]?.value === '.'
          && /^glob(?:Eager)?$/.test(tokens[index + 4]?.value ?? '')) {
          issues.push(dependencyIssue(
            'UNSUPPORTED_IMPORT_META_GLOB',
            file,
            token,
            'import.meta.glob creates implicit dependencies and needs an explicit parser rule',
          ));
        }
        continue;
      }
      if (tokens[index + 1]?.value === '(') {
        const argument = literalSpecifier(tokens[index + 2]);
        if (!argument || tokens[index + 3]?.value !== ')') {
          const code = argument && tokens[index + 3]?.value === ','
            ? 'UNSUPPORTED_DYNAMIC_IMPORT_OPTIONS'
            : 'UNPARSEABLE_DYNAMIC_IMPORT';
          issues.push(dependencyIssue(
            code,
            file,
            token,
            code === 'UNSUPPORTED_DYNAMIC_IMPORT_OPTIONS'
              ? 'dynamic import options require an explicit balanced parser rule'
              : 'dynamic import first argument must be one literal module specifier',
          ));
        } else {
          const typeOnly = isTypeImportExpression(tokens, index);
          references.push({
            kind: typeOnly ? 'import-type' : 'dynamic-import',
            specifier: argument.value,
            typeOnly,
            line: token.line,
          });
        }
        continue;
      }
      const parsed = parseStaticImport(tokens, index, file);
      if (parsed?.reference) references.push(parsed.reference);
      if (parsed?.issue) issues.push(parsed.issue);
      if (parsed) index = Math.max(index, parsed.nextIndex);
      continue;
    }

    if (token.value === 'export') {
      const parsed = parseReExport(tokens, index, file);
      if (parsed?.reference) references.push(parsed.reference);
      if (parsed?.issue) issues.push(parsed.issue);
      if (parsed) index = Math.max(index, parsed.nextIndex);
      continue;
    }

    if (token.value === 'require') {
      if (tokens[index + 1]?.value === '.' && tokens[index + 2]?.value === 'context') {
        issues.push(dependencyIssue(
          'UNSUPPORTED_REQUIRE_CONTEXT',
          file,
          token,
          'require.context creates implicit dependencies and needs an explicit parser rule',
        ));
        continue;
      }
      if (tokens[index + 1]?.value === '.' && tokens[index + 2]?.value === 'resolve') {
        const argument = literalSpecifier(tokens[index + 4]);
        if (tokens[index + 3]?.value !== '(' || !argument || tokens[index + 5]?.value !== ')') {
          issues.push(dependencyIssue(
            'UNPARSEABLE_REQUIRE_RESOLVE',
            file,
            token,
            'require.resolve argument must be one literal module specifier',
          ));
        } else {
          references.push({ kind: 'require-resolve', specifier: argument.value, typeOnly: false, line: token.line });
        }
        continue;
      }
      if (tokens[index + 1]?.value !== '(') continue;
      const argument = literalSpecifier(tokens[index + 2]);
      if (!argument || tokens[index + 3]?.value !== ')') {
        issues.push(dependencyIssue(
          'UNPARSEABLE_REQUIRE',
          file,
          token,
          'require argument must be one literal module specifier',
        ));
      } else {
        references.push({ kind: 'require', specifier: argument.value, typeOnly: false, line: token.line });
      }
    }

    if (createRequireAliases.has(token.value) && tokens[index + 1]?.value === '(') {
      const argument = literalSpecifier(tokens[index + 2]);
      if (!argument || tokens[index + 3]?.value !== ')') {
        issues.push(dependencyIssue(
          'UNPARSEABLE_CREATE_REQUIRE_CALL',
          file,
          token,
          'createRequire alias argument must be one literal module specifier',
        ));
      } else {
        references.push({ kind: 'create-require', specifier: argument.value, typeOnly: false, line: token.line });
      }
    }
  }

  const deduplicated = new Map();
  for (const reference of references) {
    const key = `${reference.kind}\0${reference.typeOnly}\0${reference.specifier}\0${reference.line}`;
    deduplicated.set(key, reference);
  }
  return { references: [...deduplicated.values()], issues };
}

function parseConfigStringReferences(source, file, moduleReferences) {
  const { tokens } = tokenizeDependencies(source, file);
  const moduleSpecifiers = new Set(moduleReferences.map(({ specifier }) => specifier));
  const references = [];
  const requiredFileProperties = new Set(['setupFiles', 'globalSetup', 'globalTeardown']);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!['string', 'template'].includes(token.type) || token.interpolated) continue;
    if (!token.value.startsWith('./') && !token.value.startsWith('../') && !token.value.startsWith('@/')) continue;
    if (moduleSpecifiers.has(token.value)) continue;
    let property;
    for (let cursor = index - 1; cursor >= 0 && index - cursor <= 12; cursor -= 1) {
      if (tokens[cursor].value === ':' && tokens[cursor - 1]?.type === 'identifier') {
        property = tokens[cursor - 1].value;
        break;
      }
      if (['{', '}', ';'].includes(tokens[cursor].value)) break;
    }
    references.push({
      kind: 'config-string',
      specifier: token.value,
      typeOnly: false,
      line: token.line,
      optionalConfigReference: !requiredFileProperties.has(property),
    });
  }
  return references;
}

function buildCaseMap(paths) {
  const map = new Map();
  for (const path of paths) {
    const key = normalizePath(resolve(path)).toLowerCase();
    const values = map.get(key) ?? [];
    values.push(resolve(path));
    map.set(key, values);
  }
  return map;
}

function withoutQueryOrFragment(specifier) {
  const marker = specifier.search(/[?#]/);
  return marker < 0 ? specifier : specifier.slice(0, marker);
}

function candidatePaths(base) {
  const output = [base];
  if (extname(base)) {
    const extension = extname(base);
    if (['.js', '.jsx', '.mjs', '.cjs'].includes(extension)) {
      const withoutExtension = base.slice(0, -extension.length);
      output.push(...MODULE_EXTENSIONS.map((candidate) => `${withoutExtension}${candidate}`));
    }
  } else {
    output.push(...RESOLVABLE_EXTENSIONS.map((extension) => `${base}${extension}`));
    output.push(...RESOLVABLE_EXTENSIONS.map((extension) => join(base, `index${extension}`)));
  }
  return uniqueSorted(output.map((path) => resolve(path)));
}

function resolveLocalReference({
  importer,
  specifier,
  sourceRoot,
  knownFiles,
  caseMap,
  repoRoot,
  line,
}) {
  const cleanSpecifier = withoutQueryOrFragment(specifier);
  let base;
  if (cleanSpecifier.startsWith('@/')) base = join(sourceRoot, cleanSpecifier.slice(2));
  else if (cleanSpecifier.startsWith('./') || cleanSpecifier.startsWith('../')) {
    base = resolve(dirname(importer), cleanSpecifier);
  } else {
    return { external: true };
  }

  if (cleanSpecifier !== specifier) {
    return {
      external: false,
      issue: {
        code: 'UNSUPPORTED_LOCAL_IMPORT_SUFFIX',
        file: repoRelative(repoRoot, importer),
        line,
        detail: specifier,
      },
    };
  }

  const matches = [];
  const caseMismatches = [];
  for (const candidate of candidatePaths(base)) {
    if (knownFiles.has(candidate) || (existsSync(candidate) && statSync(candidate).isFile())) {
      matches.push(candidate);
      continue;
    }
    const caseMatches = caseMap.get(normalizePath(candidate).toLowerCase()) ?? [];
    for (const match of caseMatches) caseMismatches.push(match);
  }

  const uniqueMatches = uniqueSorted(matches);
  if (uniqueMatches.length === 1) return { target: uniqueMatches[0], external: false };
  const file = repoRelative(repoRoot, importer);
  if (uniqueMatches.length > 1) {
    return {
      external: false,
      issue: {
        code: 'AMBIGUOUS_IMPORT_TARGET',
        file,
        line,
        detail: `${specifier} -> ${uniqueMatches.map((path) => repoRelative(repoRoot, path)).join(', ')}`,
      },
    };
  }
  if (caseMismatches.length > 0) {
    return {
      external: false,
      issue: {
        code: 'IMPORT_TARGET_CASE_MISMATCH',
        file,
        line,
        detail: `${specifier} -> ${uniqueSorted(caseMismatches).map((path) => repoRelative(repoRoot, path)).join(', ')}`,
      },
    };
  }
  return {
    external: false,
    issue: {
      code: 'MISSING_IMPORT_TARGET',
      file,
      line,
      detail: specifier,
    },
  };
}

function issueKey(issue) {
  return `${issue.code}\0${issue.file}\0${issue.line ?? ''}\0${issue.detail ?? ''}`;
}

function formatIssues(issues) {
  return issues
    .map((issue) => `[${issue.code}] ${issue.file}${issue.line ? `:${issue.line}` : ''}${issue.detail ? ` — ${issue.detail}` : ''}`)
    .join('\n');
}

function bfs(roots, adjacency, includeTypeOnly = true) {
  const parent = new Map();
  const queue = [];
  for (const root of uniqueSorted(roots)) {
    if (parent.has(root)) continue;
    parent.set(root, { root: true });
    queue.push(root);
  }

  for (let index = 0; index < queue.length; index += 1) {
    const from = queue[index];
    for (const edge of adjacency.get(from) ?? []) {
      if (!includeTypeOnly && edge.typeOnly) continue;
      if (parent.has(edge.to)) continue;
      parent.set(edge.to, { from, edge });
      queue.push(edge.to);
    }
  }
  return parent;
}

function evidencePath(parent, target, repoRoot) {
  if (!parent.has(target)) return undefined;
  const nodes = [];
  const edges = [];
  let cursor = target;
  while (cursor) {
    nodes.push(repoRelative(repoRoot, cursor));
    const record = parent.get(cursor);
    if (!record || record.root) break;
    edges.push({
      from: repoRelative(repoRoot, record.from),
      to: repoRelative(repoRoot, cursor),
      kind: record.edge.kind,
      typeOnly: record.edge.typeOnly,
      specifier: record.edge.specifier,
      line: record.edge.line,
    });
    cursor = record.from;
  }
  nodes.reverse();
  edges.reverse();
  return { nodes, edges };
}

function collectTextFiles(roots, extensions) {
  const files = [];
  for (const root of roots) {
    if (!root || !existsSync(root)) continue;
    const stat = statSync(root);
    if (stat.isFile()) {
      if (extensions.has(extname(root).toLowerCase())) files.push(resolve(root));
    } else if (stat.isDirectory()) {
      files.push(...walkFiles(root, (path) => extensions.has(extname(path).toLowerCase()), {
        ignoredDirectories: IGNORED_FRONTEND_DIRECTORIES,
      }));
    }
  }
  return uniqueSorted(files);
}

function referencedSourceFile(rawReference, { repoRoot, frontendRoot, sourceRoot, sourceFiles, caseMap }) {
  const normalized = rawReference.replaceAll('\\', '/').replace(/[),;:'"`]+$/g, '');
  let base;
  if (normalized.startsWith('frontend/src/')) base = join(repoRoot, ...normalized.split('/'));
  else if (normalized.startsWith('src/')) base = join(frontendRoot, ...normalized.split('/'));
  else if (normalized.startsWith('@/')) base = join(sourceRoot, ...normalized.slice(2).split('/'));
  else return undefined;

  const matches = candidatePaths(base).filter((candidate) => sourceFiles.has(candidate));
  if (matches.length === 1) return matches[0];
  const caseMatches = candidatePaths(base)
    .flatMap((candidate) => caseMap.get(normalizePath(candidate).toLowerCase()) ?? [])
    .filter((candidate) => sourceFiles.has(candidate));
  return uniqueSorted(caseMatches).length === 1 ? uniqueSorted(caseMatches)[0] : undefined;
}

function scanTextReferences(files, context) {
  const result = new Map();
  const pattern = /(?:frontend\/src\/|src\/|@\/)[A-Za-z0-9_.$@/\\\-[\]()]+(?:\.[cm]?[jt]sx?|\.css|\.scss|\.sass|\.less)?/g;
  for (const sourcePath of files) {
    const source = readFileSync(sourcePath, 'utf8');
    for (const match of source.matchAll(pattern)) {
      const target = referencedSourceFile(match[0], context);
      if (!target) continue;
      const references = result.get(target) ?? [];
      references.push({
        kind: 'path',
        source: repoRelative(context.repoRoot, sourcePath),
        line: lineAt(source, match.index ?? 0),
        reference: match[0],
      });
      result.set(target, references);
    }
  }
  for (const references of result.values()) {
    references.sort((left, right) => left.source.localeCompare(right.source, 'en') || left.line - right.line);
  }
  return result;
}

function scanNarrativeBasenameReferences(files, sourceFiles, repoRoot) {
  const candidatesByToken = new Map();
  for (const file of sourceFiles) {
    const name = basename(file);
    const stem = name.replace(/(?:\.d)?\.[cm]?[jt]sx?$/, '');
    for (const token of [name, stem]) {
      if (token.length < 8) continue;
      const candidates = candidatesByToken.get(token) ?? [];
      candidates.push(file);
      candidatesByToken.set(token, candidates);
    }
  }
  const uniqueCandidates = new Map(
    [...candidatesByToken].filter(([, candidates]) => uniqueSorted(candidates).length === 1),
  );
  const result = new Map();
  const tokenPattern = /[A-Za-z_$][A-Za-z0-9_$-]*(?:(?:\.d)?\.[cm]?[jt]sx?)?/g;
  for (const sourcePath of files) {
    const source = readFileSync(sourcePath, 'utf8');
    for (const match of source.matchAll(tokenPattern)) {
      const candidates = uniqueCandidates.get(match[0]);
      if (!candidates) continue;
      const target = candidates[0];
      const references = result.get(target) ?? [];
      references.push({
        kind: 'basename',
        source: repoRelative(repoRoot, sourcePath),
        line: lineAt(source, match.index ?? 0),
        reference: match[0],
      });
      result.set(target, references);
    }
  }
  return result;
}

function mergeReferenceMaps(...maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [file, references] of map) {
      const byEvidence = new Map((merged.get(file) ?? []).map((reference) => [
        `${reference.source}\0${reference.line}`,
        reference,
      ]));
      for (const reference of references) {
        const key = `${reference.source}\0${reference.line}`;
        if (!byEvidence.has(key)) byEvidence.set(key, reference);
      }
      merged.set(file, [...byEvidence.values()].sort(
        (left, right) => left.source.localeCompare(right.source, 'en') || left.line - right.line,
      ));
    }
  }
  return merged;
}

function projectPackSource(source, allowedPacks, knownPacks, file, issues) {
  const lines = source.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const projected = [];
  let openMarker;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const markers = [...line.matchAll(/reusable-base:([a-z0-9_-]+):(start|end)/g)];
    if (markers.length > 1) {
      issues.push({ code: 'MULTIPLE_PROFILE_MARKERS_ON_LINE', file, line: index + 1 });
      continue;
    }
    const marker = markers[0];
    if (!marker) {
      if (!openMarker?.strip) projected.push(line);
      continue;
    }
    const [, packName, boundary] = marker;
    if (!knownPacks.has(packName)) {
      issues.push({ code: 'UNKNOWN_PROFILE_PACK_MARKER', file, line: index + 1, detail: packName });
      continue;
    }
    if (boundary === 'start') {
      if (openMarker) {
        issues.push({ code: 'NESTED_PROFILE_PACK_MARKER', file, line: index + 1, detail: packName });
      } else {
        openMarker = { packName, strip: !allowedPacks.has(packName), line: index + 1 };
        if (!openMarker.strip) projected.push(line);
      }
    } else if (!openMarker || openMarker.packName !== packName) {
      issues.push({ code: 'MISMATCHED_PROFILE_PACK_MARKER', file, line: index + 1, detail: packName });
    } else {
      if (!openMarker.strip) projected.push(line);
      openMarker = undefined;
    }
  }
  if (openMarker) {
    issues.push({ code: 'UNCLOSED_PROFILE_PACK_MARKER', file, line: openMarker.line, detail: openMarker.packName });
  }
  return projected.join('');
}

function directProfileFiles(frontendRoot, sourceFiles, directPaths, repoRoot, profileName, issues) {
  const direct = new Map();
  for (const configuredPath of directPaths) {
    if (typeof configuredPath !== 'string' || configuredPath.trim() === '') {
      issues.push({ code: 'INVALID_PROFILE_REMOVE_PATH', file: 'config/reusable-base-profiles.json', detail: profileName });
      continue;
    }
    const absolute = resolve(frontendRoot, configuredPath);
    if (!isInside(frontendRoot, absolute)) {
      issues.push({ code: 'UNSAFE_PROFILE_REMOVE_PATH', file: 'config/reusable-base-profiles.json', detail: configuredPath });
      continue;
    }
    const matches = [...sourceFiles].filter((file) => file === absolute || isInside(absolute, file));
    if (matches.length === 0 && !existsSync(absolute)) {
      issues.push({
        code: 'STALE_PROFILE_REMOVE_PATH',
        file: 'config/reusable-base-profiles.json',
        detail: `${profileName}: ${configuredPath}`,
      });
      continue;
    }
    for (const file of matches) direct.set(file, configuredPath);
  }
  return direct;
}

function computeProfileConstraints({
  manifestPath,
  frontendRoot,
  sourceRoot,
  sourceFiles,
  knownFiles,
  caseMap,
  repoRoot,
  issues,
}) {
  const constraints = new Map([...sourceFiles].map((file) => [file, []]));
  if (!manifestPath) return constraints;
  if (!existsSync(manifestPath)) {
    issues.push({
      code: 'MISSING_PROFILE_MANIFEST',
      file: repoRelative(repoRoot, manifestPath),
    });
    return constraints;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    issues.push({
      code: 'INVALID_PROFILE_MANIFEST',
      file: repoRelative(repoRoot, manifestPath),
      detail: error instanceof Error ? error.message : String(error),
    });
    return constraints;
  }
  const profiles = manifest?.profiles;
  const packs = manifest?.packs;
  if (!profiles || typeof profiles !== 'object' || !packs || typeof packs !== 'object') {
    issues.push({ code: 'INVALID_PROFILE_MANIFEST', file: repoRelative(repoRoot, manifestPath), detail: 'profiles/packs missing' });
    return constraints;
  }
  const knownPacks = new Set(Object.keys(packs));

  for (const [profileName, profile] of Object.entries(profiles)) {
    const allowedPacks = new Set(Array.isArray(profile?.packs) ? profile.packs : []);
    const unknownAllowed = [...allowedPacks].filter((packName) => !knownPacks.has(packName));
    if (unknownAllowed.length > 0) {
      issues.push({
        code: 'UNKNOWN_PROFILE_PACK',
        file: repoRelative(repoRoot, manifestPath),
        detail: `${profileName}: ${unknownAllowed.join(', ')}`,
      });
      continue;
    }
    const directPaths = Object.entries(packs)
      .filter(([packName]) => !allowedPacks.has(packName))
      .flatMap(([, pack]) => pack?.frontend?.removePaths ?? []);
    const direct = directProfileFiles(frontendRoot, sourceFiles, directPaths, repoRoot, profileName, issues);
    const removed = new Set(direct.keys());
    const removalParent = new Map();
    const projectedAdjacency = new Map();

    for (const file of sourceFiles) {
      const rel = repoRelative(repoRoot, file);
      const source = projectPackSource(readFileSync(file, 'utf8'), allowedPacks, knownPacks, rel, issues);
      const parsed = parseModuleReferences(source, rel);
      issues.push(...parsed.issues);
      const edges = [];
      for (const reference of parsed.references) {
        const resolution = resolveLocalReference({
          importer: file,
          specifier: reference.specifier,
          sourceRoot,
          knownFiles,
          caseMap,
          repoRoot,
          line: reference.line,
        });
        if (resolution.issue) issues.push(resolution.issue);
        if (resolution.target && sourceFiles.has(resolution.target)) {
          edges.push({ from: file, to: resolution.target, ...reference });
        }
      }
      projectedAdjacency.set(file, edges);
    }

    let changed = true;
    while (changed) {
      changed = false;
      for (const file of sourceFiles) {
        if (removed.has(file)) continue;
        const dependency = (projectedAdjacency.get(file) ?? []).find((edge) => removed.has(edge.to));
        if (!dependency) continue;
        removed.add(file);
        removalParent.set(file, dependency);
        changed = true;
      }
    }

    for (const file of removed) {
      const configuredPath = direct.get(file);
      if (configuredPath) {
        constraints.get(file).push({
          profile: profileName,
          removal: 'direct',
          configuredPath,
          evidencePath: [repoRelative(repoRoot, manifestPath), repoRelative(repoRoot, file)],
        });
        continue;
      }
      const nodes = [repoRelative(repoRoot, file)];
      let cursor = file;
      const seen = new Set([file]);
      while (removalParent.has(cursor)) {
        cursor = removalParent.get(cursor).to;
        if (seen.has(cursor)) break;
        seen.add(cursor);
        nodes.push(repoRelative(repoRoot, cursor));
        if (direct.has(cursor)) break;
      }
      constraints.get(file).push({
        profile: profileName,
        removal: 'transitive',
        configuredPath: direct.get(cursor),
        evidencePath: nodes,
      });
    }
  }
  return constraints;
}

function sourceIssueMap(issues, sourceFilesByRelative) {
  const map = new Map([...sourceFilesByRelative.keys()].map((file) => [file, []]));
  for (const issue of issues) {
    if (map.has(issue.file)) map.get(issue.file).push(issue);
  }
  return map;
}

function loadRouteShadows(routeManifestPath, sourceFiles, repoRoot, issues) {
  const shadows = new Map();
  if (!routeManifestPath) return shadows;
  if (!existsSync(routeManifestPath)) {
    issues.push({ code: 'MISSING_ROUTE_CAPABILITY_MANIFEST', file: repoRelative(repoRoot, routeManifestPath) });
    return shadows;
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(routeManifestPath, 'utf8'));
  } catch (error) {
    issues.push({
      code: 'INVALID_ROUTE_CAPABILITY_MANIFEST',
      file: repoRelative(repoRoot, routeManifestPath),
      detail: error instanceof Error ? error.message : String(error),
    });
    return shadows;
  }
  if (!Array.isArray(manifest?.routes)) {
    issues.push({
      code: 'INVALID_ROUTE_CAPABILITY_MANIFEST',
      file: repoRelative(repoRoot, routeManifestPath),
      detail: 'routes array missing',
    });
    return shadows;
  }
  for (const route of manifest.routes) {
    if (route?.routing?.kind !== 'config-redirect') continue;
    if (typeof route.source !== 'string' || typeof route.routing.target !== 'string') {
      issues.push({
        code: 'INVALID_ROUTE_SHADOW',
        file: repoRelative(repoRoot, routeManifestPath),
        detail: String(route?.route ?? '<unknown>'),
      });
      continue;
    }
    const source = resolve(repoRoot, route.source);
    if (!sourceFiles.has(source)) {
      issues.push({
        code: 'ROUTE_SHADOW_SOURCE_MISSING',
        file: repoRelative(repoRoot, routeManifestPath),
        detail: route.source,
      });
      continue;
    }
    if (shadows.has(source)) {
      issues.push({
        code: 'DUPLICATE_ROUTE_SHADOW',
        file: repoRelative(repoRoot, routeManifestPath),
        detail: route.source,
      });
      continue;
    }
    shadows.set(source, {
      kind: 'config-redirect',
      route: route.route,
      target: route.routing.target,
      evidence: repoRelative(repoRoot, routeManifestPath),
    });
  }
  return shadows;
}

function chooseDeletionClass({
  productionReachable,
  testReachable,
  storyReachable,
  configReachable,
  docsReferences,
  configReferences,
  profileConstraints,
  sourceImports,
  fileIssues,
}) {
  if (productionReachable) return 'runtime-reachable';
  if (fileIssues.length > 0) return 'ambiguous';
  if (testReachable) return 'test-only';
  if (
    storyReachable
    || configReachable
    || docsReferences.length > 0
    || configReferences.length > 0
    || profileConstraints.length > 0
    || sourceImports.length > 0
  ) return 'ambiguous';
  return 'safe-candidate';
}

function deletionDecision({
  productionReachable,
  testReachable,
  storyReachable,
  configReachable,
  docsReferences,
  configReferences,
  profileConstraints,
  sourceImports,
  fileIssues,
}) {
  const blockingReasons = [];
  if (productionReachable) blockingReasons.push('production-build-reachable');
  if (testReachable) blockingReasons.push('test-reachable');
  if (storyReachable) blockingReasons.push('story-reachable');
  if (configReachable) blockingReasons.push('config-reachable');
  if (docsReferences.length > 0) blockingReasons.push('documentation-reference');
  if (configReferences.length > 0) blockingReasons.push('configuration-reference');
  if (profileConstraints.length > 0) blockingReasons.push('profile-removal-constraint');
  if (sourceImports.length > 0) blockingReasons.push('source-import-reference');
  blockingReasons.push(...fileIssues.map(({ code }) => `parser:${code}`));

  let decision = 'candidate';
  if (productionReachable || fileIssues.length > 0) decision = 'blocked';
  else if (blockingReasons.length > 0) decision = 'review-required';
  return { decision, blockingReasons: uniqueSorted(blockingReasons) };
}

/**
 * Build the census. `runtime-reachable` is deletion terminology: it includes
 * type-only dependencies reached from a production entry because deleting them
 * would still break the production type-check/build. `reachability.runtime`
 * separately reports value-level runtime reachability.
 */
export function buildFrontendReachabilityCensus(options = {}) {
  const repoRoot = resolve(options.repoRoot ?? DEFAULT_REPO_ROOT);
  const frontendRoot = resolve(options.frontendRoot ?? join(repoRoot, 'frontend'));
  const sourceRoot = resolve(options.sourceRoot ?? join(frontendRoot, 'src'));
  const manifestPath = options.profileManifestPath === null
    ? undefined
    : resolve(options.profileManifestPath ?? join(repoRoot, 'config', 'reusable-base-profiles.json'));
  const routeManifestPath = options.routeManifestPath === null
    ? undefined
    : resolve(options.routeManifestPath ?? join(repoRoot, 'config', 'ui-route-capabilities.json'));
  const documentationRoots = options.documentationRoots
    ?? [join(repoRoot, 'docs'), join(repoRoot, 'README.md'), join(frontendRoot, 'README.md')];
  const configRoots = options.configRoots
    ?? [join(repoRoot, 'config'), join(repoRoot, 'package.json'), join(frontendRoot, 'package.json')];
  const failOnErrors = options.failOnErrors !== false;

  const issues = [];
  const sourceFiles = new Set(walkFiles(sourceRoot, isModuleFile, {
    ignoredDirectories: IGNORED_FRONTEND_DIRECTORIES,
  }));
  if (sourceFiles.size === 0) {
    issues.push({ code: 'EMPTY_POPULATION', file: repoRelative(repoRoot, sourceRoot), detail: 'no frontend source modules' });
  }

  const allFrontendModules = new Set(walkFiles(frontendRoot, isModuleFile, {
    ignoredDirectories: IGNORED_FRONTEND_DIRECTORIES,
  }));
  const allFrontendFiles = new Set(walkFiles(frontendRoot, () => true, {
    ignoredDirectories: IGNORED_FRONTEND_DIRECTORIES,
  }));
  const caseMap = buildCaseMap(allFrontendFiles);
  const adjacency = new Map();
  const parsedFiles = new Set();

  function parseFile(file) {
    if (parsedFiles.has(file) || !isModuleFile(file)) return;
    parsedFiles.add(file);
    const rel = repoRelative(repoRoot, file);
    const source = readFileSync(file, 'utf8');
    const parsed = parseModuleReferences(source, rel);
    issues.push(...parsed.issues);
    const references = isConfigEntry(file, frontendRoot)
      ? [...parsed.references, ...parseConfigStringReferences(source, rel, parsed.references)]
      : parsed.references;
    const edges = [];
    for (const reference of references) {
      const resolution = resolveLocalReference({
        importer: file,
        specifier: reference.specifier,
        sourceRoot,
        knownFiles: allFrontendFiles,
        caseMap,
        repoRoot,
        line: reference.line,
      });
      if (resolution.issue && !(reference.optionalConfigReference && resolution.issue.code === 'MISSING_IMPORT_TARGET')) {
        issues.push(resolution.issue);
      }
      if (resolution.target && isModuleFile(resolution.target)) {
        allFrontendModules.add(resolution.target);
        edges.push({ from: file, to: resolution.target, ...reference });
      }
    }
    adjacency.set(file, edges.sort((left, right) => normalizePath(left.to).localeCompare(normalizePath(right.to), 'en')));
  }

  for (const file of sourceFiles) parseFile(file);
  const runtimeEntries = [...sourceFiles].filter((file) => isNextRuntimeEntry(file, sourceRoot));
  const routeShadows = loadRouteShadows(routeManifestPath, sourceFiles, repoRoot, issues);
  const effectiveRuntimeEntries = runtimeEntries.filter((file) => !routeShadows.has(file));
  const testEntries = [...allFrontendModules].filter((file) => isTestHarnessEntry(file, frontendRoot));
  const storyEntries = [...allFrontendModules].filter(isStoryFile);
  const configEntries = [...allFrontendModules].filter((file) => isConfigEntry(file, frontendRoot));

  function traverse(roots, includeTypeOnly) {
    const queue = [...roots];
    const seen = new Set();
    for (let index = 0; index < queue.length; index += 1) {
      const file = queue[index];
      if (seen.has(file)) continue;
      seen.add(file);
      parseFile(file);
      for (const edge of adjacency.get(file) ?? []) {
        if (!includeTypeOnly && edge.typeOnly) continue;
        queue.push(edge.to);
      }
    }
    return bfs(roots, adjacency, includeTypeOnly);
  }

  const runtimeValueParent = traverse(runtimeEntries, false);
  const productionParent = traverse(runtimeEntries, true);
  const effectiveProductParent = traverse(effectiveRuntimeEntries, false);
  const testParent = traverse(testEntries, true);
  const storyParent = traverse(storyEntries, true);
  const configParent = traverse(configEntries, true);

  const documentationFiles = collectTextFiles(documentationRoots, new Set(['.md', '.mdx', '.txt']));
  const configFiles = collectTextFiles(configRoots, new Set(['.json', '.jsonc', '.yml', '.yaml', '.toml', '.js', '.mjs', '.cjs', '.ts', '.mts', '.cts']));
  const referenceContext = { repoRoot, frontendRoot, sourceRoot, sourceFiles, caseMap };
  const docsReferences = mergeReferenceMaps(
    scanTextReferences(documentationFiles, referenceContext),
    scanNarrativeBasenameReferences(documentationFiles, sourceFiles, repoRoot),
  );
  const configReferences = scanTextReferences(configFiles, referenceContext);
  const profileConstraints = computeProfileConstraints({
    manifestPath,
    frontendRoot,
    sourceRoot,
    sourceFiles,
    knownFiles: allFrontendFiles,
    caseMap,
    repoRoot,
    issues,
  });

  const deduplicatedIssues = [...new Map(issues.map((issue) => [issueKey(issue), issue])).values()]
    .sort((left, right) => issueKey(left).localeCompare(issueKey(right), 'en'));
  const relativeToAbsolute = new Map([...sourceFiles].map((file) => [repoRelative(repoRoot, file), file]));
  const perFileIssues = sourceIssueMap(deduplicatedIssues, relativeToAbsolute);
  const sourceImports = new Map([...sourceFiles].map((file) => [file, []]));
  for (const [from, edges] of adjacency) {
    if (!sourceFiles.has(from)) continue;
    for (const edge of edges) {
      if (!sourceFiles.has(edge.to)) continue;
      sourceImports.get(edge.to).push({
        source: repoRelative(repoRoot, from),
        kind: edge.kind,
        typeOnly: edge.typeOnly,
        line: edge.line,
      });
    }
  }
  for (const imports of sourceImports.values()) {
    imports.sort((left, right) => left.source.localeCompare(right.source, 'en') || left.line - right.line);
  }

  const files = [...sourceFiles].map((file) => {
    const rel = repoRelative(repoRoot, file);
    const docs = docsReferences.get(file) ?? [];
    const configs = configReferences.get(file) ?? [];
    const profiles = profileConstraints.get(file) ?? [];
    const inboundSourceImports = sourceImports.get(file) ?? [];
    const fileIssues = perFileIssues.get(rel) ?? [];
    const productionReachable = productionParent.has(file);
    const testReachable = testParent.has(file);
    const storyReachable = storyParent.has(file);
    const configReachable = configParent.has(file);
    const deletionClass = chooseDeletionClass({
      productionReachable,
      testReachable,
      storyReachable,
      configReachable,
      docsReferences: docs,
      configReferences: configs,
      profileConstraints: profiles,
      sourceImports: inboundSourceImports,
      fileIssues,
    });
    const deletion = deletionDecision({
      productionReachable,
      testReachable,
      storyReachable,
      configReachable,
      docsReferences: docs,
      configReferences: configs,
      profileConstraints: profiles,
      sourceImports: inboundSourceImports,
      fileIssues,
    });
    return {
      file: rel,
      deletionClass,
      deletionDecision: deletion.decision,
      blockingReasons: deletion.blockingReasons,
      entryKinds: {
        nextRoute: runtimeEntries.includes(file),
        test: testEntries.includes(file),
        story: storyEntries.includes(file),
        config: configEntries.includes(file),
      },
      reachability: {
        runtime: runtimeValueParent.has(file),
        productionCompile: productionReachable,
        effectiveProduct: effectiveProductParent.has(file),
        test: testReachable,
        story: storyReachable,
        config: configReachable,
      },
      evidencePaths: {
        runtime: evidencePath(runtimeValueParent, file, repoRoot),
        productionCompile: evidencePath(productionParent, file, repoRoot),
        effectiveProduct: evidencePath(effectiveProductParent, file, repoRoot),
        test: evidencePath(testParent, file, repoRoot),
        story: evidencePath(storyParent, file, repoRoot),
        config: evidencePath(configParent, file, repoRoot),
      },
      dependencies: (adjacency.get(file) ?? [])
        .filter((edge) => sourceFiles.has(edge.to))
        .map((edge) => ({
          to: repoRelative(repoRoot, edge.to),
          kind: edge.kind,
          typeOnly: edge.typeOnly,
          specifier: edge.specifier,
          line: edge.line,
        })),
      routing: {
        buildEntry: runtimeEntries.includes(file),
        effectiveProductEntry: effectiveRuntimeEntries.includes(file),
        shadowedBy: routeShadows.get(file),
      },
      references: {
        sourceImports: inboundSourceImports,
        docs,
        config: configs,
      },
      profileRemovalConstraints: profiles.sort((left, right) => left.profile.localeCompare(right.profile, 'en')),
      ambiguities: fileIssues,
    };
  }).sort((left, right) => left.file.localeCompare(right.file, 'en'));

  const counts = Object.fromEntries([...DELETION_CLASSES].map((name) => [name, 0]));
  for (const file of files) counts[file.deletionClass] += 1;
  const census = {
    schemaVersion: 1,
    generatedFrom: {
      repoRoot: normalizePath(repoRoot),
      sourceRoot: repoRelative(repoRoot, sourceRoot),
      profileManifest: manifestPath ? repoRelative(repoRoot, manifestPath) : null,
      routeManifest: routeManifestPath ? repoRelative(repoRoot, routeManifestPath) : null,
    },
    semantics: {
      safeCandidate: 'No production/test/story/config/docs/profile evidence was found; still requires human review before deletion.',
      runtimeReachable: 'Reachable from a Next filesystem/build entry by value or type/build dependency.',
      effectiveProduct: 'Value-reachable after config-redirect-shadowed filesystem entries are removed using the route capability contract.',
      testOnly: 'Not production reachable, but reachable from a test entry. Docs/config evidence remains separately visible.',
      ambiguous: 'Non-runtime evidence, profile constraint, or parser uncertainty prevents safe deletion.',
    },
    summary: {
      population: files.length,
      nextRuntimeEntries: runtimeEntries.length,
      effectiveProductEntries: effectiveRuntimeEntries.length,
      testEntries: testEntries.length,
      storyEntries: storyEntries.length,
      configEntries: configEntries.length,
      parsedFiles: parsedFiles.size,
      dependencyEdges: [...adjacency.values()].reduce((sum, edges) => sum + edges.length, 0),
      deletionClasses: counts,
      issueCount: deduplicatedIssues.length,
    },
    issues: deduplicatedIssues,
    files,
  };

  if (failOnErrors && deduplicatedIssues.length > 0) {
    throw new Error(`frontend reachability census failed closed:\n${formatIssues(deduplicatedIssues)}`);
  }
  return census;
}

function edgeExists(census, from, to) {
  const source = census.files.find((file) => file.file === from);
  return source?.dependencies.some((dependency) => dependency.to === to) ?? false;
}

/** Validate repository facts that must remain explicit deletion-safety regressions. */
export function validateReachabilityAssertions(census, assertions = CURRENT_REPOSITORY_ASSERTIONS) {
  const errors = [];
  const byFile = new Map(census.files.map((file) => [file.file, file]));
  for (const chain of assertions.runtimeChains ?? []) {
    if (!Array.isArray(chain) || chain.length < 2) {
      errors.push('runtime chain assertion must contain at least two files');
      continue;
    }
    for (const file of chain) if (!byFile.has(file)) errors.push(`runtime chain file missing: ${file}`);
    for (let index = 0; index < chain.length - 1; index += 1) {
      if (!edgeExists(census, chain[index], chain[index + 1])) {
        errors.push(`runtime chain edge missing: ${chain[index]} -> ${chain[index + 1]}`);
      }
    }
    const terminal = byFile.get(chain.at(-1));
    if (terminal && terminal.deletionClass !== 'runtime-reachable') {
      errors.push(`runtime chain terminal misclassified: ${terminal.file} -> ${terminal.deletionClass}`);
    }
  }
  for (const file of assertions.runtimeReachable ?? []) {
    const entry = byFile.get(file);
    if (!entry) errors.push(`runtime assertion file missing: ${file}`);
    else if (entry.deletionClass !== 'runtime-reachable') {
      errors.push(`expected runtime-reachable: ${file} -> ${entry.deletionClass}`);
    }
  }
  for (const file of assertions.notRuntimeReachable ?? []) {
    const entry = byFile.get(file);
    if (!entry) errors.push(`non-runtime assertion file missing: ${file}`);
    else if (entry.reachability.productionCompile) errors.push(`unexpected production reachability: ${file}`);
  }
  for (const [file, expectedClass] of Object.entries(assertions.deletionClasses ?? {})) {
    const entry = byFile.get(file);
    if (!entry) errors.push(`classification assertion file missing: ${file}`);
    else if (entry.deletionClass !== expectedClass) {
      errors.push(`expected ${expectedClass}: ${file} -> ${entry.deletionClass}`);
    }
  }
  return errors;
}

function parseCliArgs(argv) {
  const args = { json: false, check: false };
  for (const arg of argv) {
    if (arg === '--json') args.json = true;
    else if (arg === '--check') args.check = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.json && !args.check) args.check = true;
  return args;
}

function runCli() {
  const args = parseCliArgs(process.argv.slice(2));
  const census = buildFrontendReachabilityCensus();
  const assertionErrors = validateReachabilityAssertions(census);
  if (assertionErrors.length > 0) {
    throw new Error(`known frontend reachability facts failed:\n${assertionErrors.join('\n')}`);
  }
  if (args.json) process.stdout.write(`${JSON.stringify(census, null, 2)}\n`);
  else {
    const classes = census.summary.deletionClasses;
    process.stdout.write(
      `frontend reachability census: ${census.summary.population} files; `
      + `runtime=${classes['runtime-reachable']}, test-only=${classes['test-only']}, `
      + `ambiguous=${classes.ambiguous}, safe-candidate=${classes['safe-candidate']}\n`,
    );
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
