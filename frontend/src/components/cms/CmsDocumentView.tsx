import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { AttachmentImage } from '@/app/components/ui/attachment-image';
import { cn } from '@/lib/utils';
import {
  isInternalHref,
  safeHref,
  type CmsCell,
  type CmsDocument,
  type CmsLayout,
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
 */

const LAYOUT_GRID: Record<CmsLayout, string> = {
  one: 'grid-cols-1',
  two: 'grid-cols-1 md:grid-cols-2',
  'two-wide': 'grid-cols-1 md:grid-cols-[2fr_3fr]',
  three: 'grid-cols-1 md:grid-cols-3',
};

const TONE_CLASS: Record<CmsTone, string> = {
  default: '',
  subtle: 'rounded-lg bg-muted/60 px-4 md:px-6',
  emphasis: 'rounded-lg bg-primary/10 px-4 md:px-6',
};

const SPACING_CLASS: Record<CmsSpacing, string> = {
  compact: 'py-3 gap-4',
  normal: 'py-5 gap-6',
  relaxed: 'py-8 gap-8',
};

const ALIGN_CLASS: Record<string, string> = { center: 'text-center', right: 'text-right' };

function alignClass(node: CmsRichNode): string | undefined {
  const value = node.attrs?.textAlign;
  return typeof value === 'string' ? ALIGN_CLASS[value] : undefined;
}

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
  const external = !isInternalHref(href) && href.startsWith('https://');
  return (
    <a
      key={key}
      href={href}
      className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {result}
      {external && <span className="sr-only"> (새 창)</span>}
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

function renderTable(node: CmsRichNode, key: string): React.ReactNode {
  const rows = node.content ?? [];
  const firstRow = rows[0]?.content ?? [];
  const widths = firstRow.flatMap((cell) => {
    const span = typeof cell.attrs?.colspan === 'number' ? cell.attrs.colspan : 1;
    const colwidth = Array.isArray(cell.attrs?.colwidth) ? (cell.attrs.colwidth as number[]) : [];
    return Array.from({ length: span }, (_, index) => colwidth[index] ?? 0);
  });
  return (
    <div key={key} className="my-4 overflow-x-auto" role="region" aria-label="표" tabIndex={0}>
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
                    {renderBlocks(cell.content, `${key}-${rowIndex}-${cellIndex}`)}
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

function renderBlocks(nodes: readonly CmsRichNode[] | undefined, prefix: string): React.ReactNode[] {
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
        return <ul key={key} className="mt-3 list-disc space-y-1 pl-6">{renderBlocks(node.content, key)}</ul>;
      case 'orderedList':
        return (
          <ol key={key} className="mt-3 list-decimal space-y-1 pl-6"
            start={typeof node.attrs?.start === 'number' ? node.attrs.start : undefined}>
            {renderBlocks(node.content, key)}
          </ol>
        );
      case 'listItem':
        return <li key={key} className="[&>p]:mt-0">{renderBlocks(node.content, key)}</li>;
      case 'blockquote':
        return (
          <blockquote key={key} className="mt-3 border-l-4 border-border pl-4 text-muted-foreground">
            {renderBlocks(node.content, key)}
          </blockquote>
        );
      case 'table':
        return renderTable(node, key);
      default:
        return null;
    }
  });
}

function renderCell(cell: CmsCell, key: string): React.ReactNode {
  if (cell.kind === 'rich') {
    return <div key={key} className="min-w-0 text-foreground">{renderBlocks(cell.doc.content, key)}</div>;
  }
  if (cell.kind === 'image') {
    return (
      <figure key={key} className="min-w-0">
        <AttachmentImage
          atchFileSn={cell.atchFileSn}
          alt={cell.decorative ? '' : cell.alt}
          className="h-auto w-full rounded-md object-contain"
          fallbackClassName="h-40 w-full rounded-md"
        />
        {cell.caption && (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">
            {cell.caption}
          </figcaption>
        )}
      </figure>
    );
  }
  return (
    <ul key={key} className="grid min-w-0 gap-2">
      {cell.items.map((item, index) => {
        const href = safeHref(item.url);
        const external = href !== null && href.startsWith('https://');
        return (
          <li key={index}>
            {href ? (
              <a
                href={href}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <span>{item.title}</span>
                <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                {external && <span className="sr-only"> (새 창)</span>}
              </a>
            ) : (
              <span className="block rounded-md border border-border px-4 py-3 text-muted-foreground">{item.title}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function renderSection(section: CmsSection, index: number): React.ReactNode {
  return (
    <div
      key={section.id}
      data-cms-section={section.id}
      className={cn('grid', LAYOUT_GRID[section.layout], SPACING_CLASS[section.spacing], TONE_CLASS[section.tone],
        index > 0 && 'mt-2')}
    >
      {section.cells.map((cell, cellIndex) => renderCell(cell, `${section.id}-${cellIndex}`))}
    </div>
  );
}

export function CmsDocumentView({ document, className }: { document: CmsDocument; className?: string }) {
  return (
    <div className={cn('text-[length:var(--font-size-body)]', className)}>
      {document.sections.map(renderSection)}
    </div>
  );
}
