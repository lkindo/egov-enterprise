/** Shared lexical boundaries for the dependency and URL-state source scanners. */
export function skipLineComment(source, start) {
  const end = source.indexOf('\n', start + 2);
  return end < 0 ? source.length : end;
}

export function skipBlockComment(source, start) {
  const close = source.indexOf('*/', start + 2);
  return close < 0 ? -1 : close + 2;
}

export function canStartRegexAfterValue(previous) {
  return previous === undefined
    || ['(', '[', '{', ',', ';', ':', '=', '!', '?', '&', '|', '+', '-', '*', '%', '^', '~', '=>'].includes(previous)
    || ['return', 'throw', 'case', 'delete', 'void', 'typeof', 'instanceof', 'in', 'of', 'yield', 'await'].includes(previous);
}

export function readRegexLiteral(source, start) {
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

export function readQuoted(source, start, quote) {
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

export function readTemplate(source, start) {
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
