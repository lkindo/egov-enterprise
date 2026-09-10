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

/** Preserve line positions while removing fenced examples and HTML comments. */
export function withoutBlockExamples(source) {
  let fence = null;
  return source.replace(/<!--[\s\S]*?-->/g, value => value.replace(/[^\n]/g, ' '))
    .split('\n').map(line => {
      const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (fence) {
        if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length
          && marker[2].trim() === '') fence = null;
        return ' '.repeat(line.length);
      }
      if (marker) {
        fence = { char: marker[1][0], length: marker[1].length };
        return ' '.repeat(line.length);
      }
      return line;
    }).join('\n');
}

function withoutInlineExamples(source) {
  return source.replace(/(`+)([\s\S]*?)\1(?!`)/g, value => value.replace(/[^\n]/g, ' '));
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

function destination(text) {
  const angle = /^\s*<([^>]+)>/.exec(text);
  if (angle) return angle[1];
  return /^\s*(\S+?)(?:\s+["'].*|\s*$)/.exec(text)?.[1] ?? text.trim();
}

export function documentationLinks(source) {
  const text = withoutInlineExamples(withoutBlockExamples(source));
  const result = [];
  const definitions = new Map();
  for (const match of text.matchAll(/^ {0,3}\[([^\]]+)\]:\s*(.+)$/gm)) {
    definitions.set(match[1].trim().toLowerCase(), destination(match[2]));
  }
  // Balanced parentheses allow relative paths such as guide(part-two).md.
  for (const match of text.matchAll(/(?<!!|\\)\[([^\]\n]*)\](\(|\[([^\]\n]*)\])?/g)) {
    const offset = match.index + match[0].length;
    if (match[2] === '(') {
      let depth = 1;
      let end = offset;
      let angle = false;
      for (; end < text.length; end += 1) {
        const char = text[end];
        if (char === '\\') { end += 1; continue; }
        if (char === '<') angle = true;
        if (char === '>') angle = false;
        if (!angle && char === '(') depth += 1;
        if (!angle && char === ')' && --depth === 0) break;
      }
      if (depth === 0) result.push(destination(text.slice(offset, end)));
    } else if (text[offset] !== ':') {
      const label = (match[3] || match[1]).trim().toLowerCase();
      if (definitions.has(label)) result.push(definitions.get(label));
    }
  }
  // Images carry the same local-file integrity requirement as ordinary links.
  for (const match of text.matchAll(/!\[[^\]\n]*\]\((<[^>]+>|[^)\s]+)(?:\s+[^)]*)?\)/g)) {
    result.push(destination(match[1]));
  }
  for (const match of text.matchAll(/<a\b[^>]*\shref\s*=\s*(["'])(.*?)\1[^>]*>/gi)) {
    result.push(decodeEntities(match[2]));
  }
  return result;
}

export function documentAnchors(source, markdown = true) {
  const text = withoutBlockExamples(source)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
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
    title = decodeEntities(title.replace(/!?\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]*>/g, ''));
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
