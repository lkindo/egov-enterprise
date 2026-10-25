'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ArrowDown, ArrowUp, Copy, FilePlus, ImagePlus, ListPlus, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AttachmentImage } from '@/app/components/ui/attachment-image';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import {
  InternalPathPicker,
  cmsPageAddressOf,
  internalPathWarning,
  usePublishedPageLookup,
  type InternalPathChoice,
} from '@/components/cms/InternalPathPicker';
import { SERVER_MAX_FILE_SIZE_MB } from '@/lib/attachments/server-upload-limits';
import { cn } from '@/lib/utils';
import { fileService } from '@/services/foundation/file/FileService';
import {
  CMS_FILE_EXTENSIONS,
  CMS_IMAGE_EXTENSIONS,
  CMS_LAYOUT_LABELS,
  CMS_SPACING_LABELS,
  CMS_TONE_LABELS,
  emptyRichCell,
  safeHref,
  type CmsCell,
  type CmsFileItem,
  type CmsLayout,
  type CmsSection,
  type CmsSpacing,
  type CmsTone,
} from '@/lib/cms/document';

// TipTap 은 브라우저에서만 그린다(기존 서식 편집기와 같다).
const CmsRichTextEditor = dynamic(
  () => import('@/components/cms/CmsRichTextEditor').then((module) => module.CmsRichTextEditor),
  { ssr: false, loading: () => <div className="h-32 animate-pulse rounded-md bg-muted" /> },
);

const SELECT_CLASS = 'h-[var(--control-h)] rounded-md border border-input bg-transparent px-2 text-[length:var(--font-size-body)] text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';
const KIND_LABELS: Record<CmsCell['kind'], string> = { rich: '본문·표', image: '이미지', links: '바로가기', files: '내려받기 파일' };
const IMAGE_ACCEPT = CMS_IMAGE_EXTENSIONS.map((extension) => `.${extension}`).join(',');
const FILE_ACCEPT = CMS_FILE_EXTENSIONS.map((extension) => `.${extension}`).join(',');
// 문서 검증기(document.ts)의 상한과 같다 — 영역 50개, 바로가기 12개, 내려받기 파일 10개, 파일 이름 200자.
const MAX_SECTIONS = 50;
const MAX_LINKS = 12;
const MAX_FILES = 10;
const MAX_FILE_TITLE = 200;

/** 영역의 문제 하나(ADR-0042). cell 은 0부터의 칸 번호이고, 없으면 영역 전체의 문제다. */
export interface SectionIssue {
  cell?: number;
  message: string;
}

export interface SectionEditorProps {
  section: CmsSection;
  index: number;
  total: number;
  readOnly: boolean;
  /** 이미지·내려받기 파일 칸의 올리기 단추. 파일 올리기 권한(FILE_UPLOAD)이 없으면 두지 않는다 — 이미 넣은 것은 그대로 보인다. */
  canUpload: boolean;
  onChange: (section: CmsSection) => void;
  onLayoutChange: (layout: CmsLayout) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onNotice: (message: string) => void;
  /** 이 영역의 문제. 영역 머리에 요약하고, 칸 번호가 있으면 그 칸에 보이며 칸 입력에 aria-invalid·aria-describedby 로 잇는다. */
  issues?: readonly SectionIssue[];
  /** 이 영역 바로 아래에 고른 단 구성의 새 영역을 더한다. 없으면 단추를 두지 않는다. */
  onInsertBelow?: (layout: CmsLayout) => void;
  /** 이 영역을 바로 아래에 복제한다(편집기가 첨부를 떼고 새 식별자로 만든다). 없으면 단추를 두지 않는다. */
  onDuplicate?: () => void;
}

/** 지금 내용을 버려도 잃는 것이 없는 칸 — 종류를 바꿀 때 확인을 묻지 않는다. */
function cellIsEmpty(cell: CmsCell): boolean {
  if (cell.kind === 'image') return !cell.atchFileSn;
  if (cell.kind === 'links') return cell.items.every((item) => !item.title && !item.url);
  if (cell.kind === 'files') return cell.items.length === 0;
  return JSON.stringify(cell.doc).indexOf('"text"') < 0;
}

