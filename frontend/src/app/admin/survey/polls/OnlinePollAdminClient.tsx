'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { onlinePollAdminService, type OnlinePollDto } from '@/services/foundation/system/OnlinePollAdminService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import {
 Vote,
 Plus,
 Search,
 RefreshCcw,
 Calendar,
 XCircle,
 Layers,
 Trash2,
 TrendingUp,
 Zap,
 UserCheck,
 Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
// sonner 직접 호출 대신 useToast 로 수렴(문자열 정규화 페일세이프 — '[object Object]' 방지, P2)
import { useToast } from '@/app/components/ui/toast';
import {
 fromDateInputValue,
 toDateInputValue,
 toDisplayYmd,
 toStorageYmd,
 todayStorageYmd,
} from '@/lib/format-date';
import { getPollStatus, POLL_STATUS_LABEL, type PollStatus } from '@/lib/poll-status';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { motion } from 'framer-motion';

const PAGE_SIZE = 10;

/** 설문 1건의 총 득표수 = 항목별 pollIemCo 합계 */
function totalVotesOf(poll: OnlinePollDto): number {
 return poll.pollArticles?.reduce((sum, item) => sum + (item.pollIemCo || 0), 0) ?? 0;
}

export default function OnlinePollAdminClient() {
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();
 const { success, error: toastError } = useToast();

 // 페이지는 URL 파생값이다 — 공유·새로고침·뒤로가기에서 위치가 복원된다(P1-7).
 // 검색어는 개인정보 노출 우려로 URL 에 싣지 않는다(감사 D-13, 제품 보류 항목).
 const pageParam = Number(searchParams.get('page') ?? '0');
 const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 0;

 const setPage = (next: number) => {
 const params = new URLSearchParams(searchParams);
 if (next <= 0) params.delete('page');
 else params.set('page', String(next));
 const query = params.toString();
 router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
 };

 const [keyword, setKeyword] = useState('');
 const debouncedKeyword = useDebouncedValue(keyword, 300);

 const [isAddOpen, setIsAddOpen] = useState(false);
 const [isSaving, setIsSaving] = useState(false);

 // 기간 기준일. 저장 포맷과 동일한 'yyyyMMdd' 문자열로 비교해야 상태 판정이 맞는다.
 const [todayYmd, setTodayYmd] = useState<string>('');
 useEffect(() => {
 setTodayYmd(todayStorageYmd());
 }, []);

 const { data, isLoading, isError, error, refetch } = useQuery({
 queryKey: ['admin-online-polls', page, debouncedKeyword],
 queryFn: () => onlinePollAdminService.getPollList({ keyword: debouncedKeyword, page, size: PAGE_SIZE }),
 });

 const polls: OnlinePollDto[] = data?.list || [];
 const totalCount = data?.total || 0;
 // 진행률 막대의 분모. 종전에는 '/100' 이라는 근거 없는 상수를 써서 101표부터 100% 로 고정됐다(P1-5).
 const maxVotesOnPage = polls.reduce((max, poll) => Math.max(max, totalVotesOf(poll)), 0);

 /** 검색어 변경 시 항상 1페이지로 되돌린다(P1-8) */
 const handleKeywordChange = (value: string) => {
 setKeyword(value);
 if (page !== 0) setPage(0);
 };

 // 날짜는 varchar(8) / @Size(max = 8) 라 'yyyyMMdd' 8자로 저장한다(10자 전송은 400).
 const emptyPoll = (): OnlinePollDto => ({
 pollNm: '',
 pollBgngYmd: toStorageYmd(new Date()),
 pollEndYmd: toStorageYmd(new Date(new Date().setDate(new Date().getDate() + 7))),
 pollKndCd: 'POLL01',
 pollDsuseYn: 'N',
 pollArticles: [{ pollArtclNm: '' }, { pollArtclNm: '' }],
 });
 const [newPoll, setNewPoll] = useState<OnlinePollDto>(emptyPoll);

 const handleAddItem = () => {
 setNewPoll(prev => ({
 ...prev,
 pollArticles: [...(prev.pollArticles || []), { pollArtclNm: '' }]
 }));
 };

 const handleRemoveItem = (index: number) => {
 setNewPoll(prev => ({
 ...prev,
 pollArticles: prev.pollArticles?.filter((_, i) => i !== index)
 }));
 };

 const handleAdd = async () => {
 if (isSaving) return;
 if (!newPoll.pollNm || !newPoll.pollArticles?.every(item => item.pollArtclNm)) {
 toastError('설문 명과 모든 항목 내용을 입력해주세요.');
 return;
 }

 // 날짜는 'yyyyMMdd' 8자여야 서버 @Size(max = 8) 를 통과한다.
 if (!newPoll.pollBgngYmd || !newPoll.pollEndYmd) {
 toastError('설문 시작일과 종료일을 입력해주세요.');
 return;
 }
 if (newPoll.pollBgngYmd > newPoll.pollEndYmd) {
 toastError('설문 시작일은 종료일보다 빨라야 합니다.');
 return;
 }

 setIsSaving(true);
 try {
 await onlinePollAdminService.createPoll(newPoll);
 success('새 설문을 등록했습니다.');
 setIsAddOpen(false);
 setNewPoll(emptyPoll());
 await refetch();
 } catch (e) {
 toastError(e instanceof Error ? e.message : '설문 등록에 실패했습니다.');
 } finally {
 setIsSaving(false);
 }
 };

 const columns: Column<OnlinePollDto>[] = [
 {
 header: '설문 명',
 accessor: (item) => (
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-lg bg-surface-inverse border border-surface-inverse-border flex items-center justify-center text-surface-inverse-foreground shadow-xl transition-transform group-hover:scale-110">
 <Vote size={22} />
 </div>
 <div>
 <span className="font-bold tracking-tighter text-foreground block text-lg leading-none">{item.pollNm}</span>
 <span className="text-xs font-bold text-muted-foreground tracking-widest mt-2 opacity-40">설문 SN: {item.pollSn}</span>
 </div>
 </div>
 )
 },
 {
 header: '기간',
 accessor: (item) => (
 <div className="flex items-center gap-3 font-mono text-xs font-bold text-muted-foreground/60 tracking-tighter ">
 <Calendar size={14} className="text-primary opacity-40" />
 {toDisplayYmd(item.pollBgngYmd)} <span className="text-xs opacity-20 mx-1">~</span> {toDisplayYmd(item.pollEndYmd)}
 </div>
 )
 },
 {
 header: '참여 수',
 accessor: (item) => {
 const totalVotes = totalVotesOf(item);
 const ratio = maxVotesOnPage > 0 ? (totalVotes / maxVotesOnPage) * 100 : 0;
 return (
 <div className="flex items-center gap-6 min-w-[200px]">
 {/* 막대는 '현재 페이지 최다 득표 대비' 상대치다(절대 목표치가 없으므로 백분율로 표기하지 않는다). */}
 <div className="flex-1 h-3 bg-muted dark:bg-muted/30 rounded-lg overflow-hidden shadow-inner border border-border/10">
 <div
 className="h-full bg-gradient-to-r from-primary to-hub-indigo rounded-lg transition-all duration-1000"
 style={{ width: `${ratio}%` }}
 />
 </div>
 <div className="flex items-center gap-1.5 shrink-0">
 <UserCheck size={14} className="text-primary" />
 <span className="text-[12px] font-bold text-foreground tracking-tighter tabular-nums">{totalVotes.toLocaleString()}</span>
 </div>
 </div>
 );
 }
 },
 {
 header: '상태',
 accessor: (item) => {
 // 종전에는 10자 'yyyy-MM-dd' 기준일과 8자 저장값을 문자열 비교해 전건 오판정이었다.
 // 판정은 poll-status 유틸(8자 기준)로 단일화한다.
 const status: PollStatus = getPollStatus(item, todayYmd);

 return (
 <div className={cn(
 "flex items-center gap-2 px-4 py-1.5 rounded-lg border w-fit shadow-sm transition-all",
 status === 'active' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
 status === 'scheduled' && "bg-amber-500/10 text-amber-500 border-amber-500/20",
 status === 'unknown' && "bg-rose-500/10 text-rose-500 border-rose-500/20",
 (status === 'closed' || status === 'suspended') && "bg-muted text-muted-foreground border-border/50"
 )}>
 {status === 'active' && <Zap size={14} className="animate-pulse" />}
 {status === 'scheduled' && <Clock size={14} />}
 {(status === 'closed' || status === 'suspended' || status === 'unknown') && <XCircle size={14} />}
 <span className="text-xs font-bold tracking-[0.2em]">{POLL_STATUS_LABEL[status]}</span>
 </div>
 );
 }
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="온라인 설문 관리"
 breadcrumbs={[{ label: '설문조사' }, { label: '온라인 설문 관리' }]}
 />

 <HubHeader
 title="온라인"
 highlight="설문"
 subtitle="전사 사용자 피드백을 수집하고 참여 현황을 확인합니다."
 icon={Vote}
 actions={
 <div className="flex gap-4 p-2">
 <Button
 variant="outline"
 size="lg"
 onClick={() => void refetch()}
 aria-label="설문 목록 새로고침"
 className="h-12 rounded-lg border-2 font-bold text-xs tracking-widest gap-2"
 >
 <RefreshCcw size={16} className={cn(isLoading && "animate-spin")} /> 새로고침
 </Button>
 <Button
 size="lg"
 onClick={() => setIsAddOpen(true)}
 className="h-12 px-8 rounded-lg font-bold text-xs tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all gap-2"
 >
 <Plus size={18} /> 신규 설문 등록
 </Button>
 </div>
 }
 />

 {/* 지표는 서버가 준 값만 남긴다.
     삭제: '분석 노드'(= 현재 페이지 배열 길이를 다른 의미로 표기한 거짓 지표),
     'SYSTEM STATUS: NOMINAL/STEADY/동기화됨'(근거 없는 상태 배지) — 감사 P1-5. */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
 <SummaryBlock
 title="전체 설문"
 value={totalCount}
 unit="건"
 icon={<Layers size={26} />}
 caption="서버 집계"
 color="text-primary"
 />
 <SummaryBlock
 title="진행중 (현재 페이지)"
 value={todayYmd ? polls.filter(p => getPollStatus(p, todayYmd) === 'active').length : 0}
 unit="건"
 icon={<Zap size={26} />}
 caption={`조회된 ${polls.length}건 기준`}
 color="text-emerald-500"
 />
 </div>

 <HubSectionCard
 title="설문 목록"
 description="등록된 모든 온라인 설문의 기간·참여 수·진행 상태입니다."
 icon={TrendingUp}
 >
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
 <div>
 <h3 className="text-2xl font-bold tracking-tighter leading-none">설문 인벤토리</h3>
 <p className="text-xs font-bold text-muted-foreground tracking-widest mt-2 opacity-50">전사 피드백 모니터링</p>
 </div>
 <div className="flex items-center gap-4">
 <div className="relative group/search flex-1 md:flex-none">
 <label htmlFor="online-poll-search" className="sr-only">설문 검색</label>
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={16} />
 <Input
 id="online-poll-search"
 placeholder="설문명으로 검색..."
 value={keyword}
 onChange={(e) => handleKeywordChange(e.target.value)}
 className="h-11 pl-12 pr-6 w-full md:w-[320px] bg-muted/30 border-none rounded-lg text-xs font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
 />
 </div>
 </div>
 </div>

 <div className="overflow-x-auto">
 <StandardDataTable
 columns={columns}
 data={polls}
 loading={isLoading}
 // 조회 실패를 '등록된 온라인 설문이 없습니다'로 위장하지 않는다(P1-1).
 error={isError ? error : null}
 onRetry={() => void refetch()}
 keyField="pollSn"
 emptyMessage="등록된 온라인 설문이 없습니다."
 className="border-none bg-transparent"
 pagination={{
 currentPage: page + 1,
 totalPages: Math.ceil(totalCount / PAGE_SIZE),
 onPageChange: (p) => setPage(p - 1),
 totalCount,
 pageSize: PAGE_SIZE,
 }}
 />
 </div>
 </HubSectionCard>

 <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
 <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-lg p-12 border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] bg-card/95 backdrop-blur-3xl relative overflow-x-hidden">
 <div className="absolute top-[-15%] left-[-15%] w-64 h-64 bg-primary/5 blur-[80px] rounded-lg pointer-events-none" />

 <DialogHeader className="space-y-6 relative z-10 text-center">
 <div className="w-20 h-11 bg-surface-inverse text-surface-inverse-foreground rounded-lg flex items-center justify-center shadow-2xl mx-auto transition-transform hover:rotate-12 duration-500 border-4 border-white/20">
 <Vote size={32} />
 </div>
 <div className="space-y-2">
 <DialogTitle className="text-4xl font-bold text-foreground tracking-tighter leading-none">신규 설문 등록</DialogTitle>
 <DialogDescription className="text-xs font-bold tracking-widest opacity-40">
 설문명·기간·선택 항목을 입력하세요
 </DialogDescription>
 </div>
 </DialogHeader>

 <div className="space-y-10 py-10 relative z-10">
 <section className="space-y-5">
 <label htmlFor="new-poll-name" className="text-xs font-bold text-muted-foreground tracking-widest ml-2 flex items-center gap-3">
 <div className="w-1.5 h-1.5 bg-primary rounded-full" />
 설문명
 </label>
 <Input
 id="new-poll-name"
 placeholder="설문 명..."
 value={newPoll.pollNm}
 onChange={(e) => setNewPoll(prev => ({ ...prev, pollNm: e.target.value }))}
 className="h-11 px-8 rounded-lg border-none bg-muted text-xl font-bold focus:bg-card focus:ring-8 focus:ring-primary/5 transition-all shadow-inner tracking-tight"
 />
 </section>

 <section className="grid grid-cols-2 gap-8">
 <div className="space-y-4">
 <label htmlFor="new-poll-begin" className="text-xs font-bold text-muted-foreground tracking-widest ml-2 block">시작일</label>
 <div className="relative group">
 <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
 {/* input[type=date] 는 'yyyy-MM-dd' 를 요구하고 저장은 'yyyyMMdd' 다 — 경계에서 변환한다. */}
 <Input
 id="new-poll-begin"
 type="date"
 value={toDateInputValue(newPoll.pollBgngYmd)}
 onChange={(e) => setNewPoll(prev => ({ ...prev, pollBgngYmd: fromDateInputValue(e.target.value) }))}
 className="h-11 pl-14 pr-6 rounded-lg border-none bg-muted font-bold text-sm focus:bg-card transition-all shadow-inner"
 />
 </div>
 </div>
 <div className="space-y-4">
 <label htmlFor="new-poll-end" className="text-xs font-bold text-muted-foreground tracking-widest ml-2 block">종료일</label>
 <div className="relative group">
 <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
 <Input
 id="new-poll-end"
 type="date"
 value={toDateInputValue(newPoll.pollEndYmd)}
 onChange={(e) => setNewPoll(prev => ({ ...prev, pollEndYmd: fromDateInputValue(e.target.value) }))}
 className="h-11 pl-14 pr-6 rounded-lg border-none bg-muted font-bold text-sm focus:bg-card transition-all shadow-inner"
 />
 </div>
 </div>
 </section>

 <section className="space-y-6">
 <div className="flex items-center justify-between px-2">
 <span className="text-xs font-bold text-muted-foreground tracking-widest flex items-center gap-3">
 <div className="w-1.5 h-1.5 bg-primary rounded-full" />
 선택 항목
 </span>
 <button
 type="button"
 onClick={handleAddItem}
 className="h-10 px-6 rounded-lg text-xs font-bold tracking-widest border border-primary/20 text-primary hover:bg-primary/5 flex items-center gap-2 transition-all active:scale-95"
 >
 <Plus size={14} /> 항목 추가
 </button>
 </div>
 <div className="space-y-4">
 {newPoll.pollArticles?.map((item, index) => (
 <motion.div
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 key={index}
 className="flex items-center gap-4 group/item"
 >
 <div className="w-14 h-11 rounded-lg bg-muted flex flex-col items-center justify-center font-bold text-muted-foreground text-xs shadow-inner border border-border/10 shrink-0">
 <span className="opacity-40 mb-0.5">항목</span>
 <span className="text-foreground leading-none">{String(index + 1).padStart(2, '0')}</span>
 </div>
 <div className="flex-1 relative">
 <label htmlFor={`new-poll-article-${index}`} className="sr-only">{`선택 항목 ${index + 1} 내용`}</label>
 <Input
 id={`new-poll-article-${index}`}
 placeholder={`항목 ${index + 1} 내용...`}
 value={item.pollArtclNm}
 onChange={(e) => {
 const value = e.target.value;
 setNewPoll(prev => ({
 ...prev,
 pollArticles: (prev.pollArticles || []).map((article, i) =>
 i === index ? { ...article, pollArtclNm: value } : article
 ),
 }));
 }}
 className="h-11 px-6 rounded-lg border-none bg-muted font-bold text-sm focus:bg-card focus:ring-8 focus:ring-primary/5 transition-all shadow-inner tracking-tight"
 />
 </div>
 {index > 1 && (
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleRemoveItem(index)}
 aria-label={`선택 항목 ${index + 1} 삭제`}
 className="h-11 w-16 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-500/10 transition-all"
 >
 <Trash2 size={20} />
 </Button>
 )}
 </motion.div>
 ))}
 </div>
 </section>
 </div>

 <DialogFooter className="relative z-10 gap-4 mt-6">
 <Button
 variant="outline"
 onClick={() => setIsAddOpen(false)}
 className="h-11 px-12 rounded-lg border-2 border-border font-bold text-xs tracking-widest hover:bg-muted"
 >
 취소
 </Button>
 <Button
 onClick={handleAdd}
 disabled={isSaving}
 className="h-11 flex-1 bg-surface-inverse border-none text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
 >
 {isSaving ? <RefreshCcw size={18} className="animate-spin" /> : <Plus size={18} />}
 {isSaving ? '등록 중…' : '설문 등록'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}

function SummaryBlock({
 title,
 value,
 unit,
 icon,
 caption,
 color,
}: {
 title: string;
 value: number;
 unit?: string;
 icon: React.ReactElement<{ size?: number }>;
 caption: string;
 color: string;
}) {
 return (
 <div className="hub-table-container p-12 group hover:scale-[1.02] transition-all relative overflow-hidden bg-card border-border/50 shadow-md">
 <div className="flex justify-between items-start mb-10">
 <div className={cn("w-14 h-11 rounded-lg bg-muted dark:bg-muted/10 flex items-center justify-center shadow-inner border border-border/10 group-hover:rotate-12 transition-transform", color)}>
 {icon}
 </div>
 <span className="text-[10px] font-bold text-muted-foreground tracking-widest px-3 py-1 rounded-lg border border-border/50 bg-muted/40">
 {caption}
 </span>
 </div>
 <div>
 <h3 className="text-4xl font-bold tracking-tighter text-foreground leading-none tabular-nums flex items-baseline gap-1.5">
 {value.toLocaleString()}
 {unit && <span className="text-sm font-bold text-muted-foreground">{unit}</span>}
 </h3>
 <p className="text-xs font-bold text-muted-foreground/40 tracking-widest mt-4 leading-none">{title}</p>
 </div>
 <div className="absolute right-[-14%] bottom-[-14%] opacity-[0.02] group-hover:scale-125 group-hover:rotate-12 transition-all duration-1000 grayscale">
 {React.cloneElement(icon, { size: 180 })}
 </div>
 </div>
 );
}
