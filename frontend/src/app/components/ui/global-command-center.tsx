import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, 
  ArrowRight, 
  LogOut, 
  ShieldCheck, 
  LayoutDashboard, 
  Star,
  History,
  Zap } from 'lucide-react';
/* reusable-base:collaboration:start */
import { Users } from 'lucide-react';
/* reusable-base:collaboration:end */
import { cn } from '@/lib/utils';
import { useShortcut } from './global-shortcut-provider';
import { menuService } from '@/services/business/user/MenuService';
import { useAuth } from '@/contexts/AuthContext';
import { readRecentMenuNos } from '@/lib/navigation/recent-menus';
import { SEARCH_URL_STATE, parseSearchUrlState, serializeSearchQuery, searchUrlErrorMessage } from '@/lib/navigation/search-url-state';
import {
  normalizeInternalRoute,
  resolveMenuInternalRoute,
} from '@/lib/navigation/internal-route';

interface CommandItem {
  id: string;
  name: string;
  url?: string;
  action?: () => void | Promise<void>;
  category: '즐겨찾기' | '최근 방문' | '메뉴' | '액션' | '시스템' | '검색';
  icon?: React.ReactNode;
  description?: string;
}


/** 결과 항목의 DOM id — combobox 의 aria-activedescendant 가 가리킨다. */
function commandOptionId(item: { id: string }): string {
  return `command-option-${item.id.replace(/[^A-Za-z0-9_-]/g, '_')}`;
}

