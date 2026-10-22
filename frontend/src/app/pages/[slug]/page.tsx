import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { SITE_IDENTITY } from '@/config/site-identity';
import { CmsDocumentView } from '@/components/cms/CmsDocumentView';
import { cmsService, type CmsPublishedPage } from '@/services/business/cms/CmsService';

/**
 * 게시된 콘텐츠 페이지(ADR-0039 결정 3). 로그인 사용자 누구나 현재 게시본을 읽는다 — 초안·지난 게시본은 이 화면으로 오지 않는다.
 * 미게시·게시 중지·보관 페이지는 서버가 모두 404 로 같게 답하므로 "없는 페이지" 로 보인다.
 */

type Load = { kind: 'loaded'; page: CmsPublishedPage } | { kind: 'missing' } | { kind: 'error' };

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

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const result = await load((await params).slug);
  if (result.kind === 'missing') notFound();
  if (result.kind === 'error') {
    return (
      <div className="mx-auto w-full max-w-[var(--page-max-w)] space-y-3">
        <h1 className="text-xl font-bold tracking-tight text-foreground">콘텐츠 페이지</h1>
        <div role="alert" className="rounded-md border border-border bg-card px-4 py-3 text-[length:var(--font-size-body)]">
          <p className="font-medium text-foreground">페이지를 불러오지 못했습니다.</p>
          <p className="mt-1 text-muted-foreground">잠시 뒤 다시 열어 주세요. 계속되면 관리자에게 알려 주세요.</p>
        </div>
      </div>
    );
  }
  const { page } = result;
  return (
    <article className="mx-auto w-full max-w-[var(--page-max-w)]" data-testid="cms-page">
      <header className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{page.contsTtl}</h1>
        {page.contsExpln && (
          <p className="mt-2 text-[length:var(--font-size-body)] text-muted-foreground">{page.contsExpln}</p>
        )}
      </header>
      <CmsDocumentView document={page.document} className="mt-4" />
    </article>
  );
}
