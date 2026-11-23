import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const CONSTITUTION_ROOTS = [
  '.agent/knowledge/backend-api-constitution',
  '.agent/knowledge/frontend-ux-constitution',
  '.agent/knowledge/db-standard-constitution',
];

export function isOwnedDoc(file) {
  return /\.md$/i.test(file) && (
    !file.includes('/') || ['docs/', '.githooks/', '.agent/memory/'].some(root => file.startsWith(root))
    || CONSTITUTION_ROOTS.some(root => file.startsWith(`${root}/artifacts/`))
  );
}

export function ownedMarkdown(repoRoot) {
  // Include new owned documents before staging; ignored/vendor files stay outside the catalog.
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: repoRoot, encoding: 'utf8',
  }).split('\0').filter(Boolean);
  return [...new Set(files)].filter(isOwnedDoc)
    .filter(file => fs.existsSync(path.join(repoRoot, file))).sort();
}

const blankExample = value => value.replace(/[^\r\n]/g, ' ');

/** 펜스 코드와 HTML 주석을 같은 길이의 공백으로 가린다. 줄 끝(LF·CRLF)과 글자 위치는 원문과 같다. 인용문 안의 펜스(> ```)도 펜스다. */
function maskBlockExamples(source) {
  let fence = null;
  return source.replace(/<!--[\s\S]*?-->/g, blankExample).replace(/[^\n]*\n|[^\n]+$/g, (line) => {
    const marker = /^(?: {0,3}>[ \t]?)* {0,3}(`{3,}|~{3,})(.*)$/.exec(line.replace(/\r?\n$/, ''));
    if (fence) {
      if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length
        && marker[2].trim() === '') fence = null;
      return blankExample(line);
    }
    if (marker) {
      fence = { char: marker[1][0], length: marker[1].length };
      return blankExample(line);
    }
    return line;
  });
}

/** Preserve line positions while removing fenced examples and HTML comments. */
export function withoutBlockExamples(source) {
  return maskBlockExamples(source.replace(/\r\n?/g, '\n'));
}

function withoutInlineExamples(source) {
  return source.replace(/(`+)([\s\S]*?)\1(?!`)/g, blankExample);
}

/**
 * 코드 예시(펜스·인라인)와 HTML 주석을 가린 글. 길이와 줄 끝이 원문과 같아, 여기서 찾은 위치를 원문에 그대로 쓸 수 있다.
 * 네 칸 들여쓴 코드 블록은 가리지 않는다(목록 안 문단과 가르려면 블록 구조를 풀어야 한다) — 그 안의 링크도 링크로 본다.
 */
export function maskExamples(source) {
  return withoutInlineExamples(maskBlockExamples(source));
}

function decodeEntities(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#39|#x[0-9a-f]+|#\d+);/gi, entity => {
    const names = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&#39;': "'" };
    if (names[entity.toLowerCase()]) return names[entity.toLowerCase()];
    const number = entity.toLowerCase().startsWith('&#x')
      ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10);
    return number <= 0x10ffff ? String.fromCodePoint(number) : entity;
  });
}

export function linkDestination(text) {
  const angle = /^\s*<([^>]+)>/.exec(text);
  if (angle) return angle[1];
  return /^\s*(\S+?)(?:\s+["'].*|\s*$)/.exec(text)?.[1] ?? text.trim();
}

const escapedAt = (text, index) => {
  let slashes = 0;
  for (let at = index - 1; at >= 0 && text[at] === '\\'; at -= 1) slashes += 1;
  return slashes % 2 === 1;
};

/** 글자 [ 에 짝이 맞는 ] 의 위치. 글자 안의 대괄호(중첩 이미지 포함)는 짝을 세고, 줄을 넘기지 않는다. */
function closingBracket(text, open) {
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (char === '\\') { index += 1; continue; }
    if (char === '\n') return -1;
    if (char === '[') depth += 1;
    else if (char === ']' && --depth === 0) return index;
  }
  return -1;
}

const linkSpace = char => char === ' ' || char === '\t' || char === '\r' || char === '\n';

/** ( 뒤의 목적지와 선택적 제목을 읽는다: (dest), (<dest>), (dest "title"), (dest 'title'), (dest (title)). 꼴이 다르면 null. */
function strictDestination(text, from) {
  let index = from;
  while (text[index] === ' ' || text[index] === '\t') index += 1;
  let rawStart;
  let rawEnd;
  if (text[index] === '<') {
    rawStart = index + 1;
    for (index += 1; index < text.length && text[index] !== '>'; index += 1) {
      if (text[index] === '\n' || text[index] === '<') return null;
      if (text[index] === '\\') index += 1;
    }
    if (text[index] !== '>') return null;
    rawEnd = index;
    index += 1;
  } else {
    rawStart = index;
    let depth = 0;
    for (; index < text.length; index += 1) {
      const char = text[index];
      if (char === '\\') { index += 1; continue; }
      if (linkSpace(char)) break;
      if (char === '(') depth += 1;
      else if (char === ')') {
        if (depth === 0) break;
        depth -= 1;
      }
    }
    rawEnd = index;
  }
  let after = index;
  let newlines = 0;
  while (linkSpace(text[after])) {
    if (text[after] === '\n' && ++newlines > 1) return null;
    after += 1;
  }
  if (after > index && (text[after] === '"' || text[after] === "'" || text[after] === '(')) {
    const closer = text[after] === '(' ? ')' : text[after];
    let blank = 0;
    for (after += 1; after < text.length && text[after] !== closer; after += 1) {
      if (text[after] === '\\') { after += 1; continue; }
      if (text[after] === '\n') { if (++blank > 1) return null; } else if (text[after] !== '\r') blank = 0;
    }
    if (text[after] !== closer) return null;
    after += 1;
    while (text[after] === ' ' || text[after] === '\t') after += 1;
  }
  if (text[after] !== ')') return null;
  return { rawStart, rawEnd, raw: text.slice(rawStart, rawEnd), close: after };
}

/** 꼴이 맞지 않는 괄호 묶음은 종전처럼 짝이 맞는 닫는 괄호까지를 보고 첫 토막을 목적지로 읽는다(쓰다 만 링크도 검사에 걸리게). */
function looseDestination(text, open) {
  let depth = 1;
  let end = open;
  let angle = false;
  for (; end < text.length; end += 1) {
    const char = text[end];
    if (char === '\\') { end += 1; continue; }
    if (char === '<') angle = true;
    if (char === '>') angle = false;
    if (!angle && char === '(') depth += 1;
    if (!angle && char === ')' && --depth === 0) break;
  }
  if (depth !== 0) return null;
  const inner = text.slice(open, end);
  const raw = linkDestination(inner);
  const rawStart = open + Math.max(0, inner.indexOf(raw));
  return { rawStart, rawEnd: rawStart + raw.length, raw, close: end };
}

/**
 * 가린 글(maskExamples)에서 인라인 링크와 이미지의 범위를 찾는다. 링크 글자 안의 이미지(배지)는 따로 한 범위로 나온다.
 * 링크 검사와 생성물의 링크 정리(reusable-source-docs)가 같은 범위를 쓴다 — 둘의 해석이 갈리면 고친 결과를 검사가 보증하지 못한다.
 */
export function inlineLinkSpans(masked) {
  const spans = [];
  for (let index = 0; index < masked.length; index += 1) {
    if (masked[index] !== '[' || escapedAt(masked, index)) continue;
    const labelEnd = closingBracket(masked, index);
    if (labelEnd < 0 || masked[labelEnd + 1] !== '(') continue;
    const destination = strictDestination(masked, labelEnd + 2) ?? looseDestination(masked, labelEnd + 2);
    if (!destination) continue;
    const image = index > 0 && masked[index - 1] === '!' && !escapedAt(masked, index - 1);
    spans.push({
      start: image ? index - 1 : index, end: destination.close + 1, image,
      labelStart: index + 1, labelEnd, destStart: destination.rawStart, destEnd: destination.rawEnd, raw: destination.raw,
    });
  }
  return spans;
}

export function documentationLinks(source) {
  const text = maskExamples(source);
  const definitions = new Map();
  for (const match of text.matchAll(/^ {0,3}\[([^\]]+)\]:\s*(.+)$/gm)) {
    definitions.set(match[1].trim().toLowerCase(), linkDestination(match[2]));
  }
  const spans = inlineLinkSpans(text);
  const links = spans.filter(span => !span.image).map(span => ({ index: span.start, raw: span.raw }));
  // 참조형 링크([글자][라벨]·[라벨])는 정의가 있을 때만 링크다. 인라인 링크는 위에서 찾았다.
  for (const match of text.matchAll(/(?<!!|\\)\[([^\]\n]*)\](?!\()(\[([^\]\n]*)\])?/g)) {
    if (text[match.index + match[0].length] === ':') continue;
    const label = (match[3] || match[1]).trim().toLowerCase();
    if (definitions.has(label)) links.push({ index: match.index, raw: definitions.get(label) });
  }
  const result = links.sort((left, right) => left.index - right.index).map(link => link.raw);
  // Images carry the same local-file integrity requirement as ordinary links.
  for (const span of spans) if (span.image) result.push(span.raw);
  for (const match of text.matchAll(/<a\b[^>]*\shref\s*=\s*(["'])(.*?)\1[^>]*>/gi)) {
    result.push(decodeEntities(match[2]));
  }
  return result;
}

export function documentAnchors(source, markdown = true) {
  // Mask raw-text blocks so removing them cannot join tokens or create headings.
  const text = withoutBlockExamples(source)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, value => value.replace(/[^\n]/g, ' '));
  const anchors = new Set();
  // HTML IDs are explicit anchors; <a name> is also supported by repository renderers.
  for (const match of withoutInlineExamples(text).matchAll(/<([a-z][\w-]*)\b[^>]*?\s(id|name)\s*=\s*(["'])(.*?)\3[^>]*>/gi)) {
    if (match[2].toLowerCase() === 'id' || match[1].toLowerCase() === 'a') {
      anchors.add(decodeEntities(match[4]));
    }
  }
  if (!markdown) return anchors;
  const generated = new Set();
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const heading = /^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(lines[index]);
    const setext = index + 1 < lines.length && /^ {0,3}(?:=+|-+)\s*$/.test(lines[index + 1])
      && lines[index].trim() && !/^\s*[>|*-]/.test(lines[index]);
    if (!heading && !setext) continue;
    let title = heading ? heading[1] : lines[index++].trim();
    title = title.replace(/!?\[([^\]]+)\]\([^)]*\)/g, '$1');
    // Extract heading text to a fixed point; this is not an HTML sanitizer.
    let previous;
    do {
      previous = title;
      title = title.replace(/<[^>]*>/g, '');
    } while (title !== previous);
    title = decodeEntities(title);
    const base = title.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');
    let slug = base;
    let suffix = 0;
    while (generated.has(slug)) slug = `${base}-${++suffix}`;
    generated.add(slug);
    anchors.add(slug);
  }
  return anchors;
}

export function validateDocumentationLinks({ repoRoot, files, readFile = file => fs.readFileSync(file, 'utf8') }) {
  const errors = [];
  const anchorCache = new Map();
  let localLinks = 0;
  function check(file, raw, rootRelative = false) {
    if (/^file:/i.test(raw)) { errors.push(`${file} -> ${raw}: machine-local file URL`); return; }
    if (/^(?:https?:|mailto:|tel:|table:|\/\/)/i.test(raw)) return;
    localLinks += 1;
    let decoded;
    try { decoded = decodeURIComponent(raw); } catch { errors.push(`${file} -> ${raw}: invalid URL encoding`); return; }
    const at = decoded.indexOf('#');
    const target = (at < 0 ? decoded : decoded.slice(0, at)).split('?')[0];
    const fragment = at < 0 ? '' : decoded.slice(at + 1);
    const base = rootRelative ? repoRoot : path.dirname(path.join(repoRoot, file));
    const absolute = target ? path.resolve(base, target) : path.join(repoRoot, file);
    if (!fs.existsSync(absolute)) { errors.push(`${file} -> ${raw}: missing target`); return; }
    if (!fragment || !/\.(?:md|mdx|html?)$/i.test(absolute)) return;
    if (!anchorCache.has(absolute)) anchorCache.set(absolute,
      documentAnchors(readFile(absolute), /\.(?:md|mdx)$/i.test(absolute)));
    if (!anchorCache.get(absolute).has(fragment)) errors.push(`${file} -> ${raw}: missing heading or HTML anchor`);
  }
  for (const file of files) {
    for (const raw of documentationLinks(readFile(path.join(repoRoot, file)))) check(file, raw);
  }
  for (const root of CONSTITUTION_ROOTS) {
    const file = `${root}/metadata.json`;
    if (!fs.existsSync(path.join(repoRoot, file))) {
      errors.push(`${file}: missing owned constitution metadata`);
      continue;
    }
    const metadata = JSON.parse(readFile(path.join(repoRoot, file)));
    if (!Array.isArray(metadata.references) || metadata.references.length === 0) {
      errors.push(`${file}: references must be nonempty`);
      continue;
    }
    for (const reference of metadata.references) check(file, reference, true);
  }
  return { errors, localLinks };
}
