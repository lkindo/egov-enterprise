'use client';

import { useState, useMemo, use } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ChevronRight, File, Folder, Loader2, Network, RefreshCcw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ErrorStateDisplay } from '@/app/components/ui/status-displays';
import { authorAdminService, AuthorInfo } from '@/services/foundation/system/AuthorAdminService';
import { menuAdminService } from '@/services/foundation/system/MenuAdminService';
import { MenuByAuthority } from '@/types/foundation/security';
import type { AuthorMenuAssignment } from '@/services/foundation/system/AuthorAdminService';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";

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
 const envelope = data as unknown as { list?: AuthorMenuAssignment[]; resultList?: AuthorMenuAssignment[] };
 return envelope?.list ?? envelope?.resultList ?? [];
 },
 enabled: !!selectedAuthority,
 });

 /**
  * 메뉴 계층은 별도 API 에서 가져온다.
  *
  * [2026-08-29] 권한별 메뉴 응답에는 **메뉴 번호도 상위 메뉴도 없다** — MenuCreateDto 는
  * menuSn·authrtCd·authrtNm·chkYeoBu 만 담는다(서버 projection 에는 menuNm·upperMenuSn 이
  * 있지만 MenuService.selectMenuCreatList 가 DTO 로 옮기지 않는다). 그래서 종전
  * buildMenuTree 는 `menu.upperMenuId === 0` 을 `undefined === 0` 으로 비교해 루트를 하나도
  * 만들지 못했고, **모든 권한에서 트리가 영구히 비어 '할당된 메뉴 없음' 이 떴다** — 지표
  * 카드가 0 이 아닌 수를 찍는 바로 옆에서.
  *
  * 계층·이름은 /menus/all 이 이미 내려주므로(권한 관리 화면이 쓰는 것과 같은 조합) 두 응답을
  * 합친다. 서버 계약 변경 없이 화면만으로 해소된다.
  */
 const {
   data: allMenus = [],
 } = useQuery({
   queryKey: ['admin-menus-all'],
   queryFn: () => menuAdminService.getAllMenus(),
 });

 /** 선택 권한에 실제로 부여된 메뉴 번호. 응답은 '메뉴 전체 + 할당 플래그' 라 플래그로 거른다. */
 const assignedMenuSns = useMemo(
   () => new Set(
     rawMenus
       .filter(m => m.chkYeoBu === 1)
       .map(m => m.menuSn)
       .filter((sn): sn is number => typeof sn === 'number'),
   ),
   [rawMenus],
 );

 const menuTree = useMemo(
   () => buildMenuTree(
     allMenus
       .filter(m => assignedMenuSns.has(m.menuNo))
       .map(m => ({
         menuNo: m.menuNo,
         menuNm: m.menuNm,
         upperMenuId: m.upMenuSn,
         menuOrdr: m.menuOrdr,
         prgrmFileNm: m.prgrmFileNm,
       })),
   ),
   [allMenus, assignedMenuSns],
 );

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
 return menus.map((menu) => {
 const hasChildren = menu.children && menu.children.length > 0;
 const isExpanded = expandedMenus.has(menu.menuNo);

 return (
 <div key={menu.menuNo}>
 <div
 role="button"
 tabIndex={hasChildren ? 0 : -1}
 aria-expanded={hasChildren ? isExpanded : undefined}
 aria-label={hasChildren ? `${menu.menuNm} 하위 메뉴 ${isExpanded ? '접기' : '펼치기'}` : menu.menuNm}
 className={cn(
 'flex items-center gap-2 rounded px-2 py-1.5 transition-colors',
 hasChildren
 ? 'cursor-pointer hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring'
 : 'cursor-default',
 )}
 style={{ paddingLeft: `${depth * 20 + 8}px` }}
 onClick={hasChildren ? () => toggleExpand(menu.menuNo) : undefined}
 onKeyDown={(e) => {
 if (!hasChildren) return;
 if (e.key === 'Enter' || e.key === ' ') {
 e.preventDefault();
 toggleExpand(menu.menuNo);
 }
 }}
 >
 {/* 펼침 표시는 자리를 고정한다 — 있을 때만 그리면 잎과 가지의 들여쓰기가 어긋난다. */}
 <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
 {hasChildren
 ? <ChevronRight size={14} aria-hidden="true" className={cn('transition-transform', isExpanded && 'rotate-90')} />
 : null}
 </span>
 {/* e2e(06-ops-governance)가 lucide-folder·lucide-file 클래스로 노드 존재를 확인한다. */}
 {hasChildren
 ? <Folder size={14} aria-hidden="true" className="shrink-0 text-muted-foreground" />
 : <File size={14} aria-hidden="true" className="shrink-0 text-muted-foreground" />}
 <span className="min-w-0 truncate text-[length:var(--font-size-body)] text-foreground">{menu.menuNm}</span>
 {/* 종전에는 프로그램 경로와 메뉴 번호가 hover 에서만 보였다 — 조회 화면에서 숨길 값이 아니다. */}
 <span className="ml-auto flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
 <span className="hidden font-mono sm:inline">{menu.prgrmFileNm || '프로그램 미연결'}</span>
 <span className="tabular-nums">{menu.menuNo}</span>
 </span>
 </div>
 {hasChildren && isExpanded && renderMenuTree(menu.children!, depth + 1)}
 </div>
 );
 });
 };

 return (
 <WorkListPage
 title="그룹별 메뉴 현황"
 description="권한 그룹을 고르면 그 그룹에 배정된 메뉴 계층을 보여 줍니다. 배정 편집은 권한 그룹 관리 화면이 소유합니다."
 breadcrumbItems={[{ label: '권한 보안' }, { label: '그룹별 메뉴 현황' }]}
 totalCount={selectedAuthority ? assignedMenuSns.size : undefined}
 actions={(
 <Button type="button" variant="outline" size="sm" onClick={() => router.push('/admin/security/authority')} className="gap-1.5">
 <ShieldCheck size={14} aria-hidden="true" /> 권한 그룹 관리
 </Button>
 )}
 filter={(
 <div className="flex flex-wrap items-end gap-2">
 <div className="min-w-0 flex-1 sm:max-w-sm">
 {/* 이 접근 이름은 e2e(06-ops-governance)가 combobox 셀렉터로 쓴다 — 정확히 권한 그룹. */}
 <label htmlFor="authority-select" className="mb-1 block text-xs font-medium text-muted-foreground">
 권한 그룹
 </label>
 <Select value={selectedAuthority} onValueChange={setSelectedAuthority}>
 <SelectTrigger id="authority-select" className="h-[var(--filter-control-h)] text-[length:var(--font-size-body)]">
 <SelectValue placeholder="권한 그룹을 선택하세요" />
 </SelectTrigger>
 <SelectContent>
 {authorities.map((auth) => (
 <SelectItem key={auth.authrtCd} value={auth.authrtCd} className="text-[length:var(--font-size-body)]">
 {auth.authrtNm} ({auth.authrtCd})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 <p className="basis-full text-xs text-muted-foreground">
 조회된 권한 그룹 {authorities.length}개
 {selectedAuthority && treeDepth > 0 ? ` · 선택한 그룹의 메뉴 계층 ${treeDepth}단계` : ''}
 </p>
 </div>
 )}
 toolbarActions={(
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleRefresh}
 disabled={isRefreshing}
 aria-label="권한 목록과 메뉴 트리 새로고침"
 className="gap-1.5"
 >
 <RefreshCcw size={14} aria-hidden="true" className={cn(isRefreshing && 'animate-spin')} />
 새로고침
 </Button>
 )}
 >
 {/* 권한 목록 조회 실패는 역할 0건으로 위장하지 않고 사유와 재시도 수단을 노출한다. */}
 {authorityErrorMessage && (
 <div role="alert" className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
 <ShieldAlert size={14} className="shrink-0 text-destructive-emphasis" aria-hidden="true" />
 <p className="min-w-0 flex-1 text-[length:var(--font-size-body)] text-destructive-emphasis">
 권한 목록을 불러오지 못했습니다. {authorityErrorMessage}
 </p>
 <Button variant="outline" size="sm" onClick={() => refetchAuthorities()} className="shrink-0 gap-1.5">
 <RefreshCcw size={14} aria-hidden="true" /> 다시 시도
 </Button>
 </div>
 )}

 <section aria-labelledby="menu-hierarchy-title" className="rounded-md border border-border bg-card">
 <header className="flex items-center gap-2 border-b border-border px-[var(--filter-pad)] py-2">
 <Network size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
 {/* e2e 가 이 제목을 메뉴 계층 접미로 찾는다 — 접미를 유지한다. */}
 <h2 id="menu-hierarchy-title" className="truncate text-[length:var(--font-size-body)] font-semibold text-foreground">
 {currentAuth ? `[${currentAuth.authrtNm}] 메뉴 계층` : '메뉴 계층'}
 </h2>
 {isMenuLoading && <Loader2 size={14} aria-hidden="true" className="ml-auto shrink-0 animate-spin text-muted-foreground" />}
 </header>
 <div className="p-[var(--filter-pad)]">
 {!selectedAuthority ? (
 <p role="status" className="py-6 text-center text-[length:var(--font-size-body)] text-muted-foreground">
 메뉴를 확인할 권한 그룹을 먼저 선택하세요.
 </p>
 ) : isMenuLoading ? (
 <p role="status" className="py-6 text-center text-[length:var(--font-size-body)] text-muted-foreground">
 선택한 권한 그룹의 메뉴를 불러오는 중입니다.
 </p>
 ) : isMenuError ? (
 // 조회 실패를 할당된 메뉴 없음으로 위장하지 않는다.
 <ErrorStateDisplay error={menuError} onRetry={() => refetchMenus()} />
 ) : menuTree.length === 0 ? (
 <p role="status" className="py-6 text-center text-[length:var(--font-size-body)] text-muted-foreground">
 할당된 메뉴 없음
 </p>
 ) : (
 <div className="max-h-[70vh] overflow-y-auto">{renderMenuTree(menuTree)}</div>
 )}
 </div>
 </section>
 </WorkListPage>
 );
}