#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_TIERS = new Set(['pre-push', 'local-full', 'local-e2e', 'ci']);
const RULE_ID = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/;
const SEVERITY = new Map([['off', 0], ['warn', 1], ['error', 2]]);

function posix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function isSafeRelative(relativePath) {
  return typeof relativePath === 'string'
    && relativePath.length > 0
    && !path.isAbsolute(relativePath)
    && !relativePath.split(/[\\/]/).includes('..');
}

function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function isFile(target) {
  try {
    return fs.statSync(target).isFile();
  } catch {
    return false;
  }
}

function walkJavaFiles(directory) {
  if (!isDirectory(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkJavaFiles(target);
    return entry.isFile() && entry.name.endsWith('.java') ? [target] : [];
  });
}

function stripJavaComments(source) {
  let output = '';
  let state = 'code';
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (state === 'line') {
      if (current === '\n') {
        output += current;
        state = 'code';
      }
      continue;
    }
    if (state === 'block') {
      if (current === '*' && next === '/') {
        index += 1;
        state = 'code';
      } else if (current === '\n') {
        output += current;
      }
      continue;
    }
    if (state === 'string' || state === 'character') {
      output += current;
      if (current === '\\') {
        output += source[index + 1] ?? '';
        index += 1;
      } else if ((state === 'string' && current === '"') || (state === 'character' && current === "'")) {
        state = 'code';
      }
      continue;
    }
    if (current === '/' && next === '/') {
      index += 1;
      state = 'line';
    } else if (current === '/' && next === '*') {
      index += 1;
      state = 'block';
    } else {
      output += current;
      if (current === '"') state = 'string';
      if (current === "'") state = 'character';
    }
  }
  return output;
}

function javaCodeMask(source) {
  const output = source.split('');
  let state = 'code';
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    const third = source[index + 2];
    if (state === 'line') {
      if (current === '\n') state = 'code';
      else output[index] = ' ';
      continue;
    }
    if (state === 'block') {
      if (current === '*' && next === '/') {
        output[index] = output[index + 1] = ' ';
        index += 1;
        state = 'code';
      } else if (current !== '\n' && current !== '\r') output[index] = ' ';
      continue;
    }
    if (state === 'string' || state === 'character' || state === 'template') {
      if (current === '\\') {
        output[index] = ' ';
        if (index + 1 < output.length) output[index + 1] = ' ';
        index += 1;
      } else if ((state === 'string' && current === '"')
        || (state === 'character' && current === "'")
        || (state === 'template' && current === '`')) {
        output[index] = ' ';
        state = 'code';
      } else if (current !== '\n' && current !== '\r') output[index] = ' ';
      continue;
    }
    if (state === 'text-block') {
      if (current === '"' && next === '"' && third === '"') {
        output[index] = output[index + 1] = output[index + 2] = ' ';
        index += 2;
        state = 'code';
      } else if (current !== '\n' && current !== '\r') output[index] = ' ';
      continue;
    }
    if (current === '/' && next === '/') {
      output[index] = output[index + 1] = ' ';
      index += 1;
      state = 'line';
    } else if (current === '/' && next === '*') {
      output[index] = output[index + 1] = ' ';
      index += 1;
      state = 'block';
    } else if (current === '"' && next === '"' && third === '"') {
      output[index] = output[index + 1] = output[index + 2] = ' ';
      index += 2;
      state = 'text-block';
    } else if (current === '"') {
      output[index] = ' ';
      state = 'string';
    } else if (current === "'") {
      output[index] = ' ';
      state = 'character';
    } else if (current === '`') {
      output[index] = ' ';
      state = 'template';
    }
  }
  return output.join('');
}

function stripHashComments(source) {
  return source.split(/\r?\n/).map((line) => {
    let quote = null;
    for (let index = 0; index < line.length; index += 1) {
      const current = line[index];
      if (quote) {
        if (current === '\\') index += 1;
        else if (current === quote) quote = null;
        continue;
      }
      if (current === '"' || current === "'") {
        quote = current;
      } else if (current === '#' && (index === 0 || /\s/.test(line[index - 1]))) {
        return line.slice(0, index);
      }
    }
    return line;
  }).join('\n');
}

function executableContent(source) {
  return stripHashComments(stripJavaComments(source));
}

function yamlScalar(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  return trimmed === '' ? null : trimmed;
}

export function parseMutationScopeMatrix(source) {
  const lines = source.split(/\r?\n/);
  const jobStart = lines.findIndex((line) => /^  mutation-scope:\s*$/.test(line));
  if (jobStart < 0) return { scopes: [], errors: ['CI mutation-scope job is missing'] };
  const relativeJobEnd = lines.slice(jobStart + 1)
    .findIndex((line) => /^  [A-Za-z0-9_-]+:\s*$/.test(line));
  const jobEnd = relativeJobEnd < 0 ? lines.length : jobStart + 1 + relativeJobEnd;
  const jobLines = lines.slice(jobStart, jobEnd);
  const includeStart = jobLines.findIndex((line) => /^        include:\s*$/.test(line));
  if (includeStart < 0) return { scopes: [], errors: ['CI mutation-scope matrix include catalog is missing'] };

  const scopes = [];
  const errors = [];
  let current = null;
  const finish = () => {
    if (!current) return;
    const fields = ['scope', 'gradle', 'classes', 'tests'];
    const missing = fields.filter((field) => typeof current[field] !== 'string' || current[field] === '');
    if (missing.length > 0) {
      errors.push(`CI mutation matrix entry is missing fields: ${missing.join(', ')}`);
    } else {
      scopes.push(current);
    }
    current = null;
  };

  for (const line of jobLines.slice(includeStart + 1)) {
    const scopeMatch = /^          - scope:\s*(.+?)\s*$/.exec(line);
    if (scopeMatch) {
      finish();
      current = { scope: yamlScalar(scopeMatch[1]) };
      continue;
    }
    if (/^    steps:\s*$/.test(line)) break;
    const fieldMatch = /^            (gradle|classes|tests):\s*(.+?)\s*$/.exec(line);
    if (fieldMatch && current) {
      if (Object.hasOwn(current, fieldMatch[1])) {
        errors.push(`CI mutation matrix scope ${current.scope ?? '(missing)'} duplicates field ${fieldMatch[1]}`);
      }
      current[fieldMatch[1]] = yamlScalar(fieldMatch[2]);
    }
  }
  finish();
  return { scopes, errors };
}

function javaClassNames(sourceRoot) {
  if (!isDirectory(sourceRoot)) return [];
  return walkJavaFiles(sourceRoot).map((source) => path.relative(sourceRoot, source)
    .replace(/\.java$/, '')
    .split(path.sep)
    .join('.'));
}

function classGlobMatches(glob, className) {
  const pattern = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll('*', '.*')
    .replaceAll('?', '.');
  return new RegExp(`^${pattern}$`).test(className);
}

function validateMutationScopeCatalog(selector, repoRoot, errors, setLabel) {
  const expected = selector.matrixScopes;
  if (!Array.isArray(expected)) {
    errors.push(`${setLabel}: PIT matrix catalog must contain exactly 10 scopes`);
    return;
  }
  if (expected.length !== 10) {
    errors.push(`${setLabel}: PIT matrix catalog must contain exactly 10 scopes`);
  }

  const expectedByScope = new Map();
  for (const entry of expected) {
    const fields = ['scope', 'gradle', 'classes', 'tests'];
    if (fields.some((field) => typeof entry?.[field] !== 'string' || entry[field].trim() === '')) {
      errors.push(`${setLabel}: PIT matrix entries require scope, gradle, classes, and tests`);
      continue;
    }
    if (expectedByScope.has(entry.scope)) {
      errors.push(`${setLabel}: duplicate PIT matrix scope '${entry.scope}'`);
      continue;
    }
    expectedByScope.set(entry.scope, entry);

    const gradleMatch = /^:([a-z0-9-]+):pitest$/.exec(entry.gradle);
    if (!gradleMatch) {
      errors.push(`${setLabel}: PIT scope ${entry.scope} has invalid Gradle task '${entry.gradle}'`);
      continue;
    }
    const moduleRoot = path.join(repoRoot, gradleMatch[1]);
    for (const [field, sourceSet] of [['classes', 'main'], ['tests', 'test']]) {
      const globs = entry[field].split(',').map((glob) => glob.trim());
      if (globs.some((glob) => glob === '') || new Set(globs).size !== globs.length) {
        errors.push(`${setLabel}: PIT scope ${entry.scope} has invalid or duplicate ${field} globs`);
        continue;
      }
      const actualClasses = javaClassNames(path.join(moduleRoot, 'src', sourceSet, 'java'));
      for (const glob of globs) {
        if (!actualClasses.some((className) => classGlobMatches(glob, className))) {
          errors.push(`${setLabel}: PIT scope ${entry.scope} ${field} glob '${glob}' matches no Java class in ${gradleMatch[1]}/src/${sourceSet}/java`);
        }
      }
    }
  }

  const workflowPath = path.join(repoRoot, '.github', 'workflows', 'ci.yml');
  const parsed = isFile(workflowPath)
    ? parseMutationScopeMatrix(fs.readFileSync(workflowPath, 'utf8'))
    : { scopes: [], errors: ['CI workflow is missing'] };
  errors.push(...parsed.errors.map((error) => `${setLabel}: ${error}`));
  const actualByScope = new Map();
  for (const entry of parsed.scopes) {
    if (actualByScope.has(entry.scope)) {
      errors.push(`${setLabel}: duplicate CI mutation matrix scope '${entry.scope}'`);
    } else {
      actualByScope.set(entry.scope, entry);
    }
  }
  for (const [scope, expectedEntry] of expectedByScope) {
    const actualEntry = actualByScope.get(scope);
    if (!actualEntry) {
      errors.push(`${setLabel}: PIT matrix scope '${scope}' is missing from ci.yml`);
      continue;
    }
    for (const field of ['gradle', 'classes', 'tests']) {
      if (actualEntry[field] !== expectedEntry[field]) {
        errors.push(`${setLabel}: PIT matrix scope '${scope}' field '${field}' differs between registry and ci.yml`);
      }
    }
  }
  for (const scope of actualByScope.keys()) {
    if (!expectedByScope.has(scope)) {
      errors.push(`${setLabel}: unregistered CI mutation matrix scope '${scope}'`);
    }
  }
}

