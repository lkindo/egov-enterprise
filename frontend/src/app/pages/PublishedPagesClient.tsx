'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { PagePagination } from '@/components/common/PagePagination';
import { Button } from '@/components/ui/button';
import { canOpenPage } from '@/lib/auth/page-access';
import { canPermission } from '@/lib/auth/permissions';
import { cmsPageRoute } from '@/lib/cms/page-menu-links';
import { toDisplayYmd } from '@/lib/format-date';
import { usePageClamp } from '@/lib/hooks/use-page-clamp';
import { cn } from '@/lib/utils';
import { cmsQueryOptions } from '@/queries/cms-query-options';
import { cmsService } from '@/services/business/cms/CmsService';

/** 한 쪽에 보이는 안내 페이지 수. */
const PAGE_SIZE = 10;
/** 콘텐츠 페이지 관리 화면 — 처음 쓰는 빈 목록에서 작성 권한이 있는 사람에게만 잇는다. */
const EDITOR_ROUTE = '/admin/system/content-pages';

/**
 * 안내 페이지 목록의 검색·쪽 이동·목록(ADR-0042). 서버가 게시 중인 페이지의 게시본 제목·요약을 최근 게시 순으로 준다.
 *
 * <p>검색어와 쪽 번호는 이 화면의 상태로만 둔다 — 주소에 싣지 않는다(URL 상태 원장 밖). 빈 상태는 처음부터 없는 것(데이터 없음)과
 * 검색어에 맞는 것이 없는 것(결과 없음)을 가른다(G15). 조회 실패는 목록 자리에서 알리고 다시 시도할 수 있다 — 화면 전체를 오류
 * 화면으로 바꾸지 않는다.
 */
export function PublishedPagesClient() {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const params = { keyword, page, size: PAGE_SIZE };
  const list = useQuery({
    ...cmsQueryOptions.published(params),
    // 실패는 이 목록이 알린다 — 전역 알림을 겹쳐 띄우지 않는다.
    queryFn: ({ signal }) => cmsService.getPublishedPages(params, { signal, suppressErrorToast: true }),
    throwOnError: false,
  });
  const total = list.data?.total ?? 0;
  usePageClamp({
    page,
    totalPages: list.data?.totalPage ?? 1,
    ready: list.isSuccess && !list.isFetching,
    onPageChange: setPage,
  });
  const rows = list.data?.list ?? [];
  const canWrite = canPermission(user, 'CMS_ADMIN_READ') && canOpenPage(user, EDITOR_ROUTE);

  const search = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <KeywordFilter label="제목·요약" value={keyword} onSearch={search} landmarkLabel="안내 페이지 찾기" />

      {list.isPending ? (
        <p role="status" className="py-6 text-center text-[length:var(--font-size-body)] text-muted-foreground">
          안내 페이지 목록을 불러오는 중…
        </p>
      ) : list.isError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 text-[length:var(--font-size-body)]">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">안내 페이지 목록을 불러오지 못했습니다.</span>{' '}
            검색어는 그대로입니다. 잠시 후 다시 시도해 주세요.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => void list.refetch()} disabled={list.isFetching}>
            <RefreshCw aria-hidden="true" />
            {list.isFetching ? '목록 불러오는 중…' : '다시 시도'}
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-[length:var(--font-size-body)]" data-testid="published-pages-empty">
          <p className="font-medium text-foreground">{emptyResultMessage(keyword, '게시된 안내 페이지가 없습니다.')}</p>
          {keyword ? (
            <p className="mt-1 text-muted-foreground">다른 검색어로 찾거나 초기화를 눌러 전체 목록을 보세요.</p>
          ) : canWrite ? (
            <p className="mt-1 text-muted-foreground">
              <Link href={EDITOR_ROUTE} className="text-primary underline underline-offset-4">콘텐츠 페이지 관리</Link>에서
              페이지를 작성하고 게시하면 이 목록에 보입니다.
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">관리자가 안내 페이지를 게시하면 이 목록에 보입니다.</p>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {keyword ? `"${keyword}" 검색 결과 ` : '게시된 안내 페이지 '}
            {total.toLocaleString('ko-KR')}건
          </p>
          <ul className={cn('divide-y divide-border rounded-md border border-border bg-card', list.isFetching && 'opacity-70')}
            aria-busy={list.isFetching}>
            {rows.map((row, index) => {
              const publishedOn = toDisplayYmd(row.publishedAt?.slice(0, 10), '');
              return (
                <li key={row.contsPathNm ?? index} className="px-4 py-3">
                  <h2 className="text-[length:var(--font-size-body)] font-semibold">
                    {row.contsPathNm ? (
                      <Link href={cmsPageRoute(row.contsPathNm)}
                        className="break-words text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        {row.contsTtl}
                      </Link>
                    ) : row.contsTtl}
                  </h2>
                  {row.contsExpln && <p className="mt-1 break-words text-sm text-muted-foreground">{row.contsExpln}</p>}
                  {publishedOn && (
                    <p className="mt-1 text-xs text-muted-foreground">게시 <time dateTime={publishedOn}>{publishedOn}</time></p>
                  )}
                </li>
              );
            })}
          </ul>
          <PagePagination total={total} page={page} size={PAGE_SIZE} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
