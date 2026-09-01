#!/usr/bin/env node
/**
 * Pre-decision URL-state producer/consumer census.
 *
 * This file discovers navigation and request URL surfaces. It is evidence for
 * an IA/privacy decision, not an allowlist and not a runtime sanitizer. Static
 * syntax never proves data sensitivity, object authorization, canonicality, or
 * role eligibility, so every discovered record remains fail-closed until the
 * accountable owners approve a separate global URL-state decision.
 *
 * Node built-ins are used deliberately so the operational contract can run
 * before frontend dependencies are installed.
 */
import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import {
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  expectedRouting,
  inspectRouteRepository,
} from './ui-route-capabilities-contract.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_REPO_ROOT = resolve(dirname(SCRIPT_PATH), '..');
const DEFAULT_MANIFEST_PATH = join(DEFAULT_REPO_ROOT, 'config', 'ui-url-state-census.json');
const DEFAULT_REVIEW_BY = '2026-10-31';
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const NEGATIVE_CASE_IDS = Object.freeze([
  'unknown-query',
  'repeated-query',
  'percent-encoded-forbidden-name',
  'double-encoded-forbidden-name',
  'array-syntax',
  'mixed-case-name',
  'unicode-confusable-name',
  'query-fragment-in-login-intent',
  'dynamic-segment-slash-injection',
  'protocol-relative-or-backslash-target',
]);
const LOGIN_CONTROL_EVIDENCE = Object.freeze([
  'frontend/src/app/login/LoginClient.tsx',
  'frontend/src/app/login/__tests__/page.test.tsx',
]);
const IMPLEMENTED_LOCAL_NEGATIVE_CASES = new Set([
  'query-fragment-in-login-intent',
  'protocol-relative-or-backslash-target',
]);

const CANDIDATE_VIEW_STATE_NAMES = new Set(['cat', 'dir', 'page', 'sort', 'tab', 'view']);
const CREDENTIAL_NAME_SIGNALS = new Set([
  'accesstoken', 'authorization', 'cookie', 'csrf', 'jwt', 'otp', 'password', 'refreshtoken', 'token',
]);
const FREE_TEXT_NAME_SIGNALS = new Set([
  'keyword', 'q', 'query', 'searchkeyword', 'searchwrd', 'text',
]);
const RECORD_LOCATOR_NAME_SIGNALS = new Set([
  'bbsid', 'groupid', 'id', 'logid', 'menuid', 'nttid', 'pstsn', 'responseid', 'srvysn', 'userid',
]);
const NETWORK_NAME_SIGNALS = new Set(['deviceid', 'host', 'hostname', 'ip', 'pod', 'traceid', 'useragent']);

function normalizePath(value) {
  return value.split(sep).join('/');
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, 'en'));
}

function walk(root, predicate) {
  const output = [];
  if (!existsSync(root)) return output;
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const target = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!['.next', 'coverage', 'node_modules', 'playwright-report', 'test-results'].includes(entry.name)) {
          visit(target);
        }
      } else if (entry.isFile() && predicate(target)) output.push(target);
    }
  }
  visit(root);
  return output.sort((left, right) => normalizePath(left).localeCompare(normalizePath(right), 'en'));
}

function isProductionSource(sourcePath) {
  const normalized = normalizePath(sourcePath);
  return SOURCE_EXTENSIONS.has(extname(sourcePath).toLowerCase())
    && !normalized.split('/').includes('__tests__')
    && !/\.(?:spec|test|stories|story)\.[cm]?[jt]sx?$/.test(normalized);
}

function readQuoted(source, start, quote) {
  let value = '';
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === '\\') {
      if (index + 1 >= source.length) return { closed: false, end: source.length, value };
      value += source[index + 1];
      index += 1;
    } else if (char === quote) {
      return { closed: true, end: index + 1, value };
    } else value += char;
  }
  return { closed: false, end: source.length, value };
}

function skipLineComment(source, start) {
  const end = source.indexOf('\n', start + 2);
  return end < 0 ? source.length : end;
}

function skipBlockComment(source, start) {
  const end = source.indexOf('*/', start + 2);
  return end < 0 ? -1 : end + 2;
}

function readTemplate(source, start) {
  let expressionDepth = 0;
  let interpolated = false;
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
          closed: true,
          end: index + 1,
          interpolated,
          value: source.slice(start + 1, index),
        };
      }
      if (char === '$' && next === '{') {
        expressionDepth = 1;
        interpolated = true;
        previousExpressionToken = undefined;
        index += 1;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      index = readQuoted(source, index, char).end - 1;
      continue;
    }
    if (char === '`') {
      index = readTemplate(source, index).end - 1;
      continue;
    }
    if (char === '/' && next === '/') {
      index = skipLineComment(source, index) - 1;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = skipBlockComment(source, index);
      if (end < 0) return { closed: false, end: source.length, interpolated: true, value: '' };
      index = end - 1;
      continue;
    }
    if (char === '/' && canStartRegex(previousExpressionToken)) {
      const regex = readRegex(source, index);
      if (regex) {
        index = regex.end - 1;
        previousExpressionToken = 'literal';
        continue;
      }
    }
    if (/[A-Za-z_$]/.test(char)) {
      let end = index + 1;
      while (/[A-Za-z0-9_$]/.test(source[end] ?? '')) end += 1;
      previousExpressionToken = source.slice(index, end);
      index = end - 1;
      continue;
    }
    if (char === '{') expressionDepth += 1;
    else if (char === '}') expressionDepth -= 1;
    if (!/\s/.test(char)) previousExpressionToken = char;
  }
  return { closed: false, end: source.length, interpolated, value: '' };
}

function canStartRegex(previous) {
  return previous === undefined
    || ['(', '[', '{', ',', ';', ':', '=', '!', '?', '&', '|', '+', '-', '*', '%', '^', '~', '=>'].includes(previous)
    || ['return', 'throw', 'case', 'delete', 'void', 'typeof', 'instanceof', 'in', 'of', 'yield', 'await'].includes(previous);
}

function readRegex(source, start) {
  let inClass = false;
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === '\n' || char === '\r') return undefined;
    if (char === '\\') index += 1;
    else if (char === '[') inClass = true;
    else if (char === ']') inClass = false;
    else if (char === '/' && !inClass) {
      let end = index + 1;
      while (/[A-Za-z]/.test(source[end] ?? '')) end += 1;
      return { end };
    }
  }
  return undefined;
}

