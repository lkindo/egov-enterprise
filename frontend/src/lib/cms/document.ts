/**
 * 콘텐츠 페이지 문서 형식 v1(ADR-0039 결정 4·5, ADR-0042).
 *
 * 허용 구조의 정본 판정은 서버 검증기(business-app `CmsDocumentValidator`)다. 이 모듈은 같은 판정을 화면에서 미리 해 저장 전에
 * 오류를 알리고, 편집기가 덧붙이는 기본 속성을 걷어 "저장한 문서와 같은가" 를 정확히 본다. 두 구현은 같은 fixture
 * (`cms-document-fixtures.json`)로 대조한다 — 한쪽만 바꾸면 양쪽 시험이 함께 붉어진다.
 *
 * 판정 수준은 둘이다(ADR-0042). 초안 저장(`'draft'`)은 아직 채우지 않은 칸 — 고르지 않은 이미지, 설명 없는 이미지, 이름·주소가 빈
 * 바로가기, 파일이 없는 내려받기 칸 — 을 받고, 게시(`'publish'`)는 모든 칸이 완성돼야 한다. 채운 값의 형식은 두 수준 모두 같게 본다.
 * 호출부는 수준을 늘 명시한다 — 게시 검사에 초안 판정이 쓰이지 않게 기본값을 두지 않는다.
 */

export const CMS_SCHEMA_VERSION = 1;
export const CMS_MAX_BYTES = 1_048_576;
const MAX_SECTIONS = 50;
const MAX_DEPTH = 20;
const MAX_BLOCKS = 2_000;
const MAX_TABLE_ROWS = 100;
const MAX_TABLE_COLUMNS = 20;
const MAX_LINKS = 12;
const MAX_FILES = 10;
const MAX_URL_LENGTH = 2_000;

/** 이미지 칸이 받는 확장자. 서버 귀속 검사(CmsContentFileService)와 같다 — 일반 업로드가 받는 이미지 형식 가운데 SVG·bmp 를 뺀 것. */
export const CMS_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif'] as const;
/** 내려받기 파일 칸이 받는 확장자. 서버 귀속 검사와 같다 — 일반 업로드가 받는 문서 형식이고 압축 파일은 받지 않는다. */
export const CMS_FILE_EXTENSIONS = ['pdf', 'hwp', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'] as const;

/** 판정 수준(ADR-0042). */
export type CmsValidationMode = 'draft' | 'publish';

export type CmsLayout = 'one' | 'two' | 'two-wide' | 'three';
export type CmsTone = 'default' | 'subtle' | 'emphasis';
export type CmsSpacing = 'compact' | 'normal' | 'relaxed';

export const CMS_LAYOUT_CELLS: Record<CmsLayout, number> = { one: 1, two: 2, 'two-wide': 2, three: 3 };
export const CMS_LAYOUT_LABELS: Record<CmsLayout, string> = {
  one: '1단',
  two: '2단 (같은 너비)',
  'two-wide': '2단 (왼쪽 좁게)',
  three: '3단',
};
export const CMS_TONE_LABELS: Record<CmsTone, string> = { default: '기본', subtle: '옅은 배경', emphasis: '강조 배경' };
export const CMS_SPACING_LABELS: Record<CmsSpacing, string> = { compact: '좁게', normal: '보통', relaxed: '넓게' };

export interface CmsMark {
  type: 'bold' | 'italic' | 'underline' | 'strike' | 'link';
  attrs?: { href: string };
}

export interface CmsRichNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: CmsRichNode[];
  text?: string;
  marks?: CmsMark[];
}

export interface CmsRichDoc {
  type: 'doc';
  content: CmsRichNode[];
}

export interface CmsLinkItem {
  title: string;
  url: string;
}

export interface CmsFileItem {
  atchFileSn: number;
  title: string;
}

/** 이미지 칸의 atchFileSn 0 은 아직 고르지 않은 이미지다(초안에서만 저장된다). */
export type CmsCell =
  | { kind: 'rich'; doc: CmsRichDoc }
  | { kind: 'image'; atchFileSn: number; alt: string; decorative: boolean; caption: string }
  | { kind: 'links'; items: CmsLinkItem[] }
  | { kind: 'files'; items: CmsFileItem[] };

