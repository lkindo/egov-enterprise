'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ComponentProps, ElementType } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarDays,
  MessageSquare,
  Settings,
  Users,
  ShieldCheck,
  CircleDot,
  ChevronDown,
  UserCircle,
  BarChart3,
  BookOpen,
  ClipboardList,
  FileText,
  Building2,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useLayout } from '@/contexts/LayoutContext';
import { MenuInfo } from '@/types/foundation/menu';
import { resolveMenuInternalRoute } from '@/lib/navigation/internal-route';

const ICON_MAP: Record<string, ElementType> = {
  '대시보드': LayoutDashboard,
  '관리자': Settings,
  '사용자관리': Users,
  '사용자 계정 및 권한 관리': Users,
  '보안관리': ShieldCheck,
  '통합 보안 및 접속 정책': ShieldCheck,
  '시스템관리': Settings,
  '시스템 설정': Settings,
  '게시판': MessageSquare,
  '업무': Users,
  '일정관리': CalendarDays,
  '스마트 일정/일지 관리': CalendarDays,
  '통계': LayoutDashboard,
  '감사 및 통계 모니터링': BarChart3,
  '알림마당': BookOpen,
  '사용자지원': UserCheckIcon,
  '설문조사': ClipboardList,
  '설문조사 및 투표 센터': ClipboardList,
  '마이페이지': UserCircle,
  '마이페이지관리': Settings,
  '공통코드관리': Database,
  '행정코드관리': Database,
  '기관코드수신': Database,
  '로그관리': FileText,
  '조직도 및 부서 관리': Building2,
  '기본': CircleDot
};

// Users 아이콘이 이미 임포트되어 있으므로 UserCheck를 명시적으로 대응합니다.
function UserCheckIcon(props: ComponentProps<typeof Users>) {
  return <Users {...props} />;
}

/** 읽기 전용 쿼리 접근자 (next/navigation 의 ReadonlyURLSearchParams 와 URLSearchParams 를 모두 수용) */
type QueryParams = { get(name: string): string | null; toString(): string };

/**
 * 현재 위치가 이 메뉴 자신을 가리키는지 판정한다.
 *
 * ⚠ usePathname() 은 쿼리스트링을 제외한 경로만 돌려준다. 이 프로젝트의 메뉴는 상당수가 같은 경로에
 *   쿼리만 다른 형태다 (개인 및 부서 일정=/admin/work-hub?tab=job, 업무 보고 및 보고함=/admin/work-hub).
 *   과거처럼 pathname.startsWith(href) 로만 비교하면 "/admin/work-hub".startsWith("/admin/work-hub?tab=job")
 *   가 false 라 쿼리를 가진 메뉴는 영영 활성화되지 못하고, 쿼리 없는 형제가 대신 활성화됐다.
 *   그래서 경로와 쿼리를 함께 판정한다.
 */
function matchesLocation(href: string | null, pathname: string, searchParams: QueryParams): boolean {
  if (!href) return false;
  const [hrefPath, hrefQuery] = href.split('?');

  // prefix 오매칭 방지: '/admin/work-hub' 가 '/admin/work-hub-archive' 를 잡지 않도록
  // 정확 일치이거나 '/' 로 끊기는 하위 경로일 때만 경로가 맞은 것으로 본다.
  if (pathname !== hrefPath && !pathname.startsWith(`${hrefPath}/`)) return false;

  if (hrefQuery) {
    // 쿼리로 특정되는 메뉴: 명시된 파라미터가 모두 현재 URL 과 일치해야 한다.
    const expected = new URLSearchParams(hrefQuery);
    let allMatch = true;
    expected.forEach((value, key) => {
      if (searchParams.get(key) !== value) allMatch = false;
    });
    return allMatch;
  }

  // 쿼리가 없는 메뉴: 현재 URL 에도 구분 쿼리가 없을 때만 활성으로 본다.
  // (형제가 ?tab=... 로 갈라지는 경우, 더 구체적인 형제에게 활성 상태를 양보한다.)
  return searchParams.toString() === '';
}

/** 자신 또는 후손 중 하나라도 현재 위치와 일치하면 true. 부모 강조·자동 펼침 판정에 쓴다. */
function subtreeMatchesLocation(item: MenuInfo, pathname: string, searchParams: QueryParams): boolean {
  if (matchesLocation(resolveMenuInternalRoute(item), pathname, searchParams)) return true;
  return (item.children || []).some((child) => subtreeMatchesLocation(child, pathname, searchParams));
}

interface NavItemProps {
  item: MenuInfo;
  depth?: number;
}