/** Minimal JS/TS/JSX lexer for URL syntax. Comments and string/regex decoys are not executable tokens. */
export function tokenizeUrlStateSource(source, file = '<memory>') {
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
      tokens.push({ type: 'string', value: quoted.value, line });
      if (!quoted.closed) issues.push({ code: 'UNTERMINATED_STRING', file, line });
      line += source.slice(index, quoted.end).split('\n').length - 1;
      index = quoted.end;
      continue;
    }
    if (char === '`') {
      const template = readTemplate(source, index);
      tokens.push({ type: 'template', value: template.value, interpolated: template.interpolated, line });
      if (!template.closed) issues.push({ code: 'UNTERMINATED_TEMPLATE', file, line });
      line += source.slice(index, template.end).split('\n').length - 1;
      index = template.end;
      continue;
    }
    if (char === '/' && canStartRegex(tokens.at(-1)?.value)) {
      const regex = readRegex(source, index);
      if (regex) {
        tokens.push({ type: 'regex', value: '<regex>', line });
        index = regex.end;
        continue;
      }
    }
    if (/[A-Za-z_$]/.test(char)) {
      let end = index + 1;
      while (/[A-Za-z0-9_$-]/.test(source[end] ?? '')) end += 1;
      tokens.push({ type: 'identifier', value: source.slice(index, end), line });
      index = end;
      continue;
    }
    if (/[0-9]/.test(char)) {
      let end = index + 1;
      while (/[0-9._]/.test(source[end] ?? '')) end += 1;
      tokens.push({ type: 'number', value: source.slice(index, end), line });
      index = end;
      continue;
    }
    if (source.startsWith('...', index)) {
      tokens.push({ type: 'punctuation', value: '...', line });
      index += 3;
      continue;
    }
    const two = source.slice(index, index + 2);
    if (['=>', '?.', '??', '&&', '||', '==', '!='].includes(two)) {
      tokens.push({ type: 'punctuation', value: two, line });
      index += 2;
      continue;
    }
    tokens.push({ type: 'punctuation', value: char, line });
    index += 1;
  }
  return { issues, tokens };
}

function findClosing(tokens, openIndex, open = '(', close = ')') {
  let depth = 0;
  for (let index = openIndex; index < tokens.length; index += 1) {
    if (tokens[index].value === open) depth += 1;
    else if (tokens[index].value === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function callArguments(tokens, openIndex) {
  const closeIndex = findClosing(tokens, openIndex);
  if (closeIndex < 0) return { arguments: [], closeIndex: -1 };
  const output = [];
  let current = [];
  const stack = [];
  const pairs = { '(': ')', '[': ']', '{': '}' };
  for (let index = openIndex + 1; index < closeIndex; index += 1) {
    const value = tokens[index].value;
    if (pairs[value]) stack.push(pairs[value]);
    else if (stack.at(-1) === value) stack.pop();
    if (value === ',' && stack.length === 0) {
      output.push(current);
      current = [];
    } else current.push(tokens[index]);
  }
  if (current.length > 0 || output.length > 0) output.push(current);
  return { arguments: output, closeIndex };
}

function expressionTarget(tokens) {
  if (tokens.length === 1 && tokens[0].type === 'string') {
    return { computed: false, target: tokens[0].value };
  }
  if (tokens.length === 1 && tokens[0].type === 'template') {
    return {
      computed: Boolean(tokens[0].interpolated),
      target: tokens[0].value.replace(/\$\{[^}]*\}/g, '[computed]'),
    };
  }
  return { computed: true, target: null };
}

function methodCallOpen(tokens, methodIndex) {
  if (tokens[methodIndex + 1]?.value === '(') return methodIndex + 1;
  if (tokens[methodIndex + 1]?.value !== '<') return -1;
  let depth = 0;
  for (let index = methodIndex + 1; index < tokens.length; index += 1) {
    if (tokens[index].value === '<') depth += 1;
    else if (tokens[index].value === '>') {
      depth -= 1;
      if (depth === 0) return tokens[index + 1]?.value === '(' ? index + 1 : -1;
    }
  }
  return -1;
}

function requestConfigQueryNames(tokens) {
  const names = [];
  let found = false;
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index].value !== 'params') continue;
    if (tokens[index + 1]?.value === ':') {
      found = true;
      if (tokens[index + 2]?.value !== '{') {
        names.push('<computed-request-query>');
        continue;
      }
      const close = findClosing(tokens, index + 2, '{', '}');
      if (close < 0) {
        names.push('<computed-request-query>');
        continue;
      }
      let depth = 1;
      for (let cursor = index + 3; cursor < close; cursor += 1) {
        const value = tokens[cursor].value;
        if (value === '{' || value === '[' || value === '(') depth += 1;
        else if (value === '}' || value === ']' || value === ')') depth -= 1;
        if (depth !== 1) continue;
        if (value === '...') names.push('<computed-request-query>');
        else if ((tokens[cursor].type === 'identifier' || tokens[cursor].type === 'string')
          && tokens[cursor + 1]?.value === ':') {
          names.push(tokens[cursor].value);
        } else if (tokens[cursor].type === 'identifier'
          && ['{', ','].includes(tokens[cursor - 1]?.value)
          && [',', '}'].includes(tokens[cursor + 1]?.value)) {
          names.push(tokens[cursor].value);
        }
      }
      index = close;
    } else if ([',', '}'].includes(tokens[index + 1]?.value)) {
      found = true;
      names.push('<computed-request-query>');
    }
  }
  return { found, names: uniqueSorted(names) };
}

function isInsideJsxOpeningTag(tokens, tokenIndex) {
  let braceDepth = 0;
  for (let index = tokenIndex - 1; index >= Math.max(0, tokenIndex - 200); index -= 1) {
    const value = tokens[index].value;
    if (value === '}') braceDepth += 1;
    else if (value === '{') braceDepth -= 1;
    if (braceDepth !== 0) continue;
    if (value === '>') return false;
    if (value === '<') return tokens[index + 1]?.value !== '/';
  }
  return false;
}

function queryKeysFromTarget(target) {
  if (!target?.includes('?')) return [];
  const query = target.slice(target.indexOf('?') + 1).split('#')[0];
  return uniqueSorted(query.split('&').filter(Boolean).map((pair) => {
    const raw = pair.split('=')[0];
    return raw.includes('[computed]') ? '<computed>' : raw;
  }));
}

function stateItem(name) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const riskSignals = [];
  let recommendation = 'deny-until-reviewed';
  if (name.startsWith('<')) riskSignals.push('computed-or-aggregate-state');
  if (CREDENTIAL_NAME_SIGNALS.has(normalized)) riskSignals.push('credential-name-signal');
  if (FREE_TEXT_NAME_SIGNALS.has(normalized)) riskSignals.push('free-text-name-signal');
  if (RECORD_LOCATOR_NAME_SIGNALS.has(normalized)) riskSignals.push('record-locator-name-signal');
  if (NETWORK_NAME_SIGNALS.has(normalized)) riskSignals.push('network-identifier-name-signal');
  if (normalized === 'redirect') riskSignals.push('raw-login-intent-signal');
  if (riskSignals.some((signal) => signal !== 'computed-or-aggregate-state')) recommendation = 'deny';
  else if (CANDIDATE_VIEW_STATE_NAMES.has(normalized)) recommendation = 'candidate-allow';
  return {
    name,
    dataClass: 'unverified',
    recommendation,
    approvalStatus: 'unverified',
    exception: 'none-proposed',
    riskSignals: uniqueSorted(riskSignals),
  };
}

