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
  Calendar } from 'lucide-react';
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
    queryKey: ['admin-sms', debouncedKeyword, page, pageSize],
    // 서버는 Spring Pageable(0-base)을 읽는다.
    queryFn: () => smsAdminService.getSmsList({
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
      toast('문자 메시지를 발송했습니다.', 'success');
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
    }
    // 종전의 '상태' 열은 데이터와 무관하게 전 행을 '전송완료'로 칠했다.
    // 실제 결과 코드(rsltCd)는 수신자별 상세(/recipients)에만 있어 목록에서는 판정할 수 없다 → 열을 제거했다(감사 P1-5).
  ];

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
            <label htmlFor="sms-search" className="text-[length:var(--font-size-body)] font-medium">
              발신번호 · 내용
            </label>
            <Input
              id="sms-search"
              placeholder="발신번호 또는 내용 검색"
              aria-label="문자 발송 이력 검색"
              value={searchKeyword}
              // 검색 시 1페이지로 되돌린다 — 3페이지에서 검색하면 빈 화면이 되던 결함(감사 P1-8).
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                if (page !== 1) goToPage(1);
              }}
            />
          </div>
        }
      >
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
        <DialogContent className="sm:max-w-[550px] rounded-lg p-0 border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] bg-card/95 backdrop-blur-3xl overflow-hidden relative">
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
    </WorkListPage>
  );
}
