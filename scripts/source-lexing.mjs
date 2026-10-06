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
