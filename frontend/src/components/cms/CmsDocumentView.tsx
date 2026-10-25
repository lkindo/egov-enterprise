import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronRight, ExternalLink } from 'lucide-react';
import { AttachmentImage } from '@/app/components/ui/attachment-image';
import { CmsFileList } from '@/components/cms/CmsFileList';
import { cn } from '@/lib/utils';
import {
  cellHasContent,
  isInternalHref,
  safeHref,
  type CmsCell,
  type CmsDocument,
  type CmsLayout,
  type CmsLinkItem,
  type CmsMark,
  type CmsRichNode,
  type CmsSection,
  type CmsSpacing,
  type CmsTone,
} from '@/lib/cms/document';

/**
 * 콘텐츠 문서를 그리는 유일한 렌더러(ADR-0039 결정 5). 게시 페이지·업무 홈 소개·관리 화면 미리보기가 모두 이것을 쓴다.
 *
 * <p>문서를 React 요소로 그리며 HTML 문자열을 끼워 넣지 않는다. 서버 검증기를 통과한 문서만 오지만, 렌더러도 모르는 노드는
 * 그리지 않고 링크는 같은 판정(safeHref)을 다시 지난 것만 링크로 만든다. 배경·간격은 의미 토큰으로만 칠한다 — 다크 모드·고대비·
 * 브랜드 프로필이 같은 의미를 따른다.
 *
 * <p>제목 계층: 페이지 제목이 h1 이고 본문 제목은 h2·h3 이다. 영역 이름은 편집용이라 그리지 않는다.
 *
 * <p>[ADR-0042] 단 배치는 화면 폭이 아니라 **이 문서를 담은 상자의 폭**으로 바뀐다(루트가 컨테이너다). 그래서 관리 화면 미리보기의
 * 휴대전화 폭 틀이 실제 휴대전화와 같은 배치를 보이고, 좁은 칸에 들어간 업무 홈 소개도 칸 폭에 맞춘다. DOM 은 하나이고 CSS 로만
 * 바뀐다(ADR-0006).
 *
 * <p>[ADR-0042] 초안은 미완성 칸(고르지 않은 이미지·이름이나 주소가 빈 바로가기·파일 없는 내려받기·빈 본문)을 담는다. 사용자 화면은
 * 그 칸을 그리지 않고(여러 단 영역에서는 넓은 폭의 단 위치만 비워 둔다), 관리 미리보기(`showPlaceholders`)는 점선 자리로 보여 무엇이
 * 비었는지 알린다.
 */

/** 단을 나누는 폭. 3단이 읽을 만한 폭(42rem)부터 나눈다 — 그보다 좁으면 한 줄로 쌓는다. */
const LAYOUT_GRID: Record<CmsLayout, string> = {
  one: 'grid-cols-1',
  two: 'grid-cols-1 @2xl:grid-cols-2',
  'two-wide': 'grid-cols-1 @2xl:grid-cols-[2fr_3fr]',
  three: 'grid-cols-1 @2xl:grid-cols-3',
};

const TONE_CLASS: Record<CmsTone, string> = {
  default: '',
  subtle: 'rounded-lg bg-muted/60 px-4 @2xl:px-6',
  emphasis: 'rounded-lg bg-primary/10 px-4 @2xl:px-6',
};

const SPACING_CLASS: Record<CmsSpacing, string> = {
  compact: 'py-3 gap-4',
  normal: 'py-5 gap-6',
  relaxed: 'py-8 gap-8',
};

const ALIGN_CLASS: Record<string, string> = { center: 'text-center', right: 'text-right' };

/** 관리 미리보기의 미완성 칸 자리. 사용자 화면에는 나오지 않는다. */
const PLACEHOLDER_CLASS =
  'block rounded-md border-2 border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground';

const TEXT_LINK_CLASS = 'text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary';

const SHORTCUT_CLASS = 'flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 font-medium '
  + 'text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** 한 번 그리는 동안 쓰는 상태 — 미완성 칸을 보일지, 문서 안 표 순번. */