function makeRecord(context, input) {
  const producerKinds = new Set([
    'config-redirect',
    'form-producer',
    'navigation-producer',
    'page-redirect',
    'query-builder',
    'query-producer',
    'request-query-producer',
  ]);
  const consumerKinds = new Set([
    'config-redirect',
    'dynamic-segment',
    'page-redirect',
    'query-builder',
    'query-consumer',
    'url-observer',
  ]);
  const producerFile = producerKinds.has(input.kind) ? context.file : null;
  const consumerFile = consumerKinds.has(input.kind) ? context.file : null;
  const ambiguityReasons = uniqueSorted([
    ...(input.ambiguityReasons ?? []),
    ...(context.routePattern === 'unresolved' ? ['route-context-unresolved'] : []),
    ...(!producerFile || !consumerFile ? ['producer-consumer-join-unresolved'] : []),
  ]);
  return {
    surface: input.surface,
    kind: input.kind,
    operation: input.operation,
    source: context.file,
    producerFile,
    consumerFile,
    routePattern: context.routePattern,
    targetCandidate: input.targetCandidate ?? null,
    stateItems: uniqueSorted(input.stateNames ?? []).map(stateItem),
    currentBehavior: input.currentBehavior,
    riskSignals: uniqueSorted(input.riskSignals ?? []),
    ambiguityReasons,
    resolutionStatus: ambiguityReasons.length > 0 ? 'ambiguous' : 'identified',
    canonical: {
      routeCandidate: input.canonicalCandidate ?? null,
      status: 'unverified',
    },
    authorizationBoundary: {
      shellAccessEvidence: context.shellAccessEvidence,
      capabilityRoles: 'unverified',
      objectAuthorization: 'unverified',
    },
    review: {
      status: 'unverified',
      decisionSafe: false,
      owner: 'security/privacy + FE/domain owner',
      reviewBy: context.reviewBy,
    },
    evidence: {
      source: context.file,
      detector: input.detector,
    },
  };
}

function addNavigationRecord(records, context, operation, argumentTokens, detector) {
  const target = expressionTarget(argumentTokens);
  const stateNames = target.target ? queryKeysFromTarget(target.target) : [];
  records.push(makeRecord(context, {
    ambiguityReasons: target.computed ? ['computed-navigation-target'] : [],
    canonicalCandidate: target.target?.split('?')[0] ?? null,
    currentBehavior: target.computed
      ? 'Navigation target is computed and cannot be dispositioned from syntax alone.'
      : 'Navigation emits the observed literal or template target.',
    detector,
    kind: 'navigation-producer',
    operation,
    riskSignals: [
      ...(target.target?.includes('%') ? ['encoded-target'] : []),
      ...(stateNames.includes('<computed>') ? ['computed-query-value-or-name'] : []),
    ],
    stateNames,
    surface: 'navigation',
    targetCandidate: target.target,
  }));
}

