/*
 * 생성 프로젝트의 문서 링크 정리 (DEC-OPS-427).
 *
 * 생성기는 생성 프로젝트가 싣지 않는 도구·시험·문서를 제거 원장대로 걷는다. 그 뒤에도 남은 문서에는 없어진 파일을 가리키는
 * 링크가 남는데, 생성 프로젝트에는 문서 링크 검사가 없어 끊긴 채 나갔다. 이 모듈은 남은 문서를 한 번 훑어
 *   - 대상 파일이 없는 인라인 링크·이미지는 글자만 남기고,
 *   - 대상은 있는데 절(#…)이 없는 링크는 절만 떼고,
 *   - 문서 인덱스(docs/README.md)에서 없어진 문서를 소개하는 행은 지운다.
 * 고친 뒤 원본 저장소와 같은 검사기로 다시 보아, 남은 문서에 끊긴 링크가 하나라도 있으면 생성을 멈춘다(자동으로 풀지 못하는 형식이
 * 조용히 남지 않게). 판정은 원본 링크 검사기(docs-link-integrity)와 같은 규칙을 쓴다 — 두 판정이 어긋나면 마지막 검사가 붉다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { documentAnchors, isOwnedDoc, linkDestination, validateDocumentationLinks } from './docs-link-integrity.mjs';

const DOC_ROOTS = ['docs', '.githooks', '.agent/memory', '.agent/knowledge'];
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git', 'build']);
/** 생성기가 다시 쓰는 파생 문서. 내용이 거버넌스 투영의 무결성 검사에 묶여 있어 여기서 고치지 않는다. 마지막 검사는 함께 본다. */
const PROJECTED_DOC_PREFIXES = ['.agent/memory/'];
export const DOCS_INDEX = 'docs/README.md';

