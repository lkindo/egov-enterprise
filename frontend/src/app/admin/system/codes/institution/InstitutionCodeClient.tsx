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
 Search,
 Plus,
 ShieldCheck,
 Building2,
 History,
 Server,
 Globe,
 Zap,
 MonitorCheck,
 CheckCircle2,
 Network } from 'lucide-react';
import { PagePagination } from '@/components/common/PagePagination';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

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
 <div className="space-y-10 pb-24 animate-in fade-in duration-1000">

 <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-border/50 pb-8">
 <div className="space-y-1">
 <h4 className="text-2xl font-black tracking-tighter text-foreground uppercase leading-none">{activeTab === 'list' ? '기관 인벤토리' : '수신 파이프라인'}</h4>
 <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] uppercase mt-2">{activeTab === 'list' ? '활성 기관 목록' : '기관코드 수신 이력'}</p>
 </div>
 {/* [P2] 수제 탭에 tablist/tab 시맨틱 부여 */}
 <div role="tablist" aria-label="기관코드 화면 전환" className="flex bg-white/40 backdrop-blur-md p-1.5 rounded-xl border border-white/60 shadow-xl ring-1 ring-black/5">
 <button
 type="button"
 role="tab"
 id="institution-tab-list"
 aria-selected={activeTab === 'list'}
 aria-controls={panelId}
 onClick={() => handleTabChange('list')}
 className={cn(
 "px-6 h-10 rounded-lg font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2",
 activeTab === 'list' ? "bg-surface-inverse text-surface-inverse-foreground shadow-xl" : "text-muted-foreground hover:bg-white/50 hover:text-muted-foreground"
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
 "px-6 h-10 rounded-lg font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2",
 activeTab === 'reception' ? "bg-surface-inverse text-surface-inverse-foreground shadow-xl" : "text-muted-foreground hover:bg-white/50 hover:text-muted-foreground"
 )}>
 <History size={14} aria-hidden="true" /> 수신 이력
 </button>
 </div>
 </div>

 {/*
   * [P1-5] 지표는 실측값만 노출한다.
   * 종전의 '동기화망: 안전' 카드는 산출 근거가 없어 삭제했고,
   * 페이지 단위 집계임을 제목에 명시한다(서버 집계 API 부재).
   */}
 {activeTab === 'list' ? (
 <HubMetricGrid>
 <HubMetricCard title="전체 기관" value={total} icon={Database} color="primary" />
 <HubMetricCard title="사용 중 (현재 페이지)" value={listData.filter(i => i.ablYn === '0').length} icon={ShieldCheck} color="emerald" />
 <HubMetricCard title="폐지 (현재 페이지)" value={listData.filter(i => i.ablYn !== '0').length} icon={Clock} color="amber" />
 </HubMetricGrid>
 ) : (
 <HubMetricGrid>
 <HubMetricCard title="전체 수신 건" value={total} icon={Database} color="primary" />
 <HubMetricCard title="처리 완료 (현재 페이지)" value={receptionData.filter(i => i.procSe === '1').length} icon={CheckCircle2} color="emerald" />
 <HubMetricCard
 title="처리 대기 (현재 페이지)"
 value={receptionData.filter(i => i.procSe !== '1').length}
 icon={Clock}
 color="amber"
 status={receptionData.some(i => i.procSe !== '1') ? '대기 중' : '정상'}
 />
 </HubMetricGrid>
 )}

 <HubSectionCard
 title={activeTab === 'list' ? "기관 인벤토리" : "수집 파이프라인"}
 description={activeTab === 'list' ? "모든 공공기관 코드의 목록입니다." : "지속적으로 유입되는 코드 변동 데이터의 수신 이력입니다."}
 icon={activeTab === 'list' ? Globe : Zap}
 >
 <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl p-8 mb-8 ring-1 ring-black/5">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div className="flex-1">
 <div className="relative group/search max-w-xl">
 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={18} aria-hidden="true" />
 <Input
 placeholder="기관명 또는 코드를 입력하세요..."
 aria-label="기관코드 검색"
 value={keyword}
 onChange={(e) => handleKeywordChange(e.target.value)}
 className="h-10 pl-14 pr-8 w-full bg-muted/50 border-none rounded-xl text-xs font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground"
 />
 </div>
 </div>
 {/*
   * [P1-6] 무동작 Export 버튼 → 동작 검증된 DataExportExcel(BOM 포함 CSV) 배선.
   * 서버 전량 반출이 아니라 현재 페이지 반출임을 filename 으로 구분하지 않는 대신,
   * 목록/수신 탭 각각의 실제 컬럼을 헤더로 매핑한다.
   */}
 {activeTab === 'list' ? (
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
 className="h-10 px-8 rounded-xl border border-border bg-card font-black text-xs tracking-widest uppercase flex items-center gap-2 hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all shadow-sm"
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
 className="h-10 px-8 rounded-xl border border-border bg-card font-black text-xs tracking-widest uppercase flex items-center gap-2 hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all shadow-sm"
 />
 )}
 </div>
 </div>

 <div
 role="tabpanel"
 id={panelId}
 aria-labelledby={activeTab === 'list' ? 'institution-tab-list' : 'institution-tab-reception'}
 className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl overflow-hidden ring-1 ring-black/5"
 >
 <div className="p-2 overflow-hidden">
 {activeTab === 'list' ? (
 <StandardDataTable<InstitutionCode>
 columns={listColumns}
 data={listData}
 loading={listQuery.isLoading}
 error={listQuery.error}
 onRetry={() => listQuery.refetch()}
 keyField="instCd"
 emptyMessage="데이터가 존재하지 않습니다."
 className="border-none bg-transparent shadow-none"
 isPremium={true}
 />
 ) : (
 <StandardDataTable<InstitutionCodeRecptn>
 columns={receptionColumns}
 data={receptionData}
 loading={receptionQuery.isLoading}
 error={receptionQuery.error}
 onRetry={() => receptionQuery.refetch()}
 keyField="jobSn"
 emptyMessage="수신 내역이 존재하지 않습니다."
 className="border-none bg-transparent shadow-none"
 isPremium={true}
 />
 )}
 </div>
 </div>

 <AnimatePresence>
 {total > PAGE_SIZE && (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="mt-10 flex justify-center"
 >
 <PagePagination
 total={total}
 size={PAGE_SIZE}
 page={page}
 onPageChange={setPage}
 />
 </motion.div>
 )}
 </AnimatePresence>
 </HubSectionCard>
 </div>
 );
}
