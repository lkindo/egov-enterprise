'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
 RefreshCcw,
 Inbox,
 Bookmark,
 Search,
 Plus,
 Users,
 Zap,
 Share2
} from 'lucide-react';
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { noteService, Note } from '@/services/business/user/NoteService';
import { scrapService } from '@/services/business/user/ScrapService';
import { addressbookUserService, AddressBook } from '@/services/business/user/addressbook/AddressbookUserService';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';

const COLLABORATION_TABS = ['MESSAGES', 'ADDRESS_BOOK', 'SCRAPS'] as const;
type CollaborationTab = (typeof COLLABORATION_TABS)[number];

/** 스크랩 목록 원소 타입 — 서비스 반환 타입에서 파생한다(로컬 재선언 금지). */
type ScrapItem = Awaited<ReturnType<typeof scrapService.getMyScraps>>['list'][number];

const TAB_LABEL: Record<CollaborationTab, string> = {
  MESSAGES: '쪽지',
  ADDRESS_BOOK: '주소록',
  SCRAPS: '스크랩',
};

/** 서버 검색(searchWrd)을 지원하는 탭만 검색창을 노출한다(스크랩 API 는 검색 파라미터가 없다). */
const SERVER_SEARCHABLE: Record<CollaborationTab, boolean> = {
  MESSAGES: true,
  ADDRESS_BOOK: true,
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

 const [searchKeyword, setSearchKeyword] = useState('');
 // [P1-8] 타이핑마다 서버 요청이 나가지 않도록 공용 훅으로 디바운스한다.
 const debouncedKeyword = useDebouncedValue(searchKeyword, 300);

 const handleTabChange = useCallback((tab: CollaborationTab) => {
   setSearchKeyword('');
   const params = new URLSearchParams(searchParams.toString());
   params.set('tab', tab);
   // 검색어는 URL 에 싣지 않는다(개인정보 노출 우려 — 감사 D-13 보류 항목).
   router.replace(`${pathname}?${params.toString()}`, { scroll: false });
 }, [pathname, router, searchParams]);

 // --- Data Fetching ---
 // 지표 카드가 실제 총 건수를 표기해야 하므로 3개 쿼리를 모두 조회한다.
 // (탭별 lazy 로딩 시 비활성 탭 지표가 항상 0 으로 표시되어 거짓 지표가 된다.)
 const notesQuery = useQuery({
   queryKey: ['collab-notes', debouncedKeyword],
   queryFn: () => noteService.getReceivedNotes({ page: 0, size: 50, searchWrd: debouncedKeyword }),
 });
 const notes: Note[] = notesQuery.data?.list ?? [];

 const addressQuery = useQuery({
   queryKey: ['collab-addressbook', debouncedKeyword],
   queryFn: () => addressbookUserService.getAddressBooks({ page: 0, size: 50, searchWrd: debouncedKeyword }),
 });
 const addresses: AddressBook[] = addressQuery.data?.list ?? [];

 const scrapsQuery = useQuery({
   queryKey: ['collab-scraps'],
   queryFn: () => scrapService.getMyScraps({ page: 0, size: 50 }),
 });
 const scraps: ScrapItem[] = scrapsQuery.data?.list ?? [];

 /** 조회 실패를 "데이터 없음"으로 위장하지 않기 위해 테이블에 그대로 전달한다(P1-1). */
 const tableError: Error | null =
   activeTab === 'MESSAGES'
     ? (notesQuery.error as Error | null)
     : activeTab === 'ADDRESS_BOOK'
       ? (addressQuery.error as Error | null)
       : (scrapsQuery.error as Error | null);

 const notesRefetch = notesQuery.refetch;
 const addressRefetch = addressQuery.refetch;
 const scrapsRefetch = scrapsQuery.refetch;
 const handleRetry = useCallback(() => {
   if (activeTab === 'MESSAGES') void notesRefetch();
   else if (activeTab === 'ADDRESS_BOOK') void addressRefetch();
   else void scrapsRefetch();
 }, [activeTab, notesRefetch, addressRefetch, scrapsRefetch]);

 const metricValue = (isError: boolean, total?: number): string | number =>
   isError ? '조회 실패' : (total ?? 0);

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
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">ID: {item.noteId}</span>
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

 const addressColumns: Column<AddressBook>[] = useMemo(() => [
 {
 header: '번호',
 accessor: (_, index) => <span className="font-mono text-xs font-bold text-muted-foreground">{((index ?? 0) + 1).toString().padStart(2, '0')}</span>,
 className: 'w-20 text-center'
 },
 {
 header: '주소록 명칭',
 accessor: (item) => <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">{item.adbkNm}</span>
 },
 {
 // 목록 응답(AddressBookDto)에는 구성원(adbkMan)이 포함되지 않는다 → 이메일 열은 항상 공백이라 제거하고
 // 실제로 내려오는 등록일자를 노출한다.
 header: '등록일자',
 accessor: (item) => <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">{(item.crtDt || '').substring(0, 10)}</span>,
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

 const headerAction = useMemo(() => {
    if (activeTab === 'ADDRESS_BOOK') {
      return (
        <Button onClick={() => router.push('/admin/collaboration/address-book/insert-address-book')} className="h-11 px-8 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl gap-2">
          <Plus size={18} /> 주소록 등록
        </Button>
      );
    }
    if (activeTab === 'SCRAPS') {
      return (
        <Button onClick={() => router.push('/admin/collaboration/scraps/insertScrap')} className="h-11 px-8 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl gap-2">
          <Plus size={18} /> 스크랩 등록
        </Button>
      );
    }
    return (
      <Button onClick={() => router.push('/admin/collaboration/mail-send')} className="h-11 px-8 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl gap-2">
        <Plus size={18} /> 신규 발송
      </Button>
    );
  }, [activeTab, router]);

 return (
 <TooltipProvider delayDuration={0}>
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="협업 및 네트워크 허브"
 breadcrumbs={[{ label: '협업관리' }, { label: '커넥트매트릭스' }]}
 />

 <HubHeader
 title="Connect"
 highlight="Matrix"
 subtitle="조직 내 원활한 소통과 정보 공유를 위한 통합 협업 공간입니다."
 icon={Share2}
 actions={
 <div className="flex gap-4 items-center">
 <div role="tablist" aria-label="협업 데이터 구분" className="flex bg-muted p-1 rounded-xl border border-border/50">
 {COLLABORATION_TABS.map((tab) => (
 <Button
 key={tab}
 role="tab"
 id={`collab-tab-${tab}`}
 aria-selected={activeTab === tab}
 aria-controls="collab-tabpanel"
 variant="ghost"
 size="sm"
 className={cn("h-8 rounded-lg px-4 text-[11px] font-black transition-all", activeTab === tab ? "bg-card shadow-sm text-primary" : "text-muted-foreground")}
 onClick={() => handleTabChange(tab)}
 >
 {TAB_LABEL[tab]}
 </Button>
 ))}
 </div>
 {headerAction}
 </div>
 }
 />

 <HubMetricGrid className="lg:grid-cols-3">
 <HubMetricCard title="받은 쪽지" value={metricValue(notesQuery.isError, notesQuery.data?.total)} icon={Inbox} color="primary" status="총 건수" />
 <HubMetricCard title="내 주소록" value={metricValue(addressQuery.isError, addressQuery.data?.total)} icon={Users} color="emerald" status="총 건수" />
 <HubMetricCard title="내 스크랩" value={metricValue(scrapsQuery.isError, scrapsQuery.data?.total)} icon={Bookmark} color="amber" status="총 건수" />
 </HubMetricGrid>

 <HubSectionCard
 title={activeTab === 'MESSAGES' ? "쪽지 수신함" : activeTab === 'ADDRESS_BOOK' ? "주소록 목록" : "스크랩 목록"}
 description="조직 내에서 발생하는 협업 데이터 및 개인 자산 명세입니다."
 icon={Zap}
 className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
 >
 <div className="space-y-8" role="tabpanel" id="collab-tabpanel" aria-labelledby={`collab-tab-${activeTab}`}>
 <div className="flex items-center justify-between gap-4 px-2 pt-2 border-b border-border/50 pb-10 mb-8">
 {SERVER_SEARCHABLE[activeTab] ? (
 <div className="relative group max-w-xl w-full">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
 <Input
 aria-label={`${TAB_LABEL[activeTab]} 검색`}
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 className="h-11 bg-muted/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
 placeholder={`${TAB_LABEL[activeTab]} 검색어를 입력하세요.`}
 />
 </div>
 ) : (
 <Button
 variant="outline"
 onClick={() => router.push('/admin/collaboration/scraps/selectScrapList')}
 className="h-11 rounded-xl border-2 border-border font-bold text-xs px-6"
 >
 스크랩 전체 목록으로 이동
 </Button>
 )}
 <Button
 variant="outline"
 aria-label="현재 목록 새로고침"
 onClick={handleRetry}
 className="h-11 px-6 rounded-xl border-2 border-border text-muted-foreground hover:text-primary transition-all"
 >
 <RefreshCcw size={20} />
 </Button>
 </div>

 <div className="min-h-[500px]">
 {activeTab === 'MESSAGES' && (
 <StandardDataTable<Note>
 columns={messageColumns}
 data={notes}
 keyField="noteId"
 loading={notesQuery.isLoading}
 error={tableError}
 onRetry={handleRetry}
 onRowClick={() => router.push('/note')}
 emptyMessage="받은 쪽지가 없습니다."
 isPremium={true}
 className="border-none bg-transparent shadow-none"
 />
 )}
 {activeTab === 'ADDRESS_BOOK' && (
 <StandardDataTable<AddressBook>
 columns={addressColumns}
 data={addresses}
 keyField="adbkSn"
 loading={addressQuery.isLoading}
 error={tableError}
 onRetry={handleRetry}
 onRowClick={(item) => router.push(`/admin/collaboration/address-book/select-address-book-detail/${item.adbkSn}`)}
 emptyMessage="등록된 주소록이 없습니다."
 isPremium={true}
 className="border-none bg-transparent shadow-none"
 />
 )}
 {activeTab === 'SCRAPS' && (
 <StandardDataTable<ScrapItem>
 columns={scrapColumns}
 data={scraps}
 keyField="scrapSn"
 loading={scrapsQuery.isLoading}
 error={tableError}
 onRetry={handleRetry}
 onRowClick={(item) => router.push(`/admin/collaboration/scraps/selectScrapDetail/${item.scrapSn}`)}
 emptyMessage="저장된 스크랩이 없습니다."
 isPremium={true}
 className="border-none bg-transparent shadow-none"
 />
 )}
 </div>
 </div>
 </HubSectionCard>
 </div>
 </TooltipProvider>
 );
}
