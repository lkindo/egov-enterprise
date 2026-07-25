'use client';

import { useState, useMemo, use } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
 ChevronRight, 
 Folder, 
 File, 
 Loader2, 
 ShieldCheck, 
 Workflow, 
 Network, 
 Lock, 
 Compass, 
 Database,
 ShieldAlert,
 Fingerprint,
 RefreshCcw,
 Milestone,
 LayoutGrid,
 Activity
} from "lucide-react";
import { ErrorStateDisplay } from '@/app/components/ui/status-displays';
import { authorAdminService, AuthorInfo } from '@/services/foundation/system/AuthorAdminService';
import { MenuByAuthority } from '@/types/foundation/security';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from 'framer-motion';

function buildMenuTree(menuList: MenuByAuthority[]): MenuByAuthority[] {
 const menuMap = new Map<number, MenuByAuthority>();
 const rootMenus: MenuByAuthority[] = [];

 menuList.forEach(menu => {
 menuMap.set(menu.menuNo, { ...menu, children: [] });
 });

 menuList.forEach(menu => {
 const currentMenu = menuMap.get(menu.menuNo)!;
 if (menu.upperMenuId === 0) {
 rootMenus.push(currentMenu);
 } else {
 const parent = menuMap.get(menu.upperMenuId);
 if (parent) {
 parent.children = parent.children || [];
 parent.children.push(currentMenu);
 }
 }
 });

 return rootMenus;
}

/**
 * 서버 조회 결과 봉투.
 * 실패를 빈 배열로 삼켜 "데이터 0건"으로 위장하지 않기 위해, 사유를 함께 실어 나른다.
 */
export type FetchResult<T> = { data: T; error: string | null };

interface MenuByAuthorityClientProps {
 authorsPromise: Promise<FetchResult<AuthorInfo[]>>;
}

