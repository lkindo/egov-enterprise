import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SITE_IDENTITY } from '@/config/site-identity';
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';
import { PublishedPagesClient } from './PublishedPagesClient';

export const metadata: Metadata = {
  title: `안내 페이지 | ${SITE_IDENTITY.frameworkName}`,
};

/**
 * 사용자용 안내 페이지 목록(ADR-0042). 로그인 사용자 누구나 게시 중인 콘텐츠 페이지를 찾아 연다 — 메뉴에 걸리지 않은 페이지도 여기서
 * 닿는다. 머리는 서버가 그리고, 검색·쪽 이동·목록은 클라이언트 잎(PublishedPagesClient)이 맡는다. 검색어와 쪽 번호는 화면 상태로만
 * 두고 주소에 싣지 않는다.
 */
export default function PublishedPagesPage() {
  return (
    <div className="mx-auto w-full max-w-[var(--page-max-w)] space-y-4">
      <div className="[&>nav]:mb-0">
        <Suspense fallback={<div className="h-[46px]" aria-hidden="true" />}>
          <DynamicBreadcrumb customItems={[{ name: '안내 페이지' }]} currentLabel="안내 페이지" />
        </Suspense>
      </div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">안내 페이지</h1>
        <p className="mt-1 text-[length:var(--font-size-body)] text-muted-foreground">
          게시된 업무 안내를 찾아 읽을 수 있습니다.
        </p>
      </header>
      <PublishedPagesClient />
    </div>
  );
}
