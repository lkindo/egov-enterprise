import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, 
  ArrowRight, 
  LogOut, 
  ShieldCheck, 
  LayoutDashboard, 
  Zap, 
  Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShortcut } from './global-shortcut-provider';
import { menuService } from '@/services/business/user/MenuService';
import { useAuth } from '@/contexts/AuthContext';
import {
  normalizeInternalRoute,
  resolveMenuInternalRoute,
} from '@/lib/navigation/internal-route';

interface CommandItem {
  id: string;
  name: string;
  url?: string;
  action?: () => void | Promise<void>;
  category: '메뉴' | '액션' | '시스템' | '검색';
  icon?: React.ReactNode;
  description?: string;
}

export function GlobalCommandCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menus, setMenus] = useState<CommandItem[]>([]);
  const [, setIsSearching] = useState(false);

  const router = useRouter();
  const { logout } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  const restorePreviousFocus = useCallback(() => {
    const previouslyFocusedElement = previouslyFocusedElementRef.current;
    previouslyFocusedElementRef.current = null;

    if (previouslyFocusedElement?.isConnected) {
      previouslyFocusedElement.focus();
    }
  }, []);

  const openCommandCenter = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      previouslyFocusedElementRef.current = document.activeElement;
    }
    setSelectedIndex(0);
    setSearch('');
    setIsOpen(true);
  }, []);

  const closeCommandCenter = useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);

  // 1. 단축키 등록 (CMD/Ctrl+K)
  useShortcut('k', true, () => {
    if (isOpen) {
      closeCommandCenter();
    } else {
      openCommandCenter();
    }
  });

  // 2. 초기 메뉴 데이터 로드
  useEffect(() => {
    async function fetchAllMenus() {
      if (!isOpen) return;

      setIsSearching(true);
      try {
        const head = await menuService.getHeadMenus();
        if (head && head.length > 0) {
          const allHead: CommandItem[] = head.flatMap(m => {
            const url = resolveMenuInternalRoute(m);
            return url ? [{
              id: `cmd-head-${m.menuNo}`,
              name: m.menuNm,
              url,
              category: '메뉴' as const,
              icon: <LayoutDashboard size={16} />
            }] : [];
          });

          setMenus(allHead);

          // 하위 메뉴 로드
          for (const m of head) {
            void menuService.getLeftMenus(m.menuNo).then(left => {
              if (left && left.length > 0) {
                const subItems: CommandItem[] = left.flatMap((l) => {
                  const url = resolveMenuInternalRoute(l);
                  return url ? [{
                    id: `cmd-left-${m.menuNo}-${l.menuNo}`,
                    name: `${m.menuNm} > ${l.menuNm}`,
                    url,
                    category: '메뉴' as const,
                    icon: <ArrowRight size={14} />
                  }] : [];
                });
                setMenus(prev => {
                  const existingIds = new Set(prev.map(i => i.id));
                  const newItems = subItems.filter(i => !existingIds.has(i.id));
                  return [...prev, ...newItems];
                });
              }
            }).catch(() => undefined);
          }
        }
      } catch {
        // 메뉴 조회 실패 시에도 로그아웃 같은 로컬 안전 작업은 계속 제공한다.
      } finally {
        setIsSearching(false);
      }
    }
    if (isOpen && menus.length === 0) fetchAllMenus();
  }, [isOpen, menus.length]); 

  // 3. 고정 액션 정의
  // 관리자 mutation이나 구현 상태가 섞인 화면을 여기서 추정해 노출하지 않는다.
  // 권한별 업무 메뉴는 backend가 현재 authority로 필터링한 menuService 응답만 사용한다.
  const logoutAndLeaveAuthenticatedSurface = useCallback(async () => {
    try {
      await logout();
    } catch {
      // 세션 종료 API 실패가 화면 이탈을 막으면 캐시된 민감 화면이 남을 수 있다.
    } finally {
      router.replace('/login');
    }
  }, [logout, router]);

  const quickActions: CommandItem[] = useMemo(() => [
    { id: 'act-collab', name: '협업 통합 허브', url: '/admin/collaboration', icon: <Users size={16} />, category: '메뉴', description: '주소록과 협업 기능으로 이동' },
    { id: 'sys-logout', name: '로그아웃', action: logoutAndLeaveAuthenticatedSurface, icon: <LogOut size={16} />, category: '시스템' },
  ], [logoutAndLeaveAuthenticatedSurface]);

  // 4. 통합 검색 필터링
  const filteredItems = useMemo(() => {
    const combined = [...quickActions, ...menus];

    // 검색어가 있을 경우 필터링
    let results = search
      ? combined.filter(item =>
        ((item.name || '')).toLowerCase().includes(search.toLowerCase()) ||
        ((item.category || '')).toLowerCase().includes(search.toLowerCase())
      )
      : combined;

    // 만약 일치하는 게 없다면 광역 검색 제안 추가
    if (search && results.length === 0) {
      results = [{
        id: 'global-search',
        name: `"${search}" 검색어로 사이트 전체 검색`,
        url: `/search?q=${encodeURIComponent(search)}`,
        category: '검색',
        icon: <Search size={16} />
      }];
    }

    return results.slice(0, 10);
  }, [search, menus, quickActions]);

  // 5. 핸들바 및 포커스 관리
  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    const modalLayer = dialog?.parentElement;
    if (!dialog || !modalLayer) return;

    const snapshots = new Map<HTMLElement, {
      ariaHidden: string | null;
      inert: string | null;
    }>();

    const isolateSiblingSubtrees = () => {
      let activeBranch: HTMLElement = modalLayer;

      while (true) {
        const parent: HTMLElement | null = activeBranch.parentElement;
        if (!parent) break;

        for (const sibling of Array.from(parent.children)) {
          if (sibling === activeBranch || !(sibling instanceof HTMLElement)) continue;

          if (!snapshots.has(sibling)) {
            snapshots.set(sibling, {
              ariaHidden: sibling.getAttribute('aria-hidden'),
              inert: sibling.getAttribute('inert'),
            });
          }

          sibling.setAttribute('aria-hidden', 'true');
          sibling.setAttribute('inert', '');
        }

        activeBranch = parent;
        if (parent === document.body) break;
      }
    };

    const isInIsolatedSubtree = (target: EventTarget | null) =>
      target instanceof Node
      && Array.from(snapshots.keys()).some(element => element.contains(target));

    const preventBackgroundClick = (event: MouseEvent) => {
      if (!isInIsolatedSubtree(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const keepFocusInDialog = (event: FocusEvent) => {
      if (!isInIsolatedSubtree(event.target)) return;
      event.preventDefault();
      (inputRef.current ?? dialog).focus();
    };

    isolateSiblingSubtrees();
    const observer = new MutationObserver(isolateSiblingSubtrees);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', preventBackgroundClick, true);
    document.addEventListener('focusin', keepFocusInDialog, true);

    return () => {
      observer.disconnect();
      document.removeEventListener('click', preventBackgroundClick, true);
      document.removeEventListener('focusin', keepFocusInDialog, true);

      for (const [element, snapshot] of Array.from(snapshots.entries()).reverse()) {
        if (snapshot.ariaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', snapshot.ariaHidden);
        }

        if (snapshot.inert === null) {
          element.removeAttribute('inert');
        } else {
          element.setAttribute('inert', snapshot.inert);
        }
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      inputRef.current?.focus();
      return;
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      restorePreviousFocus();
    }
  }, [isOpen, restorePreviousFocus]);

  useEffect(() => () => restorePreviousFocus(), [restorePreviousFocus]);

  const handleSelect = useCallback(async (item: CommandItem) => {
    if (!item) return;
    if (item.action) {
      await item.action();
    } else if (item.url) {
      const route = normalizeInternalRoute(item.url);
      if (route) router.push(route);
    }
    closeCommandCenter();
  }, [router, closeCommandCenter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(element => element.getAttribute('aria-hidden') !== 'true');

      if (focusableElements.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (e.shiftKey && (activeElement === firstElement || !dialog.contains(activeElement))) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && (activeElement === lastElement || !dialog.contains(activeElement))) {
        e.preventDefault();
        firstElement.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void handleSelect(filteredItems[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeCommandCenter();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[12vh] px-4 md:px-6">
      <div
        aria-hidden="true"
        data-testid="global-command-backdrop"
        className="fixed inset-0 bg-[#020617] animate-in fade-in duration-300"
        onClick={closeCommandCenter}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="글로벌 커맨드 센터"
        tabIndex={-1}
        className="relative w-full max-w-3xl bg-card border-2 border-primary/20 rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-500 ring-1 ring-white/30"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center px-10 py-8 border-b border-primary/10 gap-6">
          <div className="p-3 bg-primary/10 rounded-lg text-primary animate-pulse">
            <Search size={28} />
          </div>
          <input
            ref={inputRef}
            aria-label="글로벌 커맨드 센터 검색어 입력"
            placeholder="검색..."
            className="flex-1 bg-transparent border-none outline-none text-2xl font-bold placeholder:text-muted-foreground/30 tracking-tight"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="hidden sm:flex items-center gap-3">
            <div className="px-3 py-1.5 bg-muted rounded-lg border text-xs font-bold text-muted-foreground tracking-tight">ESC로 닫기</div>
          </div>
        </div>

        {/* Results Container */}
        <div className="max-h-[500px] overflow-y-auto p-6 scrollbar-hide">
          {filteredItems.length > 0 ? (
            <div className="space-y-6">
              {['메뉴', '액션', '시스템', '검색'].map(cat => {
                const catItems = filteredItems.filter(item => item.category === cat);
                if (catItems.length === 0) return null;

                return (
                  <div key={cat} className="space-y-2">
                    <p className="text-xs font-bold text-muted-foreground tracking-[0.3em] px-4 mb-3 flex items-center gap-3">
                      <span className="w-4 h-px bg-muted-foreground/30" />
                      {cat}
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {catItems.map((item) => {
                        const globalIndex = filteredItems.indexOf(item);
                        const isFocused = globalIndex === selectedIndex;

                        return (
                          <button
                            key={item.id}
                            aria-label={item.name}
                            className={cn(
                              "w-full flex items-center justify-between p-5 rounded-lg transition-all duration-300 group text-left",
                              isFocused
                                ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 scale-[1.01] z-10"
                                : "hover:bg-primary/5 text-foreground"
                            )}
                            onClick={() => void handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                          >
                            <div className="flex items-center gap-5">
                              <div className={cn(
                                "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-500",
                                isFocused ? "bg-white/20 rotate-12 scale-110" : "bg-muted group-hover:bg-primary/10 group-hover:rotate-6 shadow-inner"
                              )}>
                                {item.icon || <ShieldCheck size={20} />}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-lg tracking-tight leading-none mb-1">{item.name}</span>
                                {item.description && (
                                  <span className={cn(
                                    "text-sm font-bold opacity-60",
                                    isFocused ? "text-white" : "text-muted-foreground"
                                  )}>
                                    {item.description}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={cn(
                              "transition-all duration-500",
                              isFocused ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                            )}>
                              <ArrowRight size={20} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-24 text-center space-y-6">
              <div className="w-24 h-24 bg-muted/30 rounded-lg flex items-center justify-center mx-auto animate-bounce">
                <Zap size={32} className="text-muted-foreground/20" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">결과를 찾을 수 없습니다.</p>
                <p className="text-sm text-muted-foreground font-bold mt-1">도움이 필요하시면 시스템 관리자에게 문의하세요.</p>
              </div>
            </div>
          )}
        </div>

        {/* Intelligence Footer */}
        <div className="bg-muted px-10 py-6 border-t border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-background border rounded-lg text-xs font-bold">이동</kbd>
              <span className="text-xs font-bold text-muted-foreground opacity-60">이동</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-background border rounded-lg text-xs font-bold">입력</kbd>
              <span className="text-xs font-bold text-muted-foreground opacity-60">선택</span>
            </div>
          </div>

              <span className="text-xs font-bold text-muted-foreground">
                업무 메뉴는 현재 계정 권한에 따라 제공됩니다.
              </span>
        </div>
      </div>
    </div>
  );
}
