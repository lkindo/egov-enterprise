'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { CmsDocumentView } from '@/components/cms/CmsDocumentView';
import type { CmsDocument } from '@/lib/cms/document';
import type { CmsPageDetail, CmsRevisionSummary } from '@/services/business/cms/CmsService';
import { cmsQueryOptions } from '@/queries/cms-query-options';
import { PurgeRevisionForm } from './PurgeDialogs';

export interface LoadableRevision {
  revisionNumber?: number;
  contsTtl?: string | null;
  contsExpln?: string | null;
  document: CmsDocument;
}

interface RevisionsDialogProps {
  contsSn: number;
  /** 편집 중인 페이지의 버전 — 게시본 파기 요청이 이 버전에 묶인다. */
  version: number;
  readOnly: boolean;
  /** 파기 권한(CMS_PURGE). 없으면 파기 단추를 두지 않는다. */
  canPurge: boolean;
  onClose: () => void;
  /** '이 내용으로 편집하기'. 저장하지 않은 변경이 있으면 편집기가 버릴지 먼저 묻는다. */
  onLoad: (revision: LoadableRevision) => void;
  onPurged: (next: CmsPageDetail, revisionNumber: number) => void;
  onConflict: () => void;
}

/**
 * 게시 이력(ADR-0039·ADR-0042). 게시본마다 게시한 사람·시각·변경 설명을 보이고, 고른 게시본을 읽어 편집기로 불러온다. 파기 권한자는
 * 지금 보이는 게시본이 아닌 게시본을 파기할 수 있다 — 파기하면 목록을 다시 읽는다(뒤 판 번호가 당겨진다).
 */
export function RevisionsDialog({
  contsSn, version, readOnly, canPurge, onClose, onLoad, onPurged, onConflict,
}: RevisionsDialogProps) {
  const revisions = useQuery(cmsQueryOptions.revisions(contsSn));
  const [viewing, setViewing] = React.useState<number | null>(null);
  const [purging, setPurging] = React.useState<CmsRevisionSummary | null>(null);
  const purgeTriggers = React.useRef(new Map<number, HTMLButtonElement>());
  const revision = useQuery({ ...cmsQueryOptions.revision(contsSn, viewing ?? 0), enabled: viewing !== null });
  const items = revisions.data ?? [];
  const newest = items.reduce((max, item) => Math.max(max, item.revisionNumber ?? 0), 0);

  const closePurge = () => {
    const trigger = purging?.contsRvsnSn !== undefined ? purgeTriggers.current.get(purging.contsRvsnSn) : undefined;
    setPurging(null);
    trigger?.focus();
  };

  return (
    <StandardModal isOpen onClose={onClose} title="게시 이력" maxWidth="4xl">
      {revisions.isError && <p role="alert" className="text-destructive">게시 이력을 불러오지 못했습니다.</p>}
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.contsRvsnSn} className="flex flex-wrap items-center gap-3 py-2">
            <span className="font-semibold tabular-nums">v{item.revisionNumber}</span>
            {item.current && <Badge>지금 보이는 게시본</Badge>}
            <span className="min-w-0 flex-1 truncate">{item.contsTtl}{item.rvsnRsn ? ` — ${item.rvsnRsn}` : ''}</span>
            <span className="text-sm tabular-nums text-muted-foreground">{item.crtDt?.replace('T', ' ').slice(0, 16)} · {item.frstRgtrId}</span>
            <Button type="button" variant="outline" size="sm" aria-pressed={viewing === item.contsRvsnSn}
              aria-label={`v${item.revisionNumber} 보기`}
              onClick={() => setViewing(item.contsRvsnSn ?? null)}>보기</Button>
            {canPurge && !item.current && item.contsRvsnSn !== undefined && (
              <Button type="button" variant="ghost" size="sm"
                ref={(element) => {
                  if (item.contsRvsnSn === undefined) return;
                  if (element) purgeTriggers.current.set(item.contsRvsnSn, element);
                  else purgeTriggers.current.delete(item.contsRvsnSn);
                }}
                aria-label={`v${item.revisionNumber} 게시본 파기`}
                aria-expanded={purging?.contsRvsnSn === item.contsRvsnSn}
                onClick={() => setPurging(item)}>
                이 게시본 파기
              </Button>
            )}
          </li>
        ))}
      </ul>
      {purging && (
        <PurgeRevisionForm
          key={purging.contsRvsnSn}
          contsSn={contsSn}
          revision={purging}
          hasLaterRevision={(purging.revisionNumber ?? 0) < newest}
          version={version}
          onCancel={closePurge}
          onConflict={onConflict}
          onPurged={(next, number) => {
            if (viewing === purging.contsRvsnSn) setViewing(null);
            setPurging(null);
            onPurged(next, number);
          }}
        />
      )}
      {viewing !== null && (
        <div className="mt-4 space-y-3 rounded-md border border-border p-4">
          {revision.isLoading && <p className="text-muted-foreground">불러오는 중…</p>}
          {revision.isError && <p role="alert" className="text-destructive">게시본을 불러오지 못했습니다.</p>}
          {revision.data && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-foreground">v{revision.data.revisionNumber} {revision.data.contsTtl}</h3>
                {!readOnly && (
                  <Button type="button" size="sm" onClick={() => onLoad(revision.data)}>이 내용으로 편집하기</Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">불러오면 편집 중인 초안이 이 내용으로 바뀝니다. 저장하기 전에는 아무것도 바뀌지 않고, 주소·업무 홈 지정은 그대로입니다.</p>
              <div className="max-h-[45vh] overflow-auto rounded-md bg-background p-2">
                <CmsDocumentView document={revision.data.document} />
              </div>
            </>
          )}
        </div>
      )}
    </StandardModal>
  );
}