export function NavItem({ item, depth = 0 }: NavItemProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setSidebarOpen } = useLayout();
  const hasChildren = item.children && item.children.length > 0;
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const Icon = ICON_MAP[item.menuNm] || ICON_MAP['기본'];

  // URL normalization and mapping
  const href = resolveMenuInternalRoute(item);

  // 자신 또는 후손이 현재 위치(경로 + 쿼리)와 일치할 때 활성. 판정 규칙은 matchesLocation 주석 참조.
  const isActive = useMemo(
    () => subtreeMatchesLocation(item, String(pathname), searchParams),
    [item, pathname, searchParams]
  );

  // aria-current="page" 는 IA §7.3 의 canonical node 선언이다. isActive(자손 포함)에 달면
  // 조상 그룹까지 '현재 페이지'를 사칭하므로 자기 자신 일치에만 단다.
  const isCurrentPage = useMemo(
    () => matchesLocation(href, String(pathname), searchParams),
    [href, pathname, searchParams]
  );

  useEffect(() => {
    setIsMounted(true);
    if (isActive && hasChildren) {
      setIsOpen(true);
    }
  }, [isActive, hasChildren]);

  
  const isRestricted = !href && !hasChildren;

  const handleLinkClick = () => {
    setSidebarOpen(false);
  };

  const isNonNavigable = href === null;

  const innerContent = (
    <div className={cn(
      "flex items-center justify-between gap-3 px-3 py-2.5 text-[13px] font-bold tracking-tight rounded-[var(--radius-hub-item)] transition-all duration-300 w-full group focus-visible:outline-none relative hover:translate-x-1 hover:bg-surface-inverse hover:text-surface-inverse-foreground",
      isActive
        ? "bg-surface-inverse text-surface-inverse-foreground shadow-xl"
        : "text-muted-foreground hover:bg-surface-inverse hover:text-surface-inverse-foreground",
      isRestricted && "opacity-40 cursor-not-allowed grayscale",
      hasChildren && !isNonNavigable && "pr-12",
      depth === 1 && "pl-10",
      depth === 2 && "pl-14",
      depth >= 3 && "pl-16",
      depth > 0 && "font-bold"
    )}>
      <div className="flex items-center gap-3">
        {Icon && depth === 0 && (
          <Icon
            size={18}
            className={cn(
              "transition-transform duration-200 group-hover:scale-110",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          />
        )}
        {depth > 0 && (
          <div className={cn(
            "absolute left-4 w-1.5 h-1.5 rounded-full border border-current opacity-80 transition-transform duration-200",
            isActive ? "bg-primary border-primary scale-110 opacity-100" : "group-hover:scale-110"
          )} 
          style={{ left: `${(depth * 12) + 12}px` }}
          />
        )}
        <span className={cn("truncate", depth > 0 && "text-[13px]")}>{item.menuNm}</span>
      </div>
      {/* [a11y] isDummyLink 인 경우 바깥 래퍼가 이미 <button>(하위 메뉴 토글)이다. 그 안에 다시 토글
          <button> 을 두면 **버튼 중첩**이 되어 axe `nested-interactive` 위반이자 유효하지 않은 HTML 이며,
          React 도 개발 모드에서 "<button> cannot contain a nested <button>" 경고를 냈다(2026-07-27 확인).
          게다가 두 버튼은 같은 동작(setIsOpen)이라 기능적으로도 중복이다.
          → 래퍼가 버튼인 경우 셰브론은 **장식**으로만 렌더하고, 링크인 경우에만 독립 토글 버튼을 둔다
            (링크는 이동, 버튼은 펼침으로 역할이 갈리므로 그때는 중첩이 아니다). */}
      {hasChildren && isNonNavigable && (
        <span aria-hidden="true" className="p-1">
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} className="opacity-60" />
          </motion.div>
        </span>
      )}
    </div>
  );

  if (!isMounted) return null;

  return (
    <div className="w-full relative">
      {isNonNavigable ? (
        <button
          type="button"
          disabled={!hasChildren}
          aria-disabled={!hasChildren ? true : undefined}
          aria-expanded={hasChildren ? isOpen : undefined}
          aria-label={hasChildren ? `${item.menuNm} 하위 메뉴 토글` : `${item.menuNm} 이동 불가`}
          className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[var(--radius-hub-item)]"
          onClick={hasChildren ? () => setIsOpen(!isOpen) : undefined}
        >
          {innerContent}
        </button>
      ) : (
        <>
          <Link
            href={href}
            aria-current={isCurrentPage ? 'page' : undefined}
            className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[var(--radius-hub-item)]"
            onClick={handleLinkClick}
          >
            {innerContent}
          </Link>
          {hasChildren && (
          <button
            type="button"
            aria-label={`${item.menuNm} 서브메뉴 ${isOpen ? '접기' : '펼치기'}`}
            aria-expanded={isOpen}
            className="absolute right-2 top-1/2 flex min-h-7 min-w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => setIsOpen(!isOpen)}
          >
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown size={14} className="opacity-60" />
            </motion.div>
          </button>
          )}
        </>
      )}

      {hasChildren && isOpen && (
        <div className={cn(
          "mt-1 space-y-0.5 relative",
          depth === 0 && "ml-5 border-l border-border/40"
        )}>
          {item.children?.map((child, idx) => (
            <NavItem key={child.menuNo || `child-${idx}`} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