interface RenderContext {
  readonly placeholders: boolean;
  tables: number;
}

function alignClass(node: CmsRichNode): string | undefined {
  const value = node.attrs?.textAlign;
  return typeof value === 'string' ? ALIGN_CLASS[value] : undefined;
}

/** 바깥 주소(https)인가 — 새 창으로 열고 그 사실을 눈과 화면낭독기 모두에 알린다. mailto·tel 은 새 창이 아니다. */
const isExternalHref = (href: string) => href.startsWith('https://');

function renderMarks(text: React.ReactNode, marks: readonly CmsMark[] | undefined, key: string): React.ReactNode {
  let result = text;
  for (const mark of marks ?? []) {
    if (mark.type === 'bold') result = <strong key={key}>{result}</strong>;
    else if (mark.type === 'italic') result = <em key={key}>{result}</em>;
    else if (mark.type === 'underline') result = <u key={key}>{result}</u>;
    else if (mark.type === 'strike') result = <s key={key}>{result}</s>;
  }
  const link = marks?.find((mark) => mark.type === 'link');
  const href = link ? safeHref(link.attrs?.href) : null;
  if (!href) return result;
  // 사이트 안 경로는 앱 안 이동(전체 새로 고침 없이)으로 연다.
  if (isInternalHref(href)) {
    return <Link key={key} href={href} className={TEXT_LINK_CLASS}>{result}</Link>;
  }
  const external = isExternalHref(href);
  return (
    <a key={key} href={href} className={TEXT_LINK_CLASS} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {result}
      {external && (
        <>
          <ExternalLink aria-hidden="true" className="ml-0.5 inline-block h-[0.85em] w-[0.85em] align-baseline" />
          <span className="sr-only"> (새 창)</span>
        </>
      )}
    </a>
  );
}

function renderInline(nodes: readonly CmsRichNode[] | undefined, prefix: string): React.ReactNode[] {
  return (nodes ?? []).map((node, index) => {
    const key = `${prefix}-${index}`;
    if (node.type === 'hardBreak') return <br key={key} />;
    if (node.type !== 'text' || !node.text) return null;
    return <React.Fragment key={key}>{renderMarks(node.text, node.marks, key)}</React.Fragment>;
  });
}

