
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Command as CommandIcon,
  X,
  ChevronRight,
  ArrowRight,
  Settings,
  User,
  LogOut,
  Bell,
  Mail,
  Calendar,
  FileText,
  Shield,
  ShieldCheck,
  LayoutDashboard,
  Globe,
  Zap,
  History as HistoryIcon,
  GitBranch,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShortcut } from './global-shortcut-provider';
import { menuService } from '@/services/business/user/MenuService';
import { useAuth } from '@/contexts/AuthContext';

interface CommandItem {
  id: string;
  name: string;
  url?: string;
  action?: () => void;
  category: '메뉴' | '액션' | '시스템' | '검색';
  icon?: React.ReactNode;
  description?: string;
}

export function GlobalCommandCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menus, setMenus] = useState<CommandItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const router = useRouter();
  const { logout } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. 단축키 등록 (CMD/Ctrl+K)
  useShortcut('k', true, () => {
    setIsOpen(prev => {
      const next = !prev;
      if (next) {
        setSelectedIndex(0);
        setSearch('');
      }
      return next;
    });
  });

  // 2. 초기 메뉴 데이터 로드
  useEffect(() => {
    async function fetchAllMenus() {
      if (!isOpen) return;

      setIsSearching(true);
      try {
        const head = await menuService.getHeadMenus();
        if (head && head.length > 0) {
          const allHead: CommandItem[] = head.map(m => ({
            id: `cmd-head-${m.menuNo}`,
            name: m.menuNm,
            url: m.chkURL || '#',
            category: '메뉴' as const,
            icon: <LayoutDashboard size={16} />
          }));

          setMenus(allHead);

          // 하위 메뉴 로드
          for (const m of head) {
            menuService.getLeftMenus(m.menuNo).then(left => {
              if (left && left.length > 0) {
                const subItems: CommandItem[] = left.map((l: any) => ({
                  id: `cmd-left-${m.menuNo}-${l.menuNo}`,
                  name: `${m.menuNm} > ${l.menuNm}`,
                  url: l.chkURL || '#',
                  category: '메뉴' as const,
                  icon: <ArrowRight size={14} />
                }));
                setMenus(prev => {
                  const existingIds = new Set(prev.map(i => i.id));
                  const newItems = subItems.filter(i => !existingIds.has(i.id));
                  return [...prev, ...newItems];
                });
              }
            });
          }
        }
      } catch (e) {
        console.error('Failed to load command menus', e);
      } finally {
        setIsSearching(false);
      }
    }
    if (isOpen && menus.length === 0) fetchAllMenus();
  }, [isOpen, menus.length]); 

  // 3. 고정 액션 정의
  const quickActions: CommandItem[] = [
    { id: 'act-notif', name: '스마트 메시징 센터', url: '/admin/notifications', icon: <Bell size={16} />, category: '메뉴', description: '전사 알림 통합 모니터링 및 AI 디스패치' },
    { id: 'act-collab', name: '협업 통합 허브', url: '/admin/collaboration', icon: <Users size={16} />, category: '메뉴', description: '조직도 및 지능형 회의/자원 관리' },
    { id: 'act-audit', name: '보안 감사 타임머신', url: '/admin/system/audit', icon: <HistoryIcon size={16} />, category: '메뉴', description: '데이터 변경 이력 추적 및 시각적 감사 분석' },
    { id: 'act-workflow', name: '프로세스 캔버스', url: '/admin/workflow', icon: <GitBranch size={16} />, category: '메뉴', description: '비즈니스 워크플로우 설계 및 모니터링' },
    { id: 'act-form', name: '스마트 서식 엔진', url: '/admin/sanctn/forms', icon: <FileText size={16} />, category: '메뉴', description: '행정 서식 설계 및 문서 자동화 관리' },
    { id: 'act-create-post', name: '새 게시글 작성', url: '/admin/community/boards/insertBoardArticle', icon: <FileText size={16} />, category: '액션', description: '공지사항 및 갤러리 게시글 신규 등록' },
    { id: 'sys-1', name: '마이페이지', url: '/admin/workspace/my-page', icon: <User size={16} />, category: '시스템' },
    { id: 'sys-settings', name: '환경 설정', url: '/admin/system/menus', icon: <Settings size={16} />, category: '시스템' },
    { id: 'sys-logout', name: '로그아웃', action: logout, icon: <LogOut size={16} />, category: '시스템' },
  ];

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
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSelect = useCallback((item: CommandItem) => {
    if (!item) return;
    if (item.action) {
      item.action();
    } else if (item.url) {
      router.push(item.url);
    }
    setIsOpen(false);
    setSearch('');
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[12vh] px-4 md:px-6">
      <div
        className="fixed inset-0 bg-[#020617] animate-in fade-in duration-300"
        onClick={() => setIsOpen(false)}
      />

      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border-2 border-primary/20 rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-500 ring-1 ring-white/30"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center px-10 py-8 border-b border-primary/10 gap-6">
          <div className="p-3 bg-primary/10 rounded-lg text-primary animate-pulse">
            <Search size={28} />
          </div>
          <input
            ref={inputRef}
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
                            className={cn(
                              "w-full flex items-center justify-between p-5 rounded-lg transition-all duration-300 group text-left",
                              isFocused
                                ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 scale-[1.01] z-10"
                                : "hover:bg-primary/5 text-foreground"
                            )}
                            onClick={() => handleSelect(item)}
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

          <div className="flex items-center gap-4">
            <div className="h-6 w-px bg-muted-foreground/20" />
            <div className="flex items-center gap-3">
              <Globe size={14} className="text-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-muted-foreground tracking-tight tracking-tighter">
                시스템 상태: <span className="text-emerald-500">최적화됨</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
