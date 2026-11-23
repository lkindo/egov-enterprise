/*
 * 생성 프로젝트의 문서 링크 정리 (DEC-OPS-427).
 *
 * 생성기는 생성 프로젝트가 싣지 않는 도구·시험·문서를 제거 원장대로 걷는다. 그 뒤에도 남은 문서에는 없어진 파일을 가리키는
 * 링크가 남는데, 생성 프로젝트에는 문서 링크 검사가 없어 끊긴 채 나갔다. 이 모듈은 남은 문서를 한 번 훑어
 *   - 대상 파일이 없는 인라인 링크·이미지는 글자만 남기고,
 *   - 대상은 있는데 절(#…)이 없는 링크는 절만 떼고,
 *   - 문서 인덱스(docs/README.md)에서 없어진 문서를 소개하는 행은 지운다.
 * 고친 뒤 원본 저장소와 같은 검사기로 다시 보아, 남은 문서에 끊긴 링크가 하나라도 있으면 생성을 멈춘다.
 *
 * 링크의 범위(글자·목적지·제목·중첩 이미지)는 원본 링크 검사기의 해석기(inlineLinkSpans)를 그대로 쓴다. 검사기가 링크로 보지
 * 않는 글자는 여기서도 고치지 않고, 검사기가 보는 링크는 모두 여기서 판정한다. 고치지 못하는 것은 인라인이 아닌 링크
 * (참조형·<a href>)와 생성기가 다시 쓰는 공용 메모리의 링크다 — 앞의 것은 원본 문서 계약(nonInlineLinks)이 막고, 둘 다
 * 마지막 검사가 잡는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  documentAnchors, inlineLinkSpans, isOwnedDoc, maskExamples, validateDocumentationLinks,
} from './docs-link-integrity.mjs';
import { MEMORY_PATHS } from './reusable-governance-integrity.mjs';

const DOC_ROOTS = ['docs', '.githooks', '.agent/memory', '.agent/knowledge'];
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git', 'build']);
export const DOCS_INDEX = 'docs/README.md';
/** 원본 README 의 Atlas 안내 문장. 생성 프로젝트에는 Atlas 도구와 `atlas:*` 명령이 없어 문장째 걷는다. */
export const UPSTREAM_ATLAS_README_LINE = /^[^\r\n]*`npm run atlas:build`[^\r\n]*\r?\n(?:\r?\n)?/mu;

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

/**
 * 원본 링크 검사기의 판정을 옮긴 것. keep 은 고칠 것이 없거나(바깥 주소·남은 대상) 여기서 고치지 않는 것이다
 * (`file:` 주소·잘못된 인코딩 — 마지막 검사가 막는다).
 *   missing-file: 대상 파일이 없다 · missing-self-anchor: 이 문서의 없는 절 · missing-anchor: 대상은 있고 절만 없다
 */
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
  if (!fs.existsSync(absolute)) return 'missing-file';
  if (!fragment || !/\.(?:md|mdx|html?)$/i.test(absolute)) return 'keep';
  if (anchorsOf(absolute).has(fragment)) return 'keep';
  return target ? 'missing-anchor' : 'missing-self-anchor';
}

/** 범위를 포함 관계로 엮는다: 링크 글자 안의 이미지(배지)는 그 링크의 자식이다. 목적지·제목 안에서 찾은 범위는 버린다. */
function nestSpans(spans) {
  const roots = [];
  const stack = [];
  for (const found of spans) {
    const span = { ...found, children: [] };
    while (stack.length && span.start >= stack.at(-1).end) stack.pop();
    const parent = stack.at(-1);
    if (!parent) roots.push(span);
    else if (span.start >= parent.labelStart && span.end <= parent.labelEnd) parent.children.push(span);
    else continue;
    stack.push(span);
  }
  return roots;
}

/** 인라인 링크·이미지 가운데 끊긴 것을 고친다. 코드 예시와 주석, 링크 밖의 글자, 줄 끝은 건드리지 않는다. */
export function rewriteDanglingLinks(source, judge) {
  const counts = { unlinked: 0, defragmented: 0 };
  const render = (from, to, spans) => {
    let out = '';
    let cursor = from;
    for (const span of spans) {
      const label = render(span.labelStart, span.labelEnd, span.children);
      const verdict = judge(span.raw);
      out += source.slice(cursor, span.start);
      if (verdict === 'missing-file' || verdict === 'missing-self-anchor') {
        out += label;
        counts.unlinked += 1;
      } else {
        const hash = verdict === 'missing-anchor' ? span.raw.indexOf('#') : -1;
        // 절만 없으면 목적지의 # 부터 끝까지를 뗀다. 인코딩된 # 처럼 자리를 못 찾으면 그대로 두고 마지막 검사에 맡긴다.
        const tail = hash < 0 ? source.slice(span.labelEnd, span.end)
          : source.slice(span.labelEnd, span.destStart + hash) + source.slice(span.destEnd, span.end);
        if (hash >= 0) counts.defragmented += 1;
        out += source.slice(span.start, span.labelStart) + label + tail;
      }
      cursor = span.end;
    }
    return out + source.slice(cursor, to);
  };
  const text = render(0, source.length, nestSpans(inlineLinkSpans(maskExamples(source))));
  return { text, ...counts };
}