/** 여러 설명 id 를 aria-describedby 하나로 묶는다. 없으면 undefined. */
function describedBy(...ids: Array<string | false | null | undefined>): string | undefined {
  const joined = ids.filter(Boolean).join(' ');
  return joined || undefined;
}

/** 올리기 전에 거를 파일 — 일반 업로드는 받아도 콘텐츠 페이지가 저장할 때 거부하는 형식이 있다(서버 귀속 검사). 통과면 null. */
function uploadRejection(file: File, extensions: readonly string[]): string | null {
  const dot = file.name.lastIndexOf('.');
  const extension = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : '';
  if (!extensions.includes(extension)) return `${extensions.join('·')} 파일만 올릴 수 있습니다.`;
  if (file.size > SERVER_MAX_FILE_SIZE_MB * 1024 * 1024) return `파일 하나는 ${SERVER_MAX_FILE_SIZE_MB}MB 까지 올릴 수 있습니다.`;
  return null;
}

/** 올린 파일 이름에서 확장자를 뺀 것 — 내려받기 항목 이름의 기본값. */
function defaultFileTitle(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return (dot > 0 ? fileName.slice(0, dot) : fileName).trim().slice(0, MAX_FILE_TITLE);
}

/** 비동기 올리기가 끝난 뒤 쓸 최신 값. 올리는 동안 다른 입력을 고쳐도 끝난 결과가 그 입력을 되돌리지 않는다. */
function useLatest<T>(value: T): React.RefObject<T> {
  const ref = React.useRef(value);
  React.useEffect(() => { ref.current = value; });
  return ref;
}