export interface CmsSection {
  id: string;
  label: string;
  layout: CmsLayout;
  tone: CmsTone;
  spacing: CmsSpacing;
  cells: CmsCell[];
}

export interface CmsDocument {
  schemaVersion: 1;
  sections: CmsSection[];
}

/** 문제가 난 위치. 영역·칸 번호는 0부터다(화면이 그 칸으로 데려갈 때 쓴다). */
export interface CmsDocumentLocation {
  section?: number;
  cell?: number;
}

export interface CmsDocumentIssue extends CmsDocumentLocation {
  message: string;
}

export type CmsNormalizeResult =
  | { ok: true; document: CmsDocument }
  | { ok: false; error: string; location: CmsDocumentLocation };

const SECTION_ID = /^[a-z0-9-]{1,40}$/;
const MAILTO = /^mailto:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const TEL = /^tel:\+?[0-9][0-9-]{1,30}$/;
// 링크 주소 규칙은 서버 검증기(CmsDocumentValidator)와 글자 하나까지 같다 — 각 쪽의 URL 해석기는 포트 범위·국제화 도메인·대괄호·
//   잘못된 % 표기·두 번째 # 를 서로 다르게 받아, 한쪽이 저장한 링크를 다른 쪽이 거부했다. 받는 모양을 정규식으로 먼저 정한다.
const URL_EDGE_SPACE = /^[\t\n\f\r ]+|[\t\n\f\r ]+$/g;
const UNSAFE_URL_CHAR = /[\u0000-\u0020\u007f-\u00a0\u1680\u2000-\u200f\u2028-\u202f\u205f-\u2064\u3000\ufeff\\]/;
const HTTPS_AUTHORITY = /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)*[A-Za-z](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?::([0-9]{1,5}))?$/;
const HTTPS_TAIL_FORBIDDEN = /["<>^`{|}[\]]|%(?![0-9A-Fa-f]{2})/;
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const TONES = new Set<string>(['default', 'subtle', 'emphasis']);
const SPACINGS = new Set<string>(['compact', 'normal', 'relaxed']);
const ALIGNS = new Set<string>(['left', 'center', 'right']);
const SIMPLE_MARKS = new Set<string>(['bold', 'italic', 'underline', 'strike']);

/** 링크 주소 판정(ADR-0039 결정 6): https·사이트 내부 경로·mailto·tel 만. 통과하면 정리한 값, 아니면 null. */
export function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const href = value.replace(URL_EDGE_SPACE, '');
  if (!href || href.length > MAX_URL_LENGTH || UNSAFE_URL_CHAR.test(href)) return null;
  if (href.startsWith('/')) return href.startsWith('//') ? null : href;
  const lower = href.toLowerCase();
  if (lower.startsWith('mailto:')) return MAILTO.test(href) ? href : null;
  if (lower.startsWith('tel:')) return TEL.test(href) ? href : null;
  if (!lower.startsWith('https://')) return null;
  const rest = href.slice('https://'.length);
  const authorityEnd = rest.search(/[/?#]/);
  const authority = HTTPS_AUTHORITY.exec(authorityEnd < 0 ? rest : rest.slice(0, authorityEnd));
  const tail = authorityEnd < 0 ? '' : rest.slice(authorityEnd);
  if (!authority || HTTPS_TAIL_FORBIDDEN.test(tail) || tail.indexOf('#') !== tail.lastIndexOf('#')) return null;
  if (authority[1] !== undefined) {
    const port = Number(authority[1]);
    if (port < 1 || port > 65_535) return null;
  }
  try {
    const url = new URL(href);
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null;
    return href;
  } catch {
    return null;
  }
}

/** 사이트 내부 경로인가 — 화면은 내부 경로를 같은 창에서, 바깥 주소를 새 창으로 연다. */
export function isInternalHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

class CmsDocumentError extends Error {}

const fail = (path: string, message: string): never => {
  throw new CmsDocumentError(`${path}: ${message}`);
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);

function object(node: unknown, path: string, allowed: readonly string[]): Record<string, unknown> {
  if (!isObject(node)) fail(path, '형식이 올바르지 않습니다');
  const record = node as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) fail(path, `알 수 없는 항목입니다(${key})`);
  }
  return record;
}

