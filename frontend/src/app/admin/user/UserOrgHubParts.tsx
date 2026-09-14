'use client';

/**
 * 사용자·조직 허브(UserOrgHubClient)의 표시 전용 부품.
 *
 * 쓰기 동작·잠금·확인 대화는 UserOrgHubClient 가 소유한다(폼 검증 census 의 소유자). 이 파일에는
 * 저장·삭제 호출을 두지 않는다 — 부품은 값을 그리고 콜백을 부를 뿐이다.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { defaultDropAnimationSideEffects, type DropAnimation } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type LucideIcon, Building2, ChevronRight, GripVertical, Info, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { cn } from '@/lib/utils';
import type { UserManage } from '@/types/foundation/user';
import type { FlattenedDept } from './departments/treeUtils';

export const INDENTATION_WIDTH = 24;

export const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

interface SortableDeptNodeProps {
    node: FlattenedDept;
    isSelected: boolean;
    isTabStop: boolean;
    onClick: () => void;
    isOverlay?: boolean;
}

export const SortableDeptNode = ({ node, isSelected, isTabStop, onClick, isOverlay = false }: SortableDeptNodeProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: node.ognzId || '', disabled: isOverlay });

    const style = {
        transform: isOverlay ? undefined : CSS.Translate.toString(transform),
        transition: isOverlay ? undefined : transition,
        paddingLeft: isOverlay ? 0 : `${node.depth * INDENTATION_WIDTH}px`,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            aria-hidden={isOverlay ? true : undefined}
            className={cn(
                "group relative mb-1 outline-none",
                isDragging && !isOverlay && "opacity-30",
                isOverlay && "z-[9999] pointer-events-none"
            )}
        >
            {/* Hierarchy Line */}
            {node.depth > 0 && !isOverlay && (
                <>
                    <div className="absolute left-[11px] top-[-10px] bottom-1/2 w-px bg-muted" />
                    <div className="absolute left-[11px] top-1/2 w-3 h-px bg-muted" />
                </>
            )}

            <div
              className={cn(
                "flex w-full items-center gap-1 rounded-lg border border-transparent p-1 transition-colors",
                "hover:bg-muted",
                isSelected && "border-primary/30 bg-primary/10",
                isOverlay && "border-primary bg-card shadow-2xl ring-4 ring-primary/5"
              )}
            >
              <button
                type="button"
                {...attributes}
                {...listeners}
                disabled={isOverlay}
                aria-label={`${node.ognzNm} (${node.ognzId}) 순서 이동 핸들`}
                className="shrink-0 cursor-grab rounded p-2 text-muted-foreground hover:bg-card hover:text-foreground active:cursor-grabbing"
              >
                <GripVertical size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                data-a2-master-item={isOverlay ? undefined : ''}
                aria-current={isSelected ? 'true' : undefined}
                tabIndex={isTabStop ? 0 : -1}
                onClick={onClick}
                className="flex min-w-0 flex-1 items-center gap-3 rounded p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-hub-indigo/10 text-hub-indigo group-hover:bg-primary/10 group-hover:text-primary"
                    )}>
                        <Building2 size={14} aria-hidden="true" />
                    </div>
                    <div className="flex flex-col truncate items-start">
                        <span className={cn(
                            "text-xs font-bold truncate leading-tight tracking-tight",
                            isSelected ? "text-primary" : "text-foreground"
                        )}>
                            {node.ognzNm}
                        </span>
                        <span className={cn(
                            "text-xs font-bold tracking-tighter opacity-60",
                            isSelected ? "text-primary" : "text-muted-foreground"
                        )}>
                            {node.ognzId}
                        </span>
                    </div>
                    {isSelected && (
                        <div className="ml-auto">
                            <div className="w-1.5 h-1.5 rounded-full bg-surface-inverse-foreground animate-pulse" />
                        </div>
                    )}
                </div>
              </button>
            </div>
        </div>
    );
};