function renderTable(node: CmsRichNode, key: string, context: RenderContext): React.ReactNode {
  const rows = node.content ?? [];
  const firstRow = rows[0]?.content ?? [];
  const widths = firstRow.flatMap((cell) => {
    const span = typeof cell.attrs?.colspan === 'number' ? cell.attrs.colspan : 1;
    const colwidth = Array.isArray(cell.attrs?.colwidth) ? (cell.attrs.colwidth as number[]) : [];
    return Array.from({ length: span }, (_, index) => colwidth[index] ?? 0);
  });
  // 가로로 스크롤되는 표 상자는 키보드로 닿아야 하고 이름이 있어야 한다. 표가 여럿이면 같은 이름이 겹치지 않게 문서 안 순번을 붙인다.
  context.tables += 1;
  return (
    <div key={key} className="my-4 overflow-x-auto" role="region" aria-label={`표 ${context.tables}`} tabIndex={0}>
      <table className="w-full min-w-max border-collapse text-[length:var(--font-size-body)]">
        {widths.some((width) => width > 0) && (
          <colgroup>
            {widths.map((width, index) => (
              <col key={index} style={width > 0 ? { width: `${width}px` } : undefined} />
            ))}
          </colgroup>
        )}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {(row.content ?? []).map((cell, cellIndex) => {
                const header = cell.type === 'tableHeader';
                const Tag = header ? 'th' : 'td';
                const colspan = typeof cell.attrs?.colspan === 'number' ? cell.attrs.colspan : undefined;
                const rowspan = typeof cell.attrs?.rowspan === 'number' ? cell.attrs.rowspan : undefined;
                return (
                  <Tag
                    key={cellIndex}
                    colSpan={colspan}
                    rowSpan={rowspan}
                    {...(header ? { scope: rowIndex === 0 ? 'col' : 'row' } : {})}
                    className={cn('border border-border px-3 py-2 align-top text-left',
                      header && 'bg-muted font-semibold text-foreground')}
                  >
                    {renderBlocks(cell.content, `${key}-${rowIndex}-${cellIndex}`, context)}
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderBlocks(nodes: readonly CmsRichNode[] | undefined, prefix: string, context: RenderContext): React.ReactNode[] {
  return (nodes ?? []).map((node, index) => {
    const key = `${prefix}-${index}`;
    switch (node.type) {
      case 'paragraph':
        return (
          <p key={key} className={cn('min-h-[1lh] leading-relaxed [&:not(:first-child)]:mt-3', alignClass(node))}>
            {renderInline(node.content, key)}
          </p>
        );
      case 'heading':
        return node.attrs?.level === 3 ? (
          <h3 key={key} className={cn('mt-5 text-lg font-semibold text-foreground first:mt-0', alignClass(node))}>
            {renderInline(node.content, key)}
          </h3>
        ) : (
          <h2 key={key} className={cn('mt-6 text-xl font-bold text-foreground first:mt-0', alignClass(node))}>
            {renderInline(node.content, key)}
          </h2>
        );
      case 'bulletList':
        return <ul key={key} className="mt-3 list-disc space-y-1 pl-6">{renderBlocks(node.content, key, context)}</ul>;
      case 'orderedList':
        return (
          <ol key={key} className="mt-3 list-decimal space-y-1 pl-6"
            start={typeof node.attrs?.start === 'number' ? node.attrs.start : undefined}>
            {renderBlocks(node.content, key, context)}
          </ol>
        );
      case 'listItem':
        return <li key={key} className="[&>p]:mt-0">{renderBlocks(node.content, key, context)}</li>;
      case 'blockquote':
        return (
          <blockquote key={key} className="mt-3 border-l-4 border-border pl-4 text-muted-foreground">
            {renderBlocks(node.content, key, context)}
          </blockquote>
        );
      case 'table':
        return renderTable(node, key, context);
      default:
        return null;
    }
  });
}

/** 바로가기 하나. 이름과 허용된 주소가 모두 있어야 링크다 — 아니면 사용자 화면에서는 그리지 않고 미리보기에서는 빈 자리로 보인다. */
function renderShortcut(item: CmsLinkItem, index: number, context: RenderContext): React.ReactNode {
  const title = item.title.trim();
  const href = safeHref(item.url);
  if (!title || !href) {
    if (!context.placeholders) return null;
    return (
      <li key={index}>
        <span className={cn(PLACEHOLDER_CLASS, 'text-left')} data-cms-placeholder="link">
          {title ? `${title} — 주소를 아직 넣지 않았습니다` : '이름이나 주소를 아직 넣지 않은 바로가기'}
        </span>
      </li>
    );
  }
  // 화살표 모양으로 목적지를 구분한다 — 바깥으로 나가는 링크만 대각선 화살표이고 새 창으로 연다.
  const external = isExternalHref(href);
  const body = (
    <>
      <span className="min-w-0 break-words">{title}</span>
      {external
        ? <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        : <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />}
      {external && <span className="sr-only"> (새 창)</span>}
    </>
  );
  return (
    <li key={index}>
      {isInternalHref(href) ? (
        <Link href={href} className={SHORTCUT_CLASS}>{body}</Link>
      ) : (
        <a href={href} className={SHORTCUT_CLASS} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{body}</a>
      )}
    </li>
  );
}

function renderImage(cell: Extract<CmsCell, { kind: 'image' }>, key: string): React.ReactNode {
  const caption = cell.caption && (
    <figcaption className="mt-2 text-center text-sm text-muted-foreground">{cell.caption}</figcaption>
  );
  if (cell.atchFileSn <= 0) {
    return (
      <figure key={key} className="min-w-0">
        <span className={PLACEHOLDER_CLASS} data-cms-placeholder="image">이미지를 아직 고르지 않았습니다</span>
        {caption}
      </figure>
    );
  }
  const alt = cell.decorative ? '' : cell.alt;
  return (
    // 작은 이미지를 칸 폭으로 늘리지 않는다 — 원래 크기를 넘지 않고 칸보다 크면 칸에 맞춰 줄인다.
    <figure key={key} className="group/cms-image min-w-0">
      <AttachmentImage
        atchFileSn={cell.atchFileSn}
        alt={alt}
        className="mx-auto block h-auto max-w-full rounded-md"
        fallbackClassName="h-40 w-full rounded-md"
      />
      {/*
        이미지를 보이지 못하면(권한·부재·연결 실패) 대체 텍스트를 글로 보인다 — 화면낭독기는 대체 표시의 이름으로 이미 읽으므로
        이 글은 눈으로만 읽는다. 대체 표시만 아이콘(svg)을 담으므로 그때만 드러난다(불러오는 중·보인 뒤에는 숨는다).
        같은 DOM 하나를 CSS 로만 바꾼다.
      */}
      {alt && (
        <p aria-hidden="true" data-cms-image-alt=""
          className="mt-2 hidden text-center text-sm text-foreground group-has-[[role=img]>svg]/cms-image:block">
          {alt}
        </p>
      )}
      {caption}
    </figure>
  );
}

function renderCell(cell: CmsCell, key: string, context: RenderContext): React.ReactNode {
  if (!cellHasContent(cell)) {
    if (context.placeholders) {
      if (cell.kind === 'image') return renderImage(cell, key);
      const label = cell.kind === 'links' ? '이름이나 주소를 아직 넣지 않은 바로가기'
        : cell.kind === 'files' ? '내려받을 파일을 아직 올리지 않았습니다'
        : '내용이 없는 칸입니다';
      return <span key={key} className={cn(PLACEHOLDER_CLASS, 'min-w-0')} data-cms-placeholder={cell.kind}>{label}</span>;
    }
    // 사용자 화면은 빈 칸을 그리지 않는다. 넓은 폭에서 단을 나눌 때만 그 단 자리를 비워 옆 칸이 제자리에 남게 한다.
    return <div key={key} aria-hidden="true" className="hidden @2xl:block" data-cms-empty-cell="" />;
  }
  if (cell.kind === 'rich') {
    return <div key={key} className="min-w-0 text-foreground">{renderBlocks(cell.doc.content, key, context)}</div>;
  }
  if (cell.kind === 'image') return renderImage(cell, key);
  if (cell.kind === 'files') {
    return <div key={key} className="min-w-0"><CmsFileList items={cell.items} /></div>;
  }
  return (
    <ul key={key} className="grid min-w-0 gap-2">
      {cell.items.map((item, index) => renderShortcut(item, index, context))}
    </ul>
  );
}

function renderSection(section: CmsSection, context: RenderContext): React.ReactNode {
  // 사용자 화면에서 모든 칸이 빈 영역은 빈 여백만 남기므로 그리지 않는다.
  if (!context.placeholders && !section.cells.some(cellHasContent)) return null;
  return (
    <div
      key={section.id}
      data-cms-section={section.id}
      className={cn('grid', LAYOUT_GRID[section.layout], SPACING_CLASS[section.spacing], TONE_CLASS[section.tone])}
    >
      {section.cells.map((cell, cellIndex) => renderCell(cell, `${section.id}-${cellIndex}`, context))}
    </div>
  );
}

export function CmsDocumentView({ document, className, showPlaceholders = false }: {
  document: CmsDocument;
  className?: string;
  /** 관리 미리보기 전용 — 미완성 칸을 점선 자리로 보인다. 사용자 화면은 쓰지 않는다. */
  showPlaceholders?: boolean;
}) {
  const context: RenderContext = { placeholders: showPlaceholders, tables: 0 };
  return (
    <div className={cn('@container w-full space-y-2 text-[length:var(--font-size-body)]', className)}>
      {document.sections.map((section) => renderSection(section, context))}
    </div>
  );
}
