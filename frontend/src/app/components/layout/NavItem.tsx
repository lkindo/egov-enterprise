'use client';

import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import type { ComponentProps, ElementType, ReactNode } from 'react';
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
import {
  NO_QUERY_DISCRIMINATORS,
  collectQueryDiscriminators,
  matchesLocation,
  subtreeMatchesLocation,
  type QueryDiscriminators,
} from '@/lib/navigation/active-menu';

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

/**
 * 같은 경로를 쿼리로 나눠 쓰는 메뉴 목록. 사이드바·모바일 내비가 자기 메뉴 트리로 채운다.
 *
 * 이 값이 없으면(기본 빈 Map) 쿼리 없는 메뉴는 아무에게도 양보하지 않는다 — 즉 화면이 붙인
 * 표 페이지·검색어·필터 쿼리 때문에 활성 표시를 잃는 일이 없다. 판정 규칙은 active-menu.ts 참조.
 */
const QueryDiscriminatorContext = createContext<QueryDiscriminators>(NO_QUERY_DISCRIMINATORS);

export function NavQueryScope({ menus, children }: { menus: readonly MenuInfo[]; children: ReactNode }) {
  const discriminators = useMemo(() => collectQueryDiscriminators(menus), [menus]);
  return (
    <QueryDiscriminatorContext.Provider value={discriminators}>
      {children}
    </QueryDiscriminatorContext.Provider>
  );
}

interface NavItemProps {
  item: MenuInfo;
  depth?: number;
}

export function NavItem({ item, depth = 0 }: NavItemProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const discriminators = useContext(QueryDiscriminatorContext);
  const { setSidebarOpen } = useLayout();
  const hasChildren = item.children && item.children.length > 0;
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const Icon = ICON_MAP[item.menuNm] || ICON_MAP['기본'];

  // URL normalization and mapping
  const href = resolveMenuInternalRoute(item);

  // 자신 또는 후손이 현재 위치(경로 + 쿼리)와 일치할 때 활성. 판정 규칙은 active-menu.ts 주석 참조.
  const isActive = useMemo(
    () => subtreeMatchesLocation(item, String(pathname), searchParams, discriminators),
    [item, pathname, searchParams, discriminators]
  );

  // aria-current="page" 는 IA §7.3 의 canonical node 선언이다. isActive(자손 포함)에 달면
  // 조상 그룹까지 '현재 페이지'를 사칭하므로 자기 자신 일치에만 단다.
  const isCurrentPage = useMemo(
    () => matchesLocation(href, String(pathname), searchParams, discriminators),
    [href, pathname, searchParams, discriminators]
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