export function GlobalCommandCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const parsedSearch = parseSearchUrlState({ q: search });
  const searchQueryError = parsedSearch.ok ? null : searchUrlErrorMessage(parsedSearch.error);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menus, setMenus] = useState<CommandItem[]>([]);
  // [2026-09-26 DIP B5 F2] 검색어가 비었을 때 먼저 보일 즐겨찾기·최근 방문. 메뉴 번호만 들고, 보일 때 지금 볼 수
  //   있는 메뉴 목록과 맞춰 본다 — 배정이 회수된 메뉴는 기록에 있어도 보이지 않는다.
  const [menuByNo, setMenuByNo] = useState<ReadonlyMap<number, CommandItem>>(new Map());
  const [bookmarkNos, setBookmarkNos] = useState<number[]>([]);
  const [recentNos, setRecentNos] = useState<number[]>([]);
  const [, setIsSearching] = useState(false);

  const router = useRouter();
  const { logout, user } = useAuth();
  const userKey = user?.id;
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
          const byNo = new Map<number, CommandItem>();
          const allHead: CommandItem[] = head.flatMap(m => {
            const url = resolveMenuInternalRoute(m);
            if (!url) return [];
            const item: CommandItem = {
              id: `cmd-head-${m.menuNo}`,
              name: m.menuNm,
              url,
              category: '메뉴' as const,
              icon: <LayoutDashboard size={16} />
            };
            byNo.set(m.menuNo, item);
            return [item];
          });

          // [2026-09-26 DIP B5 F10] 하위 메뉴는 상위 메뉴 응답의 children 에 이미 있다. 상위 메뉴마다
          //   따로 요청하면 서버가 매번 메뉴 트리 전체를 다시 조립했다(N+1).
          const subItems: CommandItem[] = head.flatMap(m => (m.children ?? []).flatMap(l => {
            const url = resolveMenuInternalRoute(l);
            if (!url) return [];
            const item: CommandItem = {
              id: `cmd-left-${m.menuNo}-${l.menuNo}`,
              name: `${m.menuNm} > ${l.menuNm}`,
              url,
              category: '메뉴' as const,
              icon: <ArrowRight size={14} />
            };
            byNo.set(l.menuNo, item);
            return [item];
          }));
          setMenus([...allHead, ...subItems]);
          setMenuByNo(byNo);
        }
      } catch {
        // 메뉴 조회 실패 시에도 로그아웃 같은 로컬 안전 작업은 계속 제공한다.
      } finally {
        setIsSearching(false);
      }
    }
    if (isOpen && menus.length === 0) fetchAllMenus();
  }, [isOpen, menus.length]); 

  // 열 때마다 즐겨찾기와 최근 방문을 다시 읽는다 — 사이드바에서 방금 바꾼 즐겨찾기가 바로 보여야 한다.
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setRecentNos(readRecentMenuNos(userKey));
    (async () => {
      try {
        const bookmarks = await menuService.getMyBookmarks();
        if (active) setBookmarkNos(bookmarks.map(bookmark => bookmark.menuNo));
      } catch {
        // 즐겨찾기를 못 읽어도 메뉴 검색은 그대로 쓴다.
        if (active) setBookmarkNos([]);
      }
    })();
    return () => { active = false; };
  }, [isOpen, userKey]);

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
    // 협업 허브는 collaboration pack 소유다 — 그 pack 이 빠진 프로필에서 404 로 가는 바로가기를 남기지 않는다.
    /* reusable-base:collaboration:start */
    { id: 'act-collab', name: '협업 통합 허브', url: '/admin/collaboration', icon: <Users size={16} />, category: '메뉴', description: '쪽지·메일·스크랩 등 협업 기능으로 이동' },
    /* reusable-base:collaboration:end */
    { id: 'sys-logout', name: '로그아웃', action: logoutAndLeaveAuthenticatedSurface, icon: <LogOut size={16} />, category: '시스템' },
  ], [logoutAndLeaveAuthenticatedSurface]);

  // 4. 통합 검색 필터링
  const filteredItems = useMemo(() => {
    const combined = [...quickActions, ...menus];

    // 검색어가 있을 경우 필터링
    const results = search
      ? combined.filter(item =>
        ((item.name || '')).toLowerCase().includes(search.toLowerCase()) ||
        ((item.category || '')).toLowerCase().includes(search.toLowerCase())
      )
      : combined;

    // [2026-09-26 DIP V9] 통합 검색 제안은 검색어가 있으면 **항상** 마지막에 둔다. 종전에는 일치하는 메뉴가
    //   하나도 없을 때만 나와, 메뉴 이름에 걸리는 검색어로는 게시글·임직원을 찾으러 갈 길이 없었다.
    //   이름도 실제 범위로 말한다 — 통합 검색은 게시글 제목·임직원 성명·메뉴만 찾고 본문은 찾지 않는다.
    if (search && !searchQueryError) {
      const globalSearch: CommandItem = {
        id: 'global-search',
        name: `"${search}" 통합 검색 — 게시글 제목·임직원·메뉴`,
        url: `/search?q=${serializeSearchQuery({ q: search })}`,
        category: '검색',
        icon: <Search size={16} />
      };
      return [...results.slice(0, 9), globalSearch];
    }

    if (!search) {
      const pick = (nos: readonly number[], category: '즐겨찾기' | '최근 방문', prefix: string, icon: React.ReactNode) =>
        nos.flatMap(no => {
          const menu = menuByNo.get(no);
          return menu ? [{ ...menu, id: `${prefix}-${no}`, category, icon }] : [];
        }).slice(0, 5);
      const favorites = pick(bookmarkNos, '즐겨찾기', 'fav', <Star size={16} />);
      const recents = pick(recentNos.filter(no => !bookmarkNos.includes(no)), '최근 방문', 'recent', <History size={16} />);
      return [...favorites, ...recents, ...results.slice(0, 10)];
    }

    return results.slice(0, 10);
  }, [search, searchQueryError, menus, quickActions, menuByNo, bookmarkNos, recentNos]);

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
      )).filter(element => element.getAttribute('aria-hidden') !== 'true'
        // 결과 항목(option)은 tabindex=-1 이다 — 방향키로 고르는 항목을 Tab 순서에 다시 넣지 않는다.
        && element.getAttribute('tabindex') !== '-1');

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
          {/* [2026-09-26 DIP V9] 입력은 결과 목록을 조종하는 combobox 다. 방향키로 옮긴 항목을
              aria-activedescendant 로 보조기술에 알린다 — 종전에는 강조만 바뀌고 무엇이 골라졌는지 말하지 않았다. */}
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={filteredItems.length > 0}
            aria-controls="command-center-results"
            aria-autocomplete="list"
            aria-activedescendant={filteredItems[selectedIndex] ? commandOptionId(filteredItems[selectedIndex]) : undefined}
            aria-label="글로벌 커맨드 센터 검색어 입력"
            maxLength={SEARCH_URL_STATE.maxLength}
            aria-invalid={Boolean(searchQueryError) || undefined}
            aria-describedby={searchQueryError ? 'command-search-query-error' : undefined}
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
          {searchQueryError ? <p id="command-search-query-error" role="alert" className="text-sm text-destructive-emphasis">{searchQueryError}</p> : null}
          {filteredItems.length > 0 ? (
            <div id="command-center-results" role="listbox" aria-label="커맨드 센터 결과" className="space-y-6">
              {['즐겨찾기', '최근 방문', '메뉴', '액션', '시스템', '검색'].map(cat => {
                const catItems = filteredItems.filter(item => item.category === cat);
                if (catItems.length === 0) return null;

                return (
                  <div key={cat} role="group" aria-label={cat} className="space-y-2">
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
                            id={commandOptionId(item)}
                            role="option"
                            aria-selected={isFocused}
                            tabIndex={-1}
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