function array(node: unknown, path: string, min: number, max: number): unknown[] {
  if (!Array.isArray(node) || node.length < min || node.length > max) {
    fail(path, min === max ? `${min}개여야 합니다` : `${min}~${max}개여야 합니다`);
  }
  return node as unknown[];
}

function token<T extends string>(node: unknown, path: string, allowed: ReadonlySet<string>): T {
  if (typeof node !== 'string' || !allowed.has(node)) fail(path, '허용하지 않는 값입니다');
  return node as T;
}

function text(node: unknown, path: string, max: number, required: boolean): string {
  if (node === undefined || node === null) {
    if (required) fail(path, '값을 입력해 주세요');
    return '';
  }
  if (typeof node !== 'string') fail(path, '글자여야 합니다');
  const stripped = (node as string).trim();
  if (required && !stripped) fail(path, '값을 입력해 주세요');
  if (stripped.length > max) fail(path, `${max}자 이내로 입력해 주세요`);
  if (CONTROL.test(stripped)) fail(path, '제어 문자를 쓸 수 없습니다');
  return stripped;
}

interface Context {
  mode: CmsValidationMode;
  images: Set<number>;
  files: Set<number>;
  blocks: number;
  location: CmsDocumentLocation;
}

function nodeType(node: unknown, path: string): string {
  const type = isObject(node) && typeof node.type === 'string' ? node.type : null;
  if (!type) fail(path, '본문 요소의 종류가 없습니다');
  return type as string;
}

function optionalContent(node: Record<string, unknown>, path: string): unknown[] {
  const content = node.content;
  if (content === undefined || content === null) return [];
  if (!Array.isArray(content)) fail(path, '본문 형식이 올바르지 않습니다');
  return content as unknown[];
}

function alignOf(attrs: unknown): string | null {
  const value = isObject(attrs) ? attrs.textAlign : undefined;
  if (value === undefined || value === null || value === 'left') return null;
  if (typeof value !== 'string' || !ALIGNS.has(value)) fail('본문', '정렬 값이 올바르지 않습니다');
  return value as string;
}

function marks(raw: unknown, path: string): CmsMark[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) fail(path, '글자 서식 형식이 올바르지 않습니다');
  const out: CmsMark[] = [];
  const seen = new Set<string>();
  for (const mark of raw as unknown[]) {
    const type = nodeType(mark, path);
    if (seen.has(type)) continue;
    seen.add(type);
    if (SIMPLE_MARKS.has(type)) {
      out.push({ type: type as CmsMark['type'] });
    } else if (type === 'link') {
      const attrs = (mark as Record<string, unknown>).attrs;
      const href = safeHref(isObject(attrs) ? attrs.href : undefined);
      if (!href) fail(path, '링크 주소는 https 주소, /로 시작하는 사이트 내부 경로, mailto·tel 만 쓸 수 있습니다');
      out.push({ type: 'link', attrs: { href: href as string } });
    } else {
      fail(path, `쓸 수 없는 글자 서식입니다(${type})`);
    }
  }
  return out;
}

function inlineContent(node: Record<string, unknown>, result: CmsRichNode, path: string) {
  const content = optionalContent(node, path);
  if (content.length === 0) return;
  const out: CmsRichNode[] = [];
  for (const child of content) {
    const type = nodeType(child, path);
    if (type === 'hardBreak') {
      out.push({ type: 'hardBreak' });
      continue;
    }
    if (type !== 'text') fail(path, `문단 안에 쓸 수 없는 요소입니다(${type})`);
    const value = (child as Record<string, unknown>).text;
    if (typeof value !== 'string' || value.length === 0) fail(path, '빈 글자 조각은 쓸 수 없습니다');
    if (CONTROL.test(value as string)) fail(path, '본문에 제어 문자를 쓸 수 없습니다');
    const textNode: CmsRichNode = { type: 'text', text: value as string };
    const normalizedMarks = marks((child as Record<string, unknown>).marks, path);
    if (normalizedMarks.length) textNode.marks = normalizedMarks;
    out.push(textNode);
  }
  result.content = out;
}

