/*
 * 생성 프로젝트의 문서 링크 정리 (DEC-OPS-427).
 *
 * 생성기는 생성 프로젝트가 싣지 않는 도구·시험·문서를 제거 원장대로 걷는다. 그 뒤에도 남은 문서에는 없어진 파일을 가리키는
 * 링크가 남는데, 생성 프로젝트에는 문서 링크 검사가 없어 끊긴 채 나갔다. 이 모듈은 남은 문서를 한 번 훑어
 *   - 대상 파일이 없는 인라인 링크·이미지는 글자만 남기고,
 *   - 대상은 있는데 절(#…)이 없는 링크는 절만 떼고,
 *   - 문서 인덱스(docs/README.md)와 루트 README 의 문서 표에서 없어진 문서를 소개하는 행은 지운다.
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
import { readRemovalLedger } from './reusable-asset-removal.mjs';
import { artifactAliases } from './reusable-artifact-entrypoints-contract.mjs';
import { MEMORY_PATHS } from './reusable-governance-integrity.mjs';
import { UPSTREAM_ATLAS } from './reusable-harness-census.mjs';
import { ALWAYS_REMOVED_ASSET_RULES, isUpstreamRuntimeAlias } from './reusable-product-assets.mjs';
import { readVendorAssetLedger } from './reusable-vendor-assets.mjs';

const DOC_ROOTS = ['docs', '.githooks', '.agent/memory', '.agent/knowledge'];
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git', 'build']);
export const DOCS_INDEX = 'docs/README.md';
export const ROOT_README = 'README.md';

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
 * leadingOnly 면 표에서 첫 칸이 그 문서의 링크뿐인 행만 지운다 — 문서 인덱스가 아닌 글(루트 README)에는 문서 소개가 아닌 행과
 * 문단도 있어, 끊긴 링크 하나가 있다고 줄을 지우면 남아야 할 안내가 사라진다(그런 링크는 글자로만 남긴다). 첫 칸은 원문으로 본다 —
 * 가린 글에서는 인라인 코드가 공백이라 `명령` [문서](…) 로 시작하는 칸도 링크뿐인 칸처럼 보인다.
 */
export function dropDanglingIndexRows(source, judge, { leadingOnly = false } = {}) {
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
      const text = leadingOnly ? line : masked.slice(start, end);
      const lead = /^[ \t]*\|[ \t]*/.exec(text);
      const leads = first && lead && first.start === start + lead[0].length && /^[ \t]*\|/.test(text.slice(first.end - start));
      if (leads || (!leadingOnly && inLine.length === 1)) introduced = first;
    } else if (!leadingOnly && first && first.start === start && /^[ \t]+—[ \t]/.test(masked.slice(first.end, end))) introduced = first;
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

/*
 * 생성 프로젝트의 루트 README 투영.
 *
 * 루트 README 는 원본을 그대로 실어, 생성 프로젝트에 없는 도구(생성기·오프라인 이관 도구·요구사항 도구·Atlas)와 그 명령을 안내했다.
 * 원본 README 는 그런 내용을 원본 전용 구간 표지로 감싸고, 생성기는 구간째 걷은 뒤 이 프로젝트의 구성을 머리에 적는다.
 * 표지 밖에 남은 문장이 걷은 별칭·자산을 말하면 생성이 멈춘다. README 만 고친 변경에는 재사용 생성 잡이 돌지 않으므로,
 * 원본 문서 계약(reusable-source-docs.test.mjs)이 같은 판정을 원본 README 에 미리 돌린다.
 *
 * 검사가 보는 것은 루트 package.json 의 `npm run` 대상, 걷은 별칭, 상시 제거 원장(과 Atlas·벤더 원장)의 자산·시험 경로,
 * 단일모듈 배치의 Gradle 프로젝트 경로다. 구성에 따라 빠지는 소스·화면·스킬·비활성 워크플로의 경로와 `pnpm`·`make` 대상은 보지 않는다.
 */
export const UPSTREAM_ONLY_START = '<!-- upstream-only:start -->';
export const UPSTREAM_ONLY_END = '<!-- upstream-only:end -->';

/**
 * README 가 말하면 안 되는 별칭·자산을 모은다: 상시 제거 원장 셋과 Atlas 의 자산·시험·별칭, 원장 없이 규칙으로 걷는 별칭.
 * 벤더 프로젝트는 PostgreSQL 전용 자산의 원장을 더한다.
 */