/** Inspect one executable source without inferring privacy or authorization semantics. */
export function scanUrlStateSource(source, options = {}) {
  const context = {
    file: options.file ?? '<memory>',
    reviewBy: options.reviewBy ?? DEFAULT_REVIEW_BY,
    routePattern: options.routePattern ?? 'unresolved',
    shellAccessEvidence: options.shellAccessEvidence ?? 'unverified',
  };
  const { issues, tokens } = tokenizeUrlStateSource(source, context.file);
  const records = [];
  const urlParamVariables = new Set(['searchParams']);
  const serverObjectVariables = new Set();
  const urlVariables = new Set();

  for (let index = 0; index < tokens.length - 3; index += 1) {
    const name = tokens[index];
    if (name.type !== 'identifier' || tokens[index + 1]?.value !== '=') continue;
    let cursor = index + 2;
    if (tokens[cursor]?.value === 'await') cursor += 1;
    if (tokens[cursor]?.value === 'new' && tokens[cursor + 1]?.value === 'URLSearchParams') {
      urlParamVariables.add(name.value);
    } else if (tokens[cursor]?.value === 'useSearchParams' && tokens[cursor + 1]?.value === '(') {
      urlParamVariables.add(name.value);
    } else if (tokens[cursor]?.value === 'searchParams') {
      serverObjectVariables.add(name.value);
    } else if (tokens[cursor]?.value === 'new' && tokens[cursor + 1]?.value === 'URL') {
      urlVariables.add(name.value);
    }
  }

  // Destructured server search params, for example: const { q = '' } = await searchParams.
  for (let index = 0; index < tokens.length - 2; index += 1) {
    if (tokens[index].value !== '=' || tokens[index + 1]?.value !== 'await' || tokens[index + 2]?.value !== 'searchParams') continue;
    if (tokens[index - 1]?.value !== '}') continue;
    let depth = 0;
    let open = -1;
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      if (tokens[cursor].value === '}') depth += 1;
      else if (tokens[cursor].value === '{') {
        depth -= 1;
        if (depth === 0) {
          open = cursor;
          break;
        }
      }
    }
    if (open >= 0) {
      const names = [];
      let atItemStart = true;
      for (let cursor = open + 1; cursor < index - 1; cursor += 1) {
        if (tokens[cursor].value === ',') atItemStart = true;
        else if (atItemStart && tokens[cursor].type === 'identifier') {
          names.push(tokens[cursor].value);
          atItemStart = false;
        }
      }
      for (const name of names) records.push(makeRecord(context, {
        currentBehavior: 'Server page destructures a named URL search parameter.',
        detector: 'server-search-param-destructure',
        kind: 'query-consumer',
        operation: 'read',
        stateNames: [name],
        surface: 'navigation',
      }));
    }
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    // new URLSearchParams(existingSearchParams) is a distinct unknown/repeated query pass-through risk.
    if (token.value === 'new' && tokens[index + 1]?.value === 'URLSearchParams' && tokens[index + 2]?.value === '(') {
      const parsed = callArguments(tokens, index + 2);
      const argument = parsed.arguments[0] ?? [];
      const copiesExisting = argument.some((candidate) => urlParamVariables.has(candidate.value))
        || argument.some((candidate) => candidate.value === 'searchParams');
      records.push(makeRecord(context, {
        ambiguityReasons: copiesExisting ? ['unknown-source-query-copied'] : [],
        currentBehavior: copiesExisting
          ? 'Existing URL search parameters are copied before mutation, so unknown, repeated, and encoded names can survive.'
          : 'A URLSearchParams builder is created; its complete key population needs review.',
        detector: 'url-search-params-constructor',
        kind: 'query-builder',
        operation: copiesExisting ? 'copy-existing-query' : 'construct-query',
        riskSignals: copiesExisting
          ? ['encoded-query-passthrough', 'repeated-query-passthrough', 'unknown-query-passthrough']
          : [],
        stateNames: copiesExisting ? ['<unknown-source-query>'] : [],
        surface: 'navigation',
      }));
    }

    // URLSearchParams/read-only search params and URL.searchParams methods.
    let methodIndex = -1;
    if (token.type === 'identifier' && urlParamVariables.has(token.value) && tokens[index + 1]?.value === '.'
      && tokens[index - 1]?.value !== '.') {
      methodIndex = index + 2;
    } else if (
      token.type === 'identifier'
      && tokens[index + 1]?.value === '.'
      && tokens[index + 2]?.value === 'searchParams'
      && tokens[index + 3]?.value === '.'
    ) methodIndex = index + 4;
    if (methodIndex >= 0 && ['append', 'delete', 'get', 'getAll', 'has', 'set'].includes(tokens[methodIndex]?.value)
      && tokens[methodIndex + 1]?.value === '(') {
      const operation = tokens[methodIndex].value;
      const args = callArguments(tokens, methodIndex + 1).arguments;
      const key = args[0]?.length === 1 && args[0][0].type === 'string' ? args[0][0].value : '<computed>';
      const producer = ['append', 'delete', 'set'].includes(operation);
      records.push(makeRecord(context, {
        ambiguityReasons: key === '<computed>' ? ['computed-query-key'] : [],
        currentBehavior: producer
          ? `URL search parameter is mutated with ${operation}().`
          : `URL search parameter is consumed with ${operation}().`,
        detector: 'url-search-param-method',
        kind: producer ? 'query-producer' : 'query-consumer',
        operation,
        stateNames: [key],
        surface: 'navigation',
      }));
    }

    // Server searchParams object property reads.
    if (token.type === 'identifier' && serverObjectVariables.has(token.value)
      && tokens[index + 1]?.value === '.' && tokens[index + 2]?.type === 'identifier') {
      const key = tokens[index + 2].value;
      if (!['then', 'toString'].includes(key)) records.push(makeRecord(context, {
        currentBehavior: 'Server page reads a named URL search parameter property.',
        detector: 'server-search-param-property',
        kind: 'query-consumer',
        operation: 'read',
        stateNames: [key],
        surface: 'navigation',
      }));
    }

    // Router, redirect, location, and history navigation sinks.
    if (token.value === 'router' && tokens[index + 1]?.value === '.'
      && ['push', 'replace'].includes(tokens[index + 2]?.value) && tokens[index + 3]?.value === '(') {
      addNavigationRecord(records, context, `router.${tokens[index + 2].value}`, callArguments(tokens, index + 3).arguments[0] ?? [], 'router-navigation');
    }
    if (['redirect', 'permanentRedirect'].includes(token.value) && tokens[index + 1]?.value === '(') {
      addNavigationRecord(records, context, token.value, callArguments(tokens, index + 1).arguments[0] ?? [], 'server-redirect-call');
    }
    if (token.value === 'NextResponse' && tokens[index + 1]?.value === '.' && tokens[index + 2]?.value === 'redirect'
      && tokens[index + 3]?.value === '(') {
      addNavigationRecord(records, context, 'NextResponse.redirect', callArguments(tokens, index + 3).arguments[0] ?? [], 'middleware-redirect-call');
    }
    const locationCall = token.value === 'window' && tokens[index + 1]?.value === '.' && tokens[index + 2]?.value === 'location'
      && tokens[index + 3]?.value === '.' && ['assign', 'replace'].includes(tokens[index + 4]?.value)
      && tokens[index + 5]?.value === '(';
    const bareLocationCall = token.value === 'location' && tokens[index - 1]?.value !== '.' && tokens[index + 1]?.value === '.'
      && ['assign', 'replace'].includes(tokens[index + 2]?.value) && tokens[index + 3]?.value === '(';
    if (locationCall) addNavigationRecord(records, context, `window.location.${tokens[index + 4].value}`, callArguments(tokens, index + 5).arguments[0] ?? [], 'location-navigation');
    if (bareLocationCall) addNavigationRecord(records, context, `location.${tokens[index + 2].value}`, callArguments(tokens, index + 3).arguments[0] ?? [], 'location-navigation');
    const historyCall = token.value === 'window' && tokens[index + 1]?.value === '.' && tokens[index + 2]?.value === 'history'
      && tokens[index + 3]?.value === '.' && ['pushState', 'replaceState'].includes(tokens[index + 4]?.value)
      && tokens[index + 5]?.value === '(';
    if (historyCall) {
      const args = callArguments(tokens, index + 5).arguments;
      addNavigationRecord(records, context, `window.history.${tokens[index + 4].value}`, args[2] ?? [], 'history-navigation');
    }

    // JSX href and route-definition href fields.
    const hrefAssignment = token.value === 'href' && tokens[index + 1]?.value === '='
      && isInsideJsxOpeningTag(tokens, index);
    const hrefField = token.value === 'href' && tokens[index + 1]?.value === ':';
    if (hrefAssignment || hrefField) {
      let expression = [];
      if (tokens[index + 2]?.value === '{') {
        const close = findClosing(tokens, index + 2, '{', '}');
        if (close >= 0) expression = tokens.slice(index + 3, close);
      } else expression = [tokens[index + 2]].filter(Boolean);
      addNavigationRecord(records, context, tokens[index + 1].value === '=' ? 'jsx-href' : 'href-field', expression, 'href-navigation');
    }

    // HTML forms without an explicit method are fail-closed because interception semantics require inspection.
    if (token.value === '<' && tokens[index + 1]?.value === 'form') {
      let cursor = index + 2;
      let braceDepth = 0;
      let method = null;
      while (cursor < tokens.length) {
        if (tokens[cursor].value === '{') braceDepth += 1;
        else if (tokens[cursor].value === '}') braceDepth -= 1;
        if (braceDepth === 0 && tokens[cursor].value === '>') break;
        if (tokens[cursor].value === 'method' && tokens[cursor + 1]?.value === '=') {
          const methodToken = tokens[cursor + 2]?.value === '{' ? tokens[cursor + 3] : tokens[cursor + 2];
          method = methodToken?.type === 'string' ? methodToken.value.toLowerCase() : '<computed>';
        }
        cursor += 1;
      }
      if (method === null || method === 'get' || method === '<computed>') records.push(makeRecord(context, {
        ambiguityReasons: method === 'get' ? [] : ['form-method-or-interception-unresolved'],
        currentBehavior: method === 'get'
          ? 'Form explicitly serializes successful named controls into a GET navigation URL.'
          : 'Form has no statically explicit GET/POST contract; submit interception and URL effects require review.',
        detector: 'jsx-form',
        kind: 'form-producer',
        operation: method === 'get' ? 'explicit-get' : 'implicit-or-computed-method',
        stateNames: method === 'get' ? ['<form-field-population>'] : [],
        surface: 'navigation',
      }));
    }

    // Request URL producers: fetch() and HTTP-client get() calls with path-like targets.
    const fetchCall = token.value === 'fetch' && tokens[index + 1]?.value === '(';
    const receiverLooksHttp = token.value === 'this'
      || /^(?:api|axios|client|http)$/i.test(token.value)
      || /(?:api|axios|client|http|instance)$/i.test(token.value);
    const clientGetOpen = token.type === 'identifier' && receiverLooksHttp && tokens[index + 1]?.value === '.'
      && tokens[index + 2]?.value === 'get' && !urlParamVariables.has(token.value)
      ? methodCallOpen(tokens, index + 2)
      : -1;
    const clientGetCall = clientGetOpen >= 0;
    if (fetchCall || clientGetCall) {
      const openIndex = fetchCall ? index + 1 : clientGetOpen;
      const parsed = callArguments(tokens, openIndex);
      const target = expressionTarget(parsed.arguments[0] ?? []);
      const pathLike = target.target === null || /^(?:$|\/|https?:)/.test(target.target);
      if (pathLike) {
        const remaining = parsed.arguments.slice(1).flat();
        const requestQuery = requestConfigQueryNames(remaining);
        const hasParamsConfig = requestQuery.found
          || remaining.some((candidate) => /queryParams|searchParams/.test(candidate.value));
        const stateNames = [
          ...queryKeysFromTarget(target.target),
          ...requestQuery.names,
          ...(hasParamsConfig && requestQuery.names.length === 0 ? ['<computed-request-query>'] : []),
        ];
        records.push(makeRecord(context, {
          ambiguityReasons: [
            ...(target.computed ? ['computed-request-target'] : []),
            ...(hasParamsConfig ? ['computed-request-query'] : []),
          ],
          canonicalCandidate: target.target?.split('?')[0] ?? null,
          currentBehavior: hasParamsConfig
            ? 'GET request carries a computed query configuration whose field semantics require domain review.'
            : 'Request URL producer emits the observed target.',
          detector: fetchCall ? 'fetch-request' : 'http-client-get-request',
          kind: 'request-query-producer',
          operation: fetchCall ? 'fetch' : 'client.get',
          stateNames,
          surface: 'request-telemetry',
          targetCandidate: target.target,
        }));
      }
    }

    // URL propagation/telemetry observation points; these are not analytics approvals.
    const observesUrl = token.type === 'identifier' && ['document', 'location', 'request', 'window'].includes(token.value)
      && tokens[index + 1]?.value === '.'
      && ['href', 'referrer', 'search', 'url'].includes(tokens[index + 2]?.value);
    if (observesUrl) records.push(makeRecord(context, {
      ambiguityReasons: ['url-observation-purpose-unresolved'],
      currentBehavior: `Runtime reads ${token.value}.${tokens[index + 2].value}; propagation into logs or telemetry requires data-flow review.`,
      detector: 'url-observer',
      kind: 'url-observer',
      operation: 'read',
      stateNames: ['<raw-url-or-component>'],
      surface: 'request-telemetry',
    }));
  }

  return { issues, records };
}