function children(node: Record<string, unknown>, result: CmsRichNode, path: string, depth: number,
  context: Context, allowed: ReadonlySet<string>) {
  const content = optionalContent(node, path);
  if (content.length < 1) fail(path, '비어 있는 목록·인용은 쓸 수 없습니다');
  result.content = content.map((child) => {
    const childType = nodeType(child, path);
    if (!allowed.has(childType)) fail(path, `이 위치에 쓸 수 없는 요소입니다(${childType})`);
    return block(child, path, depth + 1, context);
  });
}

function boundedInt(attrs: unknown, name: string, min: number, max: number, path: string): number {
  const value = isObject(attrs) ? attrs[name] : undefined;
  if (value === undefined || value === null) return 1;
  if (!isInteger(value) || value < min || value > max) fail(path, '표 병합 범위가 올바르지 않습니다');
  return value as number;
}

const CELL_CHILDREN = new Set(['paragraph', 'bulletList', 'orderedList']);

function table(node: Record<string, unknown>, result: CmsRichNode, path: string, depth: number, context: Context) {
  const rows = optionalContent(node, path);
  if (rows.length === 0 || rows.length > MAX_TABLE_ROWS) fail(path, `표는 1~${MAX_TABLE_ROWS}행이어야 합니다`);
  result.content = rows.map((row) => {
    if (nodeType(row, path) !== 'tableRow') fail(path, '표 안에는 행만 둘 수 있습니다');
    const cells = optionalContent(row as Record<string, unknown>, path);
    if (cells.length === 0 || cells.length > MAX_TABLE_COLUMNS) fail(path, `표의 한 행은 1~${MAX_TABLE_COLUMNS}칸이어야 합니다`);
    return {
      type: 'tableRow',
      content: cells.map((cell) => {
        const cellType = nodeType(cell, path);
        if (cellType !== 'tableCell' && cellType !== 'tableHeader') fail(path, '표 행 안에는 칸만 둘 수 있습니다');
        const raw = cell as Record<string, unknown>;
        const colspan = boundedInt(raw.attrs, 'colspan', 1, MAX_TABLE_COLUMNS, path);
        const rowspan = boundedInt(raw.attrs, 'rowspan', 1, MAX_TABLE_ROWS, path);
        const attrs: Record<string, unknown> = {};
        if (colspan !== 1) attrs.colspan = colspan;
        if (rowspan !== 1) attrs.rowspan = rowspan;
        const widths = isObject(raw.attrs) ? raw.attrs.colwidth : undefined;
        if (widths !== undefined && widths !== null) {
          if (!Array.isArray(widths) || widths.length !== colspan) fail(path, '표 열 너비가 칸 수와 맞지 않습니다');
          let any = false;
          const out = (widths as unknown[]).map((width) => {
            if (!isInteger(width) || width < 0 || width > 1200 || (width > 0 && width < 72)) {
              fail(path, '표 열 너비는 72~1200px 이어야 합니다');
            }
            any ||= (width as number) > 0;
            return width as number;
          });
          if (any) attrs.colwidth = out;
        }
        const outCell: CmsRichNode = { type: cellType };
        if (Object.keys(attrs).length) outCell.attrs = attrs;
        children(raw, outCell, path, depth + 2, context, CELL_CHILDREN);
        return outCell;
      }),
    };
  });
}

function block(raw: unknown, path: string, depth: number, context: Context): CmsRichNode {
  if (depth > MAX_DEPTH) fail(path, '본문이 너무 깊게 중첩됐습니다');
  if (++context.blocks > MAX_BLOCKS) fail(path, '본문 요소가 너무 많습니다');
  const type = nodeType(raw, path);
  const node = raw as Record<string, unknown>;
  const result: CmsRichNode = { type };
  const attrs = node.attrs;
  switch (type) {
    case 'paragraph': {
      const align = alignOf(attrs);
      if (align) result.attrs = { textAlign: align };
      inlineContent(node, result, path);
      break;
    }
    case 'heading': {
      const level = isObject(attrs) ? attrs.level : undefined;
      if (level !== 2 && level !== 3) fail(path, '본문 제목은 제목 2·제목 3 만 쓸 수 있습니다');
      const outAttrs: Record<string, unknown> = { level };
      const align = alignOf(attrs);
      if (align) outAttrs.textAlign = align;
      result.attrs = outAttrs;
      inlineContent(node, result, path);
      break;
    }
    case 'bulletList':
    case 'orderedList': {
      if (type === 'orderedList') {
        const start = isObject(attrs) ? attrs.start : undefined;
        if (start !== undefined && start !== null) {
          if (!isInteger(start) || start < 1 || start > 10_000) fail(path, '번호 목록의 시작 번호가 올바르지 않습니다');
          if (start !== 1) result.attrs = { start };
        }
      }
      children(node, result, path, depth, context, new Set(['listItem']));
      break;
    }
    case 'listItem':
      children(node, result, path, depth, context, CELL_CHILDREN);
      break;
    case 'blockquote':
      children(node, result, path, depth, context, new Set(['paragraph']));
      break;
    case 'table':
      table(node, result, path, depth, context);
      break;
    default:
      fail(path, `본문에 쓸 수 없는 요소입니다(${type})`);
  }
  return result;
}