export function upstreamOnlySubjects(root, upstreamScripts = {}, { vendor = false } = {}) {
  const ledgers = [...ALWAYS_REMOVED_ASSET_RULES.map(({ ledgerPath }) => readRemovalLedger(root, ledgerPath)),
    ...(vendor ? [readVendorAssetLedger(root)] : [])];
  const aliases = [...ledgers.flatMap(ledger => ledger.aliases), ...UPSTREAM_ATLAS.aliases,
    ...Object.keys(upstreamScripts).filter(isUpstreamRuntimeAlias)].filter(alias => !alias.startsWith('//'));
  return {
    aliases: [...new Set(aliases)].sort(),
    assets: [...new Set([...ledgers.flatMap(ledger => [...ledger.assets, ...ledger.gates.map(gate => gate.file)]),
      ...UPSTREAM_ATLAS.assets, ...UPSTREAM_ATLAS.gates])].sort(),
  };
}

/**
 * 생성 프로젝트의 루트 package.json 별칭: 원본 별칭에서 걷는 것을 빼고 생성물 진입점(벤더면 스키마 검사)을 더한 것.
 * 원본 README 계약이 이 계산으로 `npm run` 대상을 미리 보고, 생성기는 실제 package.json 에 이 별칭이 모두 있는지 대조한다.
 */
export function expectedGeneratedAliases(root, upstreamScripts, { vendorAlias = null } = {}) {
  const removed = new Set(upstreamOnlySubjects(root, upstreamScripts, { vendor: Boolean(vendorAlias) }).aliases);
  return [...new Set([...Object.keys(upstreamScripts).filter(alias => !alias.startsWith('//') && !removed.has(alias)),
    ...Object.keys(artifactAliases), ...(vendorAlias ? [vendorAlias] : [])])].sort();
}

/**
 * 원본 전용 구간을 표지째 걷는다. 표지는 들여쓰지 않고 한 줄을 통째로 쓰며, 겹치지 않고, 코드 예시 안이나 표의 행(`|` 로 시작하는 줄)
 * 사이에 두지 않는다 — 어기면 던진다(조용히 넘기면 생성 프로젝트에 원본 전용 문장이 남거나 엉뚱한 문단·예시가 사라지고, 표의 행
 * 사이의 표지는 원본의 표를 끊는다). 걷은 자리의 겹친 빈 줄은 하나로 줄인다.
 */