function routeContextForSource(source, repository, routeManifest) {
  if (source === 'frontend/src/proxy.ts' || source === 'frontend/next.config.ts') {
    return { routePattern: '*', shellAccessEvidence: 'unverified' };
  }
  const exactPage = repository.pages.find((page) => page.source === source);
  if (exactPage) {
    return {
      routePattern: exactPage.route,
      shellAccessEvidence: routeManifest.get(exactPage.route)?.shellAccess ?? 'unverified',
    };
  }
  const sourceDirectory = `${normalizePath(dirname(source))}/`;
  const candidates = repository.pages
    .filter((page) => {
      const pageDirectory = `${normalizePath(dirname(page.source))}/`;
      return pageDirectory !== 'frontend/src/app/' && sourceDirectory.startsWith(pageDirectory);
    })
    .sort((left, right) => right.source.length - left.source.length);
  if (candidates.length === 0) return { routePattern: 'unresolved', shellAccessEvidence: 'unverified' };
  const route = candidates[0].route;
  return {
    routePattern: route,
    shellAccessEvidence: routeManifest.get(route)?.shellAccess ?? 'unverified',
  };
}

function finalizeRecords(rawRecords) {
  const sorted = rawRecords.sort((left, right) => JSON.stringify([
    left.source,
    left.routePattern,
    left.kind,
    left.operation,
    left.targetCandidate,
    left.stateItems.map(({ name }) => name),
    left.evidence.detector,
  ]).localeCompare(JSON.stringify([
    right.source,
    right.routePattern,
    right.kind,
    right.operation,
    right.targetCandidate,
    right.stateItems.map(({ name }) => name),
    right.evidence.detector,
  ]), 'en'));
  const grouped = new Map();
  for (const record of sorted) {
    const signature = JSON.stringify([
      record.source,
      record.routePattern,
      record.kind,
      record.operation,
      record.targetCandidate,
      record.stateItems.map(({ name }) => name),
      record.evidence.detector,
    ]);
    const existing = grouped.get(signature);
    if (existing) existing.evidence.occurrenceCount += 1;
    else grouped.set(signature, {
      id: `URL-${createHash('sha256').update(signature).digest('hex').slice(0, 14).toUpperCase()}`,
      ...record,
      evidence: { ...record.evidence, occurrenceCount: 1 },
    });
  }
  return [...grouped.values()];
}

