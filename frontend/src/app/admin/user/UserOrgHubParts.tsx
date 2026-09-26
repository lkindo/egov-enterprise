'use client';

/**
 * 사용자·조직 허브(UserOrgHubClient)의 표시 전용 부품.
 *
 * 쓰기 동작·잠금·확인 대화는 UserOrgHubClient 가 소유한다(폼 검증 census 의 소유자). 이 파일에는
 * 저장·삭제 호출을 두지 않는다 — 부품은 값을 그리고 콜백을 부를 뿐이다.
 *
 * [2026-09-20] 업무 화면 문법(docs/02-architecture/work-screen-grammar-catalog.md §3·§4)에 맞춰
 * 장식을 걷고 밀도 토큰으로 이행했다. 이 파일이 지키는 규칙은 셋이다.
 *   - 치수는 토큰에서 온다(--filter-pad·--font-size-body·--control-h-sm). 하드코딩 p-8·text-2xl 을
 *     두지 않는다. 그래야 data-density 축(DEC-OPS-015)이 이 화면을 그대로 관통한다.
 *   - 색은 시맨틱 토큰만 쓴다. ⚠ `--warning-emphasis` 는 이 저장소에 **정의돼 있지 않다** —
 *     `text-warning-emphasis` 를 쓰면 Tailwind 가 클래스를 만들지 않아 색이 조용히 사라진다
 *     (퇴역한 네트워크 관리 화면이 처음 기록한 함정이다). 경고 상태는 배경 틴트로 말한다.
 *   - 반복 모션·회전·워터마크를 두지 않는다(카탈로그 §3 금지 목록).
 */
import React, { useId } from 'react';
import { defaultDropAnimationSideEffects, type DropAnimation } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type LucideIcon, Building2, ChevronRight, GripVertical, Info, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOverflowRegion } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { UserManage } from '@/types/foundation/user';
import type { FlattenedDept } from './departments/treeUtils';
import { useAuth } from '@/contexts/AuthContext';
import { canOpenPage } from '@/lib/auth/page-access';

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
                "group relative outline-none",
                isDragging && !isOverlay && "opacity-30",
                isOverlay && "z-[9999] pointer-events-none"
            )}
        >
            {/* 계층 연결선 — 들여쓰기만으로는 몇 단계 아래인지 읽기 어렵다. */}
            {node.depth > 0 && !isOverlay && (
                <>
                    <div className="absolute left-[11px] top-[-4px] bottom-1/2 w-px bg-border" />
                    <div className="absolute left-[11px] top-1/2 h-px w-2.5 bg-border" />
                </>
            )}

            <div
              className={cn(
                "flex w-full items-center gap-0.5 rounded border border-transparent transition-colors",
                "hover:bg-muted",
                isSelected && "border-primary/40 bg-primary/10",
                isOverlay && "border-primary bg-card shadow-lg"
              )}
            >
              <button
                type="button"
                {...attributes}
                {...listeners}
                disabled={isOverlay}
                aria-label={`${node.ognzNm} (${node.ognzId}) 순서 이동 핸들`}
                className="shrink-0 cursor-grab rounded p-1.5 text-muted-foreground hover:bg-card hover:text-foreground active:cursor-grabbing"
              >
                <GripVertical size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                data-a2-master-item={isOverlay ? undefined : ''}
                aria-current={isSelected ? 'true' : undefined}
                tabIndex={isTabStop ? 0 : -1}
                onClick={onClick}
                className="flex min-w-0 flex-1 items-center gap-2 rounded px-1.5 py-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Building2
                  size={14}
                  aria-hidden="true"
                  className={cn("shrink-0", isSelected ? "text-primary" : "text-muted-foreground")}
                />
                {/* 이름과 코드를 한 줄에 둔다 — 두 줄로 쌓으면 행 높이가 두 배가 되는데 코드는 보조 정보다. */}
                <span className={cn(
                    "min-w-0 truncate text-[length:var(--font-size-body)]",
                    isSelected ? "font-semibold text-primary" : "text-foreground"
                )}>
                    {node.ognzNm}
                </span>
                <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                    {node.ognzId}
                </span>
              </button>
            </div>
        </div>
    );
};

