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
import { toDisplayYmd } from '@/lib/format-date';
import { useAuth } from '@/contexts/AuthContext';
import { canOpenPage } from '@/lib/auth/page-access';

// 발생일자는 'yyyyMMdd'(varchar 8)이고 시각 정보는 없다. 표시는 공용 관문(toDisplayYmd)이 yyyy-MM-dd 로 바꾼다.

export default function AdminDashboardClient() {
  // [2026-09-26 DIP B4 P1] 링크는 라우트 게이트와 같은 판정으로만 보인다. 대시보드 권한만 가진 사람에게
  //   사용자·권한·감사 화면으로 가는 길을 보이면 누르는 순간 홈으로 튕긴다.
  const { user } = useAuth();
  const canOpenUsers = canOpenPage(user, '/admin/user/manage');
  const canOpenAuthority = canOpenPage(user, '/admin/security/authority');
  const canOpenSecurityLog = canOpenPage(user, '/admin/system/monitoring/hub');
  const canOpenAudit = canOpenPage(user, '/admin/system/audit');
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

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <HubHeader
        headingLevel={1}
        title="관리자"
        highlight="업무 현황"
        subtitle="사용자, 권한, 보안 감사 현황을 확인하고 관련 관리 화면으로 이동합니다."
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

      <div className="flex flex-wrap gap-3 text-sm">{canOpenUsers && <Link href="/admin/user/manage" className="text-primary underline">사용자 확인</Link>}{canOpenAuthority && <Link href="/admin/security/authority" className="text-primary underline">권한 그룹 관리</Link>}{canOpenSecurityLog && <Link href="/admin/system/monitoring/hub?tab=security" className="text-primary underline">보안 감사 로그</Link>}</div>

      {/*
        지표 카드는 실제 조회값만 표기한다.
        종전의 '+12 활성' · '보호됨' · '운영 중' 같은 증감/상태 배지는 산출 근거가 없는 고정 문자열이라 제거했다.
      */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        <DashboardStatCard
          title="등록 사용자"
          e2eLabel="IDENTITY_RESOURCES"
          value={isUsersError ? '조회 실패' : (usersData?.total?.toLocaleString() ?? '-')}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          link={canOpenUsers ? "/admin/user/manage" : undefined}
          description="등록된 전체 사용자 수"
        />
        <DashboardStatCard
          title="권한 그룹"
          e2eLabel="CLUSTER_POLICY"
          value={isAuthorsError ? '조회 실패' : `${authorsData?.total?.toLocaleString() ?? '-'}개 그룹`}
          icon={<ShieldCheck className="w-5 h-5" />}
          color="emerald"
          link={canOpenAuthority ? "/admin/security/authority" : undefined}
          description="등록된 권한 그룹 수"
        />
        <DashboardStatCard
          title="보안 감사 이력"
          e2eLabel="BUSINESS_INTELLIGENCE"
          value={isAuditError ? '조회 실패' : (auditData?.total?.toLocaleString() ?? '-')}
          icon={<Activity className="w-5 h-5" />}
          color="rose"
          link={canOpenAudit ? "/admin/system/audit" : undefined}
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
          {canOpenAudit && (
            <Link
              href="/admin/system/audit"
              className="text-xs font-bold text-primary underline-offset-4 hover:underline"
            >
              전체 보기
            </Link>
          )}
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
  /** 목적지에 들어갈 수 없으면 비운다 — 카드는 값만 보이고 이동을 약속하지 않는다. */
  link?: string;
  description: string;
}) {
  // [2026-09-22] blue 만 `hub-*` 토큰을 쓰고 나머지는 raw 리터럴이던 내부 불일치를 통일했다.
  //   ⚠ status 토큰(success·warning·destructive)으로는 바꾸지 않는다 — 이 색은 상태가 아니라
  //   분류 표식이다(등록 사용자·권한 그룹·보안 감사 이력). 매핑하면 "권한 그룹 = 성공",
  //   "보안 감사 = 오류" 라는 없는 의미를 화면이 주장하게 된다.
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
      <div data-e2e-label={e2eLabel} className="p-4 md:p-5 h-full rounded-md bg-card border border-border">
        {body}
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={link} aria-label={`${title} — ${description}. 상세 화면으로 이동`} data-e2e-label={e2eLabel}>
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