function negativeCases() {
  const descriptions = {
    'unknown-query': 'Unknown source query names must not be assumed removed by redirects or copied URLSearchParams.',
    'repeated-query': 'Repeated names must be rejected or normalized by an approved single-value schema.',
    'percent-encoded-forbidden-name': 'Percent encoding must not bypass a forbidden-name decision.',
    'double-encoded-forbidden-name': 'Double encoding must not bypass decoding and validation boundaries.',
    'array-syntax': 'Bracket/array syntax must not create an unreviewed multi-value channel.',
    'mixed-case-name': 'Case variants must not bypass an exact approved name set.',
    'unicode-confusable-name': 'Unicode confusables must not impersonate an approved ASCII parameter.',
    'query-fragment-in-login-intent': 'Login return intent must not preserve raw query, fragment, or record locator state.',
    'dynamic-segment-slash-injection': 'Decoded slash, traversal, and control input must not cross a route-segment boundary.',
    'protocol-relative-or-backslash-target': 'Protocol-relative, absolute, and backslash targets must not become login/navigation destinations.',
  };
  return NEGATIVE_CASE_IDS.map((id) => {
    const implementedLocal = IMPLEMENTED_LOCAL_NEGATIVE_CASES.has(id);
    return {
      id,
      status: implementedLocal
        ? 'implemented-local-policy-unapproved'
        : 'unimplemented-blocked-input',
      decisionSafe: false,
      description: descriptions[id],
      ...(implementedLocal ? { evidence: [...LOGIN_CONTROL_EVIDENCE] } : {}),
    };
  });
}

function criticalLoginFlow(records) {
  const producer = records.filter((record) => record.source === 'frontend/src/proxy.ts'
    && record.stateItems.some(({ name }) => name === 'redirect')
    && record.kind === 'query-producer');
  const consumer = records.filter((record) => record.source === 'frontend/src/app/login/LoginClient.tsx'
    && record.stateItems.some(({ name }) => name === 'redirect')
    && record.kind === 'query-consumer');
  const sinks = records.filter((record) => record.source === 'frontend/src/app/login/LoginClient.tsx'
    && record.kind === 'navigation-producer'
    && ['router.replace', 'window.location.replace'].includes(record.operation));
  return {
    id: 'login-return-intent',
    status: 'unverified',
    decisionSafe: false,
    producerRecordIds: producer.map(({ id }) => id),
    consumerRecordIds: consumer.map(({ id }) => id),
    sinkRecordIds: sinks.map(({ id }) => id),
    requiredDecision: 'Replace or constrain raw URL intent only after a registered global URL/privacy decision.',
  };
}

function summaryFor(records, sourceFileCount, exactPopulations) {
  const byKind = {};
  const bySurface = {};
  for (const record of records) {
    byKind[record.kind] = (byKind[record.kind] ?? 0) + 1;
    bySurface[record.surface] = (bySurface[record.surface] ?? 0) + 1;
  }
  return {
    sourceFileCount,
    records: records.length,
    syntaxOccurrences: records.reduce((total, record) => total + record.evidence.occurrenceCount, 0),
    ambiguousRecords: records.filter(({ resolutionStatus }) => resolutionStatus === 'ambiguous').length,
    unverifiedRecords: records.filter(({ review }) => review.status === 'unverified').length,
    exactPopulations,
    byKind: Object.fromEntries(Object.entries(byKind).sort()),
    bySurface: Object.fromEntries(Object.entries(bySurface).sort()),
  };
}

/** Build the current, generated evidence artifact. */
export function buildUrlStateCensus(options = {}) {
  const repoRoot = resolve(options.repoRoot ?? DEFAULT_REPO_ROOT);
  const reviewBy = options.reviewBy ?? DEFAULT_REVIEW_BY;
  const repository = inspectRouteRepository(repoRoot);
  const routeManifestPath = resolve(options.routeManifestPath ?? join(repoRoot, 'config', 'ui-route-capabilities.json'));
  const routeManifestJson = JSON.parse(readFileSync(routeManifestPath, 'utf8'));
  const routeManifest = new Map(routeManifestJson.routes.map((route) => [route.route, route]));
  const sourceRoot = join(repoRoot, 'frontend', 'src');
  const sourcePaths = walk(sourceRoot, isProductionSource);
  const rawRecords = [];
  const issues = [];

  for (const sourcePath of sourcePaths) {
    const file = normalizePath(relative(repoRoot, sourcePath));
    const routeContext = routeContextForSource(file, repository, routeManifest);
    const inspected = scanUrlStateSource(readFileSync(sourcePath, 'utf8'), {
      file,
      reviewBy,
      ...routeContext,
    });
    issues.push(...inspected.issues);
    rawRecords.push(...inspected.records);
  }

  // Exact route populations come from the same route parser as the capability manifest.
  const dynamicRoutes = repository.pages.filter(({ route }) => route.includes('['));
  for (const page of dynamicRoutes) {
    const route = routeManifest.get(page.route);
    const segmentNames = [...page.route.matchAll(/\[([^\]]+)\]/g)].map((match) => `[${match[1]}]`);
    rawRecords.push(makeRecord({
      file: page.source,
      reviewBy,
      routePattern: page.route,
      shellAccessEvidence: route?.shellAccess ?? 'unverified',
    }, {
      canonicalCandidate: page.route,
      currentBehavior: 'Filesystem route accepts one or more dynamic path segments; locator semantics are not inferred from the segment name.',
      detector: 'filesystem-route-parser',
      kind: 'dynamic-segment',
      operation: 'consume-path-segment',
      riskSignals: ['double-encoded-segment', 'record-locator-unverified', 'slash-or-traversal-injection'],
      stateNames: segmentNames,
      surface: 'navigation',
      targetCandidate: page.route,
    }));
  }

  for (const [source, redirect] of repository.configRedirects.redirects) {
    rawRecords.push(makeRecord({
      file: repository.configRedirects.source,
      reviewBy,
      routePattern: source,
      shellAccessEvidence: routeManifest.get(source)?.shellAccess ?? 'unverified',
    }, {
      canonicalCandidate: redirect.target.split('?')[0],
      currentBehavior: 'Next config redirect can merge source query names into the destination; no sanitizer is approved by this census.',
      detector: 'next-config-redirect-parser',
      kind: 'config-redirect',
      operation: redirect.permanent ? 'permanent-redirect' : 'temporary-redirect',
      riskSignals: ['double-encoded-query', 'encoded-query-passthrough', 'repeated-query-passthrough', 'unknown-query-passthrough'],
      stateNames: ['<source-query>', ...queryKeysFromTarget(redirect.target)],
      surface: 'navigation',
      targetCandidate: redirect.target,
    }));
  }

  const pageRedirects = repository.pages
    .map((page) => ({ ...page, routing: expectedRouting(repository, page.route, page.source) }))
    .filter(({ routing }) => routing.kind === 'page-redirect');
  for (const page of pageRedirects) {
    rawRecords.push(makeRecord({
      file: page.source,
      reviewBy,
      routePattern: page.route,
      shellAccessEvidence: routeManifest.get(page.route)?.shellAccess ?? 'unverified',
    }, {
      canonicalCandidate: page.routing.target.split('?')[0].replace(/\$\{([^}]+)\}/g, '[$1]'),
      currentBehavior: 'Page-only redirect emits the observed literal/template destination; source-query and encoding policy remain unreviewed.',
      detector: 'page-redirect-parser',
      kind: 'page-redirect',
      operation: 'redirect',
      riskSignals: ['source-query-policy-unverified', ...(page.routing.target.includes('${') ? ['dynamic-segment-encoding-unverified'] : [])],
      stateNames: queryKeysFromTarget(page.routing.target),
      surface: 'navigation',
      targetCandidate: page.routing.target.replace(/\$\{([^}]+)\}/g, '[$1]'),
    }));
  }

  if (issues.length > 0) {
    const lines = issues.map((issue) => `[${issue.code}] ${issue.file}:${issue.line}`);
    throw new Error(`URL-state census could not parse every selected source:\n${lines.join('\n')}`);
  }

  const records = finalizeRecords(rawRecords);
  const exactPopulations = {
    filesystemRoutes: repository.pages.length,
    dynamicRoutePatterns: dynamicRoutes.length,
    configRedirects: repository.configRedirects.redirects.size,
    pageRedirects: pageRedirects.length,
  };
  const negatives = negativeCases();
  const criticalFlows = [criticalLoginFlow(records)];
  const inventoryHash = createHash('sha256').update(JSON.stringify({ records, negatives, criticalFlows })).digest('hex');
  return {
    schemaVersion: 1,
    asOf: routeManifestJson.asOf ?? '2026-08-21',
    authority: 'generated-pre-decision-census-not-policy',
    decision: {
      proposedId: 'PD-UX-003',
      registryStatus: 'not-registered',
      approvalStatus: 'blocked-input',
      accountableOwner: 'unassigned',
      decisionSafe: false,
    },
    sourceScope: {
      roots: ['frontend/src', 'frontend/next.config.ts', 'config/ui-route-capabilities.json'],
      excluded: ['tests', 'stories', 'generated build output', 'backend/proxy/CDN runtime logs', 'external analytics configuration'],
      generator: 'scripts/ui-url-state-census.mjs --check',
      inventoryHash,
    },
    summary: summaryFor(records, sourcePaths.length, exactPopulations),
    requiredNegativeCases: negatives,
    criticalFlows,
    records,
    limitations: [
      'Static syntax cannot determine whether a value is personal data, public, secret, or an authorized object locator.',
      'Computed target/key and unresolved shared-component route context remain ambiguous and therefore fail-closed.',
      'This repository census does not observe CDN, reverse-proxy, browser-history, support-ticket, or production analytics retention.',
      'Candidate-allow is a review recommendation only; every state item remains approvalStatus=unverified.',
      'No runtime sanitizer, redirect behavior, login intent, pending decision, ADR, proxy, or Next configuration is changed by this artifact.',
    ],
  };
}

