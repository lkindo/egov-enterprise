'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  Activity,
  Search,
  RefreshCcw,
  ShieldAlert,
  Terminal,
  Database,
  SearchCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { ErrorStateDisplay } from '@/app/components/ui/status-displays';
import { PagePagination } from '@/components/common/PagePagination';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { auditAdminService, AuditLog } from '@/services/foundation/system/AuditAdminService';
import { usePageParam } from '@/app/admin/system/logs/use-log-url-state';
import { TimelineItem } from './TimelineItem';

const PAGE_SIZE = 20;

const EXPORT_HEADERS = [
  { label: '시스템 로그 일련번호', key: 'sysLogSn' },
  { label: '요청ID', key: 'dmndId' },
  { label: '발생일자', key: 'ocrnYmd' },
  { label: '서비스명', key: 'srvcNm' },
  { label: '메소드명', key: 'methodNm' },
  { label: '처리구분', key: 'prcsSeCd' },
  { label: '처리시간(ms)', key: 'prcsTm' },
  { label: '요청자ID', key: 'dmndUserId' },
  { label: '요청자IP', key: 'rqesterIp' },
];

export function AuditTimelineClient() {
  const [searchKeyword, setSearchKeyword] = useState('');
  // 타이핑 한 글자마다 서버 요청이 나가던 것을 300ms 디바운스로 억제한다(공용 훅 재사용).
  const debouncedKeyword = useDebouncedValue(searchKeyword, 300);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = usePageParam();

  const { data: auditData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['admin-audit-timeline', debouncedKeyword, page],
    queryFn: () => auditAdminService.getAuditLogs({ page: page - 1, size: PAGE_SIZE, keyword: debouncedKeyword }),
    placeholderData: (previousData) => previousData,
    refetchInterval: 60000 // 1분마다 리프레시
  });

  const logs = useMemo(() => {
    const list = auditData?.list;
    return (Array.isArray(list) ? list.filter(Boolean) : []) as AuditLog[];
  }, [auditData]);

  const totalItems = Number(auditData?.total || 0);
  const totalPageCount = Number(auditData?.totalPage || 1);

  const handleInspect = (log: AuditLog) => {
    setSelectedLog(log);
  };

  /**
   * 지표는 실제 조회 결과에서만 산출한다.
   * (기존 `+125`/`+42`/고정 `8` 가산과 SAFE/WARNING 배지는 근거가 없어 제거했다.)
   * 보안/시스템 건수는 서버 집계가 없어 **현재 페이지** 범위에서만 계산되므로 배지로 범위를 명시한다.
   */
  const stats = useMemo(() => {
    const matches = (log: AuditLog, keywords: string[]) => {
      const content = `${log.methodNm ?? ''} ${log.srvcNm ?? ''}`.toLowerCase();
      return keywords.some((k) => content.includes(k));
    };
    return {
      total: totalItems,
      security: logs.filter((l) => matches(l, ['login', '로그인', 'auth', '보안'])).length,
      system: logs.filter((l) => matches(l, ['system', '시스템', 'deploy', '배포'])).length,
    };
  }, [logs, totalItems]);

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="보안 감사 인텔리전스"
        breadcrumbs={[{ label: '시스템관리' }, { label: '감사 타임라인' }]}
      />

      <HubHeader
        title="통합"
        highlight="감사 인텔리전스"
        subtitle="전사 인프라의 모든 관리적 행위 및 보안 프로토콜 무결성 추적 스트림"
        icon={ShieldCheck}
        actions={
          <div className="flex gap-4 p-2">
            {/*
              기존 '리포트 추출' 버튼은 onClick 이 없는 死버튼이었다.
              이미 동작 검증된 CSV(BOM 포함) 내보내기 자산을 배선한다(현재 페이지 기준).
            */}
            <DataExportExcel
              data={logs}
              headers={EXPORT_HEADERS}
              filename="감사로그"
              className="flex items-center gap-3 h-11 px-8 rounded-lg border-2 font-bold text-xs tracking-widest hover:bg-muted transition-all shadow-sm"
            />
            <Button
                size="lg"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-11 px-10 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
            >
              <RefreshCcw size={20} className={cn(isFetching && "animate-spin")} aria-hidden="true" /> 새로고침
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <HubMetricCard title="전체 감사 기록" value={stats.total.toLocaleString()} icon={Activity} color="primary" status="누적" />
         <HubMetricCard title="보안 관련 행위" value={stats.security.toLocaleString()} icon={ShieldCheck} color="emerald" status="현재 페이지" />
         <HubMetricCard title="시스템 구성 변경" value={stats.system.toLocaleString()} icon={Terminal} color="amber" status="현재 페이지" />
      </div>

      <div className="grid grid-cols-12 gap-12 px-2 h-full">
        {/* --- 타임라인 목록 --- */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-10">
           <div className="rounded-lg bg-card border-2 border-border shadow-2xl p-12 space-y-10 relative overflow-hidden flex-1">
              <div className="flex items-center justify-between border-b border-border pb-8 relative z-10">
                 <div className="space-y-1">
                    <h3 className="text-xs font-bold text-muted-foreground tracking-[0.4em]">행동 분석</h3>
                    <p className="text-2xl font-bold tracking-tighter text-foreground leading-none">감사 이력 타임라인</p>
                 </div>
              </div>

              <div className="relative group z-10">
                <label htmlFor="audit-timeline-search" className="sr-only">감사 이력 검색</label>
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} aria-hidden="true" />
                <Input
                  id="audit-timeline-search"
                  className="pl-16 h-11 bg-muted border-none rounded-lg text-xs font-bold tracking-widest shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground"
                  placeholder="행위, 시스템명 또는 행동 상세 필터링.."
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value);
                    // 3페이지에서 검색하면 빈 화면이 되는 결함 방지
                    setPage(1);
                  }}
                />
              </div>

              <div className="space-y-2 relative z-10 pt-4 overflow-y-auto max-h-[800px] pr-4 custom-scrollbar">
                {isLoading ? (
                   [1,2,3,4,5].map(i => <div key={i} className="h-40 bg-muted rounded-lg animate-pulse mb-8" />)
                ) : error ? (
                   /* 조회 실패를 "검색 결과 없음"으로 위장하지 않는다 */
                   <ErrorStateDisplay error={error} onRetry={() => refetch()} />
                ) : logs.length > 0 ? (
                   logs.map((log, idx) => (
                      <TimelineItem
                         key={log.sysLogSn ?? `audit-log-${idx}`}
                         log={log}
                         index={idx}
                         onInspect={handleInspect}
                         // sysLogSn 이 없으면(undefined) 비교가 undefined === undefined 로 참이 되어
                         // 미선택 상태에서 전 카드가 강조된다. 반드시 null 가드를 선행한다.
                         isSelected={selectedLog?.sysLogSn != null && log.sysLogSn != null && selectedLog.sysLogSn === log.sysLogSn}
                      />
                   ))
                ) : (
                   <div className="h-80 flex flex-col items-center justify-center text-center opacity-30 select-none grayscale">
                      <Search size={100} className="text-muted-foreground mb-6" aria-hidden="true" />
                      <h3 className="text-2xl font-bold text-foreground tracking-tighter">검색 결과가 없습니다</h3>
                      <p className="text-xs font-bold text-muted-foreground tracking-widest mt-4">다른 필터링 조건을 시도해 보십시오</p>
                   </div>
                )}
              </div>

              {/* 페이저 — 기존에는 page 상태만 있고 변경 수단이 없어 21건째부터 도달 불가였다 */}
              {!error && (
                <div className="relative z-10">
                  <PagePagination
                    pagination={{
                      currentPageNo: page,
                      recordCountPerPage: PAGE_SIZE,
                      totalRecordCount: totalItems,
                      totalPageCount,
                    }}
                    onPageChange={setPage}
                  />
                </div>
              )}

              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-lg blur-[100px] -mr-32 -mt-32 pointer-events-none opacity-50" />
           </div>
        </div>

        {/* --- 상세 인스펙터 --- */}
        <div className="col-span-12 lg:col-span-5 h-full lg:sticky lg:top-8">
           <AnimatePresence mode="wait">
              {selectedLog ? (
                 <motion.div
                    key={selectedLog.sysLogSn ?? 'audit-detail'}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.6, ease: "circOut" }}
                    className="h-full"
                 >
                    <div className="rounded-lg bg-surface-inverse border-4 border-surface-inverse-border shadow-[0_60px_120px_-30px_rgba(0,0,0,0.3)] h-full p-16 space-y-12 flex flex-col relative overflow-hidden group">
                       <div className="border-b border-white/5 pb-12 relative z-10 transition-transform duration-700 group-hover:-translate-y-1">
                          <div className="flex items-center gap-3 mb-6">
                              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                              <h3 className="text-xs font-bold text-white/30 tracking-[0.5em]">선택 항목</h3>
                          </div>
                          <h2 className="text-5xl font-bold text-white tracking-tighter leading-none mb-6">행위 상세 <br /> 인스펙터</h2>
                          <p className="text-xs font-mono font-bold text-primary/80 tracking-widest">
                             요청 ID: {selectedLog.dmndId ?? '-'}
                          </p>
                       </div>

                       <div className="flex-1 space-y-10 overflow-y-auto pr-4 custom-scrollbar relative z-10">
                          <div className="space-y-3">
                             <div className="flex justify-between items-center text-xs font-bold tracking-widest text-white/20">
                                <span>원본 데이터</span>
                                <Database size={12} aria-hidden="true" />
                             </div>
                             <div className="p-10 bg-white/5 border border-white/5 rounded-lg shadow-inner relative overflow-hidden group/pre">
                                <pre className="text-[12px] font-mono text-white/80 leading-relaxed font-bold break-all whitespace-pre-wrap relative z-10">
                                   {JSON.stringify(selectedLog, null, 3)}
                                </pre>
                                <SearchCode size={200} className="absolute right-0 bottom-0 p-12 text-white/5 group-hover/pre:scale-110 group-hover/pre:rotate-6 transition-transform duration-1000" aria-hidden="true" />
                             </div>
                          </div>
                       </div>

                       {/* '감사 보고 증명서 발급' 버튼은 핸들러도 백엔드 엔드포인트도 없어 삭제했다(死버튼). */}

                       <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary rounded-lg blur-[120px] -mr-32 -mb-32 opacity-20" />
                       <div className="absolute top-0 left-0 w-32 h-32 bg-hub-indigo rounded-lg blur-[80px] -ml-16 -mt-16 opacity-10" />
                    </div>
                 </motion.div>
              ) : (
                 <div className="h-full min-h-[700px] flex flex-col items-center justify-center p-20 text-center opacity-40 select-none rounded-lg border-4 border-dashed border-border bg-muted/50 group hover:border-primary/20 hover:bg-card transition-all duration-1000">
                    <div className="w-32 h-32 rounded-lg bg-card border-2 border-border flex items-center justify-center mb-12 shadow-2xl group-hover:rotate-[15deg] transition-all duration-700">
                        <ShieldAlert size={100} className="text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
                    </div>
                    <h3 className="text-4xl font-bold text-foreground tracking-tighter leading-tight mb-4">
                       선택된 항목 <br /> 없음
                    </h3>
                    <p className="text-xs font-bold text-muted-foreground tracking-[0.6em] leading-relaxed max-w-[240px]">
                       분석할 타임라인 항목을 선택하세요
                    </p>
                 </div>
              )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