export function UserOrgMasterSection({
  compact,
  title,
  description,
  icon: Icon,
  children,
}: {
  compact: boolean;
  title: string;
  description: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  if (!compact) {
    return (
      <HubSectionCard title={title} description={description} icon={Icon}>
        {children}
      </HubSectionCard>
    );
  }

  return (
    <section aria-labelledby="department-master-title" className="flex min-h-0 flex-1 flex-col rounded-md border border-border bg-card">
      <header className="border-b border-border p-[var(--filter-pad)]">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
            <Icon size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="department-master-title" className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-[length:var(--font-size-body)] text-muted-foreground">{description}</p>
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 p-[var(--filter-pad)]">{children}</div>
    </section>
  );
}

/** 계정 상태 코드(userSttsCd) → 표시 라벨. 일괄 상태 변경 모달의 코드 체계와 동일하다. */
export const USER_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  P: { label: '정상', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  A: { label: '승인 대기', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  D: { label: '비활성', className: 'bg-muted text-muted-foreground border-border' },
};

/** 일괄 작업 모달의 선택 대상 요약. 다섯 명까지 이름을 보이고 나머지는 수로 말한다. */
export function BulkSelectionSummary({ users }: { users: UserManage[] }) {
  return (
    <div className="p-6 bg-muted rounded-lg border border-border">
      <p className="text-xs font-bold text-muted-foreground tracking-tight mb-2">선택된 사용자 ({users.length}명)</p>
      <div className="flex flex-wrap gap-2">
        {users.slice(0, 5).map(u => (
          <span key={u.userId} className="px-3 py-1 bg-card border border-border rounded-lg text-xs font-bold text-foreground">{u.userNm}</span>
        ))}
        {users.length > 5 && <span className="text-xs font-bold text-muted-foreground">외 {users.length - 5}명</span>}
      </div>
    </div>
  );
}

/**
 * 부재 탭 목록 위의 안내.
 *
 * [2026-09-07] 종전 문구는 "부재 정보는 아직 연동되지 않았습니다" 였다. 이제 연동됐으므로
 * 그 고지를 걷되, 남은 사실 두 가지는 계속 말한다 — 목록은 전체 사용자이고(부재자 필터가 아니다),
 * 조회가 실패하면 '전원 정상' 으로 위장하지 않는다.
 */
export function AbsenceStatusNotice({
  isError,
  error,
  isLoading,
  absentCount,
  onRetry,
}: {
  isError: boolean;
  error: unknown;
  isLoading: boolean;
  absentCount: number;
  onRetry: () => void;
}) {
  if (isError) {
    return (
      <div role="alert" className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-left">
        <Info size={16} className="mt-0.5 shrink-0 text-destructive-emphasis" aria-hidden="true" />
        <div className="space-y-2">
          <p className="text-xs font-bold text-destructive-emphasis leading-relaxed">
            부재 상태를 불러오지 못했습니다. 아래 목록의 부재 여부는 <strong>알 수 없음</strong>이며 정상이라는 뜻이 아닙니다.
            {error instanceof Error ? ` (${error.message})` : ''}
          </p>
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 h-8">
            <RefreshCcw size={14} aria-hidden="true" /> 다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div role="note" className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/40 text-left">
      <Info size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="text-xs font-bold text-muted-foreground leading-relaxed">
        아래 목록은 <strong>전체 사용자</strong>이며, 각 행의 부재 여부를 함께 표시합니다.
        {isLoading
          ? ' 부재 상태를 불러오는 중입니다.'
          : ` 현재 페이지에서 부재로 표시된 사용자는 ${absentCount}명입니다.`}
      </p>
    </div>
  );
}

/** 사용자 상세의 접근 제어 안내. 권한 부여·회수는 권한 그룹 관리 화면이 소유한다. */
export function AccessControlLink({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="pt-10 border-t border-border/50 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <ShieldCheck size={16} aria-hidden="true" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground leading-none mb-1.5">접근 제어</h4>
            <p className="text-sm font-black text-foreground tracking-tighter leading-none">권한 그룹 관리</p>
          </div>
        </div>
        {/* 종전에는 onClick 없는 死버튼이었고, 아래에는 실제 권한과 무관한
            고정 태그 5개(ACCESS_CMS …)가 붙어 있었다(감사 P1-5·P1-6). */}
        <button
          type="button"
          onClick={onOpen}
          className="h-10 px-5 rounded-xl bg-muted hover:bg-surface-inverse text-[10px] font-black text-foreground hover:text-surface-inverse-foreground gap-2 transition-all flex items-center justify-center outline-none cursor-pointer"
        >
          권한 설정 열기 <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
      <p className="text-xs font-bold text-muted-foreground leading-relaxed">
        사용자별 권한은 <span className="text-foreground">권한 그룹 관리</span> 화면에서 부여·회수합니다.
      </p>
    </div>
  );
}

export function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-[var(--control-h-sm)] items-center gap-2 rounded px-4 text-xs font-bold transition-colors',
        active ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <span className={cn(
        "transition-colors shrink-0",
        active ? "text-primary" : "text-muted-foreground"
      )}>
        {icon}
      </span>
      <span>{label}</span>
      {active && (
        <motion.div
          layoutId="activeTabGlow"
          className="absolute right-0 top-0 w-16 h-16 bg-primary/20 rounded-full blur-2xl opacity-40 -mr-8 -mt-8 pointer-events-none"
        />
      )}
    </button>
  );
}

/**
 * '조직 정책' 탭 패널.
 *
 * 종전에는 이 탭이 사용자 목록을 그대로 재사용해, 정책 화면인 척하며 계정 목록을 보여줬다
 * (감사: 사용자/조직 > 부재관리·개인정보정책 D등급). 이 허브에는 정책 편집 기능이 없으므로
 * 실제 편집 화면으로 안내한다 — 없는 기능을 있는 것처럼 그리지 않는다.
 */
export function OrgPolicyPanel({ onNavigate }: { onNavigate: (href: string) => void }) {
  const links: { href: string; title: string; description: string }[] = [
    {
      href: '/admin/security/login-policy',
      title: '로그인 정책 관리',
      description: '사용자별 접속 IP·허용 시간대·2단계 인증(OTP)을 관리합니다.',
    },
    {
      href: '/admin/system/policies',
      title: '개인정보처리방침 · 이용약관',
      // '공개 페이지'가 아니다 — /help/policies/[type] 은 로그인을 요구하고, 본문 조회 API 가
      //   /api/v1/admin/** 아래라 일반 사용자에게는 403 이다(ApiSecurityConfig 실측).
      description: '정책 본문을 편집합니다. 현재 열람은 관리자에게만 가능합니다.',
    },
    {
      href: '/admin/security/authority',
      title: '권한 그룹 관리',
      description: '그룹별 기능권한과 메뉴 표시를 설정하고 사용자에게 하나 이상의 권한 그룹을 배정합니다.',
    },
  ];

  return (
    <div className="space-y-4 py-2">
      <div role="note" className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/50 text-left">
        <Info size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs font-bold text-muted-foreground leading-relaxed">
          조직 정책 편집 기능은 이 허브가 아니라 아래 전용 화면에 있습니다.
        </p>
      </div>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <button
              type="button"
              onClick={() => onNavigate(link.href)}
              className="w-full flex items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/60 transition-all text-left outline-none cursor-pointer"
            >
              <span className="space-y-1">
                <span className="block text-sm font-black text-foreground tracking-tight">{link.title}</span>
                <span className="block text-xs font-bold text-muted-foreground">{link.description}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InfoBlock({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="space-y-4 p-8 rounded-lg bg-muted/50 shadow-inner border border-border transition-all hover:bg-card hover:shadow-2xl hover:scale-105 group cursor-default relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
        {icon}
      </div>
      <h5 className="text-xs font-bold text-muted-foreground/60 tracking-tight flex items-center gap-3 group-hover:text-primary transition-colors relative z-10">
        {icon} {label}
      </h5>
      <p className="text-2xl font-bold tracking-tighter text-foreground truncate leading-none relative z-10 py-1">
        {value}
      </p>
    </div>
  );
}
