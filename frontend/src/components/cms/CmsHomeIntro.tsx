'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, ChevronUp, RefreshCw } from 'lucide-react';
import { CmsDocumentView } from '@/components/cms/CmsDocumentView';
import { Button } from '@/components/ui/button';
import { cmsPageRoute } from '@/lib/cms/page-menu-links';
import { cn } from '@/lib/utils';
import { cmsHomeIntroQuery } from '@/queries/cms-query-options';

/**
 * 업무 홈 맨 위 소개(ADR-0039 결정 2). 운영자가 지정한 게시 페이지의 현재 게시본을 그린다. 지정이 없거나 게시 중이 아니면 아무것도
 * 그리지 않는다 — 업무 홈은 그대로다. 서버가 첫 화면 전에 채워 두므로 늦게 끼어들어 아래 내용을 밀지 않는다.
 *
 * <p>[ADR-0042] 게시본 제목을 소개의 제목으로 보이고 그 페이지 전체 보기로 잇는다. 긴 소개가 업무 홈의 할 일을 화면 밖으로 밀지 않게
 * 높이를 24rem 으로 묶고, 넘치면 아래를 흐리게 하고 펼치기 단추를 둔다. 자르는 것은 CSS 뿐이다 — 문서 DOM 은 하나이고 펼쳐도 다시
 * 그리지 않는다. 넘치는지는 그린 높이를 재서 정한다(넘치지 않으면 단추가 없다 — 아무 일도 하지 않는 단추를 두지 않는다).
 */

/** 접었을 때의 높이 상한(rem). 아래 `max-h-96` 과 같은 값이다. */
const COLLAPSED_MAX_REM = 24;
/** 접었을 때 흐리게 덮는 아래쪽 높이(rem). 아래 `h-24` 와 같은 값이다. */
const FADE_REM = 6;

function remToPx(rem: number): number {
  const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return (Number.isFinite(rootSize) && rootSize > 0 ? rootSize : 16) * rem;
}

export function CmsHomeIntro() {
  const intro = useQuery(cmsHomeIntroQuery);
  const headingId = useId();
  const bodyId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const page = intro.data;
  const collapsed = overflowing && !expanded;

  // 이미지가 늦게 들어오거나 폭이 바뀌면 높이가 바뀐다 — 그때마다 다시 잰다. 내용 자체의 높이를 재므로 펼친 뒤에도 판정이 같다.
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return undefined;
    const measure = () => setOverflowing(content.scrollHeight > remToPx(COLLAPSED_MAX_REM) + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [page]);

  // 접힌 채 키보드로 잘린 아래쪽이나 흐린 부분의 링크에 닿으면 펼친다 — 초점이 가려지지 않게 한다(WCAG 2.4.11).
  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !collapsed) return undefined;
    const reveal = (event: FocusEvent) => {
      if (!(event.target instanceof Element)) return;
      const limit = body.getBoundingClientRect().bottom - remToPx(FADE_REM);
      if (event.target.getBoundingClientRect().bottom > limit) setExpanded(true);
    };
    body.addEventListener('focusin', reveal);
    return () => body.removeEventListener('focusin', reveal);
  }, [collapsed, page]);

  if (intro.isError) {
    return (
      <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 text-[length:var(--font-size-body)]">
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">업무 홈 소개를 불러오지 못했습니다.</span>{' '}
          아래 업무 홈 내용은 그대로 쓸 수 있습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void intro.refetch()} disabled={intro.isFetching}>
          <RefreshCw aria-hidden="true" />
          {intro.isFetching ? '업무 홈 소개 불러오는 중…' : '다시 시도'}
        </Button>
      </div>
    );
  }
  if (!page) return null;
  const title = page.contsTtl?.trim() || '업무 홈 소개';

  return (
    <section aria-labelledby={headingId} data-testid="cms-home-intro">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={headingId} className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {page.contsPathNm && (
          <Link
            href={cmsPageRoute(page.contsPathNm)}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="sr-only">{title} </span>전체 보기
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="relative mt-1">
        <div id={bodyId} ref={bodyRef} className={cn(!expanded && 'max-h-96 overflow-hidden')}>
          <div ref={contentRef}>
            <CmsDocumentView document={page.document} />
          </div>
        </div>
        {collapsed && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
        )}
        {/* 접었을 때는 흐린 아래쪽 위에 겹쳐 두어(높이가 늘지 않는다) 재고 나서 단추가 생겨도 아래 내용이 밀리지 않는다. 같은 단추 하나다. */}
        {overflowing && (
          <div className={cn('flex justify-center', collapsed ? 'absolute inset-x-0 bottom-2' : 'mt-2')}>
            <Button type="button" variant="outline" size="sm" aria-expanded={expanded} aria-controls={bodyId}
              onClick={() => setExpanded((value) => !value)}>
              {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
              {expanded ? '접기' : '펼치기'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