function expectedSummary(records, summary) {
  return summaryFor(records, summary.sourceFileCount, summary.exactPopulations);
}

/** Validate fail-closed semantics independently from the generated snapshot comparison. */
export function validateUrlStateCensus(census, options = {}) {
  const repoRoot = resolve(options.repoRoot ?? DEFAULT_REPO_ROOT);
  // 기본은 실시간 시계다. 종전에는 reviewBy 만료를 어디서도 실제 시각으로 검사하지 않아
  // 재검토 기한이 영구히 장식이었다(고정 NOW 픽스처만 존재). 만료 red 의 해소는
  // 재검토 완료 또는 DEFAULT_REVIEW_BY 의 의식적 연장 + --write 재생성이며,
  // 둘 다 diff 에 드러난다 — 조용한 연장은 불가능하다.
  const nowMs = options.nowMs ?? Date.now();
  const errors = [];
  if (census?.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (census?.authority !== 'generated-pre-decision-census-not-policy') errors.push('authority must remain non-normative');
  if (census?.decision?.registryStatus !== 'not-registered') errors.push('global URL decision must remain not-registered');
  if (census?.decision?.approvalStatus !== 'blocked-input' || census?.decision?.decisionSafe !== false) {
    errors.push('global URL decision must remain blocked-input and decisionSafe=false');
  }
  if (census?.decision?.accountableOwner !== 'unassigned') errors.push('an owner cannot be fabricated by the census');
  if (!Array.isArray(census?.records) || census.records.length === 0) return [...errors, 'URL-state record population is empty'];
  const ids = new Set();
  for (const record of census.records) {
    const label = record?.id ?? '<missing-id>';
    if (ids.has(label)) errors.push(`duplicate record id: ${label}`);
    ids.add(label);
    if (!['navigation', 'request-telemetry'].includes(record?.surface)) errors.push(`${label}: invalid surface`);
    if (!record?.source || record.source.startsWith('/') || /^[A-Za-z]:/.test(record.source)) errors.push(`${label}: evidence source must be repository-relative`);
    else if (!existsSync(join(repoRoot, record.source)) && record.source !== '<memory>') errors.push(`${label}: evidence source does not exist: ${record.source}`);
    if (!record?.producerFile && !record?.consumerFile) errors.push(`${label}: producer and consumer endpoints cannot both be empty`);
    if (record?.producerFile && record.producerFile !== record.source) errors.push(`${label}: producer endpoint must be backed by the observed source`);
    if (record?.consumerFile && record.consumerFile !== record.source) errors.push(`${label}: consumer endpoint must be backed by the observed source`);
    if ((!record?.producerFile || !record?.consumerFile)
      && !record?.ambiguityReasons?.includes('producer-consumer-join-unresolved')) {
      errors.push(`${label}: unresolved producer/consumer counterpart must be explicit`);
    }
    if (!Number.isSafeInteger(record?.evidence?.occurrenceCount) || record.evidence.occurrenceCount < 1) {
      errors.push(`${label}: evidence occurrenceCount must be a positive integer`);
    }
    if (record?.review?.status !== 'unverified' || record?.review?.decisionSafe !== false) errors.push(`${label}: review must remain unverified and decisionSafe=false`);
    if (!record?.review?.owner || !/^\d{4}-\d{2}-\d{2}$/.test(record?.review?.reviewBy ?? '')) errors.push(`${label}: owner and bounded reviewBy are required`);
    else if (Date.parse(`${record.review.reviewBy}T23:59:59.999Z`) < nowMs) {
      errors.push(`${label}: review horizon expired on ${record.review.reviewBy} — 재검토를 완료하거나, 사유와 함께 DEFAULT_REVIEW_BY 를 연장하고 --write 로 재생성하세요`);
    }
    if (record?.canonical?.status !== 'unverified') errors.push(`${label}: canonical route status cannot be approved by syntax`);
    if (record?.authorizationBoundary?.capabilityRoles !== 'unverified'
      || record?.authorizationBoundary?.objectAuthorization !== 'unverified') {
      errors.push(`${label}: capability roles and object authorization must remain unverified`);
    }
    if (record?.resolutionStatus === 'ambiguous' && (record?.ambiguityReasons?.length ?? 0) === 0) errors.push(`${label}: ambiguous record lacks reason`);
    for (const state of record?.stateItems ?? []) {
      if (state?.dataClass !== 'unverified' || state?.approvalStatus !== 'unverified') errors.push(`${label}/${state?.name}: state classification must remain unverified`);
      if (!['candidate-allow', 'deny', 'deny-until-reviewed'].includes(state?.recommendation)) errors.push(`${label}/${state?.name}: invalid recommendation`);
      if (state?.exception !== 'none-proposed') errors.push(`${label}/${state?.name}: exception cannot be fabricated`);
    }
    if (record?.operation === 'copy-existing-query') {
      for (const signal of ['unknown-query-passthrough', 'repeated-query-passthrough', 'encoded-query-passthrough']) {
        if (!record.riskSignals.includes(signal)) errors.push(`${label}: query copy missing ${signal}`);
      }
    }
    if (record?.kind === 'config-redirect') {
      for (const signal of ['unknown-query-passthrough', 'repeated-query-passthrough', 'encoded-query-passthrough', 'double-encoded-query']) {
        if (!record.riskSignals.includes(signal)) errors.push(`${label}: config redirect missing ${signal}`);
      }
    }
  }
  const actualSummary = expectedSummary(census.records, census.summary);
  if (JSON.stringify(actualSummary) !== JSON.stringify(census.summary)) errors.push('summary does not exactly match records');
  const exact = census.summary?.exactPopulations ?? {};
  if (!(exact.filesystemRoutes > 0) || !(exact.dynamicRoutePatterns > 0)
    || !(exact.configRedirects > 0) || !(exact.pageRedirects > 0)) errors.push('one or more exact route populations are empty');
  if ((census.summary?.byKind?.['dynamic-segment'] ?? 0) !== exact.dynamicRoutePatterns) errors.push('dynamic route population is not exactly represented');
  if ((census.summary?.byKind?.['config-redirect'] ?? 0) !== exact.configRedirects) errors.push('config redirect population is not exactly represented');
  if ((census.summary?.byKind?.['page-redirect'] ?? 0) !== exact.pageRedirects) errors.push('page redirect population is not exactly represented');
  const negativeIds = (census.requiredNegativeCases ?? []).map(({ id }) => id);
  if (JSON.stringify(negativeIds) !== JSON.stringify(NEGATIVE_CASE_IDS)) errors.push('required negative cases are not exact and ordered');
  for (const negative of census.requiredNegativeCases ?? []) {
    const implementedLocal = IMPLEMENTED_LOCAL_NEGATIVE_CASES.has(negative.id);
    const expectedStatus = implementedLocal
      ? 'implemented-local-policy-unapproved'
      : 'unimplemented-blocked-input';
    if (negative.status !== expectedStatus || negative.decisionSafe !== false) {
      errors.push(`${negative.id}: negative case status must match implemented local evidence without claiming decision safety`);
    }
    if (implementedLocal) {
      if (JSON.stringify(negative.evidence) !== JSON.stringify(LOGIN_CONTROL_EVIDENCE)) {
        errors.push(`${negative.id}: implemented local control evidence is incomplete`);
      }
      for (const evidence of negative.evidence ?? []) {
        if (!existsSync(join(repoRoot, evidence))) errors.push(`${negative.id}: evidence source does not exist: ${evidence}`);
      }
    } else if (negative.evidence !== undefined) {
      errors.push(`${negative.id}: unimplemented case cannot claim implementation evidence`);
    }
  }
  const login = (census.criticalFlows ?? []).find(({ id }) => id === 'login-return-intent');
  if (!login || login.status !== 'unverified' || login.decisionSafe !== false) errors.push('login return intent must remain unverified');
  if ((login?.producerRecordIds?.length ?? 0) === 0) errors.push('login return intent producer is missing');
  if ((login?.consumerRecordIds?.length ?? 0) === 0) errors.push('login return intent consumer is missing');
  if ((login?.sinkRecordIds?.length ?? 0) < 2) errors.push('login return intent soft/hard navigation sinks are missing');
  const referencedIds = [...(login?.producerRecordIds ?? []), ...(login?.consumerRecordIds ?? []), ...(login?.sinkRecordIds ?? [])];
  for (const id of referencedIds) if (!ids.has(id)) errors.push(`login flow references missing record: ${id}`);
  const inventoryHash = createHash('sha256').update(JSON.stringify({
    records: census.records,
    negatives: census.requiredNegativeCases,
    criticalFlows: census.criticalFlows,
  })).digest('hex');
  if (census?.sourceScope?.inventoryHash !== inventoryHash) errors.push('inventoryHash does not match records and required cases');
  return errors;
}

export function compareUrlStateCensus(expected, actual) {
  return JSON.stringify(expected) === JSON.stringify(actual)
    ? []
    : ['config/ui-url-state-census.json drifted from the current generated census'];
}

function parseCliArgs(argv) {
  const args = { mode: 'check', manifestPath: DEFAULT_MANIFEST_PATH };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--check') args.mode = 'check';
    else if (arg === '--json') args.mode = 'json';
    else if (arg === '--write') args.mode = 'write';
    else if (arg === '--manifest' && argv[index + 1]) args.manifestPath = resolve(argv[++index]);
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

function runCli() {
  const args = parseCliArgs(process.argv.slice(2));
  const actual = buildUrlStateCensus();
  const validationErrors = validateUrlStateCensus(actual);
  if (validationErrors.length > 0) throw new Error(`generated URL-state census is invalid:\n${validationErrors.join('\n')}`);
  if (args.mode === 'json') process.stdout.write(`${JSON.stringify(actual, null, 2)}\n`);
  else if (args.mode === 'write') {
    writeFileSync(args.manifestPath, `${JSON.stringify(actual, null, 2)}\n`, 'utf8');
    process.stdout.write(`wrote ${normalizePath(relative(DEFAULT_REPO_ROOT, args.manifestPath))}\n`);
  } else {
    const expected = JSON.parse(readFileSync(args.manifestPath, 'utf8'));
    const expectedErrors = validateUrlStateCensus(expected);
    const drift = compareUrlStateCensus(expected, actual);
    const errors = [...expectedErrors, ...drift];
    if (errors.length > 0) throw new Error(`URL-state census contract failed:\n${errors.join('\n')}`);
    const exact = actual.summary.exactPopulations;
    process.stdout.write(
      `URL-state census: ${actual.summary.records} records; dynamic=${exact.dynamicRoutePatterns}, `
      + `config redirects=${exact.configRedirects}, page redirects=${exact.pageRedirects}, `
      + `ambiguous=${actual.summary.ambiguousRecords}\n`,
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
