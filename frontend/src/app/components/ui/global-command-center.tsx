'use client';

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
  category: '硫붾돱' | '?≪뀡' | '?쒖뒪님 | '寃님;
  icon?: React.ReactNode;
  description?: string;
}

export function GlobalCommandCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selected踰덊샇, setSelected踰덊샇] = useState(0);
  const [menus, setMenus] = useState<CommandItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const router = useRouter();
  const { logout } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. ?⑥텞님등록 (CMD/Ctrl+K)
  useShortcut('k', true, () => {
    setIsOpen(prev => {
      const next = !prev;
      if (next) {
        setSelected踰덊샇(0);
        setSearch('');
      }
      return next;
    });
  });

  // 2. 珥덇린 硫붾돱 ?곗씠님濡쒕뱶
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
            category: '硫붾돱' as const,
            icon: <LayoutDashboard size={16} />
          }));

          setMenus(allHead);

          // ?섏쐞 硫붾돱 濡쒕뱶
          for (const m of head) {
            menuService.getLeftMenus(m.menuNo).then(left => {
              if (left && left.length > 0) {
                const subItems: CommandItem[] = left.map((l: any) => ({
                  id: `cmd-left-${m.menuNo}-${l.menuNo}`,
                  name: `${m.menuNm} > ${l.menuNm}`,
                  url: l.chkURL || '#',
                  category: '硫붾돱' as const,
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
  }, [isOpen, menus.length]);  // menus.length ?섏〈님異붽?

  // 3. 怨좎젙 ?≪뀡 ?뺤쓽
  const quickActions: CommandItem[] = [
    { id: 'act-notif', name: '?ㅻ쭏님硫붿떆吏님쇳꽣', url: '/admin/notifications', icon: <Bell size={16} />, category: '硫붾돱', description: '?꾩궗 ?뚮┝ ?듯빀 紐⑤땲?곕쭅 諛?AI ?붿뒪?⑥튂' },
    { id: 'act-collab', name: '?묒뾽 ?듯빀 ?덈툕', url: '/admin/collaboration', icon: <Users size={16} />, category: '硫붾돱', description: '議곗쭅님諛?吏?ν삎 ?뚯쓽/?먯썝 愿由? },
    { id: 'act-audit', name: '보안 媛먯궗 ??꾨㉧님, url: '/admin/system/audit', icon: <HistoryIcon size={16} />, category: '硫붾돱', description: '?곗씠님蹂寃님대젰 異붿쟻 諛님쒓컖님媛먯궗 분석' },
    { id: 'act-workflow', name: '?꾨줈?몄뒪 罹붾쾭님, url: '/admin/workflow', icon: <GitBranch size={16} />, category: '硫붾돱', description: '鍮꾩쫰?덉뒪 ?뚰겕?뚮줈님설계 諛?紐⑤땲?곕쭅' },
    { id: 'act-form', name: '?ㅻ쭏님?쒖떇 ?붿쭊', url: '/admin/sanctn/forms', icon: <FileText size={16} />, category: '硫붾돱', description: '?됱젙 ?쒖떇 설계 諛?臾몄꽌 ?먮룞님愿由? },
    { id: 'act-create-post', name: '님寃뚯떆湲 ?묒꽦', url: '/admin/community/boards/insertBoardArticle', icon: <FileText size={16} />, category: '?≪뀡', description: '공지사항 諛?媛ㅻ윭由?寃뚯떆湲 신규 등록' },
    { id: 'sys-1', name: '留덉씠?섏씠吏', url: '/mypage', icon: <User size={16} />, category: '?쒖뒪님 },
    { id: 'sys-2', name: '?섍꼍?ㅼ젙', url: '/admin/system/settings', icon: <Settings size={16} />, category: '?쒖뒪님 },
    { id: 'sys-3', name: '濡쒓렇?꾩썐', action: logout, icon: <LogOut size={16} />, category: '?쒖뒪님 },
  ];

  // 4. ?듯빀 寃님?꾪꽣留?  const filteredItems = useMemo(() => {
    const combined = [...quickActions, ...menus];

    // 寃?됱뼱媛 ?덉쓣 寃쎌슦 ?꾪꽣留?    let results = search
      ? combined.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase())
      )
      : combined;

    // 留뚯빟 ?쇱튂?섎뒗寃님녿떎硫님꾩뿭 寃님?쒖븞 異붽?
    if (search && results.length === 0) {
      results = [{
        id: 'global-search',
        name: `"${search}" 寃?됱뼱濡님ъ씠님?꾩껜 寃님,
        url: `/search?q=${encodeURIComponent(search)}`,
        category: '寃님,
        icon: <Search size={16} />
      }];
    }

    return results.slice(0, 10);
  }, [search, menus, quickActions]);

  // 5. ?몃뱾님諛님대퉬寃뚯씠님  useEffect(() => {
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
      setSelected踰덊샇(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected踰덊샇(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(filteredItems[selected踰덊샇]);
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
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border-2 border-primary/20 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-500 ring-1 ring-white/30"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="flex items-center px-10 py-8 border-b border-primary/10 gap-6">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary animate-pulse">
            <Search size={28} />
          </div>
          <input
            ref={inputRef}
            placeholder="寃님.."
            className="flex-1 bg-transparent border-none outline-none text-2xl font-black placeholder:text-muted-foreground/30 tracking-tight"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected踰덊샇(0);
            }}
          />
          <div className="hidden sm:flex items-center gap-3">
            <div className="px-3 py-1.5 bg-muted rounded-xl border text-[10px] font-black text-muted-foreground tracking-tight">ESC濡님リ린</div>
          </div>
        </div>

        {/* Results Container */}
        <div className="max-h-[500px] overflow-y-auto p-6 scrollbar-hide">
          {filteredItems.length > 0 ? (
            <div className="space-y-6">
              {['硫붾돱', '?≪뀡', '?쒖뒪님, '寃님].map(cat => {
                const catItems = filteredItems.filter(item => item.category === cat);
                if (catItems.length === 0) return null;

                return (
                  <div key={cat} className="space-y-2">
                    <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] px-4 mb-3 flex items-center gap-3">
                      <span className="w-4 h-px bg-muted-foreground/30" />
                      {cat}
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {catItems.map((item) => {
                        const global踰덊샇 = filteredItems.indexOf(item);
                        const isFocused = global踰덊샇 === selected踰덊샇;

                        return (
                          <button
                            key={item.id}
                            className={cn(
                              "w-full flex items-center justify-between p-5 rounded-3xl transition-all duration-300 group text-left",
                              isFocused
                                ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 scale-[1.01] z-10"
                                : "hover:bg-primary/5 text-foreground"
                            )}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelected踰덊샇(global踰덊샇)}
                          >
                            <div className="flex items-center gap-5">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                                isFocused ? "bg-white/20 rotate-12 scale-110" : "bg-muted group-hover:bg-primary/10 group-hover:rotate-6 shadow-inner"
                              )}>
                                {item.icon || <ShieldCheck size={20} />}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-black text-lg tracking-tight leading-none mb-1">{item.name}</span>
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
              <div className="w-24 h-24 bg-muted/30 rounded-[2.5rem] flex items-center justify-center mx-auto animate-bounce">
                <Zap size={32} className="text-muted-foreground/20" />
              </div>
              <div>
                <p className="text-xl font-black text-foreground">寃곌낵瑜?李얠쓣 님?놁뒿?덈떎.</p>
                <p className="text-sm text-muted-foreground font-bold mt-1">?꾩님님꾩슂?섏떆硫님쒖뒪님愿由ъ옄?먭쾶 臾몄쓽?섏꽭님</p>
              </div>
            </div>
          )}
        </div>

        {/* Intelligence Footer */}
        <div className="bg-muted px-10 py-6 border-t border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-background border rounded-lg text-[10px] font-black">?묅넃</kbd>
              <span className="text-[10px] font-black text-muted-foreground opacity-60">?대룞</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-background border rounded-lg text-[10px] font-black">?낅젰</kbd>
              <span className="text-[10px] font-black text-muted-foreground opacity-60">?좏깮</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-6 w-px bg-muted-foreground/20" />
            <div className="flex items-center gap-3">
              <Globe size={14} className="text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-muted-foreground tracking-tight tracking-tighter">
                ?쒖뒪님?곹깭: <span className="text-emerald-500">理쒖쟻?붾맖</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

