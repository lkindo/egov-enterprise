'통계 대시보드';

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
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { menuAdminService } from '@/services/foundation/system/MenuAdminService';

interface SearchResult {
    id: string;
    category: 'Menu' | 'Content' | 'User';
    title: string;
    url: string;
    description?: string;
    icon: React.ReactNode;
}

// 移댄뀒怨좊━蹂님꾩씠肄?매핑
const categoryIcons = {
    Menu: <Settings size={14} />,
    Content: <FileText size={14} />,
    User: <Users size={14} />,
};

export function CommandPalette() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // 硫붾돱 ?곗씠님濡쒕뱶
    useEffect(() => {
        if (!isOpen) return;

        const loadMenus = async () => {
            setIsLoading(true);
            try {
                const menus = await menuAdminService.getAllMenus();

                const searchResults: SearchResult[] = menus
                    .filter(menu => menu.modernRoute && menu.modernRoute !== '#' && menu.id <= 9999999)
                    .map(menu => ({
                        id: String(menu.id),
                        category: 'Menu' as const,
                        title: menu.menuNm,
                        url: menu.modernRoute,
                        description: menu.menuDc || undefined,
                        icon: getMenuIcon(menu.modernRoute),
                    }));

                setResults(searchResults);
            } catch {
                console.error('Failed to load menus:', error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadMenus();
    }, [isOpen]);

    // ?꾪꽣留곷맂 寃곌낵
    const filteredResults = results.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
    );

    const handleOpen = useCallback(() => setIsOpen(true), []);
    const handleClose = useCallback(() => {
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(0);
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
                    <Search className="text-muted-foreground" size={20} />
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
                            if (e.key === 'Enter' && filteredResults[selectedIndex]) {
                                onSelect(filteredResults[selectedIndex].url);
                            }
                            if (e.key === 'ArrowDown') setSelectedIndex((i) => Math.min(filteredResults.length - 1, i + 1));
                            if (e.key === 'ArrowUp') setSelectedIndex((i) => Math.max(0, i - 1));
                        }}
                    />
                    {isLoading && (
                        <div className="text-xs text-muted-foreground animate-pulse">濡쒕뵫以?..</div>
                    )}
                    <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md">
                        <span className="text-[10px] font-black text-muted-foreground">ESC</span>
                    </div>
                    <button onClick={handleClose} className="p-1 hover:bg-muted rounded-full text-muted-foreground">
                        <X size={18} />
                    </button>
                </div>

                {/* Results Area */}
                <div className="max-h-[50vh] overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {isLoading ? (
                        <div className="p-20 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="p-6 rounded-full bg-muted animate-spin">
                                <Search size={40} className="text-muted-foreground/30" />
                            </div>
                            <div>
                                <p className="text-lg font-black text-foreground">硫붾돱瑜?遺덈윭?ㅻ뒗 以?..</p>
                                <p className="text-sm text-muted-foreground font-bold">?좎떆留?湲곕떎?ㅼ＜?몄슂.</p>
                            </div>
                        </div>
                    ) : filteredResults.length > 0 ? (
                        <div className="space-y-1">
                            {['Menu', 'Content', 'User'].map((cat) => {
                                const catResults = filteredResults.filter(r => r.category === cat);
                                if (catResults.length === 0) return null;
                                return (
                                    <div key={cat} className="mb-4">
                                        <h3 className="text-[10px] font-black text-muted-foreground tracking-tight px-4 mb-2">{cat}</h3>
                                        <div className="space-y-1">
                                            {catResults.map((result) => {
                                                const globalIdx = filteredResults.indexOf(result);
                                                return (
                                                    <button
                                                        key={result.id}
                                                        className={cn(
                                                            '시스템 통합 분석 및 현황',
                                                            globalIdx === selectedIndex ? "bg-primary text-primary-foreground shadow-lg scale-[1.01]" : "hover:bg-muted text-foreground"
                                                        )}
                                                        onClick={() => onSelect(result.url)}
                                                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                                                    >
                                                        <div className="flex items-center gap-4 text-left">
                                                            <div className={cn(
                                                                '사용자 관리',
                                                                globalIdx === selectedIndex ? "bg-white/20 border-white/10" : '통계 대시보드'
                                                            )}>
                                                                {result.icon}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black tracking-tight">{result.title}</p>
                                                                {result.description && (
                                                                    <p className={cn(
                                                                        '권한 설정 및 사용자 목록',
                                                                        globalIdx === selectedIndex ? "text-primary-foreground/70" : '시스템 통합 분석 및 현황'
                                                                    )}>
                                                                        {result.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <ArrowRight className={cn(
                                                            '공지사항 게시판',
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
                                <p className="text-lg font-black text-foreground">寃곌낵媛 ?놁뒿?덈떎.</p>
                                <p className="text-sm text-muted-foreground font-bold">?ㅻⅨ ?ㅼ썙?쒕줈 寃?됲빐 蹂댁꽭님</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Hints */}
                <div className="p-4 bg-muted/30 border-t flex items-center justify-center gap-6">
                    <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-background border rounded text-[10px] font-black">Enter</kbd>
                        <span className="text-[10px] font-bold text-muted-foreground">?좏깮</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-background border rounded text-[10px] font-black">?묅넃</kbd>
                        <span className="text-[10px] font-bold text-muted-foreground">?대룞</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Command size={12} className="text-muted-foreground" />
                        <span className="text-[10px] font-bold text-muted-foreground">EGov ?뷀꽣?꾨씪?댁쫰 ?명뀛由ъ쟾님/span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 硫붾돱 寃쎈줈蹂님꾩씠肄?諛섑솚
function getMenuIcon(route: string): React.ReactNode {
    if (route.includes('stats') || route.includes('dashboard')) return <LayoutDashboard size={14} />;
    if (route.includes('user')) return <Users size={14} />;
    if (route.includes('board') || route.includes('community')) return <FileText size={14} />;
    if (route.includes('system') || route.includes('admin')) return <Settings size={14} />;
    return <LayoutDashboard size={14} />;
}