function richDocument(raw: unknown, path: string, context: Context): CmsRichDoc {
  if (!isObject(raw) || raw.type !== 'doc') fail(path, '본문 형식이 올바르지 않습니다');
  const content = optionalContent(raw as Record<string, unknown>, path).map((child) => block(child, path, 1, context));
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] };
}

/** 칸이 가리키는 첨부를 모은다. 한 첨부를 이미지와 내려받기 파일로 함께 쓰거나, 내려받기 목록에 두 번 넣지 않는다. */
function attachment(context: Context, kind: 'images' | 'files', atchFileSn: number, path: string) {
  const other = kind === 'images' ? context.files : context.images;
  if (other.has(atchFileSn) || (kind === 'files' && context.files.has(atchFileSn))) {
    fail(path, '같은 파일을 두 곳에 쓸 수 없습니다');
  }
  context[kind].add(atchFileSn);
}

function cell(raw: unknown, path: string, context: Context): CmsCell {
  if (!isObject(raw)) fail(path, '칸 형식이 올바르지 않습니다');
  const node = raw as Record<string, unknown>;
  const publish = context.mode === 'publish';
  const kind = token<CmsCell['kind']>(node.kind, `${path} 종류`, new Set(['rich', 'image', 'links', 'files']));
  if (kind === 'rich') {
    object(node, path, ['kind', 'doc']);
    return { kind, doc: richDocument(node.doc, path, context) };
  }
  if (kind === 'image') {
    object(node, path, ['kind', 'atchFileSn', 'alt', 'decorative', 'caption']);
    // 초안은 아직 고르지 않은 이미지(0·빈 값)를 받는다. 게시는 이미지가 있어야 한다.
    const sn = node.atchFileSn;
    const unselected = sn === undefined || sn === null || sn === 0;
    if (unselected ? publish : !isInteger(sn) || sn < 0) fail(path, '이미지를 선택해 주세요');
    const atchFileSn = unselected ? 0 : sn as number;
    if (node.decorative !== undefined && typeof node.decorative !== 'boolean') fail(path, '장식 이미지 여부가 올바르지 않습니다');
    const decorative = node.decorative === true;
    const alt = text(node.alt, `${path} 대체 텍스트`, 300, false);
    if (publish && !decorative && !alt) fail(path, '이미지 설명(대체 텍스트)을 입력하거나 장식 이미지로 지정해 주세요');
    const caption = text(node.caption, `${path} 설명`, 300, false);
    if (atchFileSn > 0) attachment(context, 'images', atchFileSn, path);
    return { kind, atchFileSn, alt: decorative ? '' : alt, decorative, caption };
  }
  if (kind === 'files') {
    object(node, path, ['kind', 'items']);
    const items = array(node.items, `${path} 내려받기 파일`, publish ? 1 : 0, MAX_FILES).map((item, index) => {
      const itemPath = `${path} 내려받기 파일 ${index + 1}`;
      const record = object(item, itemPath, ['atchFileSn', 'title']);
      // 파일 항목은 올린 뒤에만 생긴다 — 초안이라도 첨부 번호가 있어야 한다.
      if (!isInteger(record.atchFileSn) || record.atchFileSn <= 0) fail(itemPath, '파일을 올려 주세요');
      const title = text(record.title, `${itemPath} 이름`, 200, publish);
      attachment(context, 'files', record.atchFileSn as number, itemPath);
      return { atchFileSn: record.atchFileSn as number, title };
    });
    return { kind, items };
  }
  object(node, path, ['kind', 'items']);
  const items = array(node.items, `${path} 바로가기`, 1, MAX_LINKS).map((item, index) => {
    const itemPath = `${path} 바로가기 ${index + 1}`;
    const record = object(item, itemPath, ['title', 'url']);
    // 초안은 이름·주소가 빈 바로가기를 받는다. 채운 주소는 초안이라도 허용 규칙을 지나야 저장한다.
    const title = text(record.title, `${itemPath} 이름`, 100, publish);
    const rawUrl = text(record.url, `${itemPath} 주소`, MAX_URL_LENGTH, publish);
    const url = rawUrl === '' ? '' : safeHref(rawUrl);
    if (url === null) fail(itemPath, '주소는 https 주소, /로 시작하는 사이트 내부 경로, mailto·tel 만 쓸 수 있습니다');
    return { title, url: url as string };
  });
  return { kind, items };
}

