'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Command,
    FileText,
    Users,
    Settings,
    LayoutDashboard,
    ArrowRight,
    X,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
    id: string;
    category: 'Menu' | 'Content' | 'User';
    title: string;
    url: string;
    description?: string;
    icon: React.ReactNode;
}

export function CommandPalette() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Mock Data (In production, replace with API calls)
    const results: SearchResult[] = [
        { id: '1', category: 'Menu', title: '통계 대시보드', url: '/admin/stats', icon: <LayoutDashboard size={14} />, description: '시스템 통합 분석 및 현황' },
        { id: '2', category: 'Menu', title: '사용자 관리', url: '/admin/user', icon: <Users size={14} />, description: '권한 설정 및 사용자 목록' },
        { id: '3', category: 'Menu', title: '공지사항 게시판', url: '/cop/bbs/board/notice', icon: <FileText size={14} /> },
        { id: '4', category: 'Content', title: 'DDD 리팩토링 가이드', url: '/cop/bbs/board/notice/1', icon: <FileText size={14} />, description: '도메인 주도 설계 핵심 원칙' },
        { id: '5', category: 'Menu', title: '시스템 설정', url: '/admin/system', icon: <Settings size={14} /> },
    ].filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
    ) as SearchResult[];

    const handleOpen = useCallback(() => setIsOpen(true), []);
    const handleClose = useCallback(() => {
        setIsOpen(false);
        setQuery('');
    }, []);

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setIsOpen((open) => !open);
            }
            if (e.key === 'Escape') handleClose();
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [handleClose]);

    const onSelect = (url: string) => {
        router.push(url);
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 md:px-0 bg-black/80 animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Search Input Area */}
                <div className="flex items-center p-6 border-b gap-4">
                    <Search className="text-muted-foreground animate-pulse" size={20} />
                    <input
                        autoFocus
                        className="flex-1 bg-transparent border-none outline-none text-lg font-bold placeholder:text-muted-foreground/50 text-foreground"
                        placeholder="무엇을 찾으시나요? (메뉴, 사용자, 게시글...)"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && results[selectedIndex]) onSelect(results[selectedIndex].url);
                            if (e.key === 'ArrowDown') setSelectedIndex((i) => Math.min(results.length - 1, i + 1));
                            if (e.key === 'ArrowUp') setSelectedIndex((i) => Math.max(0, i - 1));
                        }}
                    />
                    <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                        <span className="text-[10px] font-black text-muted-foreground">ESC</span>
                    </div>
                    <button onClick={handleClose} className="p-1 hover:bg-muted rounded-full text-muted-foreground">
                        <X size={18} />
                    </button>
                </div>

                {/* Results Area */}
                <div className="max-h-[50vh] overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {results.length > 0 ? (
                        <div className="space-y-1">
                            {['Menu', 'Content', 'User'].map((cat) => {
                                const catResults = results.filter(r => r.category === cat);
                                if (catResults.length === 0) return null;
                                return (
                                    <div key={cat} className="mb-4">
                                        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-4 mb-2">{cat}</h3>
                                        <div className="space-y-1">
                                            {catResults.map((result, idx) => {
                                                const globalIdx = results.indexOf(result);
                                                return (
                                                    <button
                                                        key={result.id}
                                                        className={cn(
                                                            "w-full flex items-center justify-between p-4 rounded-2xl transition-all group",
                                                            globalIdx === selectedIndex ? "bg-primary text-primary-foreground shadow-lg scale-[1.01]" : "hover:bg-muted text-foreground"
                                                        )}
                                                        onClick={() => onSelect(result.url)}
                                                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                                                    >
                                                        <div className="flex items-center gap-4 text-left">
                                                            <div className={cn(
                                                                "p-2 rounded-xl border flex items-center justify-center",
                                                                globalIdx === selectedIndex ? "bg-white/20 border-white/10" : "bg-muted border-none"
                                                            )}>
                                                                {result.icon}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black tracking-tight">{result.title}</p>
                                                                {result.description && (
                                                                    <p className={cn(
                                                                        "text-[10px] font-bold mt-0.5",
                                                                        globalIdx === selectedIndex ? "text-primary-foreground/70" : "text-muted-foreground"
                                                                    )}>
                                                                        {result.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <ArrowRight className={cn(
                                                            "opacity-0 transition-all",
                                                            globalIdx === selectedIndex ? "opacity-100 translate-x-0" : "group-hover:opacity-100 -translate-x-2"
                                                        )} size={16} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-6 rounded-full bg-muted animate-bounce">
                                <Search size={40} className="text-muted-foreground/30" />
                            </div>
                            <div>
                                <p className="text-lg font-black text-foreground">결과가 없습니다.</p>
                                <p className="text-sm text-muted-foreground font-bold italic">다른 키워드로 검색해 보세요.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Hints */}
                <div className="p-4 bg-muted/30 border-t flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-background border rounded text-[10px] font-black">↵</kbd>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">선택</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-background border rounded text-[10px] font-black">↑↓</kbd>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">이동</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Command size={12} className="text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">EGov Enterprise Intelligence</span>
                    </div>
                </div>
            </div>
        </div>
    );
}