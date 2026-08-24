'use client';

import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { codeAdminService, InstitutionCode, InstitutionCodeRecptn } from '@/services/foundation/system/CodeAdminService';
import { PageResponse } from '@/types/foundation/system';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { Clock,
 RefreshCw,
 Database,
 Plus,
 ShieldCheck,
 Building2,
 History,
 Server,
 MonitorCheck,
 CheckCircle2,
 Network } from 'lucide-react';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type InstitutionTab = 'list' | 'reception';

/** 서버 페이지 크기(백엔드 기본 pageUnit). PagePagination 계산과 동일해야 한다. */
const PAGE_SIZE = 10;

export default function InstitutionCodeClient({ initialData }: { initialData?: Partial<PageResponse<InstitutionCode>> }) {
 const [activeTab, setActiveTab] = useState<InstitutionTab>('list');
 const [keyword, setKeyword] = useState('');
 /** [P1-8] 타이핑마다 서버 요청이 나가지 않도록 공용 훅으로 디바운스한다. */
 const debouncedKeyword = useDebouncedValue(keyword, 300);
 const [page, setPage] = useState(1);
 const { toast } = useToast();
 const confirm = useConfirm();

 /** SSR 초기 목록. 1페이지·무검색 첫 진입에서만 자리표시자로 쓴다. */
 const seedList: InstitutionCode[] = initialData?.list ?? [];
 const hasSeed = seedList.length > 0;

 const listQuery = useQuery({
 queryKey: ['institution-codes', debouncedKeyword, page],
 queryFn: () => codeAdminService.getInstitutionCodeList({ searchWrd: debouncedKeyword, pageNo: page }),
 enabled: activeTab === 'list',
 placeholderData: (prev) => prev ?? (
 page === 1 && debouncedKeyword === '' && hasSeed
 ? { list: seedList, total: initialData?.total ?? seedList.length, page: 1, size: PAGE_SIZE, totalPage: 1 }
 : undefined
 ),
 });

 const receptionQuery = useQuery({
 queryKey: ['institution-code-receptions', debouncedKeyword, page],
 queryFn: () => codeAdminService.getInstitutionCodeRecptnList({ searchWrd: debouncedKeyword, pageNo: page }),
 enabled: activeTab === 'reception',
 placeholderData: (prev) => prev,
 });

 /*
  * [P1-1] 실패는 빈 목록으로 위장하지 않는다.
  * error 가 있으면 StandardDataTable 이 데이터보다 error 를 우선 렌더한다.
  */
 const listData: InstitutionCode[] = listQuery.data?.list ?? [];
 const receptionData: InstitutionCodeRecptn[] = receptionQuery.data?.list ?? [];
 const total = (activeTab === 'list' ? listQuery.data?.total : receptionQuery.data?.total) ?? 0;

 /** [P1-8] 검색어가 바뀌면 페이지를 1로 되돌린다(3페이지에서 검색하면 빈 화면이 되던 결함). */
 const handleKeywordChange = useCallback((value: string) => {
 setKeyword(value);
 setPage(1);
 }, []);

 const handleTabChange = useCallback((tab: InstitutionTab) => {
 setActiveTab(tab);
 setPage(1);
 }, []);

 /** [P1-9] native confirm 제거 — 대상 기관명을 본문에 노출하는 확인 모달. */
 const handleProcess = async (item: InstitutionCodeRecptn) => {
 const ok = await confirm({
 title: '기관코드 수신 반영',
 message: `‘${item.allInstNm}’(코드 ${item.instCd}) 의 수신 내역을 기관코드 원장에 반영합니다. 반영 후에는 되돌릴 수 없습니다.`,
 confirmText: '반영',
 });
 if (!ok) return;

 try {
 await codeAdminService.processInstitutionCodeRecptn({
 ocrnYmd: item.ocrnYmd,
 instCd: item.instCd,
 jobSn: item.jobSn
 });
 toast('성공적으로 반영되었습니다.', 'success');
 receptionQuery.refetch();
 } catch {
 toast('반영 처리 중 오류가 발생했습니다.', 'error');
 }
 };

 const listColumns: Column<InstitutionCode>[] = [
 {
 header: '식별 코드',
 accessor: (item: InstitutionCode) => (
 <div className="flex items-center gap-4 py-2">
 <div className="w-10 h-9 rounded-xl bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-lg group-hover:rotate-6 transition-transform">
 <Building2 size={18} aria-hidden="true" />
 </div>
 <div>
 <span className="font-black tracking-tighter text-foreground block text-xs uppercase leading-none">{item.instCd}</span>
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-60">기관 코드</span>
 </div>
 </div>
 ),
 className: 'w-48 py-4'
 },
 {
 header: '기관 명칭',
 accessor: (item: InstitutionCode) => (
 <span className="font-black text-foreground text-sm tracking-tight">{item.allInstNm}</span>
 ),
 className: 'py-4'
 },
 {
 header: '최하위 기관',
 accessor: (item: InstitutionCode) => (
 <div className="px-3 py-1 bg-muted/50 border border-border/50 rounded-lg w-fit shadow-sm">
 <span className="text-[10px] font-black text-primary tracking-widest uppercase">{item.lwtrkInstNm}</span>
 </div>
 ),
 className: 'w-40 py-4'
 },
 {
 header: '연락처',
 accessor: (item: InstitutionCode) => (
 <div className="flex items-center gap-1.5 font-black text-[10px] text-muted-foreground tracking-widest tabular-nums uppercase">
 <Network size={12} className="opacity-30" aria-hidden="true" />
 {item.telno || '없음'}
 </div>
 ),
 className: 'w-32 py-4'
 },
 {
 header: '상태',
 accessor: (item: InstitutionCode) => (
 <div className={cn(
 "flex items-center gap-2 px-3 py-1 rounded-lg border w-fit shadow-sm",
 item.ablYn === '0'
 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
 : "bg-muted text-muted-foreground border-border/50"
 )}>
 <div className={cn("w-1.5 h-1.5 rounded-full", item.ablYn === '0' ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
 <span className="text-[10px] font-black tracking-widest uppercase">{item.ablYn === '0' ? '사용 중' : '폐지'}</span>
 </div>
 ),
 className: 'w-24 py-4'
 },
 ];

 const receptionColumns: Column<InstitutionCodeRecptn>[] = [
 {
 header: '발생 일자',
 accessor: (item: InstitutionCodeRecptn) => (
 <div className="flex items-center gap-2 font-black text-[10px] text-muted-foreground tracking-widest uppercase">
 <History size={14} className="text-primary opacity-40" aria-hidden="true" />
 {item.ocrnYmd}
 </div>
 ),
 className: 'w-40 py-4'
 },
 {
 header: '식별 코드',
 accessor: (item: InstitutionCodeRecptn) => (
 <div className="flex items-center gap-4">
 <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shadow-inner">
 <Database size={16} aria-hidden="true" />
 </div>
 <span className="font-black tracking-tighter text-foreground uppercase text-xs">{item.instCd}</span>
 </div>
 ),
 className: 'w-40 py-4'
 },
 { header: '기관 명칭', accessor: (item) => <span className="font-black text-sm text-foreground">{item.allInstNm}</span>, className: 'py-4' },
 {
 header: '변경 구분',
 accessor: (item: InstitutionCodeRecptn) => {
 const typeMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
 '1': { label: '신규', color: 'bg-primary/10 text-primary border-primary/20', icon: <Plus size={12} aria-hidden="true" /> },
 '2': { label: '수정', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: <RefreshCw size={12} aria-hidden="true" /> },
 '3': { label: '정제', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20', icon: <ShieldCheck size={12} aria-hidden="true" /> }
 };
 const config = typeMap[item.chgSeCd] || typeMap['1'];
 return (
 <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-lg border w-fit font-black text-[10px] tracking-widest uppercase shadow-sm", config.color)}>
 {config.icon}
 {config.label}
 </div>
 );
 },
 className: 'w-32 py-4'
 },
 {
 header: '상태',
 accessor: (item: InstitutionCodeRecptn) => (
 <div className={cn(
 "flex items-center gap-2 px-3 py-1 rounded-lg border w-fit shadow-sm",
 item.procSe === '1'
 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
 : "bg-amber-500/10 text-amber-600 border-amber-500/20"
 )}>
 {item.procSe === '1' ? <CheckCircle2 size={12} aria-hidden="true" /> : <Clock size={12} className="animate-spin duration-[3s]" aria-hidden="true" />}
 <span className="text-[10px] font-black tracking-widest uppercase">{item.procSe === '1' ? '완료' : '대기'}</span>
 </div>
 ),
 className: 'w-24 py-4'
 },
 {
 header: '관리',
 accessor: (item: InstitutionCodeRecptn) => (
 item.procSe !== '1' ? (
 <Button
 onClick={() => handleProcess(item)}
 aria-label={`${item.allInstNm} 수신 코드 반영`}
 className="h-9 px-5 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-primary transition-all gap-2 active:scale-95"
 >
 <MonitorCheck size={14} aria-hidden="true" /> 반영
 </Button>
 ) : null
 ),
 className: 'w-24 py-4 text-right'
 }
 ];

 /** 탭 전환 시 패널 DOM 은 하나만 존재하므로 aria-controls 대상 id 도 하나로 고정한다. */
 const panelId = 'institution-tabpanel';

 return (
 <WorkListPage
 title="공공기관 코드 관리"
 description={activeTab === 'list' ? '공공기관 코드 목록을 조회합니다.' : '기관코드 변동 수신 이력을 조회합니다.'}
 breadcrumbItems={[{ label: '시스템 관리' }, { label: '코드 관리' }, { label: '기관 코드' }]}
 filterStateKey="system-codes-institution"
 totalCount={total}
 actions={
 /* 탭은 조회 조건이 아니라 조회 대상 전환이라 헤더에 둔다. */
 <div role="tablist" aria-label="기관코드 화면 전환" className="flex rounded-md border border-border p-0.5">
 <button
 type="button"
 role="tab"
 id="institution-tab-list"
 aria-selected={activeTab === 'list'}
 aria-controls={panelId}
 onClick={() => handleTabChange('list')}
 className={cn(
 "flex h-[var(--control-h-sm)] items-center gap-2 rounded px-4 text-xs font-bold transition-colors",
 activeTab === 'list' ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
 )}>
 <Server size={14} aria-hidden="true" /> 기관 목록
 </button>
 <button
 type="button"
 role="tab"
 id="institution-tab-reception"
 aria-selected={activeTab === 'reception'}
 aria-controls={panelId}
 onClick={() => handleTabChange('reception')}
 className={cn(
 "flex h-[var(--control-h-sm)] items-center gap-2 rounded px-4 text-xs font-bold transition-colors",
 activeTab === 'reception' ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
 )}>
 <History size={14} aria-hidden="true" /> 수신 이력
 </button>
 </div>
 }
 filter={
 <div className="min-w-60 max-w-xl space-y-1">
 <label htmlFor="institution-search" className="text-[length:var(--font-size-body)] font-medium">
 기관명 · 코드
 </label>
 <Input
 id="institution-search"
 placeholder="기관명 또는 코드를 입력하세요"
 aria-label="기관코드 검색"
 value={keyword}
 onChange={(e) => handleKeywordChange(e.target.value)}
 />
 </div>
 }
 toolbarActions={
 /*
   * [P1-6] 무동작 Export 버튼 → 동작 검증된 DataExportExcel(BOM 포함 CSV) 배선.
   * 서버 전량 반출이 아니라 현재 페이지 반출이며, 탭별 실제 컬럼을 헤더로 매핑한다.
   */
 activeTab === 'list' ? (
 <DataExportExcel
 data={listData}
 headers={[
 { label: '기관코드', key: 'instCd' },
 { label: '기관명', key: 'allInstNm' },
 { label: '최하위기관', key: 'lwtrkInstNm' },
 { label: '연락처', key: 'telno' },
 { label: '폐지여부', key: 'ablYn' },
 ]}
 filename="기관코드"
 className="flex h-[var(--control-h-sm)] items-center gap-2 rounded-md border border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
 />
 ) : (
 <DataExportExcel
 data={receptionData}
 headers={[
 { label: '발생일자', key: 'ocrnYmd' },
 { label: '기관코드', key: 'instCd' },
 { label: '기관명', key: 'allInstNm' },
 { label: '변경구분', key: 'chgSeCd' },
 { label: '처리구분', key: 'procSe' },
 ]}
 filename="기관코드_수신이력"
 className="flex h-[var(--control-h-sm)] items-center gap-2 rounded-md border border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
 />
 )
 }
 >
 <div
 role="tabpanel"
 id={panelId}
 aria-labelledby={activeTab === 'list' ? 'institution-tab-list' : 'institution-tab-reception'}
 >
 {activeTab === 'list' ? (
 <StandardDataTable<InstitutionCode>
 accessibleLabel="공공기관 코드 목록"
 columns={listColumns}
 data={listData}
 loading={listQuery.isLoading}
 error={listQuery.error}
 onRetry={() => listQuery.refetch()}
 keyField="instCd"
 emptyMessage={emptyResultMessage(keyword, '등록된 기관 코드가 없습니다.')}
 pagination={{
 currentPage: page,
 totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
 onPageChange: setPage,
 pageSize: PAGE_SIZE,
 }}
 />
 ) : (
 <StandardDataTable<InstitutionCodeRecptn>
 accessibleLabel="기관코드 수신 이력"
 columns={receptionColumns}
 data={receptionData}
 loading={receptionQuery.isLoading}
 error={receptionQuery.error}
 onRetry={() => receptionQuery.refetch()}
 keyField="jobSn"
 emptyMessage={emptyResultMessage(keyword, '수신 내역이 없습니다.')}
 pagination={{
 currentPage: page,
 totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
 onPageChange: setPage,
 pageSize: PAGE_SIZE,
 }}
 />
 )}
 </div>
 </WorkListPage>
 );
}
