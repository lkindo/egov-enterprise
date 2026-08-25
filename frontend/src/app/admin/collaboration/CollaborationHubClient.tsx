'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
 RefreshCcw,
 Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { noteService, Note } from '@/services/business/user/NoteService';
import { scrapService } from '@/services/business/user/ScrapService';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import Link from 'next/link';

const COLLABORATION_TABS = ['MESSAGES', 'SCRAPS'] as const;
type CollaborationTab = (typeof COLLABORATION_TABS)[number];

/** 스크랩 목록 원소 타입 — 서비스 반환 타입에서 파생한다(로컬 재선언 금지). */
type ScrapItem = Awaited<ReturnType<typeof scrapService.getMyScraps>>['list'][number];

const TAB_LABEL: Record<CollaborationTab, string> = {
  MESSAGES: '쪽지',
  SCRAPS: '스크랩',
};

/** 서버 검색(searchWrd)을 지원하는 탭만 검색창을 노출한다(스크랩 API 는 검색 파라미터가 없다). */
const SERVER_SEARCHABLE: Record<CollaborationTab, boolean> = {
  MESSAGES: true,
  SCRAPS: false,
};

function normalizeTab(value?: string | null): CollaborationTab | null {
  if (!value) return null;
  const upper = value.toUpperCase() as CollaborationTab;
  return COLLABORATION_TABS.includes(upper) ? upper : null;
}

