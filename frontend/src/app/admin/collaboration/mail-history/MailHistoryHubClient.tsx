'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCcw,
 Mail,
 Search,
 Plus,
 Trash2,
 Zap,
 X,
 Clock,
 Layers,
 CheckCircle2,
 AlertTriangle,
 User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { mailService, SentMail, MAIL_SEND_RESULT } from '@/services/business/mail/MailService';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { motion, AnimatePresence } from 'framer-motion';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';

const PAGE_SIZE = 20;

export default function MailHistoryHubClient() {
 const router = useRouter();
 const queryClient = useQueryClient();
 const { toast } = useToast();
 const confirm = useConfirm();
 const [searchKeyword, setSearchKeyword] = useState('');
 const [page, setPage] = useState(1); // 1-base UI 페이지
 // [P1-8] 공용 훅으로 디바운스 — 타이핑 한 글자마다 서버 요청이 나가지 않는다.
 const debouncedKeyword = useDebouncedValue(searchKeyword, 300);

  // --- Data Fetching ---
  const { data: mailData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['mail-history', debouncedKeyword, page],
    queryFn: () => mailService.getSentMails({
      page: page - 1, // ApiService 가 0-base page → pageIndex 로 매핑한다
      size: PAGE_SIZE,
      searchKeyword: debouncedKeyword,
      searchCondition: '1'
    }),
  });
  const mails: SentMail[] = mailData?.list || [];
  const totalCount = mailData?.total ?? 0;
  const totalPages = mailData?.totalPage ?? 0;

  /** 현재 페이지 기준 상태별 건수 — 서버 전체 집계가 아니므로 카드 제목에 그대로 명시한다(P1-5). */
  const pageSuccess = mails.filter(m => m.sndngResultCode === MAIL_SEND_RESULT.SUCCESS).length;
  const pagePending = mails.filter(m => m.sndngResultCode === MAIL_SEND_RESULT.PENDING).length;
  const pageFailure = mails.filter(m => m.sndngResultCode === MAIL_SEND_RESULT.FAILURE).length;

  /** 발송 결과 코드(S/F/P) → 배지 표기. '1' 같은 임의 코드는 서버가 생성하지 않는다. */
  const getSendResultBadge = (code?: string) => {
    switch (code) {
      case MAIL_SEND_RESULT.SUCCESS:
        return { label: '성공', className: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' };
      case MAIL_SEND_RESULT.PENDING:
        return { label: '대기', className: 'bg-amber-500/10 text-amber-600 border border-amber-500/20' };
      case MAIL_SEND_RESULT.FAILURE:
        return { label: '실패', className: 'bg-rose-500/10 text-rose-600 border border-rose-500/20' };
      default:
        return { label: '알 수 없음', className: 'bg-muted text-muted-foreground border border-border' };
    }
  };

  const [selectedMail, setSelectedMail] = useState<SentMail | null>(null);

  // --- Mutations ---
  const deleteMutation = useMutation({
    mutationFn: (id: string) => mailService.deleteMail(id),
    onSuccess: (_data, id) => {
      toast('메일 이력이 삭제되었습니다.', 'success');
      setSelectedMail(prev => (prev?.mssageId === id ? null : prev));
      queryClient.invalidateQueries({ queryKey: ['mail-history'] });
    },
    onError: () => {
      toast('메일 삭제에 실패했습니다.', 'error');
    }
  });

  /** [P1-9] native confirm 대신 useConfirm — 본문에 대상 제목을 노출한다. */
  const handleDelete = useCallback(async (mail: SentMail) => {
    const ok = await confirm({
      title: '메일 이력 삭제',
      message: `'${mail.sj}' 발송 이력을 삭제합니다. 삭제한 이력은 복구할 수 없습니다.`,
      confirmText: '삭제',
      variant: 'destructive',
    });
    if (ok) deleteMutation.mutate(mail.mssageId);
  }, [confirm, deleteMutation]);

  const handleSearchChange = (value: string) => {
    setSearchKeyword(value);
    setPage(1); // [P1-8] 3페이지에서 검색해 빈 화면이 되는 결함 방지
  };

 const columns: Column<SentMail>[] = [
 {
 header: '번호',
 accessor: (_, index) => (
 <span className="font-mono text-xs font-bold text-muted-foreground">
 {((index ?? 0) + 1 + (page - 1) * PAGE_SIZE).toString().padStart(2, '0')}
 </span>
 ),
 className: 'w-20 text-center'
 },
 {
 header: '메일 제목',
 accessor: (mail) => (
 <div className="flex flex-col gap-1 py-1">
 <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
 {mail.sj}
 </span>
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
 ID: {mail.mssageId}
 </span>
 </div>
 )
 },
 {
 header: '수신자',
 accessor: (mail) => (
 <span className="text-xs font-bold text-muted-foreground tracking-tight">{mail.recptnPerson}</span>
 ),
 className: 'w-40'
 },
 {
 header: '발송 일시',
 accessor: (mail) => (
 <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">
 {mail.sndngDe}
 </span>
 ),
 className: 'w-48'
 },
 {
 header: '발송 상태',
 accessor: (mail) => (
 <div className={cn(
 "inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-black tracking-widest",
 getSendResultBadge(mail.sndngResultCode).className
 )}>
 {getSendResultBadge(mail.sndngResultCode).label}
 </div>
 ),
 className: 'w-32 text-center'
 },
 {
 header: '관리',
 accessor: (mail) => (
 <div className="flex items-center justify-end gap-2 pr-4">
 <Button
   variant="ghost"
   size="icon"
   data-testid="delete-mail-btn"
   aria-label={`${mail.sj} 발송 이력 삭제`}
   onClick={(e) => { e.stopPropagation(); void handleDelete(mail); }}
   className="w-10 h-10 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
 >
   <Trash2 size={16} />
 </Button>
 </div>
 ),
 className: 'w-24 text-right'
 }
 ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
  <PageHeader
  title="메일 발신 이력 관리"
  breadcrumbs={[{ label: '협업관리' }, { label: '메시징' }, { label: '발신이력' }]}
  />

  <HubHeader
  title="Dispatch"
  highlight="History"
  subtitle="시스템에서 발송된 모든 메일 이력 및 전송 상태를 추적합니다."
  icon={Mail}
  actions={
  <div className="flex gap-4">
  <Button
  variant="outline"
  aria-label="발신 이력 새로고침"
  onClick={() => { void refetch(); }}
  className="h-11 w-14 rounded-xl bg-card border-2 border-border text-muted-foreground hover:text-primary transition-all shadow-sm"
  >
  <RefreshCcw size={20} />
  </Button>
  <Button
  onClick={() => router.push('/admin/collaboration/mail-send')}
  className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl"
  >
  <Plus size={20} /> 신규 발송
  </Button>
  </div>
  }
  />

  <HubMetricGrid>
  <HubMetricCard title="전체 발신 이력" value={isError ? '조회 실패' : totalCount} icon={Layers} color="primary" status="총 건수" />
  <HubMetricCard title="성공 (현재 페이지)" value={pageSuccess} icon={CheckCircle2} color="emerald" status={`${PAGE_SIZE}건 단위`} />
  <HubMetricCard title="대기 (현재 페이지)" value={pagePending} icon={Clock} color="amber" status={`${PAGE_SIZE}건 단위`} />
  <HubMetricCard title="실패 (현재 페이지)" value={pageFailure} icon={AlertTriangle} color="rose" status={`${PAGE_SIZE}건 단위`} />
  </HubMetricGrid>

  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
    <div className={cn("transition-all duration-500", selectedMail ? "lg:col-span-7" : "lg:col-span-12")}>
      <HubSectionCard
      title="발신 로그 목록"
      description="메일 전송 상세 로그입니다."
      icon={Mail}
      className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
      >
      <div className="space-y-8">
      <div className="flex items-center justify-between px-2 pt-2 border-b border-border/50 pb-10 mb-8">
        <div className="relative group max-w-xl w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
          <Input
            aria-label="메일 검색"
            value={searchKeyword}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-11 bg-muted/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
            placeholder="메일 제목 또는 수신자 검색.."
          />
        </div>
      </div>

      <div className="min-h-[500px]">
      <StandardDataTable<SentMail>
      columns={columns}
      data={mails}
      keyField="mssageId"
      loading={isLoading}
      error={isError ? (error as Error) : null}
      onRetry={() => { void refetch(); }}
      onRowClick={(item) => setSelectedMail(item)}
      emptyMessage="발신 이력이 없습니다."
      isPremium={true}
      rowTestId="mail-item"
      className="border-none bg-transparent shadow-none"
      pagination={{
        currentPage: page,
        totalPages,
        onPageChange: setPage,
        totalCount,
        pageSize: PAGE_SIZE,
      }}
      />
      </div>
      </div>
      </HubSectionCard>
    </div>

    <AnimatePresence mode="wait">
      {selectedMail && (
        <motion.div
          key="detail-active"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="lg:col-span-5"
        >
          <HubSectionCard
            title="발신 상세"
            description="선택한 메일의 발송 정보입니다."
            icon={Zap}
            className="bg-surface-inverse text-surface-inverse-foreground border-none shadow-2xl h-full sticky top-8"
          >
            <div className="space-y-10">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <span className="text-[10px] font-black tracking-[0.3em] text-primary">발송 정보</span>
                  <h3 className="text-2xl font-bold tracking-tighter text-surface-inverse-foreground">{selectedMail.sj}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="상세 패널 닫기"
                  onClick={() => setSelectedMail(null)}
                  className="text-white/40 hover:text-white hover:bg-white/10"
                >
                  <X size={20} />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-white/40">
                    <User size={14} />
                    <span className="text-[10px] font-bold tracking-widest">수신자</span>
                  </div>
                  <p className="text-sm font-bold text-surface-inverse-foreground">{selectedMail.recptnPerson}</p>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-white/40">
                    <Clock size={14} />
                    <span className="text-[10px] font-bold tracking-widest">발송 일시</span>
                  </div>
                  <p className="text-sm font-bold text-surface-inverse-foreground">{selectedMail.sndngDe}</p>
                </div>
              </div>

              {/*
                본문(emlCn)은 목록 응답에 포함되지 않는다. 상세 조회 API 는 발신자 스코핑이 없어
                (감사 F-2) 백엔드 인가 보강 전까지 본문을 화면에 끌어오지 않는다.
                근거 없는 "암호화된 본문" 문구도 표기하지 않는다(P1-5).
              */}
              <div className="p-8 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                  <Layers className="text-primary" size={18} />
                  <span className="text-xs font-bold text-white/40 tracking-tight">발송 상태</span>
                </div>
                <div className={cn(
                  "inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-black tracking-widest",
                  getSendResultBadge(selectedMail.sndngResultCode).className
                )}>
                  {getSendResultBadge(selectedMail.sndngResultCode).label}
                </div>
                <p className="text-xs text-white/50 leading-relaxed font-medium">
                  메일 본문 조회는 현재 제공되지 않습니다.
                </p>
              </div>

              <div className="flex gap-4 pt-6">
                <Button
                  variant="destructive"
                  data-testid="delete-mail-btn"
                  aria-label={`${selectedMail.sj} 발송 이력 삭제`}
                  onClick={() => { void handleDelete(selectedMail); }}
                  className="flex-1 h-12 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs tracking-widest transition-all shadow-xl"
                >
                  <Trash2 size={16} className="mr-2" /> 이력 삭제
                </Button>
              </div>
            </div>
          </HubSectionCard>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
  </div>
  );
}