/**
 * 문서 인덱스에서 없어진 문서를 소개하는 행을 지운다 — 표의 행은 첫 칸이 그 문서의 링크이거나 행의 링크가 그것 하나뿐일 때,
 * 문단 행은 "[문서](경로) — 설명" 으로 시작할 때이고, 모두 그 대상 파일이 없을 때만이다.
 * 절만 없는 링크, 대상이 남아 있는 행, 코드 예시·주석 안의 행은 지우지 않는다.
 */
export function dropDanglingIndexRows(source, judge) {
  const masked = maskExamples(source);
  const spans = inlineLinkSpans(masked).filter(span => !span.image);
  const kept = [];
  let dropped = 0;
  let afterDrop = false;
  let offset = 0;
  for (const line of source.split(/(?<=\n)/)) {
    const start = offset;
    const end = start + line.length;
    offset = end;
    const inLine = spans.filter(span => span.start >= start && span.end <= end);
    const cell = /^[ \t]*\|[ \t]*/.exec(masked.slice(start, end));
    const first = inLine[0];
    let introduced = null;
    if (cell) {
      const leads = first && first.start === start + cell[0].length && /^[ \t]*\|/.test(masked.slice(first.end, end));
      if (leads || inLine.length === 1) introduced = first;
    } else if (first && first.start === start && /^[ \t]+—[ \t]/.test(masked.slice(first.end, end))) introduced = first;
    if (introduced && judge(introduced.raw) === 'missing-file') {
      dropped += 1;
      afterDrop = true;
      continue;
    }
    // 줄을 뺀 자리의 앞뒤가 모두 빈 줄이면 하나만 남긴다.
    if (afterDrop && /^\r?\n?$/.test(line) && kept.length && /^\r?\n$/.test(kept.at(-1))) continue;
    afterDrop = false;
    kept.push(line);
  }
  return { text: kept.join(''), dropped };
}

/**
 * 인라인이 아닌 링크(참조형 정의, <a href>)를 찾는다. 생성물의 링크 정리는 인라인 링크만 풀므로, 이런 링크가 생성 프로젝트에
 * 없는 대상을 가리키면 모든 시작 구성의 생성이 멈춘다. 원본 문서 계약이 이 함수로 문서 변경 시점에 막는다.
 */
export function nonInlineLinks(source) {
  const masked = maskExamples(source);
  const lineOf = index => masked.slice(0, index).split('\n').length;
  return [
    ...[...masked.matchAll(/^ {0,3}\[[^\]\n]+\]:[ \t]*\S/gm)].map(match => ({ line: lineOf(match.index), kind: 'reference-definition' })),
    ...[...masked.matchAll(/<a\b[^>]*\shref\s*=/gi)].map(match => ({ line: lineOf(match.index), kind: 'html-anchor' })),
  ].sort((left, right) => left.line - right.line);
}

/** 원본 README 의 Atlas 안내 문장을 걷는다(생성 프로젝트에는 그 도구와 명령이 없다). 문장이 없으면 그대로 돌려준다. */
export function stripUpstreamAtlasMention(readme) {
  return readme.replace(UPSTREAM_ATLAS_README_LINE, '');
}

/**
 * 생성물의 문서 링크를 정리하고, 남은 문서에 끊긴 링크가 없음을 확인한다. 끊긴 링크가 남으면 예외를 던진다.
 * 생성기가 다시 쓰는 공용 메모리(MEMORY_PATHS)는 내용이 거버넌스 투영의 무결성 검사에 묶여 있어 고치지 않고 검사만 한다.
 * 헌법 metadata.json 의 references 는 문서가 아니라 고치지도 막지도 않고 수만 돌려준다.
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
    if (MEMORY_PATHS.includes(file)) continue;
    const absolute = path.join(output, file);
    const before = fs.readFileSync(absolute, 'utf8');
    const judge = raw => judgeDocLink(output, file, raw, anchorsOf);
    let text = file === 'README.md' ? stripUpstreamAtlasMention(before) : before;
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
    const inMemory = documentErrors.filter(error => MEMORY_PATHS.includes(error.split(' -> ')[0]));
    throw new Error([
      `생성물 문서에 끊긴 링크가 남았다(${documentErrors.length}건). 생성기가 자동으로 푸는 것은 인라인 링크뿐이다.`,
      inMemory.length
        ? `- 공용 메모리(${MEMORY_PATHS.join(', ')})의 링크 ${inMemory.length}건: scripts/reusable-governance-integrity.mjs 의 buildGeneratedMemory 가 만드는 본문에서 고친다.`
        : null,
      documentErrors.length > inMemory.length
        ? `- 그 밖의 문서 ${documentErrors.length - inMemory.length}건: 참조형 링크([글자][라벨])·<a href>·\`file:\` 주소·잘못된 인코딩이면 원본 문서를 인라인 링크로 고친다.`
        : null,
      ...documentErrors.slice(0, 50),
      documentErrors.length > 50 ? `… 외 ${documentErrors.length - 50}건` : null,
    ].filter(Boolean).join('\n'));
  }
  return { ...summary, metadataReferenceErrors: errors.length - documentErrors.length };
}
