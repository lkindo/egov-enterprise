'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Command as CommandIcon, 
  FileText, 
  User, 
  Settings, 
  Calendar, 
  LogOut, 
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShortcut } from './global-shortcut-provider';
import { menuService } from '@/services/menuService';
import { useAuth } from '@/contexts/AuthContext';

export function GlobalCommandCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [menus, setMenus] = useState<any[]>([]);
  const router = useRouter();
  const { logout } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. 단축키 등록 (Ctrl+K)
  useShortcut('k', true, () => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setSelectedIndex(0);
      setSearch('');
    }
  });

  // 2. 메뉴 데이터 로드
  useEffect(() => {
    async function fetchAllMenus() {
      try {
        const head = await menuService.getHeadMenus();
        if (head.success) {
          const all: any[] = [];
          for (const m of head.list) {
            all.push({ name: m.menuNm, url: m.chkURL || '#', category: '메뉴' });
            const left = await menuService.getLeftMenus(m.menuNo);
            if (left.success) {
              left.list.forEach((l: any) => {
                all.push({ name: `${m.menuNm} > ${l.menuNm}`, url: l.chkURL || '#', category: '상세 메뉴' });
              });
            }
          }
          setMenus(all);
        }
      } catch (e) {
        console.error('Failed to load command menus', e);
      }
    }
    if (isOpen) fetchAllMenus();
  }, [isOpen]);

  // 3. 빠른 액션 정의
  const quickActions = [
    { name: '새 게시글 작성', url: '/cop/bbs/insertBoardArticle', icon: <FileText size={16} />, category: '액션' },
    { name: '휴가 신청하기', url: '/uss/ion/vacation', icon: <Calendar size={16} />, category: '액션' },
    { name: '마이페이지', url: '/mypage', icon: <User size={16} />, category: '시스템' },
    { name: '환경설정', url: '/admin/system/settings', icon: <Settings size={16} />, category: '시스템' },
    { name: '로그아웃', action: logout, icon: <LogOut size={16} />, category: '시스템' },
  ];

  // 4. 검색 필터링
  const filteredItems = useMemo(() => {
    const combined = [...quickActions, ...menus];
    if (!search) return combined.slice(0, 8);
    return combined.filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 10);
  }, [search, menus]);

  // 5. 키보드 내비게이션 및 포커스 관리
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (search && filteredItems.length > 0) {
        handleSelect(filteredItems[selectedIndex]);
      } else if (search) {
        router.push(`/search?q=${encodeURIComponent(search)}`);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (item: any) => {
    if (!item) return;
    if (item.action) {
      item.action();
    } else if (item.url) {
      router.push(item.url);
    }
    setIsOpen(false);
    setSearch('');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-center-title"
    >
      <h2 id="command-center-title" className="sr-only">글로벌 커맨드 센터 검색창</h2>
      
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Command Palette Card */}
      <div 
        className="relative w-full max-w-2xl bg-background/80 backdrop-blur-2xl border-2 border-primary/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-500 ring-1 ring-white/20"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Area */}
        <div className="flex items-center px-8 py-6 border-b border-primary/5 gap-4">
          <Search className="text-primary animate-pulse" size={24} aria-hidden="true" />
          <input
            ref={inputRef}
            placeholder="원하는 기능이나 메뉴를 검색하세요..."
            className="flex-1 bg-transparent border-none outline-none text-xl font-bold placeholder:text-muted-foreground/40"
            value={search}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-haspopup="listbox"
            aria-controls="command-results-list"
            aria-activedescendant={`result-item-${selectedIndex}`}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-xl border border-primary/5 text-[10px] font-black text-muted-foreground">
            <kbd className="font-sans">ESC</kbd> <span>to close</span>
          </div>
        </div>

        {/* Results List */}
        <div 
          id="command-results-list"
          className="max-h-[450px] overflow-y-auto p-4 custom-scrollbar"
          role="listbox"
          aria-label="검색 결과"
        >
          {filteredItems.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
                <Zap size={24} className="text-muted-foreground/30" aria-hidden="true" />
              </div>
              <p className="text-muted-foreground font-medium italic">일치하는 항목을 찾을 수 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, idx) => (
                <button
                  key={idx}
                  id={`result-item-${idx}`}
                  role="option"
                  aria-selected={idx === selectedIndex}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-200 group text-left outline-none",
                    idx === selectedIndex 
                      ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-[1.02] z-10 ring-2 ring-primary/20" 
                      : "hover:bg-primary/5 text-foreground focus:bg-primary/5"
                  )}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      idx === selectedIndex ? "bg-white/20" : "bg-muted shadow-inner"
                    )} aria-hidden="true">
                      {item.icon || (item.category === '메뉴' ? <ShieldCheck size={18} /> : <ArrowRight size={18} />)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-base tracking-tight">{item.name}</span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        idx === selectedIndex ? "text-white/60" : "text-muted-foreground/60"
                      )}>
                        {item.category}
                      </span>
                    </div>
                  </div>
                  {idx === selectedIndex && (
                    <div className="flex items-center gap-2 animate-in slide-in-from-right-2" aria-hidden="true">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Execute</span>
                      <CommandIcon size={14} className="opacity-60" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="bg-muted/30 px-8 py-4 border-t border-primary/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/60 uppercase">
              <kbd className="px-1.5 py-0.5 bg-background border rounded-md font-sans">↑↓</kbd> <span>Navigate</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/60 uppercase">
              <kbd className="px-1.5 py-0.5 bg-background border rounded-md font-sans">Enter</kbd> <span>Select</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest" aria-live="polite">
              {filteredItems.length} results found
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
