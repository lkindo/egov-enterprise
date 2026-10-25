'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { CmsDocumentView } from '@/components/cms/CmsDocumentView';
import { cn } from '@/lib/utils';
import { normalizeCmsDocument, type CmsDocument } from '@/lib/cms/document';

type PreviewMode = 'desktop' | 'mobile' | 'home';

const MODE_LABELS: Record<PreviewMode, string> = {
  desktop: '넓은 화면',
  mobile: '휴대전화 폭',
  home: '업무 홈 소개',
};

export interface PreviewDraft {
  contsTtl: string;
  contsExpln: string;
  document: CmsDocument;
}

/**
 * 저장하지 않은 변경까지 포함한 미리보기(ADR-0042). 세 가지로 본다.
 *  · 넓은 화면 — 게시 페이지와 같은 제목·요약·본문.
 *  · 휴대전화 폭 — 390px 상자. 렌더러(CmsDocumentView)의 루트가 컨테이너라 상자 폭으로 단이 쌓인다 — 실제 휴대전화와 같은 배치다.
 *  · 업무 홈 소개 — 업무 홈 맨 위 조각(CmsHomeIntro)의 모양. 게시본 제목과 본문만 보이고(요약은 보이지 않는다) 높이 24rem 에서 잘린다.
 * 미완성 칸(고르지 않은 이미지·빈 바로가기·빈 내려받기)은 점선 자리로 보인다 — 사용자 화면에는 나오지 않는다.
 */
export function PreviewDialog({ draft, onClose }: { draft: PreviewDraft; onClose: () => void }) {
  const [mode, setMode] = React.useState<PreviewMode>('desktop');
  const normalized = normalizeCmsDocument(draft.document, 'draft');
  const title = draft.contsTtl.trim() || '제목 없음';
  const body = normalized.ok
    ? <CmsDocumentView document={normalized.document} showPlaceholders />
    : <p role="alert" className="text-destructive">미리 볼 수 없는 내용이 있습니다: {normalized.error}</p>;

  return (
    <StandardModal isOpen onClose={onClose} title="미리보기 — 저장하지 않은 변경 포함" maxWidth="5xl">
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="미리보기 모양">
        {(Object.keys(MODE_LABELS) as PreviewMode[]).map((value) => (
          <Button key={value} type="button" size="sm" variant={mode === value ? 'default' : 'outline'} aria-pressed={mode === value}
            onClick={() => setMode(value)}>
            {MODE_LABELS[value]}
          </Button>
        ))}
      </div>
      <p className="mb-2 text-sm text-muted-foreground">
        점선 칸은 아직 채우지 않은 칸입니다. 사용자 화면에는 보이지 않고, 게시하려면 채워야 합니다.
      </p>
      <div className="max-h-[70vh] overflow-auto rounded-md border border-border bg-background p-4">
        {mode === 'home' ? (
          <div data-testid="cms-preview-home" className="space-y-2">
            <p className="text-sm text-muted-foreground">
              업무 홈에서는 소개가 높이 24rem 까지 보이고, 넘치면 사용자가 ‘펼치기’로 나머지를 봅니다. 요약은 보이지 않습니다.
            </p>
            <section className="rounded-md border border-dashed border-border p-3">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
              <div className="mt-1 max-h-96 overflow-hidden">{body}</div>
            </section>
          </div>
        ) : (
          <div data-testid="cms-preview-frame" className={cn(mode === 'mobile' ? 'mx-auto w-[390px] max-w-full rounded-md border border-border p-3' : 'w-full')}>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {draft.contsExpln.trim() && <p className="mt-2 text-muted-foreground">{draft.contsExpln}</p>}
            <div className="mt-4">{body}</div>
          </div>
        )}
      </div>
    </StandardModal>
  );
}