/**
 * 마스터(좌측) 영역의 제목 있는 섹션.
 *
 * 종전에는 `compact=false` 분기가 `HubSectionCard`(96px 아이콘 박스 + 400px 블러 오브 + p-12)를
 * 렌더해 **업무 목록을 장식 카드로 감쌌다** — 카탈로그 §3 금지 목록 1행이다. 분기를 걷고
 * 업무형 한 가지 형태만 남긴다.
 */
export function UserOrgMasterSection({
  title,
  description,
  icon: Icon,
  tools,
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  /** 이 모집단에 적용되는 도구(저장 등). 조회 조건은 셸의 조회조건 영역이 소유한다. */
  tools?: React.ReactNode;
  children: React.ReactNode;
}) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex min-h-0 flex-1 flex-col rounded-md border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-[var(--filter-pad)] py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-[length:var(--font-size-body)] font-semibold text-foreground">{title}</h2>
            {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
        {tools && <div className="flex shrink-0 flex-wrap items-center gap-2">{tools}</div>}
      </header>
      <div className="min-h-0 flex-1 p-[var(--filter-pad)]">{children}</div>
    </section>
  );
}

/**
 * 계정 상태 코드(userSttsCd) → 표시 라벨. 일괄 상태 변경 모달의 코드 체계와 동일하다.
 *
 * ⚠ 세 상태 모두 **배경 틴트가 상태를 말하고 글자는 전경 토큰으로 읽는다.** 이유가 둘이다.
 *   - `--warning-emphasis` 는 이 저장소에 정의돼 있지 않아 `text-warning-emphasis` 는 Tailwind 가
 *     클래스를 만들지 않고 색이 조용히 사라진다(퇴역한 네트워크 관리 화면이 기록한 함정).
 *   - `text-success-emphasis` 는 정의돼 있지만 premium 라이트에서 `--success` 와 **같은 값**이라
 *     (premium.css:54,57) 자기 색 10% 틴트 위에서 대비가 4.04:1 로 AA(4.5:1) 미만이 된다.
 *     불투명 카드 위 4.62:1 만 보는 `status-token-contrast` 계약이 그 축을 보지 못한다.
 *     실측: premium light 4.04 / premium dark 9.12 / krds light 6.83 / krds dark 8.22.
 *   `text-foreground` 로 두면 네 축 전부 10:1 이상이고, 상태는 색 하나로만 전달되지 않는다
 *   (라벨 문구가 함께 있다 — WCAG 1.4.1).
 */
export const USER_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  P: { label: '정상', className: 'border-success/40 bg-success/15 text-foreground' },
  A: { label: '승인 대기', className: 'border-warning/40 bg-warning/15 text-foreground' },
  D: { label: '비활성', className: 'border-border bg-muted text-muted-foreground' },
};

/** 계정 상태 배지. 목록 열과 상세 패널이 같은 어휘를 쓰도록 한 곳에서 그린다. */
export function UserStatusBadge({ code }: { code: string | undefined }) {
  const status = USER_STATUS_LABELS[code ?? ''];
  if (!status) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <span className={cn(
      'inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium',
      status.className,
    )}>
      {status.label}
    </span>
  );
}

/** 일괄 작업 모달의 선택 대상 요약. 다섯 명까지 이름을 보이고 나머지는 수로 말한다. */
export function BulkSelectionSummary({ users }: { users: UserManage[] }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-3">
      <p className="mb-2 text-xs text-muted-foreground">선택된 사용자 ({users.length}명)</p>
      <div className="flex flex-wrap gap-1.5">
        {users.slice(0, 5).map(u => (
          <span key={u.userId} className="rounded border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground">{u.userNm}</span>
        ))}
        {users.length > 5 && <span className="text-xs text-muted-foreground">외 {users.length - 5}명</span>}
      </div>
    </div>
  );
}

