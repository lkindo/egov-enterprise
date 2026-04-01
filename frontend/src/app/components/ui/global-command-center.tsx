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
  category: 'ë©”ë‰´' | '?¡ì…˜' | '?œìŠ¤?? | 'ê²€??;
  icon?: React.ReactNode;
  description?: string;
}

export function GlobalCommandCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedë²ˆí˜¸, setSelectedë²ˆí˜¸] = useState(0);
  const [menus, setMenus] = useState<CommandItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const router = useRouter();
  const { logout } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. ?¨ì¶•???±ë¡ (CMD/Ctrl+K)
  useShortcut('k', true, () => {
    setIsOpen(prev => {
      const next = !prev;
      if (next) {
        setSelectedë²ˆí˜¸(0);
        setSearch('');
      }
      return next;
    });
  });

  // 2. ì´ˆê¸° ë©”ë‰´ ?°ì´??ë¡œë“œ
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
            category: 'ë©”ë‰´' as const,
            icon: <LayoutDashboard size={16} />
          }));

          setMenus(allHead);

          // ?˜ìœ„ ë©”ë‰´ ë¡œë“œ
          for (const m of head) {
            menuService.getLeftMenus(m.menuNo).then(left => {
              if (left && left.length > 0) {
                const subItems: CommandItem[] = left.map((l: any) => ({
                  id: `cmd-left-${m.menuNo}-${l.menuNo}`,
                  name: `${m.menuNm} > ${l.menuNm}`,
                  url: l.chkURL || '#',
                  category: 'ë©”ë‰´' as const,
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
  }, [isOpen, menus.length]);  // menus.length ?˜ì¡´??ì¶”ê?

  // 3. ê³ ì • ?¡ì…˜ ?•ì˜
  const quickActions: CommandItem[] = [
    { id: 'act-notif', name: '?¤ë§ˆ??ë©”ì‹œì§??¼í„°', url: '/admin/notifications', icon: <Bell size={16} />, category: 'ë©”ë‰´', description: '?„ì‚¬ ?Œë¦¼ ?µí•© ëª¨ë‹ˆ?°ë§ ë°?AI ?”ìŠ¤?¨ì¹˜' },
    { id: 'act-collab', name: '?‘ì—… ?µí•© ?ˆë¸Œ', url: '/admin/collaboration', icon: <Users size={16} />, category: 'ë©”ë‰´', description: 'ì¡°ì§??ë°?ì§€?¥í˜• ?Œì˜/?ì› ê´€ë¦? },
    { id: 'act-audit', name: 'ë³´ì•ˆ ê°ì‚¬ ?€?„ë¨¸??, url: '/admin/system/audit', icon: <HistoryIcon size={16} />, category: 'ë©”ë‰´', description: '?°ì´??ë³€ê²??´ë ¥ ì¶”ì  ë°??œê°??ê°ì‚¬ ë¶„ì„' },
    { id: 'act-workflow', name: '?„ë¡œ?¸ìŠ¤ ìº”ë²„??, url: '/admin/workflow', icon: <GitBranch size={16} />, category: 'ë©”ë‰´', description: 'ë¹„ì¦ˆ?ˆìŠ¤ ?Œí¬?Œë¡œ???¤ê³„ ë°?ëª¨ë‹ˆ?°ë§' },
    { id: 'act-form', name: '?¤ë§ˆ???œì‹ ?”ì§„', url: '/admin/sanctn/forms', icon: <FileText size={16} />, category: 'ë©”ë‰´', description: '?‰ì • ?œì‹ ?¤ê³„ ë°?ë¬¸ì„œ ?ë™??ê´€ë¦? },
    { id: 'act-create-post', name: '??ê²Œì‹œê¸€ ?‘ì„±', url: '/admin/community/boards/insertBoardArticle', icon: <FileText size={16} />, category: '?¡ì…˜', description: 'ê³µì??¬í•­ ë°?ê°¤ëŸ¬ë¦?ê²Œì‹œê¸€ ? ê·œ ?±ë¡' },
    { id: 'sys-1', name: 'ë§ˆì´?˜ì´ì§€', url: '/mypage', icon: <User size={16} />, category: '?œìŠ¤?? },
    { id: 'sys-2', name: '?˜ê²½?¤ì •', url: '/admin/system/settings', icon: <Settings size={16} />, category: '?œìŠ¤?? },
    { id: 'sys-3', name: 'ë¡œê·¸?„ì›ƒ', action: logout, icon: <LogOut size={16} />, category: '?œìŠ¤?? },
  ];

  // 4. ?µí•© ê²€???„í„°ë§?  const filteredItems = useMemo(() => {
    const combined = [...quickActions, ...menus];

    // ê²€?‰ì–´ê°€ ?ˆì„ ê²½ìš° ?„í„°ë§?    let results = search
      ? combined.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase())
      )
      : combined;

    // ë§Œì•½ ?¼ì¹˜?˜ëŠ”ê²??†ë‹¤ë©??„ì—­ ê²€???œì•ˆ ì¶”ê?
    if (search && results.length === 0) {
      results = [{
        id: 'global-search',
        name: `"${search}" ê²€?‰ì–´ë¡??¬ì´???„ì²´ ê²€??,
        url: `/search?q=${encodeURIComponent(search)}`,
        category: 'ê²€??,
        icon: <Search size={16} />
      }];
    }

    return results.slice(0, 10);
  }, [search, menus, quickActions]);

  // 5. ?¸ë“¤??ë°??´ë¹„ê²Œì´??  useEffect(() => {
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
      setSelectedë²ˆí˜¸(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedë²ˆí˜¸(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(filteredItems[selectedë²ˆí˜¸]);
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
            placeholder="ê²€??.."
            className="flex-1 bg-transparent border-none outline-none text-2xl font-black placeholder:text-muted-foreground/30 tracking-tight"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedë²ˆí˜¸(0);
            }}
          />
          <div className="hidden sm:flex items-center gap-3">
            <div className="px-3 py-1.5 bg-muted rounded-xl border text-[10px] font-black text-muted-foreground tracking-tight">ESCë¡??«ê¸°</div>
          </div>
        </div>

        {/* Results Container */}
        <div className="max-h-[500px] overflow-y-auto p-6 scrollbar-hide">
          {filteredItems.length > 0 ? (
            <div className="space-y-6">
              {['ë©”ë‰´', '?¡ì…˜', '?œìŠ¤??, 'ê²€??].map(cat => {
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
                        const globalë²ˆí˜¸ = filteredItems.indexOf(item);
                        const isFocused = globalë²ˆí˜¸ === selectedë²ˆí˜¸;

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
                            onMouseEnter={() => setSelectedë²ˆí˜¸(globalë²ˆí˜¸)}
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
                <p className="text-xl font-black text-foreground">ê²°ê³¼ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤.</p>
                <p className="text-sm text-muted-foreground font-bold mt-1">?„ì????„ìš”?˜ì‹œë©??œìŠ¤??ê´€ë¦¬ì?ê²Œ ë¬¸ì˜?˜ì„¸??</p>
              </div>
            </div>
          )}
        </div>

        {/* Intelligence Footer */}
        <div className="bg-muted px-10 py-6 border-t border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-background border rounded-lg text-[10px] font-black">?‘â†“</kbd>
              <span className="text-[10px] font-black text-muted-foreground opacity-60">?´ë™</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-background border rounded-lg text-[10px] font-black">?…ë ¥</kbd>
              <span className="text-[10px] font-black text-muted-foreground opacity-60">? íƒ</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-6 w-px bg-muted-foreground/20" />
            <div className="flex items-center gap-3">
              <Globe size={14} className="text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-muted-foreground tracking-tight tracking-tighter">
                ?œìŠ¤???íƒœ: <span className="text-emerald-500">ìµœì ?”ë¨</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