/** 생성물 안의 소유 문서(원본 링크 검사기와 같은 범위). 생성물은 아직 Git 저장소가 아니라 디렉터리를 직접 훑는다. */
export function ownedDocFiles(root) {
  const found = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && isOwnedDoc(entry.name)) found.push(entry.name);
  }
  const walk = (rel) => {
    let entries;
    try {
      entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const next = `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) walk(next);
      } else if (entry.isFile() && isOwnedDoc(next)) found.push(next);
    }
  };
  for (const docRoot of DOC_ROOTS) walk(docRoot);
  return found.sort();
}

/** 코드 예시(펜스·인라인)와 HTML 주석을 같은 길이의 공백으로 가린다. 자리가 원문과 같아, 가린 글에서 찾은 위치를 원문에 그대로 쓴다. */
export function maskExamples(source) {
  const blank = value => value.replace(/[^\r\n]/g, ' ');
  let fence = null;
  const withoutBlocks = source.replace(/<!--[\s\S]*?-->/g, blank).replace(/[^\n]*\n|[^\n]+$/g, (line) => {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line.replace(/\r?\n$/, ''));
    if (fence) {
      if (marker && marker[1][0] === fence.char && marker[1].length >= fence.length && marker[2].trim() === '') fence = null;
      return blank(line);
    }
    if (marker) {
      fence = { char: marker[1][0], length: marker[1].length };
      return blank(line);
    }
    return line;
  });
  return withoutBlocks.replace(/(`+)([\s\S]*?)\1(?!`)/g, blank);
}

/** 원본 링크 검사기의 판정을 그대로 옮긴 것: 대상이 없으면 unlink, 대상은 있고 절만 없으면 defragment, 그 밖은 keep. */
export function judgeDocLink(root, fileRel, raw, anchorsOf) {
  if (/^file:/i.test(raw) || /^(?:https?:|mailto:|tel:|table:|\/\/)/i.test(raw)) return 'keep';
  let decoded;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return 'keep';
  }
  const at = decoded.indexOf('#');
  const target = (at < 0 ? decoded : decoded.slice(0, at)).split('?')[0];
  const fragment = at < 0 ? '' : decoded.slice(at + 1);
  const absolute = target ? path.resolve(path.dirname(path.join(root, fileRel)), target) : path.join(root, fileRel);
  if (!fs.existsSync(absolute)) return 'unlink';
  if (!fragment || !/\.(?:md|mdx|html?)$/i.test(absolute)) return 'keep';
  if (anchorsOf(absolute).has(fragment)) return 'keep';
  return target ? 'defragment' : 'unlink';
}

/** 인라인 링크·이미지 가운데 끊긴 것을 고친다. 코드 예시 안의 글자는 건드리지 않는다. */
export function rewriteDanglingLinks(source, judge) {
  const masked = maskExamples(source);
  const edits = [];
  for (const match of masked.matchAll(/(?<!\\)(!?)\[([^\]\n]*)\]\(/g)) {
    const open = match.index + match[0].length;
    let depth = 1;
    let end = open;
    let angle = false;
    for (; end < masked.length; end += 1) {
      const char = masked[end];
      if (char === '\\') { end += 1; continue; }
      if (char === '<') angle = true;
      if (char === '>') angle = false;
      if (!angle && char === '(') depth += 1;
      if (!angle && char === ')' && --depth === 0) break;
    }
    if (depth !== 0) continue;
    const verdict = judge(linkDestination(masked.slice(open, end)));
    if (verdict === 'unlink') {
      const labelStart = match.index + match[1].length + 1;
      edits.push({ start: match.index, end: end + 1, text: source.slice(labelStart, labelStart + match[2].length), kind: 'unlinked' });
    } else if (verdict === 'defragment') {
      const inner = source.slice(open, end);
      const hash = inner.indexOf('#');
      if (hash < 0) continue; // 인코딩된 '#' 처럼 여기서 못 푸는 꼴 — 마지막 검사가 잡는다
      const fragment = /^[^\s>)]*/.exec(inner.slice(hash))[0];
      edits.push({ start: open + hash, end: open + hash + fragment.length, text: '', kind: 'defragmented' });
    }
  }
  let text = source;
  const counts = { unlinked: 0, defragmented: 0 };
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
    counts[edit.kind] += 1;
  }
  return { text, ...counts };
}

/** 문서 인덱스에서 없어진 문서를 소개하는 행(표의 첫 칸이 그 링크이거나, "[문서](경로) — 설명" 으로 시작하는 줄)을 지운다. */
export function dropDanglingIndexRows(source, judge) {
  const kept = [];
  let dropped = 0;
  let afterDrop = false;
  for (const line of source.split(/(?<=\n)/)) {
    const row = /^\|\s*\[[^\]\n]*\]\(([^)\s]+)\)\s*\|/.exec(line) ?? /^\[[^\]\n]*\]\(([^)\s]+)\)\s+—\s/.exec(line);
    if (row && judge(row[1]) === 'unlink') {
      dropped += 1;
      afterDrop = true;
      continue;
    }
    const blankLine = /^\r?\n?$/.test(line);
    // 줄을 뺀 자리의 앞뒤가 모두 빈 줄이면 하나만 남긴다.
    if (afterDrop && blankLine && kept.length && /^\r?\n$/.test(kept.at(-1))) continue;
    afterDrop = false;
    kept.push(line);
  }
  return { text: kept.join(''), dropped };
}

/**
 * 생성물의 문서 링크를 정리하고, 남은 문서에 끊긴 링크가 없음을 확인한다. 끊긴 링크가 남으면 예외를 던진다.
 * 헌법 metadata.json 의 references 는 고치지도 막지도 않고 수만 돌려준다(그 파일은 문서가 아니고 이 정리의 범위 밖이다).
 */
export function projectGeneratedDocs(output) {
  const files = ownedDocFiles(output);
  const anchors = new Map();
  const anchorsOf = (absolute) => {
    if (!anchors.has(absolute)) {
      anchors.set(absolute, documentAnchors(fs.readFileSync(absolute, 'utf8'), /\.(?:md|mdx)$/i.test(absolute)));
    }
    return anchors.get(absolute);
  };
  const summary = { documents: files.length, changedFiles: 0, unlinked: 0, defragmented: 0, droppedIndexRows: 0 };
  for (const file of files) {
    if (PROJECTED_DOC_PREFIXES.some(prefix => file.startsWith(prefix))) continue;
    const absolute = path.join(output, file);
    const before = fs.readFileSync(absolute, 'utf8');
    const judge = raw => judgeDocLink(output, file, raw, anchorsOf);
    let text = before;
    if (file === DOCS_INDEX) {
      const index = dropDanglingIndexRows(text, judge);
      text = index.text;
      summary.droppedIndexRows += index.dropped;
    }
    const rewritten = rewriteDanglingLinks(text, judge);
    summary.unlinked += rewritten.unlinked;
    summary.defragmented += rewritten.defragmented;
    if (rewritten.text !== before) {
      fs.writeFileSync(absolute, rewritten.text, 'utf8');
      summary.changedFiles += 1;
    }
  }
  const { errors } = validateDocumentationLinks({ repoRoot: output, files });
  const documentErrors = errors.filter(error => isOwnedDoc(error.split(' -> ')[0]));
  if (documentErrors.length) {
    throw new Error(`생성물 문서에 끊긴 링크가 남았다(${documentErrors.length}건). 자동으로 풀지 못하는 형식이거나 생성기가 다시 쓰는 문서의 링크다 — `
      + `원본 문서의 링크 형식을 고치거나 그 문서를 만드는 투영을 고친다:\n${documentErrors.slice(0, 20).join('\n')}`);
  }
  return { ...summary, metadataReferenceErrors: errors.length - documentErrors.length };
}
