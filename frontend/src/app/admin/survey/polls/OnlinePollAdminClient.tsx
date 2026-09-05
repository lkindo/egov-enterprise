'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { onlinePollAdminService, type OnlinePollDto } from '@/services/foundation/system/OnlinePollAdminService';
import {
 Vote,
 Plus,
 Zap,
 RefreshCcw,
 Calendar,
 XCircle,
 Trash2,
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
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { adminPollFormSchema } from '../manage/poll-form-validation';

/** 페이지당 건수 기본값(A1 필수 — 사용자가 바꿀 수 있다). URL 에는 싣지 않는다. */
const DEFAULT_PAGE_SIZE = 10;

/** 설문 1건의 총 득표수 = 항목별 pollIemCo 합계 */
function totalVotesOf(poll: OnlinePollDto): number {
 return poll.pollArticles?.reduce((sum, item) => sum + (item.pollIemCo || 0), 0) ?? 0;
}

export default function OnlinePollAdminClient() {
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();
 const { success, error: toastError } = useToast();
 const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

 // 페이지는 URL 파생값이다 — 공유·새로고침·뒤로가기에서 위치가 복원된다(P1-7).
 // ADR-0009는 URL 사용을 의무화하지 않는다. 이 화면은 검색어를 로컬 상태로 유지한다.
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
 queryKey: ['admin-online-polls', page, debouncedKeyword, pageSize],
 queryFn: () => onlinePollAdminService.getPollList({ keyword: debouncedKeyword, page, size: pageSize }),
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
 const savingRef = useRef(false);
 const validationLabels = {
  pollNm: '설문명',
  pollBgngYmd: '시작일',
  pollEndYmd: '종료일',
  pollKndCd: '설문 유형',
  pollDsuseYn: '사용 여부',
  ...(newPoll.pollArticles ?? []).reduce<Record<string, string>>((labels, _item, index) => {
   labels[`pollArticles.${index}.pollArtclNm`] = `선택 항목 ${index + 1}`;
   return labels;
  }, {}),
 };
 const validation = useManualFormValidation(adminPollFormSchema, { labels: validationLabels });

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
 if (savingRef.current) return;
 const validated = validation.validate({
  ...newPoll,
  // API 조회 타입은 선택 항목을 optional 로 선언하지만, 신규 등록 계약은 최소 2개를 요구한다.
  // undefined 를 빈 배열로 정규화해야 검증이 실패로 안내되고 타입 단언으로 우회되지 않는다.
  pollArticles: newPoll.pollArticles ?? [],
 });
 if (!validated) return;

 savingRef.current = true;
 setIsSaving(true);
 try {
 await onlinePollAdminService.createPoll(validated);
 success('새 설문을 등록했습니다.');
 setIsAddOpen(false);
 setNewPoll(emptyPoll());
 validation.setFormErrors({}, false);
 await refetch();
 } catch (e) {
 const fieldErrors = extractFieldErrors(e);
 if (fieldErrors) validation.setFormErrors(fieldErrors);
 else toastError(e instanceof Error ? e.message : '설문 등록에 실패했습니다.');
 } finally {
 savingRef.current = false;
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
 <WorkListPage
 title="온라인 투표 관리"
 description="항목 하나를 고르는 온라인 투표를 조회·등록하고 참여 현황을 확인합니다. 문항형 설문조사는 설문 허브에서 관리합니다."
 breadcrumbItems={[{ label: '설문조사' }, { label: '온라인 투표 관리' }]}
 filterStateKey="survey-polls"
 totalCount={isError ? undefined : totalCount}
 actions={
 <>
 <Button
 variant="outline"
 size="sm"
 onClick={() => void refetch()}
 aria-label="설문 목록 새로고침"
 className="gap-2"
 >
 <RefreshCcw size={16} className={cn(isLoading && "animate-spin")} aria-hidden="true" /> 새로고침
 </Button>
 <Button
 size="sm"
 onClick={() => {
 validation.setFormErrors({}, false);
 setIsAddOpen(true);
 }}
 className="gap-2"
 >
 <Plus size={16} aria-hidden="true" /> 신규 설문 등록
 </Button>
 </>
 }
 filter={
 <div className="min-w-60 max-w-xl space-y-1">
 <label htmlFor="online-poll-search" className="text-[length:var(--font-size-body)] font-medium">
 설문명
 </label>
 <Input
 id="online-poll-search"
 placeholder="설문명으로 검색"
 value={keyword}
 onChange={(e) => handleKeywordChange(e.target.value)}
 />
 </div>
 }
 toolbarActions={
 /* 지표는 서버가 준 값만 남긴다. 카드 2장(180px 배경 아이콘·hover scale)을 한 줄로 수렴한다.
    삭제 이력: '분석 노드'(현재 페이지 길이를 다른 의미로 표기한 거짓 지표),
    'SYSTEM STATUS: NOMINAL'(근거 없는 상태 배지) — 감사 P1-5. */
 <span className="text-[length:var(--font-size-body)] text-muted-foreground">
 진행중 <span className="font-bold text-foreground">
 {todayYmd ? polls.filter(p => getPollStatus(p, todayYmd) === 'active').length : 0}
 </span>건 · 조회된 {polls.length}건 기준
 </span>
 }
 >
 <StandardDataTable
 accessibleLabel="온라인 투표 목록"
 columns={columns}
 data={polls}
 loading={isLoading}
 // 조회 실패를 '등록된 온라인 설문이 없습니다'로 위장하지 않는다(P1-1).
 error={isError ? error : null}
 onRetry={() => void refetch()}
 keyField="pollSn"
 emptyMessage={emptyResultMessage(keyword, '등록된 온라인 투표가 없습니다.')}
 className="border-none bg-transparent"
 pagination={{
 currentPage: page + 1,
 totalPages: Math.ceil(totalCount / pageSize),
 onPageChange: (p) => setPage(p - 1),
 // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
 pageSize,
          onPageSizeChange: (size) => { setPageSize(size); setPage(0); },
 }}
 />

 <Dialog
 open={isAddOpen}
 onOpenChange={(open) => {
 if (!open && savingRef.current) return;
 setIsAddOpen(open);
 }}
 >
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
 <FormErrorSummary
 errors={validation.errors}
 labels={validationLabels}
 onNavigate={(name) => { validation.focusError(name); }}
 />
 <section className="space-y-5">
 <label htmlFor="new-poll-name" className="text-xs font-bold text-muted-foreground tracking-widest ml-2 flex items-center gap-3">
 <div className="w-1.5 h-1.5 bg-primary rounded-full" />
 설문명
 </label>
 <Input
 id="new-poll-name"
 {...validation.fieldProps('pollNm')}
 placeholder="설문 명..."
 value={newPoll.pollNm}
 onChange={(e) => {
 validation.clearError('pollNm');
 setNewPoll(prev => ({ ...prev, pollNm: e.target.value }));
 }}
 required
 maxLength={100}
 className="h-11 px-8 rounded-lg border-none bg-muted text-xl font-bold focus:bg-card focus:ring-8 focus:ring-primary/5 transition-all shadow-inner tracking-tight"
 />
 {validation.errors.pollNm ? (
 <p {...validation.messageProps('pollNm')} className="text-sm text-destructive-emphasis" />
 ) : null}
 </section>

 <section className="grid grid-cols-2 gap-8">
 <div className="space-y-4">
 <label htmlFor="new-poll-begin" className="text-xs font-bold text-muted-foreground tracking-widest ml-2 block">시작일 (필수)</label>
 <div className="relative group">
 <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
 {/* input[type=date] 는 'yyyy-MM-dd' 를 요구하고 저장은 'yyyyMMdd' 다 — 경계에서 변환한다. */}
 <Input
 id="new-poll-begin"
 {...validation.fieldProps('pollBgngYmd')}
 type="date"
 value={toDateInputValue(newPoll.pollBgngYmd)}
 onChange={(e) => {
 validation.clearError('pollBgngYmd');
 setNewPoll(prev => ({ ...prev, pollBgngYmd: fromDateInputValue(e.target.value) }));
 }}
 required
 className="h-11 pl-14 pr-6 rounded-lg border-none bg-muted font-bold text-sm focus:bg-card transition-all shadow-inner"
 />
 </div>
 {validation.errors.pollBgngYmd ? (
 <p {...validation.messageProps('pollBgngYmd')} className="text-sm text-destructive-emphasis" />
 ) : null}
 </div>
 <div className="space-y-4">
 <label htmlFor="new-poll-end" className="text-xs font-bold text-muted-foreground tracking-widest ml-2 block">종료일 (필수)</label>
 <div className="relative group">
 <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
 <Input
 id="new-poll-end"
 {...validation.fieldProps('pollEndYmd')}
 type="date"
 value={toDateInputValue(newPoll.pollEndYmd)}
 onChange={(e) => {
 validation.clearError('pollEndYmd');
 setNewPoll(prev => ({ ...prev, pollEndYmd: fromDateInputValue(e.target.value) }));
 }}
 required
 className="h-11 pl-14 pr-6 rounded-lg border-none bg-muted font-bold text-sm focus:bg-card transition-all shadow-inner"
 />
 </div>
 {validation.errors.pollEndYmd ? (
 <p {...validation.messageProps('pollEndYmd')} className="text-sm text-destructive-emphasis" />
 ) : null}
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
 {...validation.fieldProps(`pollArticles.${index}.pollArtclNm`)}
 placeholder={`항목 ${index + 1} 내용...`}
 value={item.pollArtclNm}
 onChange={(e) => {
 const value = e.target.value;
 validation.clearError(`pollArticles.${index}.pollArtclNm`);
 setNewPoll(prev => ({
 ...prev,
 pollArticles: (prev.pollArticles || []).map((article, i) =>
 i === index ? { ...article, pollArtclNm: value } : article
 ),
 }));
 }}
 required
 maxLength={100}
 className="h-11 px-6 rounded-lg border-none bg-muted font-bold text-sm focus:bg-card focus:ring-8 focus:ring-primary/5 transition-all shadow-inner tracking-tight"
 />
 {validation.errors[`pollArticles.${index}.pollArtclNm`] ? (
 <p
 {...validation.messageProps(`pollArticles.${index}.pollArtclNm`)}
 className="mt-1 text-sm text-destructive-emphasis"
 />
 ) : null}
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
 disabled={isSaving}
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
 </WorkListPage>
 );
}