export function dropUpstreamOnlyBlocks(source) {
  const kept = [];
  const tableRow = text => /^\s*\|/.test(text);
  const blank = text => /^\s*$/.test(text);
  let openedAt = 0;
  let fence = null;
  let blocks = 0;
  let seam = false;
  let number = 0;
  let previous = '';
  let closedAt = 0;
  for (const line of source.split(/(?<=\n)/)) {
    number += 1;
    const body = line.replace(/\r?\n$/, '');
    const marker = body.trimEnd();
    const isStart = marker === UPSTREAM_ONLY_START;
    const isEnd = marker === UPSTREAM_ONLY_END;
    if (!isStart && !isEnd && /upstream-only:(?:start|end)/.test(body)) {
      throw new Error(`README ${number}행: 원본 전용 표지는 들여쓰지 않고 한 줄을 통째로 쓴다`);
    }
    if ((isStart || isEnd) && fence) throw new Error(`README ${number}행: 원본 전용 표지를 코드 예시 안에 둘 수 없다`);
    if ((isStart && tableRow(previous)) || (closedAt && closedAt === number - 1 && tableRow(body))) {
      throw new Error(`README ${isStart ? number : closedAt}행: 원본 전용 표지를 표의 행 사이에 둘 수 없다(표는 통째로 감싸고, 표 앞뒤의 표지는 빈 줄로 띄운다)`);
    }
    previous = body;
    const fenced = /^ {0,3}(`{3,}|~{3,})/.exec(body);
    if (fenced) {
      if (!fence) fence = fenced[1];
      else if (fenced[1][0] === fence[0] && fenced[1].length >= fence.length && body.trim() === fenced[1]) fence = null;
    }
    if (isStart) {
      if (openedAt) throw new Error(`README ${number}행: 원본 전용 구간이 겹쳤다(${openedAt}행에서 열림)`);
      openedAt = number;
      blocks += 1;
      continue;
    }
    if (isEnd) {
      if (!openedAt) throw new Error(`README ${number}행: 여는 표지 없는 닫는 표지`);
      openedAt = 0;
      closedAt = number;
      seam = true;
      continue;
    }
    if (openedAt) continue;
    if (seam && blank(line) && kept.length && blank(kept.at(-1))) continue;
    seam = false;
    kept.push(line);
  }
  if (openedAt) throw new Error(`README ${openedAt}행: 원본 전용 구간이 닫히지 않았다`);
  return { text: kept.join(''), blocks };
}

/**
 * 단일모듈 배치의 Gradle 은 루트 프로젝트 하나다. 진입점 태스크의 프로젝트 경로(`:api-server:bootRun`·`api-server:bootRun`)를
 * 그 배치의 것으로 바꾼다. 태스크 토큰 전체가 맞을 때만 바꾼다(다른 낱말·주소의 일부는 두고, 남은 경로는 검사가 막는다).
 */
export function projectReadmeLayout(readme, layout) {
  return layout === 'single-module' ? readme.replace(/(?<![\w:/=-]):?api-server:bootRun(?![\w:-])/gu, 'bootRun') : readme;
}

/** 생성 프로젝트 README 의 머리. 구성·배치·검증의 정본은 생성기가 함께 쓰는 두 문서다. */
export function generatedReadmeIntro({ source, features, layout, vendor = null }) {
  return [
    '## 이 프로젝트',
    '',
    `eGov Enterprise 원본 \`${source}\` 에서 생성한 프로젝트다. 아래는 원본 README 에서 이 프로젝트에 해당하는 설명만 남긴 것이다 — `
      + '원본 저장소의 생성기·오프라인 이관 도구·요구사항 도구와 그 명령은 이 프로젝트에 없다.',
    '',
    `- 기능: ${features.length ? features.join(', ') : '(공통 기반만)'} — 아래의 선택 도메인 예시 가운데 여기 없는 기능은 이 프로젝트에 없다`,
    `- backend layout: ${layout}${layout === 'single-module'
      ? ' — Gradle 프로젝트는 루트 하나다. 아래의 구조도는 논리 소스 영역이고 모듈별 빌드 서술은 멀티모듈 기준이며, 이 배치의 실행·테스트 명령은 [REUSABLE_BASE.md](./REUSABLE_BASE.md)를 따른다.'
      : ''}`,
    `- 데이터베이스: ${vendor ? `${vendor} — 끝의 「데이터베이스」 절이 아래의 PostgreSQL 안내보다 우선한다` : 'PostgreSQL'}`,
    '- 구성·배치·제거 내역: [REUSABLE_BASE.md](./REUSABLE_BASE.md)',
    '- 검증 명령과 CI 범위: [REUSABLE_VERIFICATION.md](./REUSABLE_VERIFICATION.md)',
    '- Java·권한을 더하기 전에: [도입자 가이드](./docs/03-guides/generated-project-additions.md)의 init → register 절차부터 따른다. '
      + '아래의 스캐폴드 안내는 골격을 만드는 방법이고, 새 화면·마이그레이션과 기존 소스 수정은 그 등록의 자동 지원 범위 밖이다.',
    '',
    '---',
    '',
  ];
}

/** 머리를 첫 2단계 제목 앞에 넣는다(코드 예시 안의 `## ` 는 제목이 아니다). 제목이 없으면 끝에 붙인다. 줄 끝은 본문을 따른다. */
export function insertGeneratedReadmeIntro(readme, introLines) {
  const eol = /\r\n/.test(readme) ? '\r\n' : '\n';
  const intro = introLines.map(line => `${line}${eol}`).join('');
  const lines = readme.split(/(?<=\n)/);
  let fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const body = lines[index].replace(/\r?\n$/, '');
    const fenced = /^ {0,3}(`{3,}|~{3,})/.exec(body);
    if (fenced) {
      if (!fence) fence = fenced[1];
      else if (fenced[1][0] === fence[0] && fenced[1].length >= fence.length && body.trim() === fenced[1]) fence = null;
      continue;
    }
    if (!fence && /^## /.test(body)) return [...lines.slice(0, index), intro, ...lines.slice(index)].join('');
  }
  return `${readme.replace(/\s*$/, '')}${eol}${eol}${intro}`;
}

const escapePattern = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * README 가 생성 프로젝트에 없는 것을 안내하는 줄을 찾는다. 코드 예시도 본다 — 예시의 명령이 곧 안내다.
 *   - 걷은 별칭(`npm run` 유무와 상관없이 낱말로)
 *   - 걷은 자산·시험의 경로(저장소 루트 기준 경로의 구성요소로, 대소문자·`\` 표기를 가리지 않고, 바깥 주소 안의 경로는 빼고)
 *   - scripts 를 주면 그 루트 package.json 에 없는 `npm run <이름>` 대상. 이름은 토큰 전체로 대조하고, 옵션이 이름보다 앞서면 값을
 *     받는 옵션인지 가릴 수 없어 붉게 한다(이름을 먼저 쓴다). `pnpm run`·`npm --prefix … run` 은 다른 package.json 이라 보지 않는다
 *   - layout 이 single-module 이면 Gradle 프로젝트 경로(`:모듈:태스크`, `gradlew 모듈:태스크`)
 */
export function readmeMentionErrors(readme, { removedAliases = [], removedAssets = [], scripts = null, layout = null } = {}) {
  const errors = [];
  const aliasPatterns = removedAliases.map(alias => [alias, new RegExp(`(?<![\\w:-])${escapePattern(alias)}(?![\\w:-])`, 'u')]);
  const assetPatterns = removedAssets.map(asset => [asset,
    new RegExp(`(?<![\\w-])(?<![\\w-]/)${escapePattern(asset)}(?![\\w-]|\\.\\w)`, 'iu')]);
  readme.split(/\r?\n/).forEach((line, index) => {
    const at = `README.md:${index + 1}`;
    const local = line.replace(/https?:\/\/[^\s)>\]]+/giu, '').replaceAll('\\', '/');
    for (const [alias, pattern] of aliasPatterns) if (pattern.test(line)) errors.push(`${at} 생성 프로젝트에 없는 명령 \`${alias}\``);
    for (const [asset, pattern] of assetPatterns) if (pattern.test(local)) errors.push(`${at} 생성 프로젝트에 없는 자산 \`${asset}\``);
    if (scripts) {
      for (const match of line.matchAll(/(?<![\w-])npm run(?![\w-])[ \t]+([^\s`'"]+)/gu)) {
        const name = match[1].replace(/[.,;:)\]]+$/u, '');
        if (name.startsWith('-')) errors.push(`${at} 옵션이 앞선 \`npm run\` 은 판정하지 못한다 — 스크립트 이름을 먼저 쓴다`);
        else if (!Object.hasOwn(scripts, name) && !removedAliases.includes(name)) errors.push(`${at} package.json 에 없는 명령 \`npm run ${name}\``);
      }
    }
    if (layout === 'single-module') {
      const gradlePaths = [...local.matchAll(/(?<![\w/]):[A-Za-z][\w-]*(?::[A-Za-z][\w-]*)+/gu)].map(match => match[0]);
      // gradlew 의 태스크 인자는 선행 콜론 없이도 프로젝트 경로다(`gradlew api-server:test`).
      for (const command of local.matchAll(/gradlew(?:\.bat)?((?:[ \t]+[^\s`'"|&;]+)*)/gu)) {
        gradlePaths.push(...command[1].trim().split(/[ \t]+/).filter(token => /^[A-Za-z][\w-]*(?::[A-Za-z][\w-]*)+$/u.test(token)));
      }
      for (const found of gradlePaths) errors.push(`${at} 단일모듈 배치에 없는 Gradle 프로젝트 경로 \`${found}\``);
    }
  });
  return errors;
}

/**
 * 원본 README 를 생성 프로젝트의 것처럼 줄여 본다: 원본 전용 구간을 걷고, 상시 제거 자산을 없는 파일로 보아 그것을 소개하는
 * 문서 표의 행과 링크를 정리하고, 배치에 맞춘다. 구성에 따라 더 빠지는 문서는 생성 때의 링크 정리가 맡는다.
 */
export function simulateGeneratedReadme(root, source, removedAssets, { layout = 'multi-module' } = {}) {
  const anchors = new Map();
  const anchorsOf = (absolute) => {
    if (!anchors.has(absolute)) {
      anchors.set(absolute, documentAnchors(fs.readFileSync(absolute, 'utf8'), /\.(?:md|mdx)$/i.test(absolute)));
    }
    return anchors.get(absolute);
  };
  const removed = relative => removedAssets.some(asset => relative === asset || relative.startsWith(`${asset}/`));
  const judge = (raw) => {
    const verdict = judgeDocLink(root, ROOT_README, raw, anchorsOf);
    if (/^(?:file:|https?:|mailto:|tel:|table:|\/\/)/i.test(raw)) return verdict;
    let decoded;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      return verdict;
    }
    const target = decoded.split('#')[0].split('?')[0];
    if (!target) return verdict;
    const relative = path.relative(root, path.resolve(root, target)).split(path.sep).join('/');
    return removed(relative) ? 'missing-file' : verdict;
  };
  const rows = dropDanglingIndexRows(projectReadmeLayout(dropUpstreamOnlyBlocks(source).text, layout), judge, { leadingOnly: true });
  return rewriteDanglingLinks(rows.text, judge).text;
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
    let text = before;
    // 문서 인덱스와 루트 README 의 문서 표는 없어진 문서를 소개하는 행째 지운다(루트 README 는 첫 칸이 그 문서인 행만).
    if (file === DOCS_INDEX || file === ROOT_README) {
      const index = dropDanglingIndexRows(text, judge, { leadingOnly: file === ROOT_README });
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