export default function MenuByAuthorityClient({ authorsPromise }: MenuByAuthorityClientProps) {
 // [P1: Waterfall Elimination] Resolve authors data via use()
 const initialAuthors = use(authorsPromise);

 const queryClient = useQueryClient();
 const router = useRouter();

 const [selectedAuthority, setSelectedAuthority] = useState<string>('');
 const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());

 const {
 data: authorities = [],
 isFetching: isAuthorFetching,
 isError: isAuthorError,
 error: authorError,
 refetch: refetchAuthorities,
 } = useQuery({
 queryKey: ['admin-authorities-all'],
 queryFn: async () => {
 const res = await authorAdminService.getAuthorList({ pageNo: 1, searchCondition: '1', searchKeyword: '' });
 return res?.list ?? [];
 },
 initialData: initialAuthors.data,
 // 서버 조회가 실패했다면 캐시를 즉시 stale 로 두어 클라이언트 재조회가 가능하게 한다.
 staleTime: initialAuthors.error ? 0 : 5 * 60 * 1000,
 });

 /** 서버(SSR) 실패 또는 클라이언트 재조회 실패 — 둘 중 하나라도 있으면 사용자에게 드러낸다. */
 const authorityErrorMessage = isAuthorError
 ? (authorError instanceof Error ? authorError.message : '네트워크 상태를 확인한 뒤 다시 시도해 주세요.')
 : initialAuthors.error;

 const {
 data: rawMenus = [],
 isLoading: isMenuLoading,
 isFetching: isMenuFetching,
 isError: isMenuError,
 error: menuError,
 refetch: refetchMenus,
 } = useQuery({
 queryKey: ['admin-menu-tree', selectedAuthority],
 queryFn: async () => {
 const data = await authorAdminService.getAuthorMenus(selectedAuthority);
 if (Array.isArray(data)) return data;
 const envelope = data as unknown as { list?: MenuByAuthority[]; resultList?: MenuByAuthority[] };
 return envelope?.list ?? envelope?.resultList ?? [];
 },
 enabled: !!selectedAuthority,
 });

 const menuTree = useMemo(() => buildMenuTree(rawMenus), [rawMenus]);

 /** 실제 트리에서 계산한 최대 계층 깊이(선택 전에는 0). */
 const treeDepth = useMemo(() => {
 const walk = (nodes: MenuByAuthority[], depth: number): number =>
 nodes.reduce(
 (max, node) => Math.max(max, node.children && node.children.length > 0 ? walk(node.children, depth + 1) : depth),
 depth,
 );
 return menuTree.length > 0 ? walk(menuTree, 1) : 0;
 }, [menuTree]);

 const isRefreshing = isAuthorFetching || isMenuFetching;

 // 새로고침은 이 화면이 소비하는 두 질의(권한 목록 · 선택 권한의 메뉴 트리)를 모두 무효화한다.
 // 메뉴 트리는 selectedAuthority 를 키에 포함하므로 접두 키로 일괄 무효화한다.
 const handleRefresh = () => {
 queryClient.invalidateQueries({ queryKey: ['admin-authorities-all'] });
 queryClient.invalidateQueries({ queryKey: ['admin-menu-tree'] });
 };

 const toggleExpand = (menuNo: number) => {
 setExpandedMenus(prev => {
 const newSet = new Set(prev);
 if (newSet.has(menuNo)) {
 newSet.delete(menuNo);
 } else {
 newSet.add(menuNo);
 }
 return newSet;
 });
 };

 const currentAuth = authorities.find((a) => a.authrtCd === selectedAuthority);

 const renderMenuTree = (menus: MenuByAuthority[], depth: number = 0) => {
 return menus.map((menu, idx) => {
 const hasChildren = menu.children && menu.children.length > 0;
 const isExpanded = expandedMenus.has(menu.menuNo);

 return (
 <motion.div 
 key={menu.menuNo}
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: idx * 0.05 }}
 >
 <div
 role="button"
 tabIndex={hasChildren ? 0 : -1}
 aria-expanded={hasChildren ? isExpanded : undefined}
 aria-label={hasChildren ? `${menu.menuNm} 하위 메뉴 ${isExpanded ? '접기' : '펼치기'}` : menu.menuNm}
 className={cn(
 "flex items-center gap-4 py-4 px-6 rounded-lg transition-all group relative overflow-hidden",
 hasChildren
 ? "hover:bg-muted cursor-pointer active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
 : "cursor-default",
 isExpanded && hasChildren ? "bg-muted/50" : ""
 )}
 style={{ paddingLeft: `${depth * 32 + 24}px` }}
 onClick={hasChildren ? () => toggleExpand(menu.menuNo) : undefined}
 onKeyDown={(e) => {
 if (!hasChildren) return;
 if (e.key === 'Enter' || e.key === ' ') {
 e.preventDefault();
 toggleExpand(menu.menuNo);
 }
 }}
 >
 <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-card shadow-sm border border-border group-hover:border-primary/30 transition-colors">
 {hasChildren ? (
 <ChevronRight className={cn("h-4 w-4 transition-transform text-muted-foreground group-hover:text-primary", isExpanded ? 'rotate-90' : '')} />
 ) : (
 <div className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-primary/40 transition-colors" />
 )}
 </div>

 <div className={cn(
 "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm border border-border transition-all",
 hasChildren ? "bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white" : "bg-muted text-muted-foreground group-hover:bg-surface-inverse group-hover:text-surface-inverse-foreground"
 )}>
 {hasChildren ? <Folder size={18} /> : <File size={16} />}
 </div>

 <div className="flex flex-col gap-0.5 flex-1 min-w-0">
 <span className={cn(
 "font-bold text-sm tracking-tight truncate",
 hasChildren ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
 )}>{menu.menuNm}</span>
 <span className="text-xs font-bold text-muted-foreground/40 tracking-[0.2em] font-mono uppercase truncate">{menu.prgrmFileNm || '프로그램 미연결'}</span>
 </div>
 
 <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-card border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
 <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase">ID_{menu.menuNo}</span>
 </div>
 </div>
 {hasChildren && isExpanded && (
 <div className="relative">
 <div className="absolute left-[38px] top-0 bottom-0 w-px bg-border" style={{ marginLeft: `${depth * 32}px` }} />
 {renderMenuTree(menu.children!, depth + 1)}
 </div>
 )}
 </motion.div>
 );
 });
 };

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="권한 기반 메뉴 거버넌스"
 breadcrumbs={[{ label: '시스템 관리' }, { label: '메뉴 관리' }, { label: '권한별 메뉴' }]}
 />

 <HubHeader 
 title="권한별 메뉴 관리" 
 highlight="감사" 
 subtitle="시스템 역할별 접근 가능한 메뉴 계층 구조를 시각화하고 정합성을 검증합니다." 
 icon={Workflow} 
 actions={
 <div className="flex gap-4 p-2 items-center">
 <Button
 variant="ghost"
 onClick={handleRefresh}
 disabled={isRefreshing}
 title="권한 목록과 메뉴 트리를 다시 조회합니다"
 className="h-11 w-14 rounded-lg bg-card border-2 border-border text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95 px-4"
 >
 <RefreshCcw size={22} className={cn("transition-transform duration-700", isRefreshing ? "animate-spin" : "group-hover:rotate-180")} />
 </Button>
 <Button
 onClick={() => router.push('/admin/security/authority')}
 title="보안 거버넌스 허브의 역할 인벤토리로 이동합니다"
 className="h-11 px-10 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
 >
 <ShieldCheck size={20} className="group-hover:scale-110 transition-transform duration-500" /> 권한 인벤토리
 </Button>
 </div>
 }
 />

 {/* 권한 목록 조회 실패는 "역할 0건"으로 위장하지 않고 사유와 재시도 수단을 노출한다. */}
 {authorityErrorMessage && (
 <div role="alert" className="flex flex-col gap-3 rounded-lg border-2 border-destructive/30 bg-destructive/5 p-6 sm:flex-row sm:items-center sm:justify-between">
 <div className="flex items-start gap-3">
 <ShieldAlert size={20} className="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
 <div className="space-y-1">
 <p className="text-sm font-bold text-destructive">권한 목록을 불러오지 못했습니다</p>
 <p className="text-xs font-semibold text-muted-foreground">{authorityErrorMessage}</p>
 </div>
 </div>
 <Button variant="outline" onClick={() => refetchAuthorities()} className="h-10 shrink-0 gap-2 rounded-lg font-bold">
 <RefreshCcw size={16} /> 다시 시도
 </Button>
 </div>
 )}

 {/* 근거 없는 고정 지표('보안_상태 최적' · '계층_깊이 팩터_준비')는 삭제하고, 실제 트리에서 계산되는 값만 남긴다. */}
 <HubMetricGrid className="lg:grid-cols-3">
 <HubMetricCard title="등록 역할" value={authorities.length} icon={Database} color="primary" />
 <HubMetricCard title="할당 메뉴" value={rawMenus.length} icon={LayoutGrid} color="amber" />
 <HubMetricCard title="계층 깊이" value={treeDepth} icon={Compass} color="indigo" />
 </HubMetricGrid>

 <div className="grid grid-cols-12 gap-12">
 <div className="col-span-12 lg:col-span-4 h-full space-y-8">
 <HubSectionCard title="역할 선택" description="메뉴 구조를 분석할 보안 역할을 식별하세요" icon={Lock}>
 <div className="space-y-8">
 <div className="space-y-4 pt-4">
 <label htmlFor="authority-select" className="text-xs font-bold text-muted-foreground/40 tracking-[0.4em] ml-2">보안 역할</label>
 <Select value={selectedAuthority} onValueChange={setSelectedAuthority}>
 <SelectTrigger id="authority-select" className="h-11 px-8 rounded-lg bg-muted/50 border-none shadow-inner text-sm font-bold tracking-tight focus:ring-4 focus:ring-primary/10 transition-all group active:scale-[0.98]">
 <div className="flex items-center gap-4">
 <Fingerprint size={20} className="text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
 <SelectValue placeholder="역할을 선택하십시오..." />
 </div>
 </SelectTrigger>
 <SelectContent className="rounded-lg border-none shadow-2xl p-2 bg-surface-inverse text-surface-inverse-foreground">
 {authorities.map((auth) => (
 <SelectItem 
 key={auth.authrtCd} 
 value={auth.authrtCd}
 className="rounded-lg h-12 font-bold text-xs tracking-widest uppercase focus:bg-primary focus:text-white mb-1"
 >
 {auth.authrtNm} ({auth.authrtCd})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="p-8 rounded-lg bg-surface-inverse text-surface-inverse-foreground relative overflow-hidden group border-none shadow-2xl min-h-[300px] flex flex-col justify-end">
 <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
 <ShieldAlert size={180} className="text-primary" />
 </div>
 <div className="relative z-10 space-y-6">
 <div className="w-14 h-11 bg-white/10 rounded-lg flex items-center justify-center border border-white/5 shadow-inner">
 <Activity size={28} className="text-primary" />
 </div>
 <div className="space-y-3">
 <h4 className="text-2xl font-bold tracking-tighter leading-tight uppercase">메뉴 매핑<br />인텔리전스</h4>
 <p className="text-xs text-surface-inverse-muted font-bold tracking-[0.3em] uppercase font-mono">선택한 역할의 메뉴 계층 실시간 분석</p>
 </div>
 </div>
 </div>
 </div>
 </HubSectionCard>
 </div>

 <div className="col-span-12 lg:col-span-8 h-full">
 <HubSectionCard 
 title={currentAuth ? `[${currentAuth.authrtNm}] 메뉴 아키텍처` : "아키텍처 분석"}
 description="선택된 권한에 할당된 전체 메뉴의 위계적 구조입니다." 
 icon={Network}
 >
 <div className="space-y-8">
 <div className="flex items-center justify-between px-2 pt-2 border-b border-border pb-8">
 <span className="text-xs font-bold text-muted-foreground/30 tracking-[0.4em] font-mono">기능 노드 트리</span>
 {/* 핸들러가 없어 눌러도 아무 일도 일어나지 않던 '노드 검색' 버튼을 제거했다(구현 계획 없음). */}
 <div className="flex items-center gap-4">
 {isMenuLoading && <Loader2 className="h-6 w-6 animate-spin text-primary opacity-40" />}
 </div>
 </div>

 <div className="min-h-[600px] relative">
 <AnimatePresence mode="wait">
 {!selectedAuthority ? (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 className="absolute inset-0 flex flex-col items-center justify-center p-24 text-center select-none group"
 >
 <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center text-slate-200 shadow-inner mb-8 group-hover:scale-110 transition-transform duration-1000">
 <Milestone size={48} className="opacity-20" />
 </div>
 <h3 className="text-2xl font-bold text-slate-300 tracking-tighter uppercase mb-2">권한 미선택</h3>
 <p className="text-xs font-bold text-slate-200 tracking-[0.5em] uppercase">메뉴 구조를 분석할 역할을 먼저 선택하십시오.</p>
 </motion.div>
 ) : isMenuLoading ? (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 className="absolute inset-0 flex flex-col items-center justify-center gap-6"
 >
 <Loader2 size={48} className="text-primary animate-spin opacity-40" />
 <span className="text-xs font-bold text-muted-foreground/40 tracking-[0.4em] uppercase">데이터 매핑 중...</span>
 </motion.div>
 ) : isMenuError ? (
 // 조회 실패를 '할당된 메뉴 없음'으로 위장하지 않는다.
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="absolute inset-0 flex items-center justify-center"
 >
 <ErrorStateDisplay error={menuError} onRetry={() => refetchMenus()} />
 </motion.div>
 ) : menuTree.length === 0 ? (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 className="absolute inset-0 flex flex-col items-center justify-center gap-8 py-24"
 >
 <ShieldAlert size={64} className="text-rose-500/20" />
 <h4 className="text-lg font-bold tracking-tighter text-muted-foreground uppercase">할당된 메뉴 없음</h4>
 </motion.div>
 ) : (
 <motion.div 
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="space-y-4"
 >
 <div className="p-4 rounded-lg bg-muted/30 border-2 border-border">
 {renderMenuTree(menuTree)}
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 </HubSectionCard>
 </div>
 </div>
 </div>
 );
}