export function exactBindingLineMatches(source, expectedLine) {
  return executableContent(source)
    .split(/\r?\n/)
    .some((line) => line.trim() === expectedLine);
}

function topLevelCallArguments(mask, openIndex, closeIndex) {
  const ranges = [];
  let start = openIndex + 1;
  let parentheses = 0;
  let brackets = 0;
  let braces = 0;
  for (let index = start; index < closeIndex; index += 1) {
    const current = mask[index];
    if (current === '(') parentheses += 1;
    else if (current === ')') parentheses -= 1;
    else if (current === '[') brackets += 1;
    else if (current === ']') brackets -= 1;
    else if (current === '{') braces += 1;
    else if (current === '}') braces -= 1;
    else if (current === ',' && parentheses === 0 && brackets === 0 && braces === 0) {
      ranges.push({ start, end: index });
      start = index + 1;
    }
  }
  ranges.push({ start, end: closeIndex });
  return ranges;
}

function activeSkipOptionIndexes(mask, start, end) {
  const indexes = [];
  while (start < end && /\s/.test(mask[start])) start += 1;
  if (mask[start] !== '{') return indexes;
  const closeIndex = matchingDelimiter(mask, start, '{', '}');
  if (closeIndex < 0 || closeIndex > end) return indexes;

  let depth = 0;
  for (let index = start; index < closeIndex; index += 1) {
    if (mask[index] === '{') {
      depth += 1;
      continue;
    }
    if (mask[index] === '}') {
      depth -= 1;
      continue;
    }
    if (depth !== 1 || /[\w$]/.test(mask[index - 1] ?? '')) continue;
    const property = /^skip\b\s*:\s*/.exec(mask.slice(index, closeIndex));
    if (!property) continue;
    const value = mask.slice(index + property[0].length, closeIndex).trimStart();
    if (!/^false\b/.test(value)) indexes.push(index);
  }
  return indexes;
}

function runnerCallEnd(mask, markerEnd) {
  let openIndex = markerEnd;
  while (openIndex < mask.length && /\s/.test(mask[openIndex])) openIndex += 1;
  if (mask[openIndex] !== '(') return markerEnd;
  const closeIndex = matchingDelimiter(mask, openIndex, '(', ')');
  return closeIndex < 0 ? markerEnd : closeIndex + 1;
}