export default function CollaborationHubClient({ defaultTab = 'MESSAGES' }: { defaultTab?: string }) {
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();

 // [P1-7] 탭은 URL 파생값이다. 공유·새로고침·뒤로가기가 그대로 복원된다.
 const activeTab: CollaborationTab = normalizeTab(searchParams.get('tab')) ?? normalizeTab(defaultTab) ?? 'MESSAGES';

 // 조회 시점은 `조회`/Enter 다(G2) — 타이핑마다 서버를 때리지 않는다.
 const [searchKeyword, setSearchKeyword] = useState('');

 const handleTabChange = useCallback((tab: CollaborationTab) => {
   setSearchKeyword('');
   const params = new URLSearchParams(searchParams.toString());
   params.set('tab', tab);
   // 검색어는 URL 에 싣지 않는다(개인정보 노출 우려 — 감사 D-13 보류 항목).
   router.replace(`${pathname}?${params.toString()}`, { scroll: false });
 }, [pathname, router, searchParams]);

 // --- Data Fetching ---
 // 지표 카드가 실제 총 건수를 표기해야 하므로 두 쿼리를 모두 조회한다.
 const notesQuery = useQuery({
   queryKey: ['collab-notes', searchKeyword],
   queryFn: () => noteService.getReceivedNotes({ page: 0, size: 50, searchWrd: searchKeyword }),
 });
 const notes: Note[] = notesQuery.data?.list ?? [];

 const scrapsQuery = useQuery({
   queryKey: ['collab-scraps'],
   queryFn: () => scrapService.getMyScraps({ page: 0, size: 50 }),
 });
 const scraps: ScrapItem[] = scrapsQuery.data?.list ?? [];

 /** 조회 실패를 "데이터 없음"으로 위장하지 않기 위해 테이블에 그대로 전달한다(P1-1). */
 const tableError: Error | null =
   activeTab === 'MESSAGES'
     ? (notesQuery.error as Error | null)
     : (scrapsQuery.error as Error | null);

 const notesRefetch = notesQuery.refetch;
 const scrapsRefetch = scrapsQuery.refetch;
 const handleRetry = useCallback(() => {
   if (activeTab === 'MESSAGES') void notesRefetch();
   else void scrapsRefetch();
 }, [activeTab, notesRefetch, scrapsRefetch]);

 const messageColumns: Column<Note>[] = useMemo(() => [
 {
 header: '번호',
 accessor: (_, index) => <span className="font-mono text-xs font-bold text-muted-foreground">{((index ?? 0) + 1).toString().padStart(2, '0')}</span>,
 className: 'w-20 text-center'
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
 )
 },
 {
 header: '발신자',
 accessor: (item) => <span className="text-xs font-bold text-muted-foreground tracking-tight">{item.trnsmiterNm || item.dsptchUserId}</span>,
 className: 'w-32'
 },
 {
 header: '발신일시',
 accessor: (item) => <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">{item.crtDt?.substring(0, 16)}</span>,
 className: 'w-48'
 }
 ], []);

 const scrapColumns: Column<ScrapItem>[] = useMemo(() => [
 {
 header: '번호',
 accessor: (_, index) => <span className="font-mono text-xs font-bold text-muted-foreground">{((index ?? 0) + 1).toString().padStart(2, '0')}</span>,
 className: 'w-20 text-center'
 },
 {
 header: '스크랩 제목',
 accessor: (item) => <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">{item.scrapNm}</span>
 },
 {
 header: '등록일자',
 accessor: (item) => <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">{item.crtDt?.substring(0, 10)}</span>,
 className: 'w-48'
 }
 ], []);

  const activeTotal = activeTab === 'MESSAGES' ? notesQuery.data?.total : scrapsQuery.data?.total;
  const activeLoading = activeTab === 'MESSAGES' ? notesQuery.isLoading : scrapsQuery.isLoading;

  return (
    <WorkListPage
      title="협업 및 네트워크 허브"
      description={activeTab === 'MESSAGES'
        ? '내가 받은 쪽지를 조회합니다. 제목을 선택하면 쪽지함으로 이동합니다.'
        : '내가 저장한 스크랩을 조회합니다. 제목을 선택하면 상세로 이동합니다.'}
      breadcrumbItems={[{ label: '협업관리' }, { label: '협업 허브' }]}
      filterStateKey="collaboration-hub"
      totalCount={tableError ? undefined : activeTotal}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* 탭은 조회 조건이 아니라 조회 대상 전환이라 헤더에 둔다(기관 코드 화면과 같은 규약). */}
          <div role="tablist" aria-label="협업 데이터 구분" className="flex rounded-md border border-border p-0.5">
            {COLLABORATION_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`collab-tab-${tab}`}
                aria-selected={activeTab === tab}
                aria-controls="collab-tabpanel"
                onClick={() => handleTabChange(tab)}
                className={cn(
                  'flex h-[var(--control-h-sm)] items-center rounded px-4 text-xs font-bold transition-colors',
                  activeTab === tab ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {TAB_LABEL[tab]}
              </button>
            ))}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/collaboration/address-book/select-address-book-list">주소록 관리</Link>
          </Button>
          {activeTab === 'SCRAPS' ? (
            <Button asChild size="sm">
              <Link href="/admin/collaboration/scraps/insertScrap">
                <Plus size={16} aria-hidden="true" /> 스크랩 등록
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/admin/collaboration/mail-send">
                <Plus size={16} aria-hidden="true" /> 신규 발송
              </Link>
            </Button>
          )}
        </div>
      }
      filter={
        /* 스크랩 API 는 검색 파라미터가 없다 — 동작하지 않는 입력을 만들지 않는다. */
        SERVER_SEARCHABLE[activeTab] ? (
          <KeywordFilter
            label={`${TAB_LABEL[activeTab]} 제목·발신자`}
            placeholder={`${TAB_LABEL[activeTab]} 검색어를 입력하세요`}
            value={searchKeyword}
            onSearch={(keyword) => setSearchKeyword(keyword)}
          />
        ) : undefined
      }
      toolbarActions={
        <div className="flex items-center gap-2">
          {activeTab === 'SCRAPS' && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/collaboration/scraps/selectScrapList">스크랩 전체 목록</Link>
            </Button>
          )}
          <Button variant="outline" size="sm" aria-label="현재 목록 새로고침" onClick={handleRetry}>
            <RefreshCcw size={16} aria-hidden="true" />
          </Button>
        </div>
      }
    >
      <div role="tabpanel" id="collab-tabpanel" aria-labelledby={`collab-tab-${activeTab}`}>
        {activeTab === 'MESSAGES' ? (
          <StandardDataTable<Note>
            columns={messageColumns}
            data={notes}
            keyField="noteSn"
            loading={activeLoading}
            error={tableError}
            onRetry={handleRetry}
            onRowClick={() => router.push('/note')}
            rowActionLabel="쪽지함 열기"
            emptyMessage={emptyResultMessage(searchKeyword, '받은 쪽지가 없습니다.')}
          />
        ) : (
          <StandardDataTable<ScrapItem>
            columns={scrapColumns}
            data={scraps}
            keyField="scrapSn"
            loading={activeLoading}
            error={tableError}
            onRetry={handleRetry}
            onRowClick={(item) => router.push(`/admin/collaboration/scraps/selectScrapDetail/${item.scrapSn}`)}
            rowActionLabel={(item) => `${item.scrapNm || `${item.scrapSn}번`} 스크랩 열기`}
            emptyMessage="저장된 스크랩이 없습니다."
          />
        )}
      </div>
    </WorkListPage>
  );
}