/**
 * 부재 탭 목록 위의 안내.
 *
 * [2026-09-07] 종전 문구는 "부재 정보는 아직 연동되지 않았습니다" 였다. 이제 연동됐으므로
 * 그 고지를 걷되, 남은 사실 두 가지는 계속 말한다 — 목록은 전체 사용자이고(부재자 필터가 아니다),
 * 조회가 실패하면 전원 정상으로 위장하지 않는다.
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
      <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-left">
        <Info size={14} className="shrink-0 text-destructive-emphasis" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-[length:var(--font-size-body)] text-destructive-emphasis">
          부재 상태를 불러오지 못했습니다. 아래 목록의 부재 여부는 <strong>알 수 없음</strong>이며 정상이라는 뜻이 아닙니다.
          {error instanceof Error ? ` (${error.message})` : ''}
        </p>
        <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0 gap-1.5">
          <RefreshCcw size={14} aria-hidden="true" /> 다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div role="note" className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-left">
      <Info size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="text-[length:var(--font-size-body)] text-muted-foreground">
        아래 목록은 <strong className="font-semibold text-foreground">전체 사용자</strong>이며, 각 행의 부재 여부를 함께 표시합니다.
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
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="min-w-0 text-[length:var(--font-size-body)] text-muted-foreground">
        사용자별 권한은 <span className="font-medium text-foreground">권한 그룹 관리</span> 화면에서 부여·회수합니다.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onOpen} className="shrink-0 gap-1">
        권한 설정 열기 <ChevronRight size={14} aria-hidden="true" />
      </Button>
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
        'flex h-[var(--control-h-sm)] items-center gap-1.5 rounded px-3 text-[length:var(--font-size-body)] transition-colors',
        active
          ? 'bg-background font-semibold text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <span className={cn("shrink-0", active ? "text-primary" : "text-muted-foreground")} aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

/**
 * 조직 정책 탭 패널.
 *
 * 종전에는 이 탭이 사용자 목록을 그대로 재사용해, 정책 화면인 척하며 계정 목록을 보여줬다
 * (감사: 사용자/조직 > 부재관리·개인정보정책 D등급). 이 허브에는 정책 편집 기능이 없으므로
 * 실제 편집 화면으로 안내한다 — 없는 기능을 있는 것처럼 그리지 않는다.
 */
