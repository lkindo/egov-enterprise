'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { noteService, type Note } from '@/services/business/user/NoteService';
import { StandardDataTable, type Column } from '@/app/components/ui/standard-data-table';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { CollaborationHubFrame } from '@/app/admin/collaboration/collaboration-hub-frame';

/**
 * 협업 허브의 쪽지 탭(쪽지 소유 hub-tabs-collaboration 기여의 뷰, 허브 분해 H1). 받은 쪽지 목록을 조회하고 제목을 고르면 쪽지함으로 간다.
 * 조회 조건(검색어)은 이 뷰의 상태다 — 탭을 바꾸면 뷰가 다시 마운트되어 비워진다.
 */
export function NoteCollaborationTab() {
  const router = useRouter();
  // 조회 시점은 `조회`/Enter 다(G2) — 타이핑마다 서버를 때리지 않는다.
  const [searchKeyword, setSearchKeyword] = useState('');

  const notesQuery = useQuery({
    queryKey: ['collab-notes', searchKeyword],
    queryFn: () => noteService.getReceivedNotes({ page: 0, size: 50, searchWrd: searchKeyword }),
  });
  const notes: Note[] = notesQuery.data?.list ?? [];
  /** 조회 실패를 "데이터 없음"으로 위장하지 않기 위해 테이블에 그대로 전달한다(P1-1). */
  const tableError = notesQuery.error as Error | null;
  const refetch = notesQuery.refetch;
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const columns: Column<Note>[] = useMemo(() => [
    {
      header: '번호',
      accessor: (_, index) => <span className="font-mono text-xs font-bold text-muted-foreground">{((index ?? 0) + 1).toString().padStart(2, '0')}</span>,
      className: 'w-20 text-center',
    },
    {
      header: '쪽지 제목',
      accessor: (item) => (
        <div className="flex flex-col gap-1 py-1">
          <div className="flex items-center gap-2">
            {item.openYn === 'N' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">{item.noteSj}</span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">SN: {item.noteSn}</span>
        </div>
      ),
    },
    {
      header: '발신자',
      accessor: (item) => <span className="text-xs font-bold text-muted-foreground tracking-tight">{item.trnsmiterNm || item.dsptchUserId}</span>,
      className: 'w-32',
    },
    {
      header: '발신일시',
      accessor: (item) => <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">{item.crtDt?.substring(0, 16)}</span>,
      className: 'w-48',
    },
  ], []);

  return (
    <CollaborationHubFrame
      description="내가 받은 쪽지를 조회합니다. 제목을 선택하면 쪽지함으로 이동합니다."
      totalCount={tableError ? undefined : notesQuery.data?.total}
      filter={
        <KeywordFilter
          label="쪽지 제목·내용"
          placeholder="쪽지 검색어를 입력하세요"
          value={searchKeyword}
          onSearch={(keyword) => setSearchKeyword(keyword)}
        />
      }
      toolbarActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" aria-label="현재 목록 새로고침" onClick={handleRetry}>
            <RefreshCcw size={16} aria-hidden="true" />
          </Button>
        </div>
      }
    >
      <StandardDataTable<Note>
        columns={columns}
        data={notes}
        keyField="noteSn"
        loading={notesQuery.isLoading}
        error={tableError}
        onRetry={handleRetry}
        onRowClick={() => router.push('/note')}
        rowActionLabel="쪽지함 열기"
        emptyMessage={emptyResultMessage(searchKeyword, '받은 쪽지가 없습니다.')}
      />
    </CollaborationHubFrame>
  );
}