function section(raw: unknown, path: string, ids: Set<string>, context: Context): CmsSection {
  const node = object(raw, path, ['id', 'label', 'layout', 'tone', 'spacing', 'cells']);
  const id = text(node.id, `${path} 식별자`, 40, true);
  if (!SECTION_ID.test(id) || ids.has(id)) fail(path, '영역 식별자가 올바르지 않거나 겹칩니다');
  ids.add(id);
  const label = text(node.label, `${path} 이름`, 80, false);
  const layout = token<CmsLayout>(node.layout, `${path} 단 구성`, new Set(Object.keys(CMS_LAYOUT_CELLS)));
  const tone = token<CmsTone>(node.tone, `${path} 배경`, TONES);
  const spacing = token<CmsSpacing>(node.spacing, `${path} 간격`, SPACINGS);
  const expected = CMS_LAYOUT_CELLS[layout];
  const cells = array(node.cells, `${path} 칸`, expected, expected)
    .map((child, index) => {
      context.location.cell = index;
      return cell(child, `${path} ${index + 1}단`, context);
    });
  context.location.cell = undefined;
  return { id, label, layout, tone, spacing, cells };
}

const newContext = (mode: CmsValidationMode): Context =>
  ({ mode, images: new Set(), files: new Set(), blocks: 0, location: {} });

/** 서버 검증기와 같은 판정으로 문서를 정규화한다. 실패하면 처음 걸린 문제와 그 위치(영역·칸)를 준다. */
export function normalizeCmsDocument(raw: unknown, mode: CmsValidationMode): CmsNormalizeResult {
  const context = newContext(mode);
  try {
    if (raw === undefined || raw === null) fail('문서', '문서가 비어 있습니다');
    const root = object(raw, '문서', ['schemaVersion', 'sections']);
    if (root.schemaVersion !== CMS_SCHEMA_VERSION) fail('문서', '지원하지 않는 문서 형식입니다');
    const ids = new Set<string>();
    const sections = array(root.sections, '영역 목록', 1, MAX_SECTIONS)
      .map((child, index) => {
        context.location.section = index;
        return section(child, `영역 ${index + 1}`, ids, context);
      });
    context.location = {};
    const document: CmsDocument = { schemaVersion: 1, sections };
    if (new TextEncoder().encode(JSON.stringify(document)).length > CMS_MAX_BYTES) {
      fail('문서', '문서가 너무 큽니다(1MiB 초과). 영역이나 표를 나눠 주세요');
    }
    return { ok: true, document };
  } catch (error) {
    if (error instanceof CmsDocumentError) return { ok: false, error: error.message, location: { ...context.location } };
    throw error;
  }
}

/**
 * 게시를 막는 문제를 칸마다 모두 모은다(초안 판정을 통과한 문서 대상). 서버 게시 검증은 처음 걸린 하나만 알리므로, 화면은 이것으로
 * 고칠 칸을 한 번에 보인다. 보이는 내용이 하나도 없으면 문서 단위 문제 하나를 더한다.
 */
