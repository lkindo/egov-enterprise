'use client';

import React, { useRef, useState, use } from 'react';
import { useTheme } from 'next-themes';
import {
  Moon,
  Sun,
  Bell,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Info,
  Menu,
  X,
  LayoutGrid,
  Users,
  HeartHandshake,
  ShieldCheck,
  KeyRound,
  UserCog,
  CircleDot
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isAdministrativeRole } from '@/lib/auth/administrative-role';
import { useLayout } from '@/contexts/LayoutContext';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { AppNotificationDrawer } from '../ui/app-notification-drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { menuService } from '@/services/business/user/MenuService';
import { MenuInfo } from '@/types/foundation/menu';
import { HeaderSearchParamSync } from './HeaderSearchParamSync';
import {
  normalizeInternalRoute,
  resolveMenuInternalRoute,
} from '@/lib/navigation/internal-route';
import { SITE_IDENTITY } from '@/config/site-identity';
import dynamic from 'next/dynamic';
import { userService } from '@/services/business/user/userService';
import { useToast } from '@/app/components/ui/toast';
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm';
import { ProfileEditForm } from '@/components/account/ProfileEditForm';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import type { UserDto } from '@/types/foundation/user';

const StandardModal = dynamic(
  () => import('@/app/components/ui/standard-modal').then((mod) => mod.StandardModal),
  { ssr: false },
);

const DOMAIN_ICON_MAP: Record<number, React.ComponentType<{ size?: number; className?: string }>> = {
  1000000: LayoutGrid, // 워크스페이스
  2000000: Users, // 커뮤니티
  3000000: HeartHandshake, // 고객지원센터
  9000000: ShieldCheck, // 통합 관리 센터
};

const DOMAIN_ROUTE_MAP: Record<number, string> = {
  1000000: '/admin/work-hub',
  2000000: '/admin/collaboration',
  9000000: '/admin/system/menus',
};

