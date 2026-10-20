'use client';

import React from 'react';
import {
  Activity,
  Users,
  ShieldCheck,
  AlertTriangle,
  RefreshCcw,
  ArrowUpRight,
  LayoutDashboard,
  Clock,
  Lock,
  ListX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { auditAdminService, type AuditLog } from '@/services/foundation/system/AuditAdminService';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { authorAdminService } from '@/services/foundation/system/AuthorAdminService';
import {
  adminDashboardService,
  type OperationalSignal,
  type OperationalSignalKind,
} from '@/services/foundation/system/AdminDashboardService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { VisualAuditTimeline, AuditLog as UIAuditLog } from '@/app/components/ui/visual-audit-timeline';
import { toDisplayYmd, utcToSeoulDisplayDateTime } from '@/lib/format-date';
import { useAuth } from '@/contexts/AuthContext';
import { canOpenPage } from '@/lib/auth/page-access';
import { canPermission } from '@/lib/auth/permissions';
import { ADMIN_DASHBOARD_QUERY_KEYS, SYSTEM_LOG_ROUTE } from './admin-dashboard-queries';

// 발생일자는 'yyyyMMdd'(varchar 8)이고 시각 정보는 없다. 표시는 공용 관문(toDisplayYmd)이 yyyy-MM-dd 로 바꾼다.

/*
 * [2026-09-30] 조회의 실패는 이 화면이 화면 안 경고(role="alert")와 '다시 시도' 로 알린다. 전역 실패 토스트까지
 * 켜 두면 같은 실패가 두 번 보이고, 60초 주기 조회가 실패할 때마다 토스트가 다시 떴다.
 */
const QUIET = { suppressErrorToast: true } as const;

/**
 * 운영 신호의 화면 이름과 목적지. 서버가 보는 사람이 원천을 조회할 수 있는 신호만 싣는다 — 화면은 받은 신호만 그린다.
 * 이름은 원천과 같다: 후속 작업 원장(tb_sys_job)의 실패, 사용자의 로그인 잠금, 시스템 로그(tb_sys_log — 4xx 이상 요청).
 */
const SIGNAL_VIEW: Record<OperationalSignalKind, { title: string; description: string; href: string; icon: React.ReactNode }> = {
  FAILED_DURABLE_JOBS: {
    title: '실패한 후속 작업',
    description: '재시도 한도에 이르러 멈춘 후속 작업 수',
    href: '/admin/system/durable-jobs',
    icon: <ListX className="w-5 h-5" />,
  },
  LOCKED_ACCOUNTS: {
    title: '잠긴 계정',
    description: '로그인 잠금 상태인 계정 수(사용자 목록의 로그인 잠금과 같은 기준)',
    href: '/admin/user/manage',
    icon: <Lock className="w-5 h-5" />,
  },
  FAILED_REQUESTS_TODAY: {
    title: '오늘 실패 요청',
    description: '오늘(서버 날짜) 시스템 로그에 기록된 4xx 이상 요청 수',
    href: SYSTEM_LOG_ROUTE,
    icon: <AlertTriangle className="w-5 h-5" />,
  },
};

/**
 * 관리자 홈(/admin).
 *
 * [2026-10-20] ① 보는 사람에게 권한이 있는 조회만 부르고, 권한이 없는 카드는 그리지 않는다 — 종전에는 관리자 홈 권한
 * (DASHBOARD_ADMIN_READ)만 있으면 사용자·권한·시스템 로그 조회를 무조건 불러, 그 권한이 없는 묶음(감사 담당 log-audit-viewer 의
 * 사용자·권한 조회)에 카드가 '조회 실패' 로 보이고 경고까지 떴다(DEC-OPS-152·185 의 '권한으로 보인다' 원칙). 노출일 뿐 인가는 서버가
 * 한다(H3). ② 이름을 원천에 맞춘다 — 그 목록은 시스템 로그(tb_sys_log, 4xx 이상 실패 요청)이지 보안 감사가 아니다. 카드 링크는
 * 리다이렉트 스텁(/admin/system/audit) 대신 실제 시스템 로그 화면이다. ③ 운영 신호(실패한 후속 작업·잠긴 계정·오늘 실패 요청)를
 * 서버 요약 하나로 보인다(관측 시각 함께).
 */
export default function AdminDashboardClient() {
  // [2026-09-26 DIP B4 P1] 링크는 라우트 게이트와 같은 판정으로만 보인다. 대시보드 권한만 가진 사람에게
  //   사용자·권한·시스템 로그 화면으로 가는 길을 보이면 누르는 순간 홈으로 튕긴다.
  const { user } = useAuth();
  const canOpenUsers = canOpenPage(user, '/admin/user/manage');
  const canOpenAuthority = canOpenPage(user, '/admin/security/authority');
  const canOpenSystemLog = canOpenPage(user, '/admin/system/logs/system');
  // 카드·목록은 그 조회 API 의 권한이 있을 때만 부르고 그린다.
  const canReadUsers = canPermission(user, 'USER_READ');
  const canReadAuthorities = canPermission(user, 'AUTHRT_READ');
  const canReadSystemLog = canPermission(user, 'SYS_LOG_READ');
  const canReadSignals = canPermission(user, 'DASHBOARD_ADMIN_READ');

  const {
    data: auditData,
    isLoading: isAuditLoading,
    isError: isAuditError,
    error: auditError,
    refetch: refetchAudit,
  } = useQuery({
    queryKey: ADMIN_DASHBOARD_QUERY_KEYS.recentFailedRequests,
    queryFn: () => auditAdminService.getAuditLogs({ page: 1, size: 5 }, QUIET),
    enabled: canReadSystemLog,
    refetchInterval: 60000,
    retry: 1,
    retryDelay: 5000,
  });

  const {
    data: usersData,
    isError: isUsersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ADMIN_DASHBOARD_QUERY_KEYS.users,
    queryFn: () => userAdminService.getUserList({ page: 1, size: 1 }, QUIET),
    enabled: canReadUsers,
    retry: 1,
    retryDelay: 5000,
  });

  const {
    data: authorsData,
    isError: isAuthorsError,
    refetch: refetchAuthors,
  } = useQuery({
    queryKey: ADMIN_DASHBOARD_QUERY_KEYS.authors,
    queryFn: () => authorAdminService.getAuthorList({ page: 1, size: 1 }, QUIET),
    enabled: canReadAuthorities,
    retry: 1,
    retryDelay: 5000,
  });

  const {
    data: signalsData,
    isError: isSignalsError,
    refetch: refetchSignals,
  } = useQuery({
    queryKey: ADMIN_DASHBOARD_QUERY_KEYS.operationalSignals,
    queryFn: () => adminDashboardService.getOperationalSignals(QUIET),
    enabled: canReadSignals,
    refetchInterval: 60000,
    retry: 1,
    retryDelay: 5000,
  });

  const hasError = isAuditError || isUsersError || isAuthorsError || isSignalsError;
  const retryAll = React.useCallback(() => {
    if (isAuditError) void refetchAudit();
    if (isUsersError) void refetchUsers();
    if (isAuthorsError) void refetchAuthors();
    if (isSignalsError) void refetchSignals();
  }, [isAuditError, isUsersError, isAuthorsError, isSignalsError, refetchAudit, refetchUsers, refetchAuthors, refetchSignals]);

  /**
   * 실패 요청 기록 매핑.
   * ⚠ 종전에는 `histCn`/`histId`/`occrrncDe`/`sysNm` 등 계약에 없는 필드를 읽어(전량 undefined)
   *   전 카드가 'System Activity' + 고정 일시로 렌더됐다. 계약 SSOT 는 generated-api 의 `SysLogDto`
   *   (sysLogSn/dmndId/srvcNm/methodNm/prcsSeCd/prcsTm/dmndUserId/rqesterIp/ocrnYmd)다.
   */
  const recentLogs: UIAuditLog[] = React.useMemo(() => {
    const list: AuditLog[] = auditData?.list ?? [];
    return list.slice(0, 5).map((log, i) => {
      const entityName = [log.srvcNm, log.methodNm].filter(Boolean).join('.') || '시스템 활동';

      // [2026-09-15 DEC-OPS-100] 서비스·메서드 이름의 키워드로 동작과 중요도를 추측해 영문 대문자 등급으로 그렸다.
      //   저장된 판정이 아니므로 운영 상태처럼 보이면 안 된다(term-operational-status). 이 로그에는 동작·중요도
      //   코드가 없어 둘 다 비워 둔다.
      const row: UIAuditLog = {
        id: String(log.sysLogSn ?? log.dmndId ?? `log-${i}`),
        entityName,
        performedBy: log.dmndUserId || '시스템',
        timestamp: toDisplayYmd(log.ocrnYmd),
        ipAddress: log.rqesterIp || '-',
      };
      return row;
    });
  }, [auditData]);

  const signals: readonly OperationalSignal[] = signalsData?.signals ?? [];
  const hasSummaryCards = canReadUsers || canReadAuthorities || canReadSystemLog;
  // 볼 수 있는 것이 하나도 없는 계정 — 빈 화면이나 실패 경고 대신 사실과 다음 행동을 말한다.
  const nothingToShow = !hasSummaryCards && (!canReadSignals || (signalsData !== undefined && signals.length === 0));

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <HubHeader
        headingLevel={1}
        title="관리자"
        highlight="업무 현황"
        subtitle="사용자·권한 그룹·실패 요청 현황과 운영 신호를 확인하고 관련 관리 화면으로 이동합니다."
        icon={LayoutDashboard}
      />

      {/* 조회 실패를 '데이터 없음'으로 위장하지 않는다 — 실패 사실과 재시도 경로를 그대로 노출한다. 부르지 않은 조회는 실패가 아니다. */}
      {hasError && (
        <div
          role="alert"
          className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-destructive-emphasis" />
            <div className="space-y-1">
              <p className="text-sm font-bold">관리 현황을 불러오지 못했습니다.</p>
              <p className="text-xs font-medium text-muted-foreground">
                {[
                  isUsersError && '사용자 수',
                  isAuthorsError && '권한 그룹 수',
                  isAuditError && '실패 요청 기록',
                  isSignalsError && '운영 신호',
                ].filter(Boolean).join(' · ')} 조회에 실패했습니다.
                {auditError instanceof Error ? ` (${auditError.message})` : ''}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={retryAll} className="gap-2 self-start sm:self-auto">
            <RefreshCcw size={16} /> 다시 시도
          </Button>
        </div>
      )}

      {nothingToShow && (
        <div role="status" className="rounded-md border border-border bg-card px-4 py-3 text-[length:var(--font-size-body)]">
          <p className="font-medium text-foreground">이 계정으로 볼 수 있는 관리 현황이 없습니다.</p>
          <p className="mt-1 text-muted-foreground">메뉴에서 이용 가능한 관리 화면을 선택해 주세요.</p>
        </div>
      )}

      {(canOpenUsers || canOpenAuthority || canOpenSystemLog) && (
        <div className="flex flex-wrap gap-3 text-sm">
          {canOpenUsers && <Link href="/admin/user/manage" className="text-primary underline">사용자 확인</Link>}
          {canOpenAuthority && <Link href="/admin/security/authority" className="text-primary underline">권한 그룹 관리</Link>}
          {canOpenSystemLog && <Link href="/admin/system/logs/system" className="text-primary underline">실패 요청 로그</Link>}
        </div>
      )}

      {/*
        지표 카드는 실제 조회값만 표기한다. 그 조회 권한이 없는 카드는 그리지 않는다.
        종전의 '+12 활성' · '보호됨' · '운영 중' 같은 증감/상태 배지는 산출 근거가 없는 고정 문자열이라 제거했다.
      */}
      {hasSummaryCards && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {canReadUsers && (
            <DashboardStatCard
              title="등록 사용자"
              value={isUsersError ? '조회 실패' : (usersData?.total?.toLocaleString() ?? '-')}
              icon={<Users className="w-5 h-5" />}
              color="blue"
              link={canOpenUsers ? "/admin/user/manage" : undefined}
              description="등록된 전체 사용자 수"
            />
          )}
          {canReadAuthorities && (
            <DashboardStatCard
              title="권한 그룹"
              value={isAuthorsError ? '조회 실패' : `${authorsData?.total?.toLocaleString() ?? '-'}개 그룹`}
              icon={<ShieldCheck className="w-5 h-5" />}
              color="emerald"
              link={canOpenAuthority ? "/admin/security/authority" : undefined}
              description="등록된 권한 그룹 수"
            />
          )}
          {canReadSystemLog && (
            <DashboardStatCard
              title="실패 요청 로그"
              value={isAuditError ? '조회 실패' : (auditData?.total?.toLocaleString() ?? '-')}
              icon={<Activity className="w-5 h-5" />}
              color="rose"
              link={canOpenSystemLog ? SYSTEM_LOG_ROUTE : undefined}
              description="시스템 로그에 기록된 실패 요청(4xx 이상) 전체 건수"
            />
          )}
        </div>
      )}

      {/* 운영 신호 — 서버가 보는 사람이 원천을 조회할 수 있는 신호만 싣는다. 받은 신호가 없으면 구역을 그리지 않는다. */}
      {signals.length > 0 && (
        <section aria-labelledby="admin-operational-signals" className="space-y-3">
          <div>
            <h2 id="admin-operational-signals" className="text-sm font-bold text-foreground">운영 신호</h2>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">
              {/* 관측 시각은 요청마다 바뀌는 값이라 다른 동적 숫자처럼 tabular-nums 로 둔다(시각 회귀 기준선이 이 클래스를 가린다). */}
              DB 에서 센 값입니다. 관측 시각{' '}
              <time dateTime={signalsData?.observedAt ?? undefined} className="tabular-nums">
                {utcToSeoulDisplayDateTime(signalsData?.observedAt)}
              </time>
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {signals.map(signal => {
              const view = SIGNAL_VIEW[signal.kind];
              return (
                <DashboardStatCard
                  key={signal.kind}
                  title={view.title}
                  value={signal.count === null ? '조회 실패' : `${signal.count.toLocaleString()}건`}
                  icon={view.icon}
                  color="amber"
                  link={canOpenPage(user, view.href) ? view.href : undefined}
                  description={view.description}
                />
              );
            })}
          </div>
        </section>
      )}

      {canReadSystemLog && (
        <div className="rounded-lg bg-card border border-border shadow-sm p-6 md:p-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-surface-inverse rounded-lg text-surface-inverse-foreground shadow-xl">
                <Clock size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">최근 실패 요청</h2>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground">시스템 로그에 기록된 최근 실패 요청(4xx 이상) 5건</p>
              </div>
            </div>
            {canOpenSystemLog && (
              <Link
                href="/admin/system/logs/system"
                className="text-xs font-bold text-primary underline-offset-4 hover:underline"
              >
                전체 보기
              </Link>
            )}
          </div>

          <div className="max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
            {isAuditLoading ? (
              <p className="py-16 text-center text-sm font-medium text-muted-foreground">실패 요청 기록을 불러오는 중입니다...</p>
            ) : isAuditError ? (
              <div className="flex flex-col items-center gap-4 py-16">
                <AlertTriangle size={28} className="text-destructive-emphasis" />
                <p className="text-sm font-bold text-foreground">실패 요청 기록을 불러오지 못했습니다.</p>
                <Button variant="outline" size="sm" onClick={() => void refetchAudit()} className="gap-2">
                  <RefreshCcw size={14} /> 다시 시도
                </Button>
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="py-16 text-center text-sm font-medium text-muted-foreground">표시할 실패 요청 기록이 없습니다.</p>
            ) : (
              <VisualAuditTimeline logs={recentLogs} title="실패 요청 기록" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardStatCard({
  title,
  value,
  icon,
  color,
  link,
  description,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'amber' | 'rose';
  /** 목적지에 들어갈 수 없으면 비운다 — 카드는 값만 보이고 이동을 약속하지 않는다. */
  link?: string;
  description: string;
}) {
  // [2026-09-22] blue 만 `hub-*` 토큰을 쓰고 나머지는 raw 리터럴이던 내부 불일치를 통일했다.
  //   ⚠ status 토큰(success·warning·destructive)으로는 바꾸지 않는다 — 이 색은 상태가 아니라
  //   분류 표식이다(등록 사용자·권한 그룹·실패 요청 로그·운영 신호). 매핑하면 "권한 그룹 = 성공",
  //   "실패 요청 = 오류" 라는 없는 의미를 화면이 주장하게 된다.
  const colorMap: Record<string, string> = {
    blue: "text-hub-blue bg-hub-blue/10",
    emerald: "text-hub-emerald bg-hub-emerald/10",
    amber: "text-hub-amber bg-hub-amber/10",
    rose: "text-hub-rose bg-hub-rose/10",
  };

  const body = (
    <>
      {/* [2026-09-22] 카드 안의 카드(아이콘 상자 border-2·shadow-inner)와 5% 불투명 워터마크
          아이콘을 걷고 여백을 밀도 계약에 맞췄다 — 실측 약 250px 였다(카탈로그 §A1·§4). */}
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-md", colorMap[color])}>
          {icon}
        </div>
        {link && <ArrowUpRight size={16} className="text-muted-foreground transition-colors group-hover:text-primary" />}
      </div>

      <div className="space-y-2">
        {/* 한국어 라벨이라 uppercase 는 무효고 0.3em 자간만 남아 읽기를 방해했다(표 머리글과 같은 정정). */}
        <p className="text-xs font-semibold text-foreground">
          {title}
        </p>
        {/* a11y(heading-order): stat 값은 문서 섹션 제목이 아니므로 heading(h3) 대신 p로 — h1→h3 레벨 스킵 위반 제거 */}
        <p className="text-3xl font-bold text-foreground tabular-nums group-hover:text-primary transition-colors leading-none">{value}</p>
        <p className="text-xs text-muted-foreground leading-tight">
          {description}
        </p>
      </div>
    </>
  );

  // 들어갈 수 없는 화면이면 이동을 약속하지 않는다 — 값만 보이는 카드다.
  if (!link) {
    return (
      <div className="p-4 md:p-5 h-full rounded-md bg-card border border-border">
        {body}
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={link} aria-label={`${title} — ${description}. 상세 화면으로 이동`}>
          <motion.div
            whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="p-4 md:p-5 h-full rounded-md bg-card border border-border hover:border-primary/30 transition-colors cursor-pointer group"
          >
            {body}
          </motion.div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-widest">
        {title} 상세 페이지로 이동
      </TooltipContent>
    </Tooltip>
  );
}