export function cmsPublishIssues(document: CmsDocument): CmsDocumentIssue[] {
  const issues: CmsDocumentIssue[] = [];
  const context = newContext('publish');
  document.sections.forEach((item, sectionIndex) => {
    item.cells.forEach((entry, cellIndex) => {
      try {
        cell(entry, `영역 ${sectionIndex + 1} ${cellIndex + 1}단`, context);
      } catch (error) {
        if (!(error instanceof CmsDocumentError)) throw error;
        issues.push({ section: sectionIndex, cell: cellIndex, message: error.message });
      }
    });
  });
  if (!hasVisibleContent(document)) issues.push({ message: '보이는 내용이 없습니다. 본문을 작성해 주세요.' });
  return issues;
}

/** 시작 양식이 넣은 작성 안내 문장. 그대로 게시하면 사용자에게 '작성해 주세요' 가 보인다. */
export const CMS_TEMPLATE_INSTRUCTIONS: readonly string[] = ['안내할 내용을 작성해 주세요.', '내용을 작성해 주세요.'];

/** 시작 양식의 작성 안내 문장이 그대로 남은 칸. */
export function templateInstructionIssues(document: CmsDocument): CmsDocumentIssue[] {
  const issues: CmsDocumentIssue[] = [];
  const walk = (node: CmsRichNode): boolean =>
    (node.type === 'text' && CMS_TEMPLATE_INSTRUCTIONS.includes((node.text ?? '').trim())) || (node.content ?? []).some(walk);
  document.sections.forEach((item, sectionIndex) => item.cells.forEach((entry, cellIndex) => {
    if (entry.kind === 'rich' && entry.doc.content.some(walk)) {
      issues.push({ section: sectionIndex, cell: cellIndex, message: '시작 양식의 작성 안내 문장이 남아 있습니다' });
    }
  }));
  return issues;
}

/** 아무것도 그리지 않는 칸(빈 본문·고르지 않은 이미지·빈 바로가기·빈 내려받기). 게시하면 빈 단으로 보인다. */
export function emptyCellLocations(document: CmsDocument): CmsDocumentLocation[] {
  const locations: CmsDocumentLocation[] = [];
  document.sections.forEach((item, sectionIndex) => item.cells.forEach((entry, cellIndex) => {
    if (!cellHasContent(entry)) locations.push({ section: sectionIndex, cell: cellIndex });
  }));
  return locations;
}

/** 다른 페이지의 내용을 새 페이지의 시작점으로 쓸 때 첨부를 뗀다 — 한 첨부는 한 페이지에만 속한다(ADR-0039 결정 8). */
export function withoutAttachments(document: CmsDocument): CmsDocument {
  return {
    schemaVersion: 1,
    sections: document.sections.map((item) => ({
      ...item,
      cells: item.cells.map((entry): CmsCell => {
        if (entry.kind === 'image') return { ...entry, atchFileSn: 0 };
        if (entry.kind === 'files') return { kind: 'files', items: [] };
        return entry;
      }),
    })),
  };
}