export function Header({ 
  initialMenus = [],
  menusPromise
}: { 
  initialMenus?: MenuInfo[];
  menusPromise?: Promise<MenuInfo[]>;
}) {
  const resolvedMenus = menusPromise ? use(menusPromise) : initialMenus;
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { user, logout } = useAuth();
  const isAdministrativeUser = isAdministrativeRole(user?.role);
  const { isSidebarOpen, toggleSidebar, activeMenuNo, setActiveMenuNo } = useLayout();
  const { notifications, unreadCount, error: notificationsError, markAsRead, markAllAsRead, removeNotification, refresh: refreshNotifications } = useNotifications();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  /*
    [2026-09-08] 본인 비밀번호 변경. 서버(PUT /users/me/password)와 userService.changePassword 는
    있었는데 호출부가 0 이었다 — DEC-OPS-032 가 관리자 초기화만 열었고, 정작 사용자가 자기
    비밀번호를 바꿀 경로는 어디에도 없었다. 계정 메뉴에 두는 이유는 새 라우트·URL 상태를 만들지
    않기 위해서다(DEC-OPS-037 의 다이얼로그 선례).
  */
  const { toast } = useToast();
  const [isPasswordOpen, setPasswordOpen] = useState(false);
  const [isPasswordPending, setPasswordPending] = useState(false);
  /*
    [2026-09-08] 내 프로필 수정. `PUT /users/me` 와 userService.updateMe 도 호출부가 0 이었다 —
    사용자는 전화번호 한 칸을 고치려 해도 관리자에게 부탁해야 했다. 현재 값을 먼저 읽어 폼을
    채운 뒤 여는 이유는, 빈 폼을 먼저 보여 주면 사용자가 그 상태를 '내 정보가 비어 있다' 로
    읽고 지움 의도로 저장할 수 있기 때문이다(서버 계약상 빈 문자열은 실제로 지움이다).
  */
  const [profileInitial, setProfileInitial] = useState<UserDto | null>(null);
  const [isProfilePending, setProfilePending] = useState(false);
  // 저장 요청 자체의 재진입 잠금. state 는 리렌더 뒤에야 반영되므로 같은 틱의 두 번째 제출을
  // 막지 못한다 — 폼 안쪽 잠금과 별개로 이 경계도 자기 잠금을 갖는다.
  const profilePendingRef = useRef(false);
  const [isProfileLoading, setProfileLoading] = useState(false);

  const openProfile = async () => {
    if (isProfileLoading) return;
    setProfileLoading(true);
    try {
      setProfileInitial(await userService.getMe());
    } catch (error: unknown) {
      toast(extractErrorMessage(error, '내 정보를 불러오지 못했습니다.'), 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // 서버 prefetch 가 비어 있으면(토큰 부재·백엔드 장애) 클라이언트가 직접 조회해 GNB 를 복구한다.
  // 기존에는 서버가 준 값을 그대로 쓰기만 해(const menus = resolvedMenus) 복구 수단이 전혀 없었다.
  // Sidebar 와 동일한 queryKey 를 사용하므로 캐시를 공유하며 중복 요청은 발생하지 않는다.
  const { data: menus = [] } = useQuery({
    queryKey: ['menus', 'head'],
    queryFn: () => menuService.getHeadMenus(),
    initialData: resolvedMenus.length > 0 ? resolvedMenus : undefined,
    staleTime: 5 * 60 * 1000,
  });

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // 네트워크 실패가 현재 화면의 캐시된 사용자 데이터를 계속 노출하게 두지 않는다.
    } finally {
      router.replace('/login');
    }
  };

  return (
    <header
      data-sidebar-modal-background="header"
      className="sticky top-0 z-[100] w-full border-b border-border bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60"
    >
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <React.Suspense fallback={null}>
        <HeaderSearchParamSync menus={menus} activeMenuNo={activeMenuNo} setActiveMenuNo={setActiveMenuNo} />
      </React.Suspense>
      <div className="flex h-11 items-center px-4 md:px-6 gap-3 sm:gap-4">
        {/* Mobile Sidebar Toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="lg:hidden text-muted-foreground mr-1" 
          onClick={toggleSidebar} 
          aria-label={isSidebarOpen ? '주 메뉴 닫기' : '주 메뉴 열기'}
          aria-expanded={isSidebarOpen}
          aria-controls="primary-sidebar"
        >
          {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </Button>

        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80 shrink-0">
          <div className="w-10 h-10 bg-surface-inverse rounded-[var(--radius-hub-item)] flex items-center justify-center shadow-lg">
            <span className="text-surface-inverse-foreground font-bold text-lg">{SITE_IDENTITY.logoMark}</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-bold leading-tight text-foreground">{SITE_IDENTITY.brandName}</span>
            <span className="text-xs text-muted-foreground font-semibold tracking-tight">{SITE_IDENTITY.sitePortalName}</span>
          </div>
        </Link>

        <div className="flex-1 flex justify-center">
          <nav className="hidden xl:flex items-center gap-1 bg-muted/50 p-1.5 rounded-[var(--radius-hub-item)] border border-border" aria-label="주메뉴 네비게이션">
            {menus.map((menu, index) => {
              const Icon = DOMAIN_ICON_MAP[menu.menuNo] || CircleDot;
              const isActive = activeMenuNo === menu.menuNo;
              
              const targetRoute = resolveMenuInternalRoute(menu)
                ?? normalizeInternalRoute(DOMAIN_ROUTE_MAP[menu.menuNo]);
              const itemClassName = cn(
                "inline-flex items-center justify-center whitespace-nowrap px-6 h-10 font-bold text-xs tracking-tight transition-all rounded-[var(--radius-hub-item)] gap-2.5",
                isActive
                  ? "bg-surface-inverse text-surface-inverse-foreground shadow-xl"
                  : "text-muted-foreground hover:text-foreground hover:bg-card"
              );
              const itemContent = (
                <>
                  <Icon size={14} className={cn("transition-transform", isActive ? "scale-110" : "opacity-100")} />
                  {menu.menuNm}
                </>
              );

              return targetRoute ? (
                <Link
                  key={menu.menuNo || `head-${index}`}
                  href={targetRoute}
                  aria-label={menu.menuNm}
                  // 활성 도메인은 섹션 표지라 'true' — 'page' 는 하위 화면에서 페이지 사칭이 된다(IA §7.3).
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => {
                    setActiveMenuNo(menu.menuNo);
                  }}
                  className={itemClassName}
                >
                  {itemContent}
                </Link>
              ) : (
                <button
                  key={menu.menuNo || `head-${index}`}
                  type="button"
                  disabled
                  aria-disabled="true"
                  aria-label={`${menu.menuNm} 이동 불가`}
                  className={cn(itemClassName, 'cursor-not-allowed opacity-50')}
                >
                  {itemContent}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Link
            href="/help"
            title="메뉴구성 설명"
            aria-label="메뉴구성 설명"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "hidden md:flex text-muted-foreground")}
          >
            <Info size={20} />
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="text-muted-foreground"
            title="테마 변경"
            aria-label="테마 변경"
          >
            <Moon size={20} aria-hidden="true" className="dark:hidden" />
            <Sun size={20} aria-hidden="true" className="hidden dark:block" />
          </Button>

          <Button
            id="e2e-bell-button"
            variant="ghost"
            size="icon"
            onClick={() => setIsNotifOpen(true)}
            aria-label={unreadCount > 0 ? `알림, 읽지 않음 ${unreadCount}건` : "알림"}
            className={cn(
              "relative text-muted-foreground transition-all group",
              unreadCount > 0 && "text-primary bg-primary/5 ring-4 ring-primary/5"
            )}
          >
            <Bell size={20} className={cn(unreadCount > 0 && "animate-bounce-subtle")} />
            {unreadCount > 0 && (
              <Badge aria-hidden="true" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-rose-500 text-white border-2 border-background font-bold text-xs shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>

          <div className="flex items-center gap-2 pl-2 md:pl-3 border-l ml-1 md:ml-2">
            {user ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2.5 pl-2 pr-1.5 h-11 hover:bg-muted rounded-[var(--radius-hub-item)] border border-transparent hover:border-border transition-all" aria-label="사용자 계정 메뉴">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                        <User size={16} />
                      </div>
                      <div className="flex flex-col items-start mr-1 hidden sm:flex">
                        <span className="text-sm font-bold leading-none">{user.name}</span>
                        <span className="text-xs text-muted-foreground font-semibold mt-0.5 tracking-tight">{isAdministrativeUser ? '관리자' : '사용자'}</span>
                      </div>
                      <ChevronDown size={14} className="text-muted-foreground hidden sm:block" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2 mt-1" align="end">
                    <div className="px-3 py-2 border-b mb-1">
                      <p className="text-sm font-bold">{user.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.id}</p>
                    </div>
                    <div className="space-y-0.5">
                      {isAdministrativeUser && (
                        <>
                          <Link href="/admin/workspace/my-page" aria-label="마이페이지 환경 설정 이동" className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start text-sm h-9 gap-2 font-medium")}>
                            <span className="flex items-center gap-2"><User size={14} /> 마이페이지 환경 설정</span>
                          </Link>
                          <Link href="/admin/system/menus" aria-label="시스템 메뉴 관리 이동" className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start text-sm h-9 gap-2 font-medium")}>
                            <span className="flex items-center gap-2"><Settings size={14} /> 시스템 메뉴 관리</span>
                          </Link>
                          <div className="h-px bg-muted my-1" />
                        </>
                      )}
                      <Button
                        variant="ghost"
                        aria-label="내 정보 수정"
                        className="w-full justify-start text-sm h-9 gap-2 font-medium"
                        onClick={openProfile}
                        disabled={isProfileLoading}
                      >
                        <UserCog size={14} /> {isProfileLoading ? '불러오는 중…' : '내 정보 수정'}
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label="비밀번호 변경"
                        className="w-full justify-start text-sm h-9 gap-2 font-medium"
                        onClick={() => setPasswordOpen(true)}
                      >
                        <KeyRound size={14} /> 비밀번호 변경
                      </Button>
                      <Button
                        variant="ghost"
                        aria-label="로그아웃"
                        className="w-full justify-start text-sm h-9 gap-2 text-destructive-emphasis hover:text-destructive-emphasis hover:bg-destructive/10 font-medium"
                        onClick={handleLogout}
                      >
                        <LogOut size={14} /> 로그아웃
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <Link href="/login" aria-label="로그인 이동" className={cn(buttonVariants({ size: "sm" }), "rounded-[var(--radius-hub-item)] h-10 px-6 font-bold text-xs tracking-normal uppercase font-mono bg-surface-inverse text-surface-inverse-foreground shadow-xl hover:bg-primary transition-all")}>
                  로그인
                </Link>
              )}
          </div>
        </div>
      </div>

      <AppNotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onMarkRead={markAsRead}
        onMarkAllRead={markAllAsRead}
        onDelete={removeNotification}
        // [2026-08-04] 조회 실패를 드로어까지 전달한다. 이 배선이 없으면 훅이 오류를 알아도
        //   화면은 여전히 '활성화된 알림이 없습니다' 를 렌더한다(상태만 만들고 배선하지 않는 것은
        //   고친 것이 아니다 — 12축 감사 클러스터 D).
        error={notificationsError}
        onRetry={refreshNotifications}
        notifications={(notifications || []).filter(Boolean).map((n) => ({
          id: n.notiSn,
          title: n.notiTtlNm,
          message: n.notiCn,
          time: n.notiDt,
          isRead: n.readYn === 'Y',
          type: n.type,
          // [2026-09-02] 서버가 계산해 저장한 목적지를 화면까지 나른다. 훅이 이미 내부 경로로
          //   검증했으므로(normalizeInternalRoute) 신뢰할 수 없는 값은 null 로 온다.
          linkUrl: n.linkUrl ?? null,
        }))}
      />

      <StandardModal
        isOpen={profileInitial !== null}
        onClose={() => { if (!isProfilePending) setProfileInitial(null); }}
        title="내 정보 수정"
        maxWidth="lg"
      >
        {profileInitial ? (
          <ProfileEditForm
            isPending={isProfilePending}
            initialValues={profileInitial}
            onCancel={() => { if (!isProfilePending) setProfileInitial(null); }}
            onSubmit={async (patch) => {
              if (profilePendingRef.current) return;
              profilePendingRef.current = true;
              setProfilePending(true);
              try {
                await userService.updateMe(patch);
                toast('내 정보를 저장했습니다.', 'success');
                setProfileInitial(null);
              } finally {
                // 실패는 폼이 필드 오류·안내로 처리하도록 그대로 올려보낸다(입력 보존).
                profilePendingRef.current = false;
                setProfilePending(false);
              }
            }}
          />
        ) : null}
      </StandardModal>

      <StandardModal
        isOpen={isPasswordOpen}
        onClose={() => { if (!isPasswordPending) setPasswordOpen(false); }}
        title="비밀번호 변경"
        maxWidth="md"
      >
        <ChangePasswordForm
          isPending={isPasswordPending}
          onCancel={() => { if (!isPasswordPending) setPasswordOpen(false); }}
          onSubmit={async (oldPassword, newPassword) => {
            setPasswordPending(true);
            try {
              await userService.changePassword(oldPassword, newPassword);
              toast('비밀번호를 변경했습니다.', 'success');
              setPasswordOpen(false);
            } finally {
              // 실패는 폼이 필드 오류·안내로 처리하도록 그대로 올려보낸다(입력 보존).
              setPasswordPending(false);
            }
          }}
        />
      </StandardModal>
    </header>
  );
}