function nodeSkipOptions(mask) {
  const constructs = [];
  for (const marker of mask.matchAll(/(?<![\w$.])(?:test|it)\s*\(/g)) {
    const openIndex = mask.indexOf('(', marker.index);
    const closeIndex = matchingDelimiter(mask, openIndex, '(', ')');
    if (closeIndex < 0) continue;
    for (const { start, end } of topLevelCallArguments(mask, openIndex, closeIndex)) {
      for (const index of activeSkipOptionIndexes(mask, start, end)) {
        constructs.push({ kind: 'skip-option', index, end: closeIndex + 1 });
      }
    }
  }
  return constructs;
}

export function findRunnerSkipConstructs(source) {
  const code = javaCodeMask(source);
  const constructs = [];
  const patterns = [
    {
      regex: /(?<![\w$.])(?:test|it|describe|suite|specify)\s*(?:\.\s*(?:describe|concurrent|sequential|parallel|serial|each)\s*)*\.\s*(skip|skipIf|todo|only|fixme|fail|fails)\b/g,
      kind: (match) => match[1],
    },
    {
      regex: /(?<![\w$.])x(?:test|it|describe|suite|specify)\s*(?:\.\s*(?:each|concurrent|sequential)\s*)*\(/g,
      kind: () => 'disabled-alias',
    },
    {
      regex: /(?<![\w$.])t\s*\.\s*(skip|todo|only|fixme|fail|fails)\s*\(/g,
      kind: (match) => match[1],
    },
  ];
  for (const { regex, kind } of patterns) {
    for (const match of code.matchAll(regex)) {
      constructs.push({
        kind: kind(match),
        index: match.index,
        end: runnerCallEnd(code, match.index + match[0].replace(/\($/, '').length),
      });
    }
  }
  constructs.push(...nodeSkipOptions(code));
  return constructs
    .sort((left, right) => left.index - right.index || left.end - right.end)
    .map((construct) => ({
      ...construct,
      line: source.slice(0, construct.index).split(/\r?\n/).length,
    }));
}

export function containsRunnerSkip(source) {
  return findRunnerSkipConstructs(source).length > 0;
}

function validateExecutionBindings({
  bindings,
  repoRoot,
  setLabel,
  errors,
  required = false,
  expectedTiers = [],
}) {
  if (!Array.isArray(bindings) || (required && bindings.length === 0)) {
    errors.push(`${setLabel}: execution bindings are required`);
    return;
  }
  const boundTiers = new Set();
  for (const binding of bindings) {
    if (!isSafeRelative(binding?.source) || typeof binding?.fragment !== 'string' || binding.fragment === '') {
      errors.push(`${setLabel}: invalid execution binding`);
      continue;
    }
    if (!Array.isArray(binding.tiers)
      || binding.tiers.length === 0
      || new Set(binding.tiers).size !== binding.tiers.length
      || binding.tiers.some((tier) => !ALLOWED_TIERS.has(tier) || !expectedTiers.includes(tier))) {
      errors.push(`${setLabel}: execution binding tiers must be a non-empty subset of the gate tiers`);
      continue;
    }
    for (const tier of binding.tiers) boundTiers.add(tier);
    const absolute = path.join(repoRoot, binding.source);
    const content = isFile(absolute) ? fs.readFileSync(absolute, 'utf8') : '';
    if (!exactBindingLineMatches(content, binding.fragment)) {
      errors.push(`${setLabel}: ghost execution binding in ${binding.source}: ${binding.fragment}`);
    }
  }
  const missingTiers = expectedTiers.filter((tier) => !boundTiers.has(tier));
  if (missingTiers.length > 0) {
    errors.push(`${setLabel}: execution bindings do not cover declared tiers: ${missingTiers.join(', ')}`);
  }
}

export function hasClassAnnotation(source, annotation, value, expectedClassName) {
  const code = javaCodeMask(source);
  const declaration = /\b(?:(?:public|protected|private|abstract|final|static|sealed|non-sealed)\s+)*class\s+([A-Za-z_$][\w$]*)/.exec(code);
  if (!declaration || declaration[1] !== expectedClassName) return false;
  const escapedAnnotation = annotation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`@${escapedAnnotation}\\s*\\(\\s*["']${escapedValue}["']\\s*\\)`, 'g');
  return [...source.slice(0, declaration.index).matchAll(matcher)]
    .some((match) => code[match.index] === '@');
}

function hasRunnableTestAnnotation(source, archUnit) {
  const code = javaCodeMask(source);
  return archUnit
    ? /@ArchTest\b/.test(code)
    : /@(?:Test|ParameterizedTest|RepeatedTest|TestFactory|ArchTest)\b/.test(code);
}

export function hasGateSkipConstruct(source) {
  const code = javaCodeMask(source);
  return /@(?:Disabled|EnabledIf|DisabledIf|EnabledOn|DisabledOn)[A-Za-z0-9_]*\b/.test(code)
    || /\b(?:Assumptions\s*\.\s*)?assume(?:True|False)\s*\(/.test(code);
}

function braceBlock(source, markerIndex) {
  const open = source.indexOf('{', markerIndex);
  if (open < 0) return null;
  let depth = 0;
  let quote = null;
  for (let index = open; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (quote) {
      if (current === '\\') index += 1;
      else if (current === quote) quote = null;
      continue;
    }
    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }
    if (current === '/' && next === '/') {
      const newline = source.indexOf('\n', index + 2);
      index = newline < 0 ? source.length : newline;
      continue;
    }
    if (current === '/' && next === '*') {
      const close = source.indexOf('*/', index + 2);
      index = close < 0 ? source.length : close + 1;
      continue;
    }
    if (current === '{') depth += 1;
    if (current === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  return null;
}

function matchingDelimiter(mask, openIndex, openToken, closeToken) {
  let depth = 0;
  for (let index = openIndex; index < mask.length; index += 1) {
    if (mask[index] === openToken) depth += 1;
    if (mask[index] === closeToken) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parseQuotedString(source, start, end) {
  const quote = source[start];
  let value = '';
  for (let index = start + 1; index < end; index += 1) {
    const current = source[index];
    if (current === quote) return { value, next: index + 1 };
    if (current !== '\\') {
      value += current;
      continue;
    }
    index += 1;
    if (index >= end) return { error: 'unterminated escape in string array' };
    const escaped = source[index];
    value += ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' })[escaped] ?? escaped;
  }
  return { error: 'unterminated string in array' };
}

function parseStringArray(source, mask, openIndex) {
  const closeIndex = matchingDelimiter(mask, openIndex, '[', ']');
  if (closeIndex < 0) return { error: 'unterminated string array' };
  const values = [];
  let index = openIndex + 1;
  while (index < closeIndex) {
    if (/\s|,/.test(source[index])) {
      index += 1;
      continue;
    }
    if (source[index] === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index + 2);
      index = newline < 0 || newline > closeIndex ? closeIndex : newline + 1;
      continue;
    }
    if (source[index] === '/' && source[index + 1] === '*') {
      const commentClose = source.indexOf('*/', index + 2);
      if (commentClose < 0 || commentClose > closeIndex) return { error: 'unterminated comment in string array' };
      index = commentClose + 2;
      continue;
    }
    if (source[index] !== '"' && source[index] !== "'") {
      return { error: `non-literal value in string array near '${source.slice(index, index + 20).trim()}'` };
    }
    const parsed = parseQuotedString(source, index, closeIndex);
    if (parsed.error) return parsed;
    values.push(parsed.value);
    index = parsed.next;
  }
  return { value: values, closeIndex };
}

function uniqueCodeMatch(mask, pattern, start = 0, end = mask.length) {
  const scoped = mask.slice(start, end);
  const matches = [...scoped.matchAll(new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`))];
  return matches.length === 1
    ? { match: matches[0], index: start + matches[0].index }
    : null;
}

function propertyValueStart(mask, name, start, end) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const marker = uniqueCodeMatch(mask, new RegExp(`\\b${escapedName}\\s*:`), start, end);
  return marker ? marker.index + marker.match[0].length : -1;
}

function readStringProperty(source, mask, name, start, end) {
  let valueStart = propertyValueStart(mask, name, start, end);
  while (valueStart < end && /\s/.test(source[valueStart])) valueStart += 1;
  if (valueStart < 0 || (source[valueStart] !== '"' && source[valueStart] !== "'")) return null;
  const parsed = parseQuotedString(source, valueStart, end);
  return parsed.error || parsed.next > end ? null : parsed.value;
}

function readRegexProperty(source, mask, name, start, end) {
  let valueStart = propertyValueStart(mask, name, start, end);
  while (valueStart < end && /\s/.test(source[valueStart])) valueStart += 1;
  if (valueStart < 0 || source[valueStart] !== '/') return null;
  let characterClass = false;
  for (let index = valueStart + 1; index < end; index += 1) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }
    if (source[index] === '[') characterClass = true;
    else if (source[index] === ']') characterClass = false;
    else if (source[index] === '/' && !characterClass) {
      let flagEnd = index + 1;
      while (flagEnd < end && /[a-z]/i.test(source[flagEnd])) flagEnd += 1;
      return source.slice(valueStart, flagEnd);
    }
  }
  return null;
}

function objectRanges(mask, openIndex, closeIndex) {
  const ranges = [];
  let index = openIndex + 1;
  while (index < closeIndex) {
    if (/\s|,/.test(mask[index])) {
      index += 1;
      continue;
    }
    if (mask[index] !== '{') return null;
    const objectClose = matchingDelimiter(mask, index, '{', '}');
    if (objectClose < 0 || objectClose > closeIndex) return null;
    ranges.push({ start: index, end: objectClose + 1 });
    index = objectClose + 1;
  }
  return ranges;
}

export function validatePlaywrightProjectContract(source, contract) {
  const invalidContract = !contract
    || typeof contract.forbidOnly !== 'string'
    || contract.forbidOnly.trim() === ''
    || !Array.isArray(contract.projects)
    || contract.projects.length === 0
    || contract.projects.some((project) => typeof project?.name !== 'string'
      || typeof project?.testMatch !== 'string'
      || (project.dependencies !== undefined
        && (!Array.isArray(project.dependencies)
          || project.dependencies.some((dependency) => typeof dependency !== 'string'))))
    || new Set(contract.projects.map(({ name }) => name)).size !== contract.projects.length;
  if (invalidContract) return ['invalid Playwright project contract'];

  const errors = [];
  const mask = javaCodeMask(source);
  let forbidOnlyStart = propertyValueStart(mask, 'forbidOnly', 0, mask.length);
  while (forbidOnlyStart >= 0 && forbidOnlyStart < mask.length && /\s/.test(mask[forbidOnlyStart])) {
    forbidOnlyStart += 1;
  }
  const forbidOnlyEnd = forbidOnlyStart < 0 ? -1 : mask.indexOf(',', forbidOnlyStart);
  const actualForbidOnly = forbidOnlyEnd < 0
    ? ''
    : mask.slice(forbidOnlyStart, forbidOnlyEnd).replace(/\s/g, '');
  if (actualForbidOnly !== contract.forbidOnly.replace(/\s/g, '')) {
    errors.push('ghost Playwright forbidOnly contract');
  }

  const projectsMarker = uniqueCodeMatch(mask, /\bprojects\s*:\s*\[/);
  const projectsOpen = projectsMarker ? mask.indexOf('[', projectsMarker.index) : -1;
  const projectsClose = projectsOpen < 0 ? -1 : matchingDelimiter(mask, projectsOpen, '[', ']');
  const ranges = projectsClose < 0 ? null : objectRanges(mask, projectsOpen, projectsClose);
  if (!ranges) {
    errors.push('ghost Playwright projects contract');
    return errors;
  }

  const actualNames = ranges.map(({ start, end }) => readStringProperty(source, mask, 'name', start, end));
  const expectedNames = contract.projects.map(({ name }) => name);
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    errors.push(`ghost Playwright project names contract: expected ${expectedNames.join(',')}`);
  }

  for (let index = 0; index < contract.projects.length; index += 1) {
    const expected = contract.projects[index];
    const range = ranges[index];
    if (!range
      || actualNames[index] !== expected.name
      || readRegexProperty(source, mask, 'testMatch', range.start, range.end) !== expected.testMatch) {
      errors.push(`ghost Playwright project contract for ${expected.name}`);
      continue;
    }
    if (expected.dependencies !== undefined) {
      const dependencies = parseArrayProperty(
        source,
        mask,
        'dependencies',
        ':',
        range.start,
        range.end,
      );
      if (dependencies.error
        || JSON.stringify(dependencies.value) !== JSON.stringify(expected.dependencies)) {
        errors.push(`ghost Playwright project contract for ${expected.name}`);
      }
    }
  }
  return errors;
}

function parseArrayProperty(source, mask, name, separator, start = 0, end = mask.length) {
  const escapedName = String(name ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const marker = uniqueCodeMatch(mask, new RegExp(`\\b${escapedName}\\s*${separator}\\s*\\[`), start, end);
  if (!marker) return { error: `expected exactly one executable ${name} string array` };
  const openIndex = mask.indexOf('[', marker.index);
  if (openIndex < 0 || openIndex >= end) return { error: `missing ${name} array` };
  return parseStringArray(source, mask, openIndex);
}

function uniqueNamedBlock(source, mask, pattern, label) {
  const marker = uniqueCodeMatch(mask, pattern);
  if (!marker) return { error: `expected exactly one executable ${label} block` };
  const openIndex = mask.indexOf('{', marker.index);
  const closeIndex = openIndex < 0 ? -1 : matchingDelimiter(mask, openIndex, '{', '}');
  return closeIndex < 0
    ? { error: `unterminated ${label} block` }
    : { openIndex, closeIndex };
}

export function readPopulationConsumer(source, selector) {
  const mask = javaCodeMask(source);
  if (selector?.type === 'gradle-list-assignment') {
    if (typeof selector.name !== 'string' || selector.name.trim() === '') {
      return { error: 'gradle-list-assignment requires a variable name' };
    }
    const escapedName = String(selector.name ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parsed = parseArrayProperty(source, mask, selector.name, '=', 0, mask.length);
    if (parsed.error || !uniqueCodeMatch(mask, new RegExp(`\\bdef\\s+${escapedName}\\s*=`))) {
      return { error: parsed.error ?? `expected exactly one executable def ${selector.name} assignment` };
    }
    return { exclude: parsed.value };
  }

  if (selector?.type === 'vitest-coverage-population') {
    const block = uniqueNamedBlock(source, mask, /\bcoverage\s*:\s*\{/, 'Vitest coverage');
    if (block.error) return block;
    const include = parseArrayProperty(source, mask, 'include', ':', block.openIndex, block.closeIndex);
    const exclude = parseArrayProperty(source, mask, 'exclude', ':', block.openIndex, block.closeIndex);
    if (include.error || exclude.error) return { error: include.error ?? exclude.error };
    return { include: include.value, exclude: exclude.value };
  }

  if (selector?.type === 'gradle-pitest-population') {
    const block = uniqueNamedBlock(source, mask, /\bpitest\s*\{/, 'Gradle pitest');
    if (block.error) return block;
    const excludedClasses = parseArrayProperty(
      source,
      mask,
      'excludedClasses',
      '=',
      block.openIndex,
      block.closeIndex,
    );
    if (excludedClasses.error) return excludedClasses;
    const booleanMatch = uniqueCodeMatch(
      mask,
      /\bfailWhenNoMutations\s*=\s*(true|false)\b/,
      block.openIndex,
      block.closeIndex,
    );
    if (!booleanMatch) return { error: 'expected exactly one executable failWhenNoMutations boolean' };
    return {
      excludedClasses: excludedClasses.value,
      failWhenNoMutations: booleanMatch.match[1] === 'true',
    };
  }

  return { error: `unsupported population selector type '${selector?.type ?? ''}'` };
}

function numeric(value) {
  return Number(String(value).replaceAll('_', ''));
}

function singleMatch(content, pattern) {
  const matches = [...content.matchAll(new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`))];
  return matches.length === 1 ? matches[0][1] : null;
}

function readConsumerValue(repoRoot, ratchet) {
  const absolute = path.join(repoRoot, ratchet.source);
  if (!isFile(absolute)) return { error: `ghost quality source: ${ratchet.source}` };
  const content = fs.readFileSync(absolute, 'utf8');
  const executable = executableContent(content);
  const selector = ratchet.selector ?? {};

  if (selector.type === 'gradle-jacoco-limit') {
    const marker = executable.indexOf(`tasks.register('${selector.task}'`);
    const block = marker < 0 ? null : braceBlock(executable, marker);
    if (!block) return { error: `ghost quality selector for ${ratchet.id}: Gradle task ${selector.task}` };
    if (/\benabled\s*=\s*false\b/.test(block) || /\bonlyIf\s*\{\s*false\s*\}/.test(block)) {
      return { error: `ghost quality selector for ${ratchet.id}: disabled Gradle task ${selector.task}` };
    }
    const counter = selector.counter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const value = selector.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const raw = singleMatch(block, new RegExp(`counter\\s*=\\s*['"]${counter}['"][\\s\\S]*?value\\s*=\\s*['"]${value}['"][\\s\\S]*?minimum\\s*=\\s*([0-9._]+)`));
    return raw === null
      ? { error: `ghost quality selector for ${ratchet.id}: JaCoCo ${selector.counter}` }
      : { value: numeric(raw) };
  }

  if (selector.type === 'gradle-jacoco-direct-limit') {
    const marker = executable.indexOf(`${selector.task} {`);
    const taskBlock = marker < 0 ? null : braceBlock(executable, marker);
    if (taskBlock && (/\benabled\s*=\s*false\b/.test(taskBlock) || /\bonlyIf\s*\{\s*false\s*\}/.test(taskBlock))) {
      return { error: `ghost quality selector for ${ratchet.id}: disabled Gradle task ${selector.task}` };
    }
    const candidates = [];
    for (const match of taskBlock?.matchAll(/\brule\s*\{/g) ?? []) {
      const rule = braceBlock(taskBlock, match.index);
      if (!rule) continue;
      const element = singleMatch(rule, /\belement\s*=\s*['"]([A-Z]+)['"]/) ?? 'BUNDLE';
      const counter = singleMatch(rule, /\bcounter\s*=\s*['"]([A-Z]+)['"]/) ?? 'INSTRUCTION';
      const value = singleMatch(rule, /\bvalue\s*=\s*['"]([A-Z]+)['"]/) ?? 'COVEREDRATIO';
      const minimum = singleMatch(rule, /\bminimum\s*=\s*([0-9._]+)/);
      if (minimum !== null && element === selector.element && counter === selector.counter && value === selector.value) {
        candidates.push(numeric(minimum));
      }
    }
    return candidates.length === 1
      ? { value: candidates[0] }
      : { error: `ghost quality selector for ${ratchet.id}: ${selector.task} ${selector.element}/${selector.counter}` };
  }

  if (selector.type === 'gradle-mutation-threshold') {
    const environment = String(selector.environment ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const strictValue = String(selector.strictValue ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `mutationThreshold\\s*=\\s*System\\.getenv\\(\\s*['"]${environment}['"]\\s*\\)\\s*==\\s*['"]${strictValue}['"]\\s*\\?\\s*([0-9_]+)\\s*:\\s*([0-9_]+)`,
      'g',
    );
    const matches = [...executable.matchAll(pattern)];
    if (matches.length !== 1 || numeric(matches[0][2]) !== selector.relaxedValue) {
      return { error: `ghost quality selector for ${ratchet.id}: fail-closed mutationThreshold condition` };
    }
    return { value: numeric(matches[0][1]) };
  }

  if (selector.type === 'vitest-coverage-threshold') {
    const marker = executable.indexOf('thresholds:');
    const block = marker < 0 ? null : braceBlock(executable, marker);
    const key = selector.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const raw = block ? singleMatch(block, new RegExp(`\\b${key}\\s*:\\s*([0-9._]+)`)) : null;
    return raw === null
      ? { error: `ghost quality selector for ${ratchet.id}: Vitest ${selector.key}` }
      : { value: numeric(raw) };
  }

  if (selector.type === 'package-script-flag') {
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      return { error: `cannot parse ${ratchet.source}: ${error.message}` };
    }
    const command = parsed.scripts?.[selector.script];
    const flag = selector.flag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const raw = typeof command === 'string'
      ? singleMatch(command, new RegExp(`${flag}\\s+([0-9_]+)`))
      : null;
    return raw === null
      ? { error: `ghost quality selector for ${ratchet.id}: script ${selector.script} ${selector.flag}` }
      : { value: numeric(raw) };
  }

  if (selector.type === 'javascript-object-number') {
    const marker = executable.indexOf(`const ${selector.object} =`);
    const objectBlock = marker < 0 ? null : braceBlock(executable, marker);
    const propertyMarker = objectBlock?.indexOf(`${selector.property}:`);
    const propertyBlock = propertyMarker === undefined || propertyMarker < 0
      ? null
      : braceBlock(objectBlock, propertyMarker);
    const key = selector.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const raw = propertyBlock ? singleMatch(propertyBlock, new RegExp(`\\b${key}\\s*:\\s*([0-9._]+)`)) : null;
    return raw === null
      ? { error: `ghost quality selector for ${ratchet.id}: ${selector.object}.${selector.property}.${selector.key}` }
      : { value: numeric(raw) };
  }

  if (selector.type === 'eslint-rule-severity') {
    const rule = selector.rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const raw = singleMatch(executable, new RegExp(`["']${rule}["']\\s*:\\s*["'](off|warn|error)["']`));
    return raw === null
      ? { error: `ghost quality selector for ${ratchet.id}: ESLint rule ${selector.rule}` }
      : { value: raw };
  }

  return { error: `unsupported quality selector for ${ratchet.id}: ${selector.type ?? '(missing)'}` };
}

function sameValue(left, right) {
  return typeof left === 'number' && typeof right === 'number'
    ? Math.abs(left - right) < 1e-12
    : left === right;
}

export function loadGovernanceRegistry(registryPath) {
  return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
}

function walkCatalogFiles(directory, recursive) {
  if (!isDirectory(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return recursive ? walkCatalogFiles(target, true) : [];
    return entry.isFile() ? [target] : [];
  });
}

function validateRequiredContexts(value, knownContexts, label, errors) {
  const contexts = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(contexts)
    || contexts.length === 0
    || new Set(contexts).size !== contexts.length
    || contexts.some((context) => typeof context !== 'string' || context.trim() === '')) {
    errors.push(`${label}: requiredCiContext must be a non-empty string or unique string array`);
    return;
  }
  for (const context of contexts) {
    if (!knownContexts.has(context)) errors.push(`${label}: unknown required CI context '${context}'`);
  }
}

function validateStringArray(value, label, field, errors) {
  if (!Array.isArray(value)
    || value.length === 0
    || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    errors.push(`${label}: ${field} must be a non-empty string array`);
  }
}

function validIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

function validatePlaywrightSkipWaivers({ selector, catalogSources, repoRoot, setLabel, errors }) {
  if (!Array.isArray(selector.skipWaivers)) {
    errors.push(`${setLabel}: Playwright skipWaivers must be an array`);
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const constructsBySource = new Map();
  for (const source of catalogSources) {
    constructsBySource.set(
      source,
      findRunnerSkipConstructs(fs.readFileSync(path.join(repoRoot, source), 'utf8')),
    );
  }

  const waiverIds = new Set();
  const waiverLocations = new Set();
  const waivedConstructs = new Set();
  for (const waiver of selector.skipWaivers) {
    const id = waiver?.id ?? '(missing-waiver-id)';
    const location = `${waiver?.source ?? ''}\0${waiver?.stableToken ?? ''}`;
    if (!RULE_ID.test(id)
      || !isSafeRelative(waiver?.source)
      || typeof waiver?.stableToken !== 'string'
      || waiver.stableToken.trim() === ''
      || waiver.stableToken.includes('\n')
      || typeof waiver?.owner !== 'string'
      || waiver.owner.trim() === ''
      || typeof waiver?.reason !== 'string'
      || waiver.reason.trim().length < 20
      || typeof waiver?.condition !== 'string'
      || waiver.condition.trim() === '') {
      errors.push(`${setLabel}: invalid structured Playwright skip waiver ${id}`);
      continue;
    }
    if (waiver.condition !== waiver.stableToken) {
      errors.push(`${setLabel}: Playwright skip waiver ${id} condition must equal its exact stableToken`);
    }
    if (waiverIds.has(id) || waiverLocations.has(location)) {
      errors.push(`${setLabel}: duplicate Playwright skip waiver ${id}`);
      continue;
    }
    waiverIds.add(id);
    waiverLocations.add(location);
    if (!validIsoDate(waiver.reviewBy)) {
      errors.push(`${setLabel}: Playwright skip waiver ${id} has invalid reviewBy`);
    } else if (waiver.reviewBy <= today) {
      errors.push(`${setLabel}: expired Playwright skip waiver ${id} (${waiver.reviewBy})`);
    }
    if (!catalogSources.has(waiver.source)) {
      errors.push(`${setLabel}: stale Playwright skip waiver ${id} points outside the catalog`);
      continue;
    }

    const sourceText = fs.readFileSync(path.join(repoRoot, waiver.source), 'utf8');
    const tokenIndexes = [];
    let index = sourceText.indexOf(waiver.stableToken);
    while (index >= 0) {
      tokenIndexes.push(index);
      index = sourceText.indexOf(waiver.stableToken, index + waiver.stableToken.length);
    }
    const constructs = constructsBySource.get(waiver.source) ?? [];
    const matches = tokenIndexes.flatMap((tokenIndex) => constructs
      .map((construct, constructIndex) => ({ construct, constructIndex }))
      .filter(({ construct }) => tokenIndex >= construct.index && tokenIndex < construct.end));
    if (tokenIndexes.length !== 1 || matches.length !== 1) {
      errors.push(`${setLabel}: stale Playwright skip waiver ${id} does not identify exactly one construct`);
      continue;
    }
    const [{ construct, constructIndex }] = matches;
    if (!['skip', 'skipIf'].includes(construct.kind)) {
      errors.push(`${setLabel}: Playwright waiver ${id} may cover only a conditional skip, not ${construct.kind}`);
      continue;
    }
    waivedConstructs.add(`${waiver.source}\0${constructIndex}`);
  }

  for (const [source, constructs] of constructsBySource) {
    constructs.forEach((construct, constructIndex) => {
      if (!waivedConstructs.has(`${source}\0${constructIndex}`)) {
        errors.push(`${setLabel}: unwaived Playwright skip construct ${construct.kind} at ${source}:${construct.line}`);
      }
    });
  }
}

function hasValidUniqueStrings(value) {
  return Array.isArray(value)
    && value.length > 0
    && value.every((item) => typeof item === 'string' && item.trim() !== '')
    && new Set(value).size === value.length;
}

function sameStringList(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((item, index) => item === right[index]);
}

function denominatorWideGlob(pattern) {
  return typeof pattern === 'string'
    && /^(?:\*{1,2})(?:[/.]\*{1,2})*$/.test(pattern.trim().replaceAll('\\', '/'));
}

function validateMinimumPopulation({ currentInclude, baselineInclude, currentExclude, baselineExclude, label, errors }) {
  for (const [field, value] of [
    ['include', currentInclude],
    ['baselineInclude', baselineInclude],
    ['exclude', currentExclude],
    ['baselineExclude', baselineExclude],
  ]) {
    if (value !== undefined && !hasValidUniqueStrings(value)) {
      errors.push(`${label}: ${field} must be a non-empty unique string array`);
    }
  }
  if (Array.isArray(baselineInclude) && Array.isArray(currentInclude)) {
    const missing = baselineInclude.filter((pattern) => !currentInclude.includes(pattern));
    if (missing.length > 0) {
      errors.push(`${label}: coverage include population shrank below baseline: ${missing.join(', ')}`);
    }
  }
  if (Array.isArray(baselineExclude) && Array.isArray(currentExclude)) {
    const added = currentExclude.filter((pattern) => !baselineExclude.includes(pattern));
    if (added.length > 0) {
      errors.push(`${label}: coverage exclude population expanded beyond baseline: ${added.join(', ')}`);
    }
  }
  for (const pattern of currentExclude ?? []) {
    if (denominatorWideGlob(pattern)) {
      errors.push(`${label}: denominator-wide exclusion is forbidden: ${pattern}`);
    }
  }
}

function validatePitMatrixExclusions({ matrixSet, excludedClasses, repoRoot, label, errors }) {
  if (!matrixSet || !Array.isArray(matrixSet.selector?.matrixScopes)) {
    errors.push(`${label}: matrixGateSetId does not resolve to a PIT matrix catalog`);
    return;
  }
  const reported = new Set();
  for (const scope of matrixSet.selector.matrixScopes) {
    const gradleMatch = /^:([a-z0-9-]+):pitest$/.exec(scope.gradle ?? '');
    if (!gradleMatch) continue;
    const classes = javaClassNames(path.join(repoRoot, gradleMatch[1], 'src', 'main', 'java'));
    for (const targetGlob of String(scope.classes ?? '').split(',').map((value) => value.trim()).filter(Boolean)) {
      const targets = classes.filter((className) => classGlobMatches(targetGlob, className));
      if (targets.length === 0) continue;
      const excludedTargets = targets.filter((className) => excludedClasses
        .some((excludeGlob) => classGlobMatches(excludeGlob, className)));
      if (excludedTargets.length === targets.length) {
        const error = `${label}: PIT exclusions erase matrix target '${scope.scope}:${targetGlob}'`;
        if (!reported.has(error)) {
          errors.push(error);
          reported.add(error);
        }
      }
      for (const excludeGlob of excludedClasses) {
        const isBroadPackageGlob = !excludeGlob.startsWith('*') && /[*?]/.test(excludeGlob);
        if (isBroadPackageGlob && targets.some((className) => classGlobMatches(excludeGlob, className))) {
          const error = `${label}: broad PIT exclusion '${excludeGlob}' intersects matrix target '${scope.scope}:${targetGlob}'`;
          if (!reported.has(error)) {
            errors.push(error);
            reported.add(error);
          }
        }
      }
    }
  }
}

function validateQualityPopulations({ registry, repoRoot, errors, registryIds }) {
  if (!Array.isArray(registry?.qualityPopulations) || registry.qualityPopulations.length === 0) {
    errors.push('registry qualityPopulations must be a non-empty array');
    return;
  }

  for (const population of registry.qualityPopulations) {
    const label = population?.id ?? '(missing-population-id)';
    if (!RULE_ID.test(label)) errors.push(`invalid quality population id: ${label}`);
    if (registryIds.has(label)) errors.push(`duplicate registry id: ${label}`);
    registryIds.add(label);
    if (!isSafeRelative(population.source)) {
      errors.push(`${label}: source must be a safe relative path`);
      continue;
    }
    for (const field of ['owner', 'redProof']) {
      if (typeof population[field] !== 'string' || population[field].trim() === '') {
        errors.push(`${label}: missing ${field}`);
      }
    }

    const absolute = path.join(repoRoot, population.source);
    if (!isFile(absolute)) {
      errors.push(`${label}: ghost population source: ${population.source}`);
      continue;
    }
    const consumer = readPopulationConsumer(fs.readFileSync(absolute, 'utf8'), population.selector);
    if (consumer.error) {
      errors.push(`${label}: ghost population selector: ${consumer.error}`);
      continue;
    }

    if (population.selector?.type === 'gradle-list-assignment') {
      validateMinimumPopulation({
        currentExclude: population.exclude,
        baselineExclude: population.baselineExclude,
        label,
        errors,
      });
      if (!sameStringList(consumer.exclude, population.exclude)) {
        errors.push(`${label}: build.gradle exclusion population differs from registry exact order/content`);
      }
      continue;
    }

    if (population.selector?.type === 'vitest-coverage-population') {
      validateMinimumPopulation({
        currentInclude: population.include,
        baselineInclude: population.baselineInclude,
        currentExclude: population.exclude,
        baselineExclude: population.baselineExclude,
        label,
        errors,
      });
      if (!sameStringList(consumer.include, population.include)
        || !sameStringList(consumer.exclude, population.exclude)) {
        errors.push(`${label}: Vitest coverage population differs from registry exact order/content`);
      }
      continue;
    }

    if (population.selector?.type === 'gradle-pitest-population') {
      if (!hasValidUniqueStrings(population.excludedClasses)
        || !hasValidUniqueStrings(population.baselineExcludedClasses)) {
        errors.push(`${label}: PIT exclusion allowlists must be non-empty unique string arrays`);
      }
      for (const pattern of population.excludedClasses ?? []) {
        if (denominatorWideGlob(pattern)) {
          errors.push(`${label}: denominator-wide exclusion is forbidden: ${pattern}`);
        }
      }
      if (!sameStringList(population.excludedClasses, population.baselineExcludedClasses)) {
        errors.push(`${label}: PIT excludedClasses allowlist must remain exact-frozen`);
      }
      if (population.failWhenNoMutations !== true) {
        errors.push(`${label}: failWhenNoMutations must remain true`);
      }
      if (!sameStringList(consumer.excludedClasses, population.excludedClasses)) {
        errors.push(`${label}: Gradle PIT excludedClasses differs from registry exact order/content`);
      }
      if (consumer.failWhenNoMutations !== true) {
        errors.push(`${label}: executable Gradle pitest must set failWhenNoMutations = true`);
      }
      if (consumer.failWhenNoMutations !== population.failWhenNoMutations) {
        errors.push(`${label}: Gradle failWhenNoMutations differs from registry`);
      }
      const matrixSet = registry.gateSets?.find(({ id }) => id === population.matrixGateSetId);
      validatePitMatrixExclusions({
        matrixSet,
        excludedClasses: population.excludedClasses ?? [],
        repoRoot,
        label,
        errors,
      });
      continue;
    }

    errors.push(`${label}: unsupported quality population selector '${population.selector?.type ?? ''}'`);
  }
}

function collectGovernanceAssets(registry, repoRoot) {
  const assets = new Set([
    '.github/CODEOWNERS',
    'config/governance/gates.json',
    'scripts/governance-gates-contract.mjs',
    'scripts/governance-gates-contract.test.mjs',
  ]);
  const addFile = (source) => {
    if (isSafeRelative(source) && isFile(path.join(repoRoot, source))) assets.add(posix(source));
  };

  for (const set of registry?.gateSets ?? []) {
    for (const rule of set.rules ?? []) addFile(rule.source);
    const selector = set.selector ?? {};
    addFile(selector.packageScript?.source);
    addFile(selector.projectContract?.source);
    for (const catalog of [...(selector.catalogs ?? []), ...(selector.supportRoots ?? [])]) {
      if (!isSafeRelative(catalog?.root) || !Array.isArray(catalog?.suffixes)) continue;
      const root = path.join(repoRoot, catalog.root);
      for (const file of walkCatalogFiles(root, catalog.recursive === true)) {
        if (catalog.suffixes.some((suffix) => file.endsWith(suffix))) {
          assets.add(posix(path.relative(repoRoot, file)));
        }
      }
    }
    for (const binding of selector.commandBindings ?? []) addFile(binding.source);
    for (const binding of selector.executionBindings ?? []) addFile(binding.source);
    for (const input of set.inputs ?? []) addFile(input);
  }
  for (const ratchet of registry?.qualityRatchets ?? []) {
    addFile(ratchet.source);
    for (const input of ratchet.inputs ?? []) addFile(input);
  }
  for (const profile of registry?.executionProfiles ?? []) {
    for (const binding of profile.bindings ?? []) addFile(binding.source);
  }
  for (const population of registry?.qualityPopulations ?? []) addFile(population.source);
  return assets;
}

export function codeOwnerCovers(pattern, source) {
  const normalized = pattern.replace(/^\//, '').replaceAll('\\', '/');
  if (normalized.endsWith('/')) return source.startsWith(normalized);
  const glob = normalized
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll('**/', '\u0000')
    .replaceAll('**', '\u0001')
    .replaceAll('*', '[^/]*')
    .replaceAll('?', '[^/]')
    .replaceAll('\u0000', '(?:.*/)?')
    .replaceAll('\u0001', '.*');
  return new RegExp(`^${glob}$`).test(source);
}

export function effectiveCodeOwners(rules, source) {
  let owners = [];
  for (const [pattern, ...candidateOwners] of rules) {
    if (codeOwnerCovers(pattern, source)) owners = candidateOwners;
  }
  return owners;
}

function validateGovernanceOwnership(registry, repoRoot, errors) {
  const codeownersPath = path.join(repoRoot, '.github', 'CODEOWNERS');
  if (!isFile(codeownersPath)) {
    errors.push('governance CODEOWNERS file is missing');
    return;
  }
  const rules = fs.readFileSync(codeownersPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/));

  for (const source of collectGovernanceAssets(registry, repoRoot)) {
    if (!effectiveCodeOwners(rules, source).includes('@lkindo')) {
      errors.push(`governance asset is not CODEOWNERS-protected: ${source}`);
    }
  }
}

export function validateGovernanceRegistry({ registry, repoRoot }) {
  const errors = [];
  const registryIds = new Set();
  const registeredSources = new Set();
  const registeredSelectors = new Set();
  let requiredChecks = [];
  let requiredContexts = new Set();

  try {
    const required = JSON.parse(fs.readFileSync(path.join(repoRoot, '.github', 'required-checks.json'), 'utf8'));
    requiredChecks = required.requiredChecks ?? [];
    requiredContexts = new Set(requiredChecks.map(({ context }) => context));
  } catch (error) {
    errors.push(`cannot read required CI contexts: ${error.message}`);
  }

  if (registry?.schemaVersion !== 1) errors.push('registry schemaVersion must be 1');
  const executionProfiles = new Map();
  if (!Array.isArray(registry?.executionProfiles) || registry.executionProfiles.length === 0) {
    errors.push('registry executionProfiles must be a non-empty array');
  }
  for (const profile of registry?.executionProfiles ?? []) {
    const label = profile?.id ?? '(missing-execution-profile-id)';
    if (!RULE_ID.test(label)) errors.push(`invalid execution profile id: ${label}`);
    if (executionProfiles.has(label)) errors.push(`duplicate execution profile id: ${label}`);
    executionProfiles.set(label, profile);
    if (typeof profile.command !== 'string' || profile.command.trim() === '') {
      errors.push(`${label}: missing execution profile command`);
    }
    if (!Array.isArray(profile.tier)
      || profile.tier.length === 0
      || new Set(profile.tier).size !== profile.tier.length
      || profile.tier.some((tier) => !ALLOWED_TIERS.has(tier))) {
      errors.push(`${label}: execution profile tier is invalid`);
    } else {
      validateExecutionBindings({
        bindings: profile.bindings,
        repoRoot,
        setLabel: label,
        errors,
        required: true,
        expectedTiers: profile.tier,
      });
    }
  }
  if (!Array.isArray(registry?.gateSets) || registry.gateSets.length === 0) {
    errors.push('registry gateSets must be a non-empty array');
  }

  for (const set of registry?.gateSets ?? []) {
    const setLabel = set?.id ?? '(missing-set-id)';
    if (!RULE_ID.test(setLabel)) errors.push(`invalid gate set id: ${setLabel}`);
    if (registryIds.has(setLabel)) errors.push(`duplicate registry id: ${setLabel}`);
    registryIds.add(setLabel);
    const selector = set?.selector;
    if (!Array.isArray(set.tier)
      || set.tier.length === 0
      || new Set(set.tier).size !== set.tier.length
      || set.tier.some((tier) => !ALLOWED_TIERS.has(tier))) {
      errors.push(`${setLabel}: tier must contain only ${[...ALLOWED_TIERS].join(', ')}`);
    }
    if (!(typeof set.task === 'string' && set.task.trim() !== '')
      && !(Array.isArray(set.task)
        && set.task.length > 0
        && set.task.every((task) => typeof task === 'string' && task.trim() !== ''))) {
      errors.push(`${setLabel}: task must be a non-empty string or array`);
    }
    for (const field of ['category', 'owner', 'redProof']) {
      if (typeof set[field] !== 'string' || set[field].trim() === '') errors.push(`${setLabel}: missing ${field}`);
    }
    validateStringArray(set.inputs, setLabel, 'inputs', errors);
    validateStringArray(set.evidence, setLabel, 'evidence', errors);
    validateRequiredContexts(set.requiredCiContext, requiredContexts, setLabel, errors);

    if (selector?.type === 'java-class-annotation') {
      if (!['Tag', 'ArchTag'].includes(selector.annotation)
        || typeof selector.value !== 'string'
        || !Array.isArray(selector.roots)
        || selector.roots.length === 0) {
        errors.push(`${setLabel}: invalid java-class-annotation selector`);
        continue;
      }
      if (!Array.isArray(set.rules) || set.rules.length === 0) {
        errors.push(`${setLabel}: rules must be a non-empty array`);
        continue;
      }

      const roots = selector.roots.filter(isSafeRelative);
      if (roots.length !== selector.roots.length) errors.push(`${setLabel}: selector roots must be safe relative paths`);
      const actual = new Set();
      for (const root of roots) {
        const absoluteRoot = path.join(repoRoot, root);
        if (!isDirectory(absoluteRoot)) {
          errors.push(`${setLabel}: selector root does not exist: ${root}`);
          continue;
        }
        for (const sourcePath of walkJavaFiles(absoluteRoot)) {
          const source = fs.readFileSync(sourcePath, 'utf8');
          if (hasClassAnnotation(
            source,
            selector.annotation,
            selector.value,
            path.basename(sourcePath, '.java'),
          )) {
            actual.add(posix(path.relative(repoRoot, sourcePath)));
          }
        }
      }

      const expected = new Set();
      for (const rule of set.rules) {
        const id = rule?.id ?? '(missing-rule-id)';
        const source = rule?.source;
        if (!RULE_ID.test(id)) errors.push(`invalid gate id: ${id}`);
        if (registryIds.has(id)) errors.push(`duplicate gate id: ${id}`);
        registryIds.add(id);
        if (!isSafeRelative(source)) {
          errors.push(`${id}: source must be a safe relative path`);
          continue;
        }
        if (registeredSources.has(source)) errors.push(`duplicate registered source: ${source}`);
        registeredSources.add(source);
        expected.add(source);
        const absolute = path.join(repoRoot, source);
        if (!isFile(absolute)) {
          errors.push(`ghost gate source: ${source} does not exist`);
        } else {
          const content = fs.readFileSync(absolute, 'utf8');
          const expectedClassName = path.basename(source, '.java');
          if (!hasClassAnnotation(content, selector.annotation, selector.value, expectedClassName)) {
            errors.push(`ghost gate source: ${source} does not satisfy @${selector.annotation}("${selector.value}") on ${expectedClassName}`);
          }
          if (!hasRunnableTestAnnotation(content, selector.annotation === 'ArchTag')) {
            errors.push(`ghost gate source: ${source} declares no runnable test annotation`);
          }
          if (hasGateSkipConstruct(content)) {
            errors.push(`ghost gate source: ${source} contains a disabled, conditional, or assumption-based skip`);
          }
        }
      }
      for (const source of actual) {
        if (!expected.has(source)) errors.push(`unregistered tagged gate in ${setLabel}: ${source}`);
      }
      for (const source of expected) {
        if (!actual.has(source) && isFile(path.join(repoRoot, source))) {
          errors.push(`ghost gate source in ${setLabel}: ${source} is outside the actual selector result`);
        }
      }
      validateExecutionBindings({
        bindings: selector.executionBindings,
        repoRoot,
        setLabel,
        errors,
        required: true,
        expectedTiers: set.tier,
      });
      continue;
    }

    if (selector?.type === 'runner-catalog') {
      if (set.rules !== undefined) errors.push(`${setLabel}: runner catalogs must not enumerate individual test rules`);
      if (!['node-test', 'vitest', 'playwright'].includes(selector.runner)
        || !Array.isArray(selector.catalogs)
        || selector.catalogs.length === 0) {
        errors.push(`${setLabel}: invalid runner-catalog selector`);
        continue;
      }
      const catalogSources = new Set();
      for (const catalog of selector.catalogs) {
        if (!isSafeRelative(catalog?.root)
          || !Array.isArray(catalog?.suffixes)
          || catalog.suffixes.length === 0
          || catalog.suffixes.some((suffix) => typeof suffix !== 'string' || !suffix.startsWith('.'))) {
          errors.push(`${setLabel}: invalid runner catalog root or suffix selector`);
          continue;
        }
        const absoluteRoot = path.join(repoRoot, catalog.root);
        if (!isDirectory(absoluteRoot)) {
          errors.push(`${setLabel}: ghost runner selector root: ${catalog.root}`);
          continue;
        }
        const matches = walkCatalogFiles(absoluteRoot, catalog.recursive === true)
          .filter((source) => catalog.suffixes.some((suffix) => source.endsWith(suffix)));
        if (matches.length === 0) errors.push(`${setLabel}: ghost runner selector matched no tests in ${catalog.root}`);
        for (const source of matches) catalogSources.add(posix(path.relative(repoRoot, source)));
      }

      if (selector.forbidSkips === true) {
        for (const source of catalogSources) {
          const content = fs.readFileSync(path.join(repoRoot, source), 'utf8');
          if (containsRunnerSkip(content)) {
            errors.push(`${setLabel}: runner catalog contains a forbidden skip/only/todo: ${source}`);
          }
        }
      }
      if (selector.runner !== 'playwright' && selector.skipWaivers !== undefined) {
        errors.push(`${setLabel}: only Playwright catalogs may declare skipWaivers`);
      }

      for (const support of selector.supportRoots ?? []) {
        if (!isSafeRelative(support?.root)
          || !Array.isArray(support?.suffixes)
          || support.suffixes.length === 0
          || support.suffixes.some((suffix) => typeof suffix !== 'string' || !suffix.startsWith('.'))) {
          errors.push(`${setLabel}: invalid runner support root or suffix selector`);
          continue;
        }
        const matches = walkCatalogFiles(path.join(repoRoot, support.root), support.recursive === true)
          .filter((source) => support.suffixes.some((suffix) => source.endsWith(suffix)));
        if (matches.length === 0) errors.push(`${setLabel}: ghost runner support root matched no files in ${support.root}`);
      }

      const packageBinding = selector.packageScript;
      if (packageBinding !== undefined) {
        if (!isSafeRelative(packageBinding?.source)
          || typeof packageBinding?.name !== 'string'
          || typeof packageBinding?.command !== 'string') {
          errors.push(`${setLabel}: invalid packageScript selector`);
        } else {
          const absolute = path.join(repoRoot, packageBinding.source);
          try {
            const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
            const actualCommand = parsed.scripts?.[packageBinding.name];
            if (actualCommand !== packageBinding.command) {
              errors.push(`${setLabel}: ghost runner selector package script ${packageBinding.name}`);
            }
          } catch (error) {
            errors.push(`${setLabel}: cannot read runner package ${packageBinding.source}: ${error.message}`);
          }
        }
      }

      if (selector.runner === 'playwright') {
        validatePlaywrightSkipWaivers({ selector, catalogSources, repoRoot, setLabel, errors });
        for (const source of catalogSources) {
          const content = executableContent(fs.readFileSync(path.join(repoRoot, source), 'utf8'));
          if (!/\btest\s*\(/.test(content)) {
            errors.push(`${setLabel}: Playwright spec has no runnable test(): ${source}`);
          }
        }
        const project = selector.projectContract;
        if (!isSafeRelative(project?.source)) {
          errors.push(`${setLabel}: invalid Playwright project contract`);
        } else {
          const absolute = path.join(repoRoot, project.source);
          const content = isFile(absolute) ? fs.readFileSync(absolute, 'utf8') : '';
          errors.push(...validatePlaywrightProjectContract(content, project)
            .map((error) => `${setLabel}: ${error}`));
        }
      }

      const commandBindings = selector.commandBindings ?? [];
      const bindingErrorStart = errors.length;
      validateExecutionBindings({
        bindings: commandBindings,
        repoRoot,
        setLabel,
        errors,
        expectedTiers: set.tier,
      });
      for (let index = bindingErrorStart; index < errors.length; index += 1) {
        errors[index] = errors[index]
          .replace('invalid execution binding', 'invalid runner command binding')
          .replace('ghost execution binding', 'ghost runner command binding');
      }

      for (const bindingSource of selector.catalogCoverage ?? []) {
        if (!isSafeRelative(bindingSource) || !isFile(path.join(repoRoot, bindingSource))) {
          errors.push(`${setLabel}: ghost catalog coverage binding: ${bindingSource}`);
          continue;
        }
        const content = fs.readFileSync(path.join(repoRoot, bindingSource), 'utf8');
        for (const source of catalogSources) {
          if (!content.includes(source)) {
            errors.push(`${setLabel}: unregistered runner catalog item in ${bindingSource}: ${source}`);
          }
        }
      }

      if (packageBinding === undefined && commandBindings.length === 0) {
        errors.push(`${setLabel}: runner catalog has no execution binding`);
      }
      continue;
    }

    if (selector?.type === 'required-check-aggregate') {
      if (set.rules !== undefined) errors.push(`${setLabel}: aggregate runners must not enumerate individual test rules`);
      const check = requiredChecks.find(({ context }) => context === selector.context);
      if (!check
        || check.aggregate?.sourceJobId !== selector.sourceJobId
        || check.aggregate?.sourceRun !== set.task) {
        errors.push(`${setLabel}: ghost required-check aggregate selector for ${selector?.context ?? ''}`);
      } else {
        for (const [name, value] of Object.entries(selector.strictEnvironment ?? {})) {
          if (check.aggregate.sourceEnv?.[name] !== value) {
            errors.push(`${setLabel}: aggregate environment ${name} must remain ${value}`);
          }
        }
      }
      if (selector.context === 'mutation-test') {
        validateMutationScopeCatalog(selector, repoRoot, errors, setLabel);
      }
      continue;
    }

    errors.push(`${setLabel}: unsupported gate selector type '${selector?.type ?? ''}'`);
  }

  validateQualityPopulations({ registry, repoRoot, errors, registryIds });

  if (!Array.isArray(registry?.qualityRatchets) || registry.qualityRatchets.length === 0) {
    errors.push('registry qualityRatchets must be a non-empty array');
  }
  for (const ratchet of registry?.qualityRatchets ?? []) {
    const id = ratchet?.id ?? '(missing-quality-id)';
    if (!RULE_ID.test(id)) errors.push(`invalid quality id: ${id}`);
    if (registryIds.has(id)) errors.push(`duplicate gate id: ${id}`);
    registryIds.add(id);
    const sourceIsSafe = isSafeRelative(ratchet.source);
    if (!sourceIsSafe) errors.push(`${id}: source must be a safe relative path`);
    const selectorFingerprint = `${ratchet.source}\0${JSON.stringify(ratchet.selector)}`;
    if (registeredSelectors.has(selectorFingerprint)) errors.push(`duplicate quality selector: ${id}`);
    registeredSelectors.add(selectorFingerprint);
    if (!Array.isArray(ratchet.tier)
      || ratchet.tier.length === 0
      || new Set(ratchet.tier).size !== ratchet.tier.length
      || ratchet.tier.some((tier) => !ALLOWED_TIERS.has(tier))) {
      errors.push(`${id}: tier must contain only ${[...ALLOWED_TIERS].join(', ')}`);
    }
    for (const field of ['command', 'category', 'owner', 'redProof']) {
      if (typeof ratchet[field] !== 'string' || ratchet[field].trim() === '') errors.push(`${id}: missing ${field}`);
    }
    const executionProfile = executionProfiles.get(ratchet.executionProfile);
    if (!executionProfile) {
      errors.push(`${id}: unknown execution profile '${ratchet.executionProfile ?? ''}'`);
    } else {
      const profileTiers = [...executionProfile.tier].sort();
      const ratchetTiers = [...ratchet.tier].sort();
      if (JSON.stringify(profileTiers) !== JSON.stringify(ratchetTiers)) {
        errors.push(`${id}: execution profile tiers do not match the ratchet tiers`);
      }
      if (executionProfile.command !== ratchet.command) {
        errors.push(`${id}: execution profile command does not match the ratchet command`);
      }
    }
    if (!Array.isArray(ratchet.inputs)
      || ratchet.inputs.length === 0
      || ratchet.inputs.some((input) => typeof input !== 'string' || input.trim() === '')) {
      errors.push(`${id}: inputs must be a non-empty string array`);
    }
    if (!Array.isArray(ratchet.evidence)
      || ratchet.evidence.length === 0
      || ratchet.evidence.some((item) => typeof item !== 'string' || item.trim() === '')) {
      errors.push(`${id}: evidence must be a non-empty string array`);
    }
    validateRequiredContexts(ratchet.requiredCiContext, requiredContexts, id, errors);

    if (ratchet.direction === 'minimum') {
      if (!(typeof ratchet.current === 'number' && typeof ratchet.baseline === 'number')) {
        errors.push(`${id}: numeric minimum ratchet requires current and baseline`);
      } else if (ratchet.current < ratchet.baseline) {
        errors.push(`${id}: weakened below baseline (${ratchet.current} < ${ratchet.baseline})`);
      }
    } else if (ratchet.direction === 'maximum') {
      if (!(typeof ratchet.current === 'number' && typeof ratchet.baseline === 'number')) {
        errors.push(`${id}: numeric maximum ratchet requires current and baseline`);
      } else if (ratchet.current > ratchet.baseline) {
        errors.push(`${id}: weakened above baseline (${ratchet.current} > ${ratchet.baseline})`);
      }
    } else if (ratchet.direction === 'minimum-severity') {
      if (!SEVERITY.has(ratchet.current) || !SEVERITY.has(ratchet.baseline)) {
        errors.push(`${id}: invalid severity ratchet`);
      } else if (SEVERITY.get(ratchet.current) < SEVERITY.get(ratchet.baseline)) {
        errors.push(`${id}: weakened below baseline severity (${ratchet.current} < ${ratchet.baseline})`);
      }
    } else {
      errors.push(`${id}: direction must be minimum, maximum, or minimum-severity`);
    }

    if (sourceIsSafe) {
      const consumer = readConsumerValue(repoRoot, ratchet);
      if (consumer.error) errors.push(consumer.error);
      else if (!sameValue(consumer.value, ratchet.current)) {
        errors.push(`${id}: consumer value ${consumer.value} does not match registry current ${ratchet.current}`);
      }
    }
  }

  validateGovernanceOwnership(registry, repoRoot, errors);

  return errors;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const registryPath = path.join(repoRoot, 'config', 'governance', 'gates.json');
  try {
    const registry = loadGovernanceRegistry(registryPath);
    const errors = validateGovernanceRegistry({ registry, repoRoot });
    if (errors.length > 0) {
      console.error('❌ governance gate registry contract failed:');
      errors.forEach((error) => console.error(`   - ${error}`));
      process.exit(1);
    }
    const ruleCount = registry.gateSets.reduce((sum, set) => sum + (set.rules?.length ?? 0), 0);
    const runnerCount = registry.gateSets.filter(({ selector }) => selector.type !== 'java-class-annotation').length;
    console.log(`✅ governance registry: ${ruleCount} tagged gates, ${runnerCount} runner gates, ${registry.qualityRatchets.length} quality ratchets, ${registry.qualityPopulations.length} population contracts`);
  } catch (error) {
    console.error(`❌ cannot validate governance registry: ${error.message}`);
    process.exit(1);
  }
}
