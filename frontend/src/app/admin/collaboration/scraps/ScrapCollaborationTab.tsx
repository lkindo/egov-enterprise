'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Scrap } from '@/services/business/user/ScrapService';
import { scrapQueryOptions } from '@/queries/scrap-query-options';
import { StandardDataTable, type Column } from '@/app/components/ui/standard-data-table';
import { CollaborationHubFrame } from '@/app/admin/collaboration/collaboration-hub-frame';
import { ScrapFormDialog, type ScrapFormValues } from './ScrapFormDialog';

/**
 * 협업 허브의 스크랩 탭(스크랩 소유 hub-tabs-collaboration 기여의 뷰, 허브 분해 H1). 내 스크랩을 조회하고, 등록·수정은 목록 위 모달로 한다.
 * 스크랩 API 는 검색 파라미터가 없어 조회 조건 칸을 두지 않는다 — 동작하지 않는 입력을 만들지 않는다.
 */
export function ScrapCollaborationTab() {
  const scrapsQuery = useQuery(scrapQueryOptions.list({ pageIndex: 1, pageUnit: 50 }));
  const scraps: Scrap[] = scrapsQuery.data?.list ?? [];

  /*
    [2026-09-12 §A3-1] 등록·수정이 전용 라우트에서 목록 위 모달로 옮겨 갔다.
    이 허브도 같은 자원을 다루므로 같은 그릇을 쓴다 — 종전에는 `insertScrap`(등록)과
    `selectScrapDetail/[id]`(수정)으로 보냈는데 둘 다 page-redirect 가 되면서
    **등록 버튼은 목록으로 떨어지고 행 클릭은 어느 스크랩을 눌렀는지 잃었다**.
    저장 후 재조회는 `scrapMutationOptions` 가 scrapKeys.lists() 를 무효화해 처리한다.
  */
  const [scrapFormMode, setScrapFormMode] = useState<'create' | 'edit' | null>(null);
  const [scrapEditTarget, setScrapEditTarget] = useState<{ scrapSn: number; values: ScrapFormValues } | null>(null);

  const openScrapEdit = useCallback((item: Scrap) => {
    setScrapEditTarget({
      scrapSn: item.scrapSn as number,
      values: {
        scrapNm: item.scrapNm ?? '',
        scrapUrl: item.scrapUrl ?? '',
        scrapExpln: item.scrapExpln ?? '',
      },
    });
    setScrapFormMode('edit');
  }, []);

  /** 조회 실패를 "데이터 없음"으로 위장하지 않기 위해 테이블에 그대로 전달한다(P1-1). */
  const tableError = scrapsQuery.error as Error | null;
  const refetch = scrapsQuery.refetch;
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const columns: Column<Scrap>[] = useMemo(() => [
    {
      header: '번호',
      accessor: (_, index) => <span className="font-mono text-xs font-bold text-muted-foreground">{((index ?? 0) + 1).toString().padStart(2, '0')}</span>,
      className: 'w-20 text-center',
    },
    {
      header: '스크랩 제목',
      accessor: (item) => <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">{item.scrapNm}</span>,
    },
    {
      header: '등록일자',
      accessor: (item) => <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">{item.crtDt?.substring(0, 10)}</span>,
      className: 'w-48',
    },
  ], []);

  return (
    <CollaborationHubFrame
      description="내가 저장한 스크랩을 조회합니다. 제목을 선택하면 상세로 이동합니다."
      totalCount={tableError ? undefined : scrapsQuery.data?.total}
      primaryAction={
        /* [2026-09-12 §A3-1] 스크랩 등록은 페이지 이동이 아니라 모달이므로 button 역할이 옳다. */
        <Button size="sm" onClick={() => { setScrapEditTarget(null); setScrapFormMode('create'); }}>
          <Plus size={16} aria-hidden="true" /> 스크랩 등록
        </Button>
      }
      toolbarActions={
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/collaboration/scraps/selectScrapList">스크랩 전체 목록</Link>
          </Button>
          <Button variant="outline" size="sm" aria-label="현재 목록 새로고침" onClick={handleRetry}>
            <RefreshCcw size={16} aria-hidden="true" />
          </Button>
        </div>
      }
    >
      <StandardDataTable<Scrap>
        columns={columns}
        data={scraps}
        keyField="scrapSn"
        loading={scrapsQuery.isLoading}
        error={tableError}
        onRetry={handleRetry}
        onRowClick={(item) => openScrapEdit(item)}
        rowActionLabel={(item) => `${item.scrapNm || `${item.scrapSn}번`} 스크랩 열기`}
        emptyMessage="저장된 스크랩이 없습니다."
      />
      {scrapFormMode ? (
        <ScrapFormDialog
          isOpen
          mode={scrapFormMode}
          scrapSn={scrapEditTarget?.scrapSn}
          initialValues={scrapEditTarget?.values}
          onClose={() => { setScrapFormMode(null); setScrapEditTarget(null); }}
          onSaved={() => { setScrapFormMode(null); setScrapEditTarget(null); }}
        />
      ) : null}
    </CollaborationHubFrame>
  );
}
