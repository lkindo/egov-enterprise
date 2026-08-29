'use client';

import { useCallback, useRef, useState } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { smsAdminService, SmsDto } from '@/services/foundation/operation/SmsAdminService';
import { PageResponse } from '@/types/foundation/system';
import { Send,
  RefreshCcw,
  Plus,
  Phone,
  Calendar,
  AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { format } from 'date-fns';
import { smsSchema } from '@/lib/validation/schemas';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormErrorSummary,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const smsValidationLabels: Record<string, string> = {
  sndngTelno: '발신 번호',
  rcptnTelno: '수신 번호',
  sndngCn: '메시지 내용',
};

/** 페이지당 건수 기본값(A1 필수 — 사용자가 바꿀 수 있다). URL 에는 싣지 않는다. */
const DEFAULT_PAGE_SIZE = 10;

/** 발송 일시 표시. 서버 필드는 crtDt(LocalDateTime)다. */
function formatSentAt(value?: string): { date: string; time: string } {
  if (!value) return { date: '-', time: '' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: '-', time: '' };
  return { date: format(parsed, 'yyyy.MM.dd'), time: format(parsed, 'HH:mm:ss') };
}

export default function SmsAdminClient({
  initialSmsList
}: {
  /** 서버 프리페치 결과. 실패 시 null 이며, 그때는 클라이언트 쿼리가 실패를 그대로 노출한다. */
  initialSmsList: PageResponse<SmsDto> | null
}) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isSending, setIsSending] = useState(false);
  const sendPendingRef = useRef(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  /**
   * 검색 축. 서버가 해석하는 값은 둘뿐이다 — '0' 수신전화번호(rcptnTelno), '1' 전송내용(sndngCn).
   * (SmsRepositoryImpl.searchExpression) 그 밖의 값은 필터 없음이 되므로 화면도 둘만 제공한다.
   */
  const [searchCondition, setSearchCondition] = useState<'0' | '1'>('1');
  /** 타이핑마다 서버를 때리지 않도록 300ms 디바운스(감사 P1-8). */
  const debouncedKeyword = useDebouncedValue(searchKeyword, 300);

  const [page, setPage] = useState(() => {
    const raw = Number(searchParams.get('page'));
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  });
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  /** 페이지는 URL 에 반영한다 — 새로고침·공유·뒤로가기 복원(감사 P1-7). */
  const goToPage = useCallback((next: number) => {
    setPage(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-sms', searchCondition, debouncedKeyword, page, pageSize],
    // 서버는 Spring Pageable(0-base)을 읽는다.
    queryFn: () => smsAdminService.getSmsList({
      // [2026-08-29] searchCondition 을 함께 보낸다.
      //   종전에는 키워드만 보냈는데, 서버의 SmsRepositoryImpl.searchExpression 은 조건이
      //   '0'(수신전화번호)·'1'(전송내용) 이 아니면 **null(= 필터 없음)** 을 돌려준다. 즉
      //   무엇을 입력해도 전체 목록이 그대로 나왔고, 화면은 그것을 검색 결과처럼 보여 줬다.
      //   관리자는 "그 번호로 보낸 이력이 이만큼" 이라고 잘못 읽는다.
      searchCondition: debouncedKeyword ? searchCondition : undefined,
      searchKeyword: debouncedKeyword || undefined,
      page: page - 1,
      size: pageSize,
    }),
    initialData: (page === 1 && !debouncedKeyword) ? (initialSmsList ?? undefined) : undefined,
  });

  const smsList = data?.list ?? [];
  const totalCount = data?.total ?? 0;

  // Send SMS Form
  const form = useAppForm(smsSchema, {
    defaultValues: {
      sndngTelno: '02-1234-5678', // 발신번호 (기본값)
      rcptnTelno: '',
      sndngCn: ''
    }
  });

  const handleSend = async (values: z.infer<typeof smsSchema>) => {
    if (sendPendingRef.current) return;
    sendPendingRef.current = true;
    setIsSending(true);
    try {
      // 백엔드 SmsDto 는 최상위 rcptnTelno 를 받지 않는다 — 수신자는 recipients 배열로 전달해야
      // SmsService 가 수신자 행을 만들고 비동기 발송을 기동한다. 종전에는 top-level 로 보내
      // ignoreUnknown 에 의해 조용히 버려졌고, 수신자 0명인 발송 이력만 남았다.
      await smsAdminService.sendSms({
        sndngTelno: values.sndngTelno,
        sndngCn: values.sndngCn,
        recipients: [{ rcptnTelno: values.rcptnTelno }],
      });
      /*
       * 종전 문구 '문자 메시지를 발송했습니다.' 는 사실이 아니었다. 이 응답은 **접수**일 뿐이고
       * 실제 전달은 SmsAsyncProcessor 가 비동기로 수행한다. 게다가 SmsSender 구현체는
       * LoggingSmsSender(!prod)·UnavailableSmsSender(prod) 둘뿐이고 **둘 다 항상 false 를
       * 반환**해, 재시도 3회를 소진한 뒤 전 수신자가 rsltCd='F' 로 확정된다. 즉 초록 토스트를
       * 보고 문자가 나갔다고 믿은 관리자가 실제로는 한 통도 못 보낸 상태였다.
       */
      toast('발송 요청을 접수했습니다. 전달 결과는 목록의 ‘수신자 결과’에서 확인하세요.', 'info');
      setIsSendOpen(false);
      form.reset();
      refetch();
    } catch (err) {
      if (!form.applyServerErrors(err)) {
        toast(extractErrorMessage(err, '발송에 실패했습니다.'), 'error');
      }
    } finally {
      sendPendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleOpenSend = () => {
    form.reset();
    setIsSendOpen(true);
  };

  /**
   * 수신자별 전달 결과. 발송 이력 목록에는 rsltCd 가 없어(수신자 테이블에만 있다) 결과를
   * 판정할 수 없다 — 그래서 종전의 '상태' 열이 전 행을 '전송완료'로 칠했고 지금은 제거돼 있다.
   * 대신 이미 존재하던 GET /{smsTrsmSn}/recipients 를 화면에 연결해 실제 결과를 드러낸다.
   */
  const [recipientTarget, setRecipientTarget] = useState<SmsDto | null>(null);
  const {
    data: recipientRows,
    isFetching: recipientsLoading,
    error: recipientsError,
    refetch: refetchRecipients,
  } = useQuery({
    queryKey: ['sms-recipients', recipientTarget?.smsTrsmSn],
    enabled: recipientTarget?.smsTrsmSn != null,
    queryFn: () => smsAdminService.getSmsRecipients(recipientTarget!.smsTrsmSn as number),
  });

  /** 이 엔드포인트는 배열을 그대로 돌려준다. 형태가 달라져도 화면 전체가 죽지 않게 좁힌다. */
  const recipientList = Array.isArray(recipientRows) ? recipientRows : [];

  const handleSendOpenChange = (open: boolean) => {
    if (!open && sendPendingRef.current) return;
    setIsSendOpen(open);
  };

  const columns: Column<SmsDto>[] = [
    {
      header: '발송 일시',
      accessor: (item: SmsDto) => {
        // 종전 코드는 백엔드에 존재하지 않는 trnsmitPnttm 을 읽어 전건 'N/A' 였다.
        const { date, time } = formatSentAt(item.crtDt);
        return (
          <div className="flex items-center gap-4 py-2">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border shadow-inner">
              <Calendar size={16} aria-hidden="true" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-mono font-bold text-foreground tracking-tighter leading-none">{date}</span>
              {time && <span className="text-xs font-bold text-muted-foreground mt-1 tracking-widest">{time}</span>}
            </div>
          </div>
        );
      }
    },
    {
      header: '발신 번호',
      accessor: (item: SmsDto) => (
        <div className="flex items-center gap-3">
          <Phone size={14} className="text-primary opacity-50" aria-hidden="true" />
          <span className="font-bold text-foreground tracking-tighter">{item.sndngTelno || '-'}</span>
        </div>
      )
    },
    {
      header: '메시지 내용',
      accessor: (item: SmsDto) => (
        <div className="max-w-[450px] truncate font-bold text-muted-foreground tracking-tight text-left">
          {item.sndngCn || '-'}
        </div>
      )
    },
    // 종전의 '상태' 열은 데이터와 무관하게 전 행을 '전송완료'로 칠했다.
    // 실제 결과 코드(rsltCd)는 수신자별 상세(/recipients)에만 있어 목록에서는 판정할 수 없다 → 열을 제거했다(감사 P1-5).
    // 대신 그 상세를 여는 경로를 붙인다 — 결과를 볼 방법이 아예 없으면 '접수했다'는 안내도 확인할 수 없다.
    {
      header: '전달 결과',
      className: 'w-36',
      accessor: (item: SmsDto) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRecipientTarget(item)}
          disabled={item.smsTrsmSn == null}
        >
          수신자 결과
        </Button>
      )
    }
  ];

  /** 서버 결과 코드(SmsService 'P' 초기값, SmsAsyncProcessor 'S'/'F')를 사용자 어휘로 옮긴다. */
  const describeResult = (rsltCd?: string | null): { label: string; tone: string } => {
    if (rsltCd === 'S') return { label: '전달 완료', tone: 'text-success-emphasis' };
    if (rsltCd === 'F') return { label: '전달 실패', tone: 'text-destructive-emphasis' };
    if (rsltCd === 'P') return { label: '대기 중', tone: 'text-muted-foreground' };
    return { label: rsltCd || '알 수 없음', tone: 'text-muted-foreground' };
  };

  return (
    <WorkListPage
        title="문자 메시지 발송 관리"
        description="시스템 알림·인증 문자 발송 이력을 조회하고 새 메시지를 발송합니다."
        breadcrumbItems={[{ label: '부가서비스' }, { label: '문자 메시지' }]}
        filterStateKey="uss-sms"
        totalCount={isError ? undefined : totalCount}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCcw size={16} className={cn(isFetching && "animate-spin")} aria-hidden="true" /> 새로고침
            </Button>
            <Button size="sm" onClick={handleOpenSend} className="gap-2">
              <Plus size={16} aria-hidden="true" /> 새 메시지 구성
            </Button>
          </>
        }
        filter={
          <div className="min-w-60 max-w-xl space-y-1">
            {/*
              [2026-08-29] 라벨을 '발신번호 · 내용' 에서 실제 검색 축으로 고친다.
              서버가 번호로 거르는 축은 **수신**전화번호(rcptnTelno)이고 발신번호로 거르는
              경로는 없다. 한 번에 한 축만 보낼 수 있으므로 축을 고르게 한다 — 두 축을 한
              키워드로 OR 하려면 서버 술어를 바꿔야 하고, 그건 이 수정의 범위 밖이다.
            */}
            <label htmlFor="sms-search-condition" className="text-[length:var(--font-size-body)] font-medium">
              조회 조건
            </label>
            <div className="flex gap-2">
              <select
                id="sms-search-condition"
                aria-label="문자 발송 이력 검색 조건"
                className="h-[var(--control-h)] rounded-[var(--radius-control)] border border-border bg-card px-2 text-[length:var(--font-size-body)]"
                value={searchCondition}
                onChange={(e) => {
                  setSearchCondition(e.target.value as '0' | '1');
                  if (page !== 1) goToPage(1);
                }}
              >
                <option value="1">내용</option>
                <option value="0">수신번호</option>
              </select>
            <Input
              id="sms-search"
              placeholder={searchCondition === '0' ? '수신번호 검색' : '전송 내용 검색'}
              aria-label="문자 발송 이력 검색어"
              value={searchKeyword}
              // 검색 시 1페이지로 되돌린다 — 3페이지에서 검색하면 빈 화면이 되던 결함(감사 P1-8).
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                if (page !== 1) goToPage(1);
              }}
            />
            </div>
          </div>
        }
      >
        {/*
          [2026-08-28] 게이트웨이 미연동을 **보내기 전에** 고지한다.

          전송 구현체는 두 프로필 모두 무조건 실패를 돌려준다 —
          LoggingSmsSender(@Profile("!prod"))·UnavailableSmsSender(@Profile("prod")) 가
          각각 return false 다. 즉 이 화면에서 누르는 발송은 **100% 실패가 확정**돼 있다.
          그런데 화면은 아무 사전 고지 없이 작성·발송을 유도했고, 관리자는 인증 문자를 다 쓴
          뒤에야 결과를 뒤져 실패를 알게 됐다.

          이 문구는 위 두 구현체와 양방향으로 결속돼 있다(sms-gateway-disclosure 계약) —
          실제 게이트웨이 sender 가 생기면 계약이 red 가 되어 이 배너를 걷어내게 한다.
        */}
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-5 py-4"
        >
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning-emphasis" aria-hidden="true" />
          <div className="text-xs font-bold leading-relaxed text-foreground space-y-1">
            <p>문자 게이트웨이가 연동되어 있지 않아 지금은 문자가 실제로 발송되지 않습니다.</p>
            <p className="font-normal">
              발송을 누르면 요청은 이력에 남지만 전달 결과는 ‘실패’로 기록됩니다. 아래 목록의 ‘수신자 결과’에서 확인할 수 있습니다.
            </p>
          </div>
        </div>

        <StandardDataTable<SmsDto>
          accessibleLabel="문자 발송 이력"
          columns={columns}
          data={smsList}
          loading={isLoading}
          error={isError ? (error as Error) : null}
          onRetry={() => refetch()}
          keyField="smsTrsmSn"
          emptyMessage={emptyResultMessage(debouncedKeyword, '발송된 문자 메시지가 없습니다.')}
          pagination={{
            currentPage: page,
            totalPages: data?.totalPage || 1,
            pageSize,
          onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
            onPageChange: goToPage,
          }}
        />

      {/* Send Message Composition Dialog */}
      <Dialog open={isSendOpen} onOpenChange={handleSendOpenChange}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto rounded-lg p-0 border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] bg-card/95 backdrop-blur-3xl relative">
          <Form {...form}>
            <form
              noValidate
              onSubmit={(event) => {
                void form.handleSubmit(handleSend)(event);
              }}
            >
              <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-primary/10 blur-[80px] rounded-lg pointer-events-none" />

              <DialogHeader className="p-12 pb-0 space-y-6 relative z-10">
                <div className="w-20 h-11 bg-surface-inverse text-surface-inverse-foreground rounded-lg flex items-center justify-center shadow-2xl shadow-primary/30 mx-auto transition-transform hover:rotate-12 duration-500 border-4 border-white/20">
                  <Send size={32} aria-hidden="true" />
                </div>
                <div className="text-center space-y-2">
                  <DialogTitle className="text-4xl font-bold text-foreground tracking-tighter leading-none">메시지 작성</DialogTitle>
                  <DialogDescription className="text-xs font-bold tracking-[0.4em] text-muted-foreground">
                    발송할 문자 메시지를 구성합니다
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="p-12 space-y-10 relative z-10 text-left">
                <FormErrorSummary labels={smsValidationLabels} onNavigate={form.focusError} />
                <FormField
                  control={form.control}
                  name="rcptnTelno"
                  required
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-xs font-bold text-muted-foreground tracking-[0.2em] ml-2 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" aria-hidden="true" />
                        수신 번호
                      </FormLabel>
                      <div className="relative group">
                        <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} aria-hidden="true" />
                        <FormControl>
                          <Input
                            {...field}
                            inputMode="tel"
                            maxLength={20}
                            placeholder="010-0000-0000"
                            className="h-11 pl-16 pr-8 rounded-lg border-none bg-muted text-xl font-bold tabular-nums focus:bg-card focus:ring-8 focus:ring-primary/5 transition-all shadow-inner tracking-wider"
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-xs font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sndngCn"
                  required
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-xs font-bold text-muted-foreground tracking-[0.2em] ml-2 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" aria-hidden="true" />
                        메시지 내용
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Textarea
                            {...field}
                            maxLength={80}
                            placeholder="메시지 내용을 입력하세요..."
                            className="min-h-[180px] p-8 rounded-lg border-none bg-muted text-base font-bold outline-none focus:bg-card focus:ring-8 focus:ring-primary/5 transition-all resize-none shadow-inner leading-relaxed"
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-xs font-bold" />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="p-12 pt-0 relative z-10 gap-4 flex !justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSendOpenChange(false)}
                  disabled={isSending || form.formState.isSubmitting}
                  className="h-11 px-10 rounded-lg border-2 border-border font-bold text-xs tracking-widest hover:bg-muted transition-all hover:border-border"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isSending || form.formState.isSubmitting}
                  aria-busy={isSending || form.formState.isSubmitting}
                  className="h-11 px-16 bg-surface-inverse border-none text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-[0.3em] shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 flex-1"
                >
                  {isSending ? <RefreshCcw size={18} className="animate-spin" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
                  {isSending ? '발송 중…' : '발송'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 수신자별 전달 결과 — 발송 이력 목록에는 rsltCd 가 없어 여기서만 실제 결과를 볼 수 있다. */}
      {recipientTarget !== null && (
      <Dialog open onOpenChange={(open) => { if (!open) setRecipientTarget(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>수신자 전달 결과</DialogTitle>
            <DialogDescription>
              발송 요청은 접수 즉시 응답하고 전달은 비동기로 이뤄집니다. 아래가 수신자별 실제 결과입니다.
            </DialogDescription>
          </DialogHeader>

          {recipientsError ? (
            <div className="space-y-3 py-4">
              <p className="text-sm font-medium text-destructive-emphasis">수신자 결과를 불러오지 못했습니다.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetchRecipients()}>
                다시 시도
              </Button>
            </div>
          ) : recipientsLoading ? (
            <p className="py-6 text-sm text-muted-foreground">불러오는 중…</p>
          ) : recipientList.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">이 발송에 기록된 수신자가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-border py-2">
              {recipientList.map((recipient) => {
                const result = describeResult(recipient.rsltCd);
                return (
                  <li key={recipient.rcptnTelno} className="flex items-start justify-between gap-4 py-3">
                    <span className="font-mono text-sm font-bold text-foreground">{recipient.rcptnTelno}</span>
                    <span className="text-right">
                      <span className={cn('block text-sm font-bold', result.tone)}>{result.label}</span>
                      {recipient.rsltMsg && (
                        <span className="block text-xs text-muted-foreground">{recipient.rsltMsg}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <DialogFooter>
            {/*
              [2026-08-28] 성공 경로에도 새로고침을 둔다.

              전달은 비동기다(SmsAsyncProcessor 가 재시도 3회 뒤 결과를 쓴다). 그런데 전역
              staleTime 이 60초·refetchOnWindowFocus 가 false 라, 발송 직후 이 창을 열면
              '대기 중'이 뜨고 **그 뒤 60초 동안은 닫았다 다시 열어도 재조회되지 않는다** —
              토스트가 시키는 대로 결과를 보러 와도 실제 '전달 실패'를 볼 수 없었다.
              종전에는 '다시 시도' 가 오류 분기 전용이라 이 경로에 새로고침이 아예 없었다.
            */}
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetchRecipients()}
              disabled={recipientsLoading}
              aria-busy={recipientsLoading || undefined}
              className="gap-2"
            >
              <RefreshCcw size={16} className={cn(recipientsLoading && 'animate-spin')} aria-hidden="true" />
              결과 새로고침
            </Button>
            <Button type="button" variant="outline" onClick={() => setRecipientTarget(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </WorkListPage>
  );
}