export function OrgPolicyPanel({ onNavigate }: { onNavigate: (href: string) => void }) {
  const { user } = useAuth();
  const allLinks: { href: string; title: string; description: string }[] = [
    {
      href: '/admin/security/login-policy',
      title: '로그인 정책 관리',
      description: '사용자별 접속 IP·허용 시간대·2단계 인증(OTP)을 관리합니다.',
    },
    {
      href: '/admin/system/policies',
      title: '개인정보처리방침 · 이용약관',
      // 공개 페이지가 아니다 — /help/policies/[type] 은 로그인을 요구하고, 본문 조회 API 가
      //   /api/v1/admin/** 아래라 일반 사용자에게는 403 이다(ApiSecurityConfig 실측).
      description: '정책 본문을 편집합니다. 현재 열람은 관리자에게만 가능합니다.',
    },
    {
      href: '/admin/security/authority',
      title: '권한 그룹 관리',
      description: '그룹별 기능권한과 메뉴 표시를 설정하고 사용자에게 하나 이상의 권한 그룹을 배정합니다.',
    },
  ];
  // 들어갈 수 없는 화면은 목록에서 뺀다 — 라우트 게이트와 같은 판정이다(DIP B4 P1).
  const links = allLinks.filter((link) => canOpenPage(user, link.href));

  return (
    <div className="space-y-3">
      <div role="note" className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-left">
        <Info size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-[length:var(--font-size-body)] text-muted-foreground">
          조직 정책 편집 기능은 이 허브가 아니라 아래 전용 화면에 있습니다.
        </p>
      </div>
      {links.length === 0 && (
        <p role="status" className="text-[length:var(--font-size-body)] text-muted-foreground">
          열 수 있는 정책 화면이 없습니다. 정책을 바꾸려면 해당 화면 권한이 있는 관리자에게 요청해 주세요.
        </p>
      )}
      <ul className="divide-y divide-border rounded-md border border-border bg-card">
        {links.map((link) => (
          <li key={link.href}>
            <button
              type="button"
              onClick={() => onNavigate(link.href)}
              className="flex w-full items-center justify-between gap-3 px-[var(--filter-pad)] py-2.5 text-left outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            >
              <span className="min-w-0">
                <span className="block text-[length:var(--font-size-body)] font-semibold text-foreground">{link.title}</span>
                <span className="block text-xs text-muted-foreground">{link.description}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 상세 패널의 항목 묶음.
 *
 * 종전 `InfoBlock` 은 라벨·값 한 쌍에 `p-8`(사방 32px) + `text-2xl` + 워터마크 아이콘 +
 * `hover:scale-105 hover:shadow-2xl` 을 썼다 — 값 하나가 세로 약 120px 을 차지해 네 항목을
 * 보는 데 스크롤이 필요했다. 정의 목록(`dl`)으로 바꿔 항목당 세로 약 42px 로 줄인다.
 */
/**
 * 상세 패널 본문의 스크롤 영역.
 *
 * 부서 탭에서는 이 안에 포커스 가능한 자손이 하나도 없다 — 액션은 패널 헤더가 갖고, 권한 안내는
 * 사용자 탭 전용이다. 그런데 부서 설명은 4,000자까지 들어가고 정의 목록은 의도적으로 truncate 하지
 * 않으므로 고정 높이 안에서 실제로 넘친다. 그러면 키보드만 쓰는 사용자는 잘린 내용을 볼 방법이
 * 없다(axe `scrollable-region-focusable`, WCAG 2.1.1).
 *
 * ⚠ 이 훅은 **스크롤 노드와 같은 컴포넌트에서** 불러야 한다. 허브에서 부르고 props 만 내려보내면
 *   동작하지 않는다 — 상세 패널은 항목을 선택해야 마운트되는데, 훅의 `useLayoutEffect` 는 deps 가
 *   고정(`enabled` 상수)이라 허브가 마운트될 때 `ref.current === null` 로 한 번 돌고 다시 돌지
 *   않는다. 그래서 role·tabIndex·이름이 한 번도 붙지 않는다. 소스 문자열만 보는 계약은 그 배선을
 *   통과시키므로 이 컴포넌트의 계약 테스트가 **렌더 결과**로 고정한다.
 */
export function DetailScrollArea({ children }: { children: React.ReactNode }) {
  const scrollRegionProps = useOverflowRegion<HTMLDivElement>('상세 정보 스크롤 영역');

  return (
    <div
      {...scrollRegionProps}
      className="min-h-0 flex-1 space-y-3 overflow-y-auto p-[var(--filter-pad)] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      {children}
    </div>
  );
}

export function DetailFieldList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-4 sm:grid-cols-2', className)}>
      {children}
    </dl>
  );
}

export function DetailField({
  label,
  value,
  span,
}: {
  label: string;
  value: React.ReactNode;
  /** 주소처럼 긴 값은 두 열을 다 쓴다. */
  span?: boolean;
}) {
  return (
    <div className={cn('min-w-0 border-b border-border/60 py-1.5', span && 'sm:col-span-2')}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      {/* ⚠ truncate 를 쓰지 않는다 — 선택한 항목의 이름·연락처는 생략이 허용되는 보조 정보가
          아니다(프런트엔드 헌법 제16조 2항). 길면 줄바꿈으로 전부 보인다. */}
      <dd className="mt-0.5 break-words text-[length:var(--font-size-body)] font-medium text-foreground">
        {value}
      </dd>
    </div>
  );
}
