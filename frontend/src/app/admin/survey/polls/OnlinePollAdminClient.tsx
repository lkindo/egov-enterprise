'use client';

import { useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
// [2026-09-06 DEC-OPS-041] 관리 화면도 /api/v1/polls 를 쓴다 — 같은 서비스를 감싸던 /admin/system/polls 컨트롤러는 제거됐다.
import { pollUserService } from '@/services/business/user/poll/PollUserService';
import type { OnlinePollDto } from '@/types/business/poll';
import {
 Vote,
 Plus,
 Zap,
 RefreshCcw,
 XCircle,
 Trash2,
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
} from '@/lib/format-date';
import { useTodayStorageYmd } from '@/lib/hooks/use-today-ymd';
import { getPollStatus, POLL_STATUS_LABEL, type PollStatus } from '@/lib/poll-status';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { adminPollFormSchema } from '../manage/poll-form-validation';
import { pickAllowedParams } from '@/lib/navigation/allowlist-params';

/**
 * 이 라우트가 URL 에 싣는 쿼리 키 전수. 페이지 하나만 읽는다.
 *
 * 종전에는 들어온 쿼리를 통째로 복사해 재발행했다 — 모르는 이름이 한 번 들어오면 이동마다
 * 다시 붙는 캐리어였다(DEC-OPS-029 Q2). 새 파라미터를 도입하면 이 목록에 함께 넣어야 하고,
 * 빠뜨리면 이동 시 조용히 사라진다.
 */
const LIST_PARAM_KEYS = ['page'] as const;

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
 const params = pickAllowedParams(searchParams, LIST_PARAM_KEYS);
 if (next <= 0) params.delete('page');
 else params.set('page', String(next));
 const query = params.toString();
 router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
 };

 // [2026-09-26 DIP C9] 검색어는 `조회`/Enter 로 적용된 값이다(카탈로그 G2). 종전에는 타이핑을 디바운스해 조회했다.
 const [keyword, setKeyword] = useState('');

 const [isAddOpen, setIsAddOpen] = useState(false);
 const [isSaving, setIsSaving] = useState(false);

 // 기간 기준일. 저장 포맷과 동일한 'yyyyMMdd' 문자열로 비교해야 상태 판정이 맞는다.
 const todayYmd = useTodayStorageYmd();

 const { data, isLoading, isError, error, refetch } = useQuery({
 queryKey: ['admin-online-polls', page, keyword, pageSize],
 queryFn: () => pollUserService.getPollList({ searchKeyword: keyword, page, size: pageSize }),
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
 await pollUserService.createPoll(validated);
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
 <div className="flex items-center gap-2">
 <Vote size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
 <div className="min-w-0">
 <span className="block text-[length:var(--font-size-body)] font-medium text-foreground">{item.pollNm}</span>
 <span className="text-xs tabular-nums text-muted-foreground">설문 SN: {item.pollSn}</span>
 </div>
 </div>
 )
 },
 {
 header: '기간',
 accessor: (item) => (
 <span className="text-[length:var(--font-size-body)] tabular-nums text-muted-foreground">
 {toDisplayYmd(item.pollBgngYmd)} <span className="mx-1">~</span> {toDisplayYmd(item.pollEndYmd)}
 </span>
 )
 },
 {
 header: '참여 수',
 accessor: (item) => {
 const totalVotes = totalVotesOf(item);
 const ratio = maxVotesOnPage > 0 ? (totalVotes / maxVotesOnPage) * 100 : 0;
 return (
 <div className="flex min-w-40 items-center gap-2">
 {/* 막대는 '현재 페이지 최다 득표 대비' 상대치다(절대 목표치가 없으므로 백분율로 표기하지 않는다). */}
 <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
 <div className="h-full rounded bg-primary" style={{ width: `${ratio}%` }} />
 </div>
 <span className="shrink-0 text-[length:var(--font-size-body)] tabular-nums text-foreground">{totalVotes.toLocaleString()}</span>
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
 <span className={cn(
 "inline-flex w-fit items-center gap-1.5 rounded border px-1.5 py-0.5 text-xs",
 status === 'active' && "border-success/40 bg-success/15 text-foreground",
 status === 'scheduled' && "border-warning/40 bg-warning/15 text-foreground",
 status === 'unknown' && "border-destructive/40 bg-destructive/10 text-foreground",
 (status === 'closed' || status === 'suspended') && "border-border bg-muted text-muted-foreground"
 )}>
 {status === 'active' && <Zap size={12} aria-hidden="true" />}
 {status === 'scheduled' && <Clock size={12} aria-hidden="true" />}
 {(status === 'closed' || status === 'suspended' || status === 'unknown') && <XCircle size={12} aria-hidden="true" />}
 {POLL_STATUS_LABEL[status]}
 </span>
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
 <KeywordFilter
 label="설문명"
 placeholder="설문명으로 검색"
 value={keyword}
 onSearch={handleKeywordChange}
 />
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
 <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-lg bg-card p-6">

 <DialogHeader className="space-y-1">
 <DialogTitle className="text-base font-bold tracking-tight text-foreground">신규 설문 등록</DialogTitle>
 <DialogDescription className="text-[length:var(--font-size-body)] text-muted-foreground">
 설문명·기간·선택 항목을 입력하세요
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-4">
 <FormErrorSummary
 errors={validation.errors}
 labels={validationLabels}
 onNavigate={(name) => { validation.focusError(name); }}
 />
 <section className="space-y-1.5">
 <label htmlFor="new-poll-name" className="block text-[length:var(--font-size-body)] font-medium text-foreground">
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
 className="text-[length:var(--font-size-body)]"
 />
 {validation.errors.pollNm ? (
 <p {...validation.messageProps('pollNm')} className="text-sm text-destructive-emphasis" />
 ) : null}
 </section>

 <section className="grid grid-cols-2 gap-[var(--form-gap)]">
 <div className="space-y-1.5">
 <label htmlFor="new-poll-begin" className="block text-[length:var(--font-size-body)] font-medium text-foreground">시작일 (필수)</label>
 <div className="relative">
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
 className="text-[length:var(--font-size-body)]"
 />
 </div>
 {validation.errors.pollBgngYmd ? (
 <p {...validation.messageProps('pollBgngYmd')} className="text-sm text-destructive-emphasis" />
 ) : null}
 </div>
 <div className="space-y-1.5">
 <label htmlFor="new-poll-end" className="block text-[length:var(--font-size-body)] font-medium text-foreground">종료일 (필수)</label>
 <div className="relative">
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
 className="text-[length:var(--font-size-body)]"
 />
 </div>
 {validation.errors.pollEndYmd ? (
 <p {...validation.messageProps('pollEndYmd')} className="text-sm text-destructive-emphasis" />
 ) : null}
 </div>
 </section>

 <section className="space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-[length:var(--font-size-body)] font-medium text-foreground">
 선택 항목
 </span>
 <button
 type="button"
 onClick={handleAddItem}
 className="inline-flex h-[var(--control-h-sm)] items-center gap-1.5 rounded-md border border-border px-3 text-[length:var(--font-size-body)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
 >
 <Plus size={14} aria-hidden="true" /> 항목 추가
 </button>
 </div>
 <div className="space-y-2">
 {newPoll.pollArticles?.map((item, index) => (
 <div
 key={index}
 className="flex items-center gap-2"
 >
 <div className="flex w-14 shrink-0 items-center gap-1 text-[length:var(--font-size-body)] text-muted-foreground">
 <span>항목</span>
 <span className="tabular-nums text-foreground">{String(index + 1).padStart(2, '0')}</span>
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
 className="text-[length:var(--font-size-body)]"
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
 size="icon-sm"
 onClick={() => handleRemoveItem(index)}
 aria-label={`선택 항목 ${index + 1} 삭제`}
 className="shrink-0 text-destructive-emphasis hover:bg-destructive/10 hover:text-destructive-emphasis"
 >
 <Trash2 size={14} aria-hidden="true" />
 </Button>
 )}
 </div>
 ))}
 </div>
 </section>
 </div>

 <DialogFooter className="mt-4 gap-2">
 <Button
 variant="outline"
 onClick={() => setIsAddOpen(false)}
 disabled={isSaving}
 >
 취소
 </Button>
 <Button
 onClick={handleAdd}
 disabled={isSaving}
 >
 {isSaving ? <RefreshCcw size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
 {isSaving ? '등록 중…' : '설문 등록'}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </WorkListPage>
 );
}
