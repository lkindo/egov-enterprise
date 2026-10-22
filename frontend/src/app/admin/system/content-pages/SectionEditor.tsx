'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AttachmentImage } from '@/app/components/ui/attachment-image';
import { fileService } from '@/services/foundation/file/FileService';
import {
  CMS_LAYOUT_LABELS,
  CMS_SPACING_LABELS,
  CMS_TONE_LABELS,
  emptyRichCell,
  safeHref,
  type CmsCell,
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
const KIND_LABELS: Record<CmsCell['kind'], string> = { rich: '본문·표', image: '이미지', links: '바로가기' };
const IMAGE_ACCEPT = '.png,.jpg,.jpeg,.gif,.webp';

export interface SectionEditorProps {
  section: CmsSection;
  index: number;
  total: number;
  readOnly: boolean;
  /** 이미지 칸의 올리기 단추. 파일 올리기 권한(FILE_UPLOAD)이 없으면 두지 않는다 — 이미 넣은 이미지는 그대로 보인다. */
  canUpload: boolean;
  onChange: (section: CmsSection) => void;
  onLayoutChange: (layout: CmsLayout) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onNotice: (message: string) => void;
}

function cellIsEmpty(cell: CmsCell): boolean {
  if (cell.kind === 'image') return !cell.atchFileSn;
  if (cell.kind === 'links') return cell.items.every((item) => !item.title && !item.url);
  return JSON.stringify(cell.doc).indexOf('"text"') < 0;
}

export function SectionEditor({ section, index, total, readOnly, canUpload, onChange, onLayoutChange, onMove, onRemove, onNotice }: SectionEditorProps) {
  const number = index + 1;
  const name = section.label || `${number}번 영역`;
  const setCell = (cellIndex: number, cell: CmsCell) =>
    onChange({ ...section, cells: section.cells.map((item, position) => (position === cellIndex ? cell : item)) });

  return (
    <section
      aria-labelledby={`cms-section-${section.id}-title`}
      data-section-index={index}
      className="rounded-lg border border-border bg-card"
    >
      <div className="flex flex-wrap items-end gap-2 border-b border-border px-3 py-2">
        <h3 id={`cms-section-${section.id}-title`} className="sr-only">{name}</h3>
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
          <Button type="button" variant="outline" size="icon" aria-label={`${name} 삭제`}
            disabled={readOnly || total === 1} onClick={onRemove}>
            <Trash2 size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
      <div className={section.layout === 'one' ? 'grid gap-3 p-3' : 'grid gap-3 p-3 lg:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]'}>
        {section.cells.map((cell, cellIndex) => (
          <CellEditor
            key={cellIndex}
            cell={cell}
            label={`${name} ${cellIndex + 1}단`}
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
  label: string;
  readOnly: boolean;
  canUpload: boolean;
  onChange: (cell: CmsCell) => void;
  onNotice: (message: string) => void;
}

function CellEditor({ cell, label, readOnly, canUpload, onChange, onNotice }: CellEditorProps) {
  const [pendingKind, setPendingKind] = React.useState<CmsCell['kind'] | null>(null);
  const replace = (kind: CmsCell['kind']) => {
    if (kind === 'rich') onChange(emptyRichCell());
    else if (kind === 'image') onChange({ kind: 'image', atchFileSn: 0, alt: '', decorative: false, caption: '' });
    else onChange({ kind: 'links', items: [{ title: '', url: '' }] });
    setPendingKind(null);
  };
  return (
    <div className="min-w-0 space-y-2 rounded-md border border-dashed border-border p-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {label} 내용
          <select
            className={SELECT_CLASS}
            value={pendingKind ?? cell.kind}
            disabled={readOnly}
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
      {cell.kind === 'rich' && (
        <CmsRichTextEditor
          value={cell.doc}
          label={`${label} 본문`}
          readOnly={readOnly}
          onNotice={onNotice}
          onChange={(doc) => onChange({ kind: 'rich', doc })}
        />
      )}
      {cell.kind === 'image' && <ImageCellEditor cell={cell} label={label} readOnly={readOnly} canUpload={canUpload} onChange={onChange} onNotice={onNotice} />}
      {cell.kind === 'links' && <LinksCellEditor cell={cell} label={label} readOnly={readOnly} onChange={onChange} />}
    </div>
  );
}

function ImageCellEditor({ cell, label, readOnly, canUpload, onChange, onNotice }: {
  cell: Extract<CmsCell, { kind: 'image' }>;
  label: string;
  readOnly: boolean;
  canUpload: boolean;
  onChange: (cell: CmsCell) => void;
  onNotice: (message: string) => void;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const pendingUploadRef = React.useRef(false);
  const upload = async (file: File | undefined) => {
    if (!file || pendingUploadRef.current) return;
    pendingUploadRef.current = true;
    setUploading(true);
    setUploadError(null);
    try {
      const atchFileSn = await fileService.uploadFiles([file]);
      onChange({ ...cell, atchFileSn });
      onNotice('이미지를 올렸습니다. 초안을 저장하면 이 페이지에 연결됩니다.');
    } catch {
      const message = '이미지를 올리지 못했습니다. 파일 형식과 크기를 확인해 주세요.';
      setUploadError(message);
      onNotice(message);
    } finally {
      pendingUploadRef.current = false;
      setUploading(false);
    }
  };
  return (
    <div className="space-y-2">
      {cell.atchFileSn > 0 ? (
        <AttachmentImage atchFileSn={cell.atchFileSn} alt={cell.decorative ? '' : cell.alt}
          className="max-h-60 w-full rounded-md object-contain" fallbackClassName="h-40 w-full rounded-md" />
      ) : (
        <p className="rounded-md bg-muted px-3 py-6 text-center text-sm text-muted-foreground">아직 이미지가 없습니다.</p>
      )}
      {canUpload ? (
        <>
          <input ref={input} type="file" accept={IMAGE_ACCEPT} hidden aria-label={`${label} 이미지 파일`}
            onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
          <Button type="button" variant="outline" size="sm" disabled={readOnly || uploading} aria-busy={uploading}
            onClick={() => input.current?.click()}>
            <ImagePlus size={16} aria-hidden="true" /> {uploading ? '올리는 중…' : cell.atchFileSn > 0 ? '이미지 바꾸기' : '이미지 올리기'}
          </Button>
          {uploadError && <p role="alert" className="text-sm text-destructive">{uploadError}</p>}
          <p className="text-sm text-muted-foreground">png·jpg·gif·webp 한 장씩 올립니다. 다른 페이지에 쓴 이미지는 다시 올려 주세요.</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">이미지를 올리려면 파일 올리기 권한이 필요합니다.</p>
      )}
      <label className="flex flex-col gap-1 text-sm text-muted-foreground">
        이미지 설명(대체 텍스트)
        <Input value={cell.alt} maxLength={300} disabled={readOnly || cell.decorative}
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

function LinksCellEditor({ cell, label, readOnly, onChange }: {
  cell: Extract<CmsCell, { kind: 'links' }>;
  label: string;
  readOnly: boolean;
  onChange: (cell: CmsCell) => void;
}) {
  const setItem = (index: number, patch: Partial<{ title: string; url: string }>) =>
    onChange({ ...cell, items: cell.items.map((item, position) => (position === index ? { ...item, ...patch } : item)) });
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {cell.items.map((item, index) => {
          const invalidUrl = item.url.trim() !== '' && safeHref(item.url) === null;
          const errorId = `${label}-link-${index}-error`.replace(/\s+/g, '-');
          return (
            <li key={index} className="flex flex-wrap items-end gap-2">
              <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-sm text-muted-foreground">
                {index + 1}번 이름
                <Input value={item.title} maxLength={100} disabled={readOnly}
                  onChange={(event) => setItem(index, { title: event.target.value })} />
              </label>
              <label className="flex min-w-[12rem] flex-[2] flex-col gap-1 text-sm text-muted-foreground">
                {index + 1}번 주소
                <Input value={item.url} maxLength={2000} disabled={readOnly} placeholder="/pages/… 또는 https://…"
                  aria-invalid={invalidUrl || undefined} aria-describedby={invalidUrl ? errorId : undefined}
                  onChange={(event) => setItem(index, { url: event.target.value })} />
              </label>
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
            </li>
          );
        })}
      </ul>
      <Button type="button" variant="outline" size="sm" disabled={readOnly || cell.items.length >= 12}
        onClick={() => onChange({ ...cell, items: [...cell.items, { title: '', url: '' }] })}>
        <Plus size={16} aria-hidden="true" /> 바로가기 더하기
      </Button>
    </div>
  );
}
