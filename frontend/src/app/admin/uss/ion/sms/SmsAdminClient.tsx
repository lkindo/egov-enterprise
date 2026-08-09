'use client';

import { useCallback, useState } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { smsAdminService, SmsDto } from '@/services/foundation/operation/SmsAdminService';
import { PageResponse } from '@/types/foundation/system';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { MessageSquare,
  Send,
  Search,
  RefreshCcw,
  Plus,
  History,
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
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { format } from 'date-fns';
import { smsSchema } from '@/lib/validation/schemas';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const PAGE_SIZE = 10;

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
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  /** 타이핑마다 서버를 때리지 않도록 300ms 디바운스(감사 P1-8). */
  const debouncedKeyword = useDebouncedValue(searchKeyword, 300);

  const [page, setPage] = useState(() => {
    const raw = Number(searchParams.get('page'));
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  });

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
    queryKey: ['admin-sms', debouncedKeyword, page],
    // 서버는 Spring Pageable(0-base)을 읽는다.
    queryFn: () => smsAdminService.getSmsList({
      searchKeyword: debouncedKeyword || undefined,
      page: page - 1,
      size: PAGE_SIZE,
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
      toast(err instanceof Error ? err.message : '발송에 실패했습니다.', 'error');
    } finally {
      setIsSending(false);
    }
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
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      {/* ⚠ 제목/버튼 문구 3종과 성공 토스트는 e2e POM(e2e/pages/OperationalExtensionPage.ts:61,68,71,73)이
          정확 문자열로 매칭한다. 한글화(P2)는 POM 동시 수정이 필요해 이번 배치에서는 문구를 보존한다. */}
      <PageHeader
        title="메시지 오케스트레이션"
        breadcrumbs={[{ label: '부가서비스' }, { label: '문자 메시지' }]}
      />

      <HubHeader
        title="문자 메시지"
        highlight="발송 관리"
        subtitle="시스템 알림 및 인증 문자 발송 이력을 조회하고 새 메시지를 발송합니다."
        icon={Send}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => refetch()}
              className="h-12 rounded-lg border-2 font-bold text-xs tracking-widest gap-2"
            >
              <RefreshCcw size={16} className={cn(isFetching && "animate-spin")} aria-hidden="true" /> 새로고침
            </Button>
            <Button
              size="lg"
              onClick={() => setIsSendOpen(true)}
              className="h-12 px-8 rounded-lg font-bold text-xs tracking-widest shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all gap-2"
            >
              <Plus size={18} aria-hidden="true" /> 새 메시지 구성
            </Button>
          </div>
        }
      />

      {/*
        종전 지표 카드 3종(ACCUMULATED LOGS / DELIVERY SUCCESS / FAILED ATTEMPTS)은
        같은 total 값을 서로 다른 의미로 두 번 표기하고, 실패 건수는 항상 0(CRITICAL)로 고정돼 있었다.
        산출 근거가 있는 값(총 발송 건수)만 남긴다(감사 P1-5).
      */}
      <div className="flex items-center gap-4 px-2">
        <div className="hub-table-container bg-card px-8 py-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border border-border/10 shadow-inner">
            <History size={22} aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="text-3xl font-bold tracking-tighter text-foreground leading-none tabular-nums">
              {totalCount.toLocaleString()}
            </p>
            <p className="text-xs font-bold text-muted-foreground tracking-widest mt-2 leading-none">총 발송 건수</p>
          </div>
        </div>
      </div>

      {/* Main Stream Area */}
      <HubSectionCard
        title="발송 이력"
        description="시스템에서 처리된 문자 메시지 발송 기록입니다."
        icon={MessageSquare}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
          <div className="text-left">
            <h3 className="text-2xl font-bold tracking-tighter leading-none text-left">발송 로그</h3>
            <p className="text-xs font-bold text-muted-foreground tracking-[0.3em] mt-2 text-left">문자 발송 내역 조회</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group/search flex-1 md:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-40 group-focus-within/search:opacity-100 transition-opacity" size={16} aria-hidden="true" />
              <Input
                placeholder="발신번호 또는 내용 검색..."
                aria-label="문자 발송 이력 검색"
                value={searchKeyword}
                // 검색 시 1페이지로 되돌린다 — 3페이지에서 검색하면 빈 화면이 되던 결함(감사 P1-8).
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  if (page !== 1) goToPage(1);
                }}
                className="h-11 pl-12 pr-6 w-full md:w-[320px] bg-muted border-none rounded-lg text-xs font-bold tracking-widest shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <StandardDataTable<SmsDto>
            columns={columns}
            data={smsList}
            loading={isLoading}
            error={isError ? (error as Error) : null}
            onRetry={() => refetch()}
            keyField="smsId"
            emptyMessage={debouncedKeyword ? `'${debouncedKeyword}' 에 해당하는 발송 내역이 없습니다.` : '발송된 문자 메시지가 없습니다.'}
            className="border-none bg-transparent"
            pagination={{
              currentPage: page,
              totalPages: data?.totalPage || 1,
              totalCount: data?.total,
              pageSize: PAGE_SIZE,
              onPageChange: goToPage,
            }}
          />
        </div>
      </HubSectionCard>

      {/* Send Message Composition Dialog */}
      <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-lg p-0 border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] bg-card/95 backdrop-blur-3xl overflow-hidden relative">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSend)}>
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
                <FormField
                  control={form.control}
                  name="rcptnTelno"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-xs font-bold text-muted-foreground tracking-[0.2em] ml-2 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" aria-hidden="true" />
                        수신 번호
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} aria-hidden="true" />
                          <Input
                            {...field}
                            placeholder="010-0000-0000"
                            className="h-11 pl-16 pr-8 rounded-lg border-none bg-muted text-xl font-bold tabular-nums focus:bg-card focus:ring-8 focus:ring-primary/5 transition-all shadow-inner tracking-wider"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sndngCn"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-xs font-bold text-muted-foreground tracking-[0.2em] ml-2 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" aria-hidden="true" />
                        메시지 내용
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea
                            {...field}
                            placeholder="메시지 내용을 입력하세요..."
                            className="min-h-[180px] p-8 rounded-lg border-none bg-muted text-base font-bold outline-none focus:bg-card focus:ring-8 focus:ring-primary/5 transition-all resize-none shadow-inner leading-relaxed"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs font-bold" />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="p-12 pt-0 relative z-10 gap-4 flex !justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSendOpen(false)}
                  className="h-11 px-10 rounded-lg border-2 border-border font-bold text-xs tracking-widest hover:bg-muted transition-all hover:border-border"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isSending}
                  className="h-11 px-16 bg-surface-inverse border-none text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-[0.3em] shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 flex-1"
                >
                  {isSending ? <RefreshCcw size={18} className="animate-spin" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
                  Execute Send
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
