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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { auditAdminService, type AuditLog } from '@/services/foundation/system/AuditAdminService';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { authorAdminService } from '@/services/foundation/system/AuthorAdminService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { VisualAuditTimeline, AuditLog as UIAuditLog } from '@/app/components/ui/visual-audit-timeline';
import { InsightBanner } from './components/InsightBanner';

/** 'yyyyMMdd'(varchar 8) 발생일자를 표시용으로 변환한다. 스키마에 시각 정보는 없다. */
function formatOcrnYmd(ymd?: string): string {
  if (!ymd) return '-';
  const digits = ymd.replace(/\D/g, '');
  if (digits.length < 8) return ymd;
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}

export default function AdminDashboardClient() {
  const {
    data: auditData,
    isLoading: isAuditLoading,
    isError: isAuditError,
    error: auditError,
    refetch: refetchAudit,
  } = useQuery({
    queryKey: ['admin-dashboard-recent-audits'],
    queryFn: () => auditAdminService.getAuditLogs({ page: 0, size: 5 }),
    refetchInterval: 60000,
    retry: 1,
    retryDelay: 5000,
  });

  const {
    data: usersData,
    isError: isUsersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['admin-dashboard-users'],
    queryFn: () => userAdminService.getUserList({ pageNo: 1, size: 1 }),
    retry: 1,
    retryDelay: 5000,
  });

  const {
    data: authorsData,
    isError: isAuthorsError,
    refetch: refetchAuthors,
  } = useQuery({
    queryKey: ['admin-dashboard-authors'],
    queryFn: () => authorAdminService.getAuthorList({ pageIndex: 1, size: 1 }),
    retry: 1,
    retryDelay: 5000,
  });

  const hasError = isAuditError || isUsersError || isAuthorsError;
  const retryAll = React.useCallback(() => {
    if (isAuditError) void refetchAudit();
    if (isUsersError) void refetchUsers();
    if (isAuthorsError) void refetchAuthors();
  }, [isAuditError, isUsersError, isAuthorsError, refetchAudit, refetchUsers, refetchAuthors]);

  /**
   * 감사 이력 매핑.
   * ⚠ 종전에는 `histCn`/`histId`/`occrrncDe`/`sysNm` 등 계약에 없는 필드를 읽어(전량 undefined)
   *   전 카드가 'System Activity' + 고정 일시로 렌더됐다. 계약 SSOT 는 generated-api 의 `SysLogDto`
   *   (dmndId/srvcNm/methodNm/prcsSeCd/prcsTm/dmndUserId/rqesterIp/ocrnYmd)다.
   */
  const recentLogs: UIAuditLog[] = React.useMemo(() => {
    const list: AuditLog[] = auditData?.list ?? [];
    return list.slice(0, 5).map((log, i) => {
      const entityName = [log.srvcNm, log.methodNm].filter(Boolean).join('.') || '시스템 활동';
      const haystack = `${entityName} ${log.prcsSeCd ?? ''}`.toLowerCase();

      const action: UIAuditLog['action'] =
        /insert|create|regist|등록|생성/.test(haystack) ? 'CREATE' :
        /delete|remove|삭제/.test(haystack) ? 'DELETE' :
        /restore|복원/.test(haystack) ? 'RESTORE' : 'UPDATE';

      const severity: UIAuditLog['severity'] =
        /error|fail|오류|실패|delete|삭제/.test(haystack) ? 'high' :
        /security|auth|권한|보안/.test(haystack) ? 'medium' : 'low';

      return {
        id: log.dmndId || `log-${i}`,
        action,
        entityName,
        performedBy: log.dmndUserId || 'System',
        timestamp: formatOcrnYmd(log.ocrnYmd),
        ipAddress: log.rqesterIp || 'Unknown',
        severity,
      };
    });
  }, [auditData]);

  return (
    <div className="space-y-6 md:space-y-8 pb-12 animate-in fade-in duration-700">
      <HubHeader
        title="관리자"
        highlight="인텔리전스 센터"
        subtitle="시스템 전반의 오퍼레이션 상태, 지능형 데이터 분석 및 보안 거버넌스 통합 관제 패널"
        icon={LayoutDashboard}
      />

      {/* 조회 실패를 '데이터 없음'으로 위장하지 않는다 — 실패 사실과 재시도 경로를 그대로 노출한다. */}
      {hasError && (
        <div
          role="alert"
          className="flex flex-col gap-4 rounded-lg border border-rose-200 bg-rose-50 p-6 text-rose-900 sm:flex-row sm:items-center sm:justify-between dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-bold">대시보드 지표를 불러오지 못했습니다.</p>
              <p className="text-xs font-medium opacity-80">
                {[
                  isUsersError && '사용자 통계',
                  isAuthorsError && '권한 통계',
                  isAuditError && '보안 감사 이력',
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

      <InsightBanner />

      {/*
        지표 카드는 실제 조회값만 표기한다.
        종전의 '+12 활성' · '보호됨' · '운영 중' 같은 증감/상태 배지는 산출 근거가 없는 고정 문자열이라 제거했다.
      */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        <DashboardStatCard
          title="ID 레지스트리"
          e2eLabel="IDENTITY_RESOURCES"
          value={isUsersError ? '조회 실패' : (usersData?.total?.toLocaleString() ?? '-')}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          link="/admin/user/manage"
          description="등록된 전체 사용자 수"
        />
        <DashboardStatCard
          title="보안 거버넌스"
          e2eLabel="CLUSTER_POLICY"
          value={isAuthorsError ? '조회 실패' : `${authorsData?.total?.toLocaleString() ?? '-'}개 역할`}
          icon={<ShieldCheck className="w-5 h-5" />}
          color="emerald"
          link="/admin/security/authority"
          description="등록된 권한(역할) 수"
        />
        <DashboardStatCard
          title="보안 감사 이력"
          e2eLabel="BUSINESS_INTELLIGENCE"
          value={isAuditError ? '조회 실패' : (auditData?.total?.toLocaleString() ?? '-')}
          icon={<Activity className="w-5 h-5" />}
          color="rose"
          link="/admin/system/audit"
          description="수집된 전체 감사 로그 건수"
        />
      </div>

      <div className="rounded-lg bg-card border border-border shadow-sm p-6 md:p-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-inverse rounded-lg text-surface-inverse-foreground shadow-xl">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">최근 보안 감사 이력</h2>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">최근 수집된 시스템 감사 로그 5건</p>
            </div>
          </div>
          <Link
            href="/admin/system/audit"
            className="text-xs font-bold text-primary underline-offset-4 hover:underline"
          >
            전체 보기
          </Link>
        </div>

        <div className="max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
          {isAuditLoading ? (
            <p className="py-16 text-center text-sm font-medium text-muted-foreground">감사 이력을 불러오는 중입니다...</p>
          ) : isAuditError ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <AlertTriangle size={28} className="text-rose-500" />
              <p className="text-sm font-bold text-foreground">감사 이력을 불러오지 못했습니다.</p>
              <Button variant="outline" size="sm" onClick={() => void refetchAudit()} className="gap-2">
                <RefreshCcw size={14} /> 다시 시도
              </Button>
            </div>
          ) : recentLogs.length === 0 ? (
            <p className="py-16 text-center text-sm font-medium text-muted-foreground">표시할 감사 이력이 없습니다.</p>
          ) : (
            <VisualAuditTimeline logs={recentLogs} />
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardStatCard({
  title,
  e2eLabel,
  value,
  icon,
  color,
  link,
  description,
}: {
  title: string;
  e2eLabel: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'amber' | 'rose';
  link: string;
  description: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-hub-blue bg-hub-blue/10 border-hub-blue/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={link} aria-label={`${title} — ${description}. 상세 화면으로 이동`}>
          <motion.div
            whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="p-6 md:p-8 h-full rounded-lg bg-card border-2 border-border shadow-xl hover:border-primary/30 transition-colors cursor-pointer group relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className={cn("p-3.5 rounded-lg border-2 transition-transform group-hover:rotate-6 shadow-inner", colorMap[color])}>
                {icon}
              </div>
              <ArrowUpRight size={18} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
            </div>

            <div className="space-y-4">
              <p className="text-xs font-bold text-foreground tracking-[0.3em] uppercase font-mono flex items-center gap-2">
                {title}
                <span className="e2e-label">{e2eLabel}</span>
              </p>
              {/* a11y(heading-order): stat 값은 문서 섹션 제목이 아니므로 heading(h3) 대신 p로 — h1→h3 레벨 스킵 위반 제거 */}
              <p className="text-4xl font-bold text-foreground tracking-tighter tabular-nums group-hover:text-primary transition-colors leading-none">{value}</p>
              <p className="text-xs font-bold text-muted-foreground leading-tight">
                {description}
              </p>
            </div>

            <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.05] rotate-12 group-hover:rotate-6 transition-transform duration-1000 pointer-events-none scale-150">
              {icon}
            </div>
          </motion.div>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-widest">
        {title} 상세 페이지로 이동
      </TooltipContent>
    </Tooltip>
  );
}