export function SectionEditor({
  section, index, total, readOnly, canUpload, onChange, onLayoutChange, onMove, onRemove, onNotice,
  issues = [], onInsertBelow, onDuplicate,
}: SectionEditorProps) {
  const number = index + 1;
  const name = section.label || `${number}번 영역`;
  const [insertOpen, setInsertOpen] = React.useState(false);
  const insertToggleRef = React.useRef<HTMLButtonElement>(null);
  const setCell = (cellIndex: number, cell: CmsCell) =>
    onChange({ ...section, cells: section.cells.map((item, position) => (position === cellIndex ? cell : item)) });
  const sectionIssues = issues.filter((issue) => issue.cell === undefined);
  const full = total >= MAX_SECTIONS;
  const idBase = `cms-section-${section.id}`;
  const closeInsert = () => {
    setInsertOpen(false);
    insertToggleRef.current?.focus();
  };

  return (
    <section
      aria-labelledby={`${idBase}-title`}
      data-section-index={index}
      className={cn('rounded-lg border bg-card', issues.length > 0 ? 'border-destructive' : 'border-border')}
    >
      <div className="flex flex-wrap items-end gap-2 border-b border-border px-3 py-2">
        <h3 id={`${idBase}-title`} className="sr-only">{name}</h3>
        <span aria-hidden="true" className="pb-2 text-sm font-semibold tabular-nums text-muted-foreground">
          {String(number).padStart(2, '0')}
        </span>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm text-muted-foreground">
          영역 이름(편집용)
          <Input
            value={section.label}
            maxLength={80}
            disabled={readOnly}
            placeholder={`${number}번 영역`}
            onChange={(event) => onChange({ ...section, label: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          단 구성
          <select
            className={SELECT_CLASS}
            value={section.layout}
            disabled={readOnly}
            onChange={(event) => onLayoutChange(event.target.value as CmsLayout)}
          >
            {Object.entries(CMS_LAYOUT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          배경
          <select
            className={SELECT_CLASS}
            value={section.tone}
            disabled={readOnly}
            onChange={(event) => onChange({ ...section, tone: event.target.value as CmsTone })}
          >
            {Object.entries(CMS_TONE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          간격
          <select
            className={SELECT_CLASS}
            value={section.spacing}
            disabled={readOnly}
            onChange={(event) => onChange({ ...section, spacing: event.target.value as CmsSpacing })}
          >
            {Object.entries(CMS_SPACING_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-1 pb-0.5">
          <Button type="button" variant="outline" size="icon" aria-label={`${name} 위로 옮기기`}
            disabled={readOnly || index === 0} data-move="up" onClick={() => onMove(-1)}>
            <ArrowUp size={16} aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label={`${name} 아래로 옮기기`}
            disabled={readOnly || index === total - 1} data-move="down" onClick={() => onMove(1)}>
            <ArrowDown size={16} aria-hidden="true" />
          </Button>
          {onInsertBelow && (
            <Button ref={insertToggleRef} type="button" variant="outline" size="icon" aria-label={`${name} 아래에 영역 더하기`}
              aria-expanded={insertOpen} aria-controls={`${idBase}-insert`} disabled={readOnly || full}
              onClick={() => setInsertOpen((value) => !value)}>
              <ListPlus size={16} aria-hidden="true" />
            </Button>
          )}
          {onDuplicate && (
            <Button type="button" variant="outline" size="icon" aria-label={`${name} 복제`}
              disabled={readOnly || full} onClick={onDuplicate}>
              <Copy size={16} aria-hidden="true" />
            </Button>
          )}
          <Button type="button" variant="outline" size="icon" aria-label={`${name} 삭제`}
            disabled={readOnly || total === 1} onClick={onRemove}>
            <Trash2 size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
      {onInsertBelow && insertOpen && !readOnly && !full && (
        <div
          id={`${idBase}-insert`}
          role="group"
          aria-label={`${name} 아래에 더할 영역의 단 구성`}
          className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2"
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            closeInsert();
          }}
        >
          <span className="text-sm text-muted-foreground">아래에 더할 단 구성</span>
          {(Object.keys(CMS_LAYOUT_LABELS) as CmsLayout[]).map((layout) => (
            <Button key={layout} type="button" variant="outline" size="sm"
              onClick={() => {
                closeInsert();
                onInsertBelow(layout);
              }}>
              <Plus size={14} aria-hidden="true" /> {CMS_LAYOUT_LABELS[layout]}
            </Button>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={closeInsert}>닫기</Button>
        </div>
      )}
      {issues.length > 0 && (
        <div role="alert" className="space-y-1 border-b border-border bg-destructive/5 px-3 py-2 text-sm text-destructive-emphasis">
          <p className="font-medium">{name}에 고칠 곳이 {issues.length}개 있습니다.</p>
          {sectionIssues.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5">
              {sectionIssues.map((issue, position) => <li key={position}>{issue.message}</li>)}
            </ul>
          )}
        </div>
      )}
      <div className={section.layout === 'one' ? 'grid gap-3 p-3' : 'grid gap-3 p-3 lg:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]'}>
        {section.cells.map((cell, cellIndex) => (
          <CellEditor
            key={cellIndex}
            cell={cell}
            cellIndex={cellIndex}
            label={`${name} ${cellIndex + 1}단`}
            issues={issues.filter((issue) => issue.cell === cellIndex)}
            issueId={`${idBase}-cell-${cellIndex}-issues`}
            readOnly={readOnly}
            canUpload={canUpload}
            onChange={(next) => setCell(cellIndex, next)}
            onNotice={onNotice}
          />
        ))}
      </div>
    </section>
  );
}

interface CellEditorProps {
  cell: CmsCell;
  cellIndex: number;
  label: string;
  issues: readonly SectionIssue[];
  /** 이 칸의 문제 목록 id(문제가 있을 때만 그린다). */
  issueId: string;
  readOnly: boolean;
  canUpload: boolean;
  onChange: (cell: CmsCell) => void;
  onNotice: (message: string) => void;
}

/** 칸 편집기들이 함께 받는 값. issueId 는 이 칸에 문제가 있을 때만 있다. */
interface CellContentProps {
  label: string;
  readOnly: boolean;
  issueId?: string;
  onChange: (cell: CmsCell) => void;
}

function CellEditor({ cell, cellIndex, label, issues, issueId, readOnly, canUpload, onChange, onNotice }: CellEditorProps) {
  const [pendingKind, setPendingKind] = React.useState<CmsCell['kind'] | null>(null);
  const invalid = issues.length > 0;
  const activeIssueId = invalid ? issueId : undefined;
  const replace = (kind: CmsCell['kind']) => {
    if (kind === 'rich') onChange(emptyRichCell());
    else if (kind === 'image') onChange({ kind: 'image', atchFileSn: 0, alt: '', decorative: false, caption: '' });
    else if (kind === 'files') onChange({ kind: 'files', items: [] });
    else onChange({ kind: 'links', items: [{ title: '', url: '' }] });
    setPendingKind(null);
  };
  return (
    <div data-cell-index={cellIndex}
      className={cn('min-w-0 space-y-2 rounded-md border border-dashed p-2', invalid ? 'border-destructive' : 'border-border')}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {label} 내용
          <select
            className={SELECT_CLASS}
            value={pendingKind ?? cell.kind}
            disabled={readOnly}
            aria-invalid={invalid || undefined}
            aria-describedby={activeIssueId}
            onChange={(event) => {
              const kind = event.target.value as CmsCell['kind'];
              if (kind === cell.kind) { setPendingKind(null); return; }
              if (cellIsEmpty(cell)) replace(kind);
              else setPendingKind(kind);
            }}
          >
            {Object.entries(KIND_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </label>
        {pendingKind && (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
            <span>지금 내용을 지우고 {KIND_LABELS[pendingKind]}(으)로 바꿀까요?</span>
            <Button type="button" size="sm" variant="destructive" onClick={() => replace(pendingKind)}>바꾸기</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setPendingKind(null)}>그대로 두기</Button>
          </div>
        )}
      </div>
      {invalid && (
        <ul id={issueId} className="space-y-0.5 text-sm text-destructive-emphasis">
          {issues.map((issue, position) => <li key={position}>{issue.message}</li>)}
        </ul>
      )}
      {cell.kind === 'rich' && (
        <CmsRichTextEditor
          value={cell.doc}
          label={`${label} 본문`}
          readOnly={readOnly}
          invalid={invalid}
          describedBy={activeIssueId}
          onNotice={onNotice}
          onChange={(doc) => onChange({ kind: 'rich', doc })}
        />
      )}
      {cell.kind === 'image' && (
        <ImageCellEditor cell={cell} label={label} readOnly={readOnly} canUpload={canUpload} issueId={activeIssueId}
          onChange={onChange} onNotice={onNotice} />
      )}
      {cell.kind === 'links' && <LinksCellEditor cell={cell} label={label} readOnly={readOnly} issueId={activeIssueId} onChange={onChange} />}
      {cell.kind === 'files' && (
        <FilesCellEditor cell={cell} label={label} readOnly={readOnly} canUpload={canUpload} issueId={activeIssueId}
          onChange={onChange} onNotice={onNotice} />
      )}
    </div>
  );
}

function ImageCellEditor({ cell, label, readOnly, canUpload, issueId, onChange, onNotice }: CellContentProps & {
  cell: Extract<CmsCell, { kind: 'image' }>;
  canUpload: boolean;
  onNotice: (message: string) => void;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const pendingUploadRef = React.useRef(false);
  const latestCell = useLatest(cell);
  const latestOnChange = useLatest(onChange);
  const errorId = `${label}-image-error`.replace(/\s+/g, '-');
  const fail = (message: string) => {
    setUploadError(message);
    onNotice(message);
  };
  const upload = async (file: File | undefined) => {
    if (!file || pendingUploadRef.current) return;
    const rejection = uploadRejection(file, CMS_IMAGE_EXTENSIONS);
    if (rejection) {
      fail(`이미지를 올리지 못했습니다. ${rejection}`);
      return;
    }
    pendingUploadRef.current = true;
    setUploading(true);
    setUploadError(null);
    try {
      const atchFileSn = await fileService.uploadFiles([file]);
      latestOnChange.current({ ...latestCell.current, atchFileSn });
      onNotice('이미지를 올렸습니다. 초안을 저장하면 이 페이지에 연결됩니다.');
    } catch (error) {
      // 서버가 준 사유(형식·크기·바이러스 검사 등)를 그대로 보인다. 사유가 없으면 확인할 것을 말한다.
      fail(`이미지를 올리지 못했습니다. ${extractErrorMessage(error, '파일 형식과 크기를 확인해 주세요.')}`);
    } finally {
      pendingUploadRef.current = false;
      setUploading(false);
    }
  };
  const missingImage = Boolean(issueId) && cell.atchFileSn <= 0;
  const missingAlt = Boolean(issueId) && !cell.decorative && cell.alt.trim() === '';
  return (
    <div className="space-y-2">
      {cell.atchFileSn > 0 ? (
        <AttachmentImage atchFileSn={cell.atchFileSn} alt={cell.decorative ? '' : cell.alt}
          className="max-h-60 w-full rounded-md object-contain" fallbackClassName="h-40 w-full rounded-md" />
      ) : (
        <p className="rounded-md bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
          아직 이미지가 없습니다. 초안으로 저장할 수 있고, 게시하기 전에 골라야 합니다.
        </p>
      )}
      {canUpload ? (
        <>
          <input ref={input} type="file" accept={IMAGE_ACCEPT} hidden aria-label={`${label} 이미지 파일`}
            onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
          <Button type="button" variant="outline" size="sm" disabled={readOnly || uploading} aria-busy={uploading}
            aria-describedby={describedBy(uploadError && errorId, missingImage && issueId)}
            onClick={() => input.current?.click()}>
            <ImagePlus size={16} aria-hidden="true" /> {uploading ? '올리는 중…' : cell.atchFileSn > 0 ? '이미지 바꾸기' : '이미지 올리기'}
          </Button>
          {uploadError && <p id={errorId} role="alert" className="text-sm text-destructive">{uploadError}</p>}
          <p className="text-sm text-muted-foreground">
            {CMS_IMAGE_EXTENSIONS.join('·')} 이미지를 한 장씩 올립니다(파일 하나에 {SERVER_MAX_FILE_SIZE_MB}MB 까지). 다른 페이지에 쓴 이미지는 다시 올려 주세요.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">이미지를 올리려면 파일 올리기 권한이 필요합니다.</p>
      )}
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        이미지 설명(대체 텍스트)
        <Input value={cell.alt} maxLength={300} disabled={readOnly || cell.decorative}
          aria-invalid={missingAlt || undefined} aria-describedby={missingAlt ? issueId : undefined}
          onChange={(event) => onChange({ ...cell, alt: event.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox checked={cell.decorative} disabled={readOnly}
          onCheckedChange={(checked) => onChange({ ...cell, decorative: checked === true })} />
        꾸밈 이미지(설명 없이 읽기 프로그램이 건너뜀)
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        이미지 아래 설명(선택)
        <Input value={cell.caption} maxLength={300} disabled={readOnly}
          onChange={(event) => onChange({ ...cell, caption: event.target.value })} />
      </label>
    </div>
  );
}

function LinksCellEditor({ cell, label, readOnly, issueId, onChange }: CellContentProps & {
  cell: Extract<CmsCell, { kind: 'links' }>;
}) {
  const [pickerIndex, setPickerIndex] = React.useState<number | null>(null);
  // 게시 목록은 /pages/ 주소가 있을 때만 읽는다 — 그 주소가 지금 게시 중인 페이지인지 알려 준다.
  const published = usePublishedPageLookup(cell.items.some((item) => cmsPageAddressOf(item.url) !== null));
  const setItem = (index: number, patch: Partial<{ title: string; url: string }>) =>
    onChange({ ...cell, items: cell.items.map((item, position) => (position === index ? { ...item, ...patch } : item)) });
  const choose = ({ path, title }: InternalPathChoice) => {
    if (pickerIndex === null) return;
    const current = cell.items[pickerIndex];
    // 이름은 비어 있을 때만 채운다 — 적어 둔 이름을 고른 대상의 이름으로 덮지 않는다.
    const named = current && current.title.trim() === '' && title ? { title: title.slice(0, 100) } : {};
    setItem(pickerIndex, { url: path, ...named });
  };
  const idBase = `${label}-link`.replace(/\s+/g, '-');
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {cell.items.map((item, index) => {
          // 빈 주소는 초안에서 받는다(ADR-0042) — 오류가 아니다. 게시 판정은 issues 로 온다.
          const invalidUrl = item.url.trim() !== '' && safeHref(item.url) === null;
          const warning = invalidUrl ? null : internalPathWarning(item.url, published);
          const titleMissing = Boolean(issueId) && item.title.trim() === '';
          const urlMissing = Boolean(issueId) && item.url.trim() === '';
          const errorId = `${idBase}-${index}-error`;
          const warningId = `${idBase}-${index}-warning`;
          return (
            <li key={index} className="flex flex-wrap items-end gap-2">
              <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm text-muted-foreground">
                {index + 1}번 이름
                <Input value={item.title} maxLength={100} disabled={readOnly}
                  aria-invalid={titleMissing || undefined} aria-describedby={titleMissing ? issueId : undefined}
                  onChange={(event) => setItem(index, { title: event.target.value })} />
              </label>
              <label className="flex min-w-[12rem] flex-[2] flex-col gap-1 text-sm text-muted-foreground">
                {index + 1}번 주소
                <Input value={item.url} maxLength={2000} disabled={readOnly} placeholder="/pages/… 또는 https://…"
                  aria-invalid={invalidUrl || urlMissing || undefined}
                  aria-describedby={describedBy(invalidUrl && errorId, warning && warningId, urlMissing && issueId)}
                  onChange={(event) => setItem(index, { url: event.target.value })} />
              </label>
              <Button type="button" variant="outline" size="sm" aria-label={`${index + 1}번 주소 사이트 안에서 고르기`}
                disabled={readOnly} onClick={() => setPickerIndex(index)}>
                <Search size={16} aria-hidden="true" /> 사이트 안에서 고르기
              </Button>
              <Button type="button" variant="outline" size="icon" aria-label={`${index + 1}번 바로가기 지우기`}
                disabled={readOnly || cell.items.length === 1}
                onClick={() => onChange({ ...cell, items: cell.items.filter((_, position) => position !== index) })}>
                <X size={16} aria-hidden="true" />
              </Button>
              {invalidUrl && (
                <p id={errorId} className="basis-full text-sm text-destructive">
                  https 주소, /로 시작하는 사이트 내부 경로, mailto·tel 만 쓸 수 있습니다.
                </p>
              )}
              {warning && <p id={warningId} className="basis-full text-sm text-warning-emphasis">{warning}</p>}
            </li>
          );
        })}
      </ul>
      <Button type="button" variant="outline" size="sm" disabled={readOnly || cell.items.length >= MAX_LINKS}
        onClick={() => onChange({ ...cell, items: [...cell.items, { title: '', url: '' }] })}>
        <Plus size={16} aria-hidden="true" /> 바로가기 더하기
      </Button>
      <InternalPathPicker open={pickerIndex !== null} onOpenChange={(open) => { if (!open) setPickerIndex(null); }} onSelect={choose} />
    </div>
  );
}

function FilesCellEditor({ cell, label, readOnly, canUpload, issueId, onChange, onNotice }: CellContentProps & {
  cell: Extract<CmsCell, { kind: 'files' }>;
  canUpload: boolean;
  onNotice: (message: string) => void;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const pendingUploadRef = React.useRef(false);
  const latestCell = useLatest(cell);
  const latestOnChange = useLatest(onChange);
  const full = cell.items.length >= MAX_FILES;
  const idBase = `${label}-file`.replace(/\s+/g, '-');
  const errorId = `${idBase}-error`;
  const setItems = (items: CmsFileItem[]) => onChange({ kind: 'files', items });
  const move = (index: number, direction: -1 | 1) => {
    const items = [...cell.items];
    [items[index], items[index + direction]] = [items[index + direction], items[index]];
    setItems(items);
  };
  const fail = (message: string) => {
    setUploadError(message);
    onNotice(message);
  };
  const upload = async (file: File | undefined) => {
    if (!file || pendingUploadRef.current || latestCell.current.items.length >= MAX_FILES) return;
    const rejection = uploadRejection(file, CMS_FILE_EXTENSIONS);
    if (rejection) {
      fail(`파일을 올리지 못했습니다. ${rejection}`);
      return;
    }
    pendingUploadRef.current = true;
    setUploading(true);
    setUploadError(null);
    try {
      const atchFileSn = await fileService.uploadFiles([file]);
      latestOnChange.current({ kind: 'files', items: [...latestCell.current.items, { atchFileSn, title: defaultFileTitle(file.name) }] });
      onNotice('파일을 올렸습니다. 초안을 저장하면 이 페이지에 연결됩니다.');
    } catch (error) {
      fail(`파일을 올리지 못했습니다. ${extractErrorMessage(error, '파일 형식과 크기를 확인해 주세요.')}`);
    } finally {
      pendingUploadRef.current = false;
      setUploading(false);
    }
  };
  const noFiles = cell.items.length === 0;
  return (
    <div className="space-y-2">
      {noFiles ? (
        <p className="rounded-md bg-muted px-3 py-6 text-center text-sm text-muted-foreground">
          아직 파일이 없습니다. 초안으로 저장할 수 있고, 게시하기 전에 하나 이상 올려야 합니다.
        </p>
      ) : (
        <ol className="space-y-2">
          {cell.items.map((item, index) => {
            const titleMissing = Boolean(issueId) && item.title.trim() === '';
            return (
              <li key={item.atchFileSn} className="flex flex-wrap items-end gap-2">
                <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm text-muted-foreground">
                  {index + 1}번 파일 이름(사용자에게 보임)
                  <Input value={item.title} maxLength={MAX_FILE_TITLE} disabled={readOnly}
                    aria-invalid={titleMissing || undefined} aria-describedby={titleMissing ? issueId : undefined}
                    onChange={(event) => setItems(cell.items.map((entry, position) =>
                      (position === index ? { ...entry, title: event.target.value } : entry)))} />
                </label>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="icon" aria-label={`${index + 1}번 파일 위로 옮기기`}
                    disabled={readOnly || index === 0} onClick={() => move(index, -1)}>
                    <ArrowUp size={16} aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" aria-label={`${index + 1}번 파일 아래로 옮기기`}
                    disabled={readOnly || index === cell.items.length - 1} onClick={() => move(index, 1)}>
                    <ArrowDown size={16} aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" aria-label={`${index + 1}번 파일 지우기`}
                    disabled={readOnly} onClick={() => setItems(cell.items.filter((_, position) => position !== index))}>
                    <X size={16} aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {canUpload ? (
        <>
          <input ref={input} type="file" accept={FILE_ACCEPT} hidden aria-label={`${label} 내려받기 파일`}
            onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
          <Button type="button" variant="outline" size="sm" disabled={readOnly || uploading || full} aria-busy={uploading}
            aria-describedby={describedBy(uploadError && errorId, noFiles && issueId)}
            onClick={() => input.current?.click()}>
            <FilePlus size={16} aria-hidden="true" /> {uploading ? '올리는 중…' : '파일 올리기'}
          </Button>
          {uploadError && <p id={errorId} role="alert" className="text-sm text-destructive">{uploadError}</p>}
          <p className="text-sm text-muted-foreground">
            {CMS_FILE_EXTENSIONS.join('·')} 파일을 하나씩 올립니다(파일 하나에 {SERVER_MAX_FILE_SIZE_MB}MB 까지, 한 칸에 {MAX_FILES}개까지).
            {full ? ` ${MAX_FILES}개를 모두 채웠습니다. 더 올리려면 하나를 지우세요.` : ''} 다른 페이지에 쓴 파일은 다시 올려 주세요.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">파일을 올리려면 파일 올리기 권한이 필요합니다.</p>
      )}
    </div>
  );
}
