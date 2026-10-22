'use client';

import { useQuery } from '@tanstack/react-query';
import { CmsDocumentView } from '@/components/cms/CmsDocumentView';
import { cmsHomeIntroQuery } from '@/queries/cms-query-options';

/**
 * 업무 홈 맨 위 소개(ADR-0039 결정 2). 운영자가 지정한 게시 페이지의 현재 게시본을 그린다. 지정이 없거나 게시 중이 아니면 아무것도
 * 그리지 않는다 — 업무 홈은 그대로다. 서버가 첫 화면 전에 채워 두므로 늦게 끼어들어 아래 내용을 밀지 않는다.
 */
export function CmsHomeIntro() {
  const intro = useQuery(cmsHomeIntroQuery);
  if (intro.isError) {
    return (
      <p role="status" className="rounded-md border border-border bg-card px-4 py-3 text-[length:var(--font-size-body)] text-muted-foreground">
        업무 홈 소개를 불러오지 못했습니다.
      </p>
    );
  }
  const page = intro.data;
  if (!page) return null;
  return (
    <section aria-label={page.contsTtl ?? '업무 홈 소개'} data-testid="cms-home-intro">
      <CmsDocumentView document={page.document} />
    </section>
  );
}
