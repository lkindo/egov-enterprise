import type { Metadata } from 'next';
import Link from 'next/link';
import { cache, Suspense } from 'react';
import { notFound } from 'next/navigation';
import { SITE_IDENTITY } from '@/config/site-identity';
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';
import { CmsDocumentView } from '@/components/cms/CmsDocumentView';
import { buttonVariants } from '@/components/ui/button';
import { toDisplayYmd } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { cmsService, type CmsPublishedPage } from '@/services/business/cms/CmsService';
import { EditThisPageLink } from './EditThisPageLink';

/**
 * 게시된 콘텐츠 페이지(ADR-0039 결정 3). 로그인 사용자 누구나 현재 게시본을 읽는다 — 초안·지난 게시본은 이 화면으로 오지 않는다.
 * 미게시·게시 중지·보관 페이지는 서버가 모두 404 로 같게 답하므로 "없는 페이지" 로 보인다.
 *
 * [ADR-0042] 머리에 현재 위치(메뉴에 걸려 있으면 그 메뉴 경로, 아니면 홈 › 안내 페이지 › 제목)와 게시일·게시본 번호를 보이고, 관리
 * 화면을 열 수 있는 사람에게 '이 페이지 편집' 을 둔다. 없는 페이지·조회 오류에서도 안내 페이지 목록과 업무 홈으로 돌아갈 길을 준다.
 */

type Load = { kind: 'loaded'; page: CmsPublishedPage } | { kind: 'missing' } | { kind: 'error' };

/** 사용자용 안내 페이지 목록(src/app/pages/page.tsx). */
const LIST_ROUTE = '/pages';

const load = cache(async (slug: string): Promise<Load> => {
  try {
    return { kind: 'loaded', page: await cmsService.getPublishedPage(slug) };
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    return status === 404 ? { kind: 'missing' } : { kind: 'error' };
  }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const result = await load((await params).slug);
  const title = result.kind === 'loaded' ? result.page.contsTtl : '콘텐츠 페이지';
  return { title: `${title} | ${SITE_IDENTITY.frameworkName}` };
}

/** 오류 화면의 돌아갈 길. 없는 페이지 화면(not-found.tsx)과 같은 두 곳으로 보낸다. */
function ContentPageReturnLinks() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={LIST_ROUTE} className={cn(buttonVariants({ variant: 'outline' }))}>안내 페이지 목록</Link>
      <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>업무 홈으로</Link>
    </div>
  );
}

/** 위치 표시. 메뉴 경로를 찾지 못하면 안내 페이지 목록 아래의 이 페이지로 보인다. */
function ContentPageBreadcrumb({ title }: { title: string }) {
  return (
    // 위치 표시는 화면 주소와 메뉴를 읽는 클라이언트 잎이다. 정적 렌더가 깨지지 않게 같은 높이의 자리로 감싼다(PageHeader 와 같다).
    <div className="[&>nav]:mb-3">
      <Suspense fallback={<div className="mb-3 h-[46px]" aria-hidden="true" />}>
        <DynamicBreadcrumb customItems={[{ name: '안내 페이지', href: LIST_ROUTE }, { name: title }]} currentLabel={title} />
      </Suspense>
    </div>
  );
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await load(slug);
  if (result.kind === 'missing') notFound();
  if (result.kind === 'error') {
    return (
      <div className="mx-auto w-full max-w-[var(--page-max-w)] space-y-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground">콘텐츠 페이지</h1>
        <div role="alert" className="rounded-md border border-border bg-card px-4 py-3 text-[length:var(--font-size-body)]">
          <p className="font-medium text-foreground">페이지를 불러오지 못했습니다.</p>
          <p className="mt-1 text-muted-foreground">
            잠시 뒤 다시 열어 주세요. 계속되면 관리자에게 알려 주세요. 다른 안내 페이지나 업무 홈은 그대로 쓸 수 있습니다.
          </p>
        </div>
        <ContentPageReturnLinks />
      </div>
    );
  }
  const { page } = result;
  const title = page.contsTtl ?? '콘텐츠 페이지';
  const publishedOn = toDisplayYmd(page.publishedAt?.slice(0, 10), '');
  const revision = typeof page.revisionNumber === 'number' ? `v${page.revisionNumber}` : '';
  return (
    <div className="mx-auto w-full max-w-[var(--page-max-w)]">
      <ContentPageBreadcrumb title={title} />
      <article data-testid="cms-page">
        <header className="border-b border-border pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <EditThisPageLink contsPathNm={page.contsPathNm ?? slug} />
          </div>
          {page.contsExpln && (
            <p className="mt-2 text-[length:var(--font-size-body)] text-muted-foreground">{page.contsExpln}</p>
          )}
          {(publishedOn || revision) && (
            <p className="mt-2 text-sm text-muted-foreground" data-testid="cms-page-revision">
              {publishedOn && <>게시 <time dateTime={publishedOn}>{publishedOn}</time></>}
              {publishedOn && revision && ' · '}
              {revision}
            </p>
          )}
        </header>
        <CmsDocumentView document={page.document} className="mt-4" />
      </article>
    </div>
  );
}