/** 키 순서와 무관하게 같은 문서인가(편집기 기본 속성은 정규화로 걷힌다). */
export function sameCmsDocument(left: unknown, right: unknown): boolean {
  const a = normalizeCmsDocument(left, 'draft');
  const b = normalizeCmsDocument(right, 'draft');
  if (!a.ok || !b.ok) return stableStringify(left) === stableStringify(right);
  return stableStringify(a.document) === stableStringify(b.document);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// ---- 편집 도우미 -------------------------------------------------------------------------------------------------

let sequence = 0;

/** 문서 안에서 겹치지 않는 영역 식별자. */
export function newSectionId(existing: readonly CmsSection[]): string {
  const used = new Set(existing.map((item) => item.id));
  let id: string;
  do {
    sequence += 1;
    id = `s-${Date.now().toString(36)}-${sequence.toString(36)}`;
  } while (used.has(id));
  return id;
}

export const emptyRichCell = (): CmsCell => ({ kind: 'rich', doc: { type: 'doc', content: [{ type: 'paragraph' }] } });

export function createSection(existing: readonly CmsSection[], layout: CmsLayout, label = ''): CmsSection {
  return {
    id: newSectionId(existing),
    label,
    layout,
    tone: 'default',
    spacing: 'normal',
    cells: Array.from({ length: CMS_LAYOUT_CELLS[layout] }, emptyRichCell),
  };
}

/**
 * 영역의 단 구성을 바꾼다. 단을 줄여도 내용을 버리지 않는다 — 넘치는 칸은 바로 아래 새 1단 영역으로 옮기고, 단을 늘리면 빈 본문 칸을 더한다.
 * 바뀐 영역 목록과 옮긴 칸 수를 돌려준다.
 */
export function changeSectionLayout(sections: readonly CmsSection[], index: number, layout: CmsLayout)
  : { sections: CmsSection[]; moved: number } {
  const target = sections[index];
  const size = CMS_LAYOUT_CELLS[layout];
  const kept = target.cells.slice(0, size);
  while (kept.length < size) kept.push(emptyRichCell());
  const overflow = target.cells.slice(size);
  const result = [...sections];
  result[index] = { ...target, layout, cells: kept };
  const moved: CmsSection[] = [];
  for (const overflowCell of overflow) {
    const created = createSection([...result, ...moved], 'one', target.label ? `${target.label} (옮긴 내용)` : '옮긴 내용');
    moved.push({ ...created, tone: target.tone, spacing: target.spacing, cells: [overflowCell] });
  }
  result.splice(index + 1, 0, ...moved);
  return { sections: result, moved: overflow.length };
}

/** 칸이 무엇이든 그리는가 — 글자 있는 본문, 고른 이미지, 이름·주소가 있는 바로가기, 파일이 있는 내려받기 목록. */
export function cellHasContent(entry: CmsCell): boolean {
  const walk = (node: CmsRichNode): boolean =>
    (node.type === 'text' && Boolean(node.text?.trim())) || (node.content ?? []).some(walk);
  if (entry.kind === 'rich') return entry.doc.content.some(walk);
  if (entry.kind === 'image') return entry.atchFileSn > 0;
  if (entry.kind === 'links') return entry.items.some((item) => item.title.trim() !== '' && item.url.trim() !== '');
  return entry.items.length > 0;
}

/** 보이는 내용이 하나라도 있는가(빈 문서 게시를 막는 화면 안내용). */
export function hasVisibleContent(document: CmsDocument): boolean {
  return document.sections.some((item) => item.cells.some(cellHasContent));
}

// ---- 시작 양식 ---------------------------------------------------------------------------------------------------

const paragraph = (value: string): CmsRichNode => ({ type: 'paragraph', content: [{ type: 'text', text: value }] });
const heading = (level: 2 | 3, value: string): CmsRichNode => ({
  type: 'heading', attrs: { level }, content: [{ type: 'text', text: value }],
});
const rich = (...content: CmsRichNode[]): CmsCell => ({ kind: 'rich', doc: { type: 'doc', content } });

export type CmsTemplate = 'blank' | 'guide' | 'intro';

export const CMS_TEMPLATE_LABELS: Record<CmsTemplate, string> = {
  blank: '빈 페이지',
  guide: '업무 안내',
  intro: '업무 홈 소개',
};

/** 새 페이지의 첫 문서. 양식은 처음 한 번만 쓰고, 작성 중인 내용을 덮어쓰지 않는다. */
export function templateDocument(template: CmsTemplate): CmsDocument {
  const sections: CmsSection[] = [];
  const add = (layout: CmsLayout, label: string, cells: CmsCell[], tone: CmsTone = 'default') => {
    const created = createSection(sections, layout, label);
    sections.push({ ...created, tone, cells });
  };
  if (template === 'intro') {
    add('two-wide', '대표 소개', [
      rich(heading(2, '필요한 업무를 한곳에서'), paragraph('기관의 정보와 서비스를 한곳에서 확인하세요.')),
      emptyRichCell(),
    ], 'emphasis');
    add('three', '주요 서비스', [emptyRichCell(), emptyRichCell(), emptyRichCell()]);
  } else if (template === 'guide') {
    add('one', '안내', [rich(heading(2, '이용 안내'), paragraph('안내할 내용을 작성해 주세요.'))]);
    add('one', '절차', [rich(heading(2, '진행 순서'), {
      type: 'orderedList',
      content: ['준비 사항 확인', '신청 내용 작성', '결과 확인'].map((step) => ({ type: 'listItem', content: [paragraph(step)] })),
    })]);
  } else {
    add('one', '본문', [rich(paragraph('내용을 작성해 주세요.'))]);
  }
  return { schemaVersion: 1, sections };
}
