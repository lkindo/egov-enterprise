'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Program } from '@/types/foundation/program';
import type { PageResponse, ProgrmManage } from '@/types/foundation/system';
import type { ScreenRegistryEntry } from '@/types/generated-screen-registry';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Plus,
 Loader2,
 Trash2,
 Settings,
 Link as LinkIcon,
 ListPlus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import {
 Tooltip,
 TooltipContent,
 TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProgramForm } from '@/components/admin/system/ProgramForm';

import { failureMessage } from '@/lib/safe-error-log';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { canOpenPage } from '@/lib/auth/page-access';
import { canAddScreensToMenus } from '@/lib/navigation/menu-screen-resolution';
import { handOffScreen } from '@/lib/navigation/target-handoff';
import {
 createProgramMenuLinkLookup,
 programDeleteLinkNotice,
 programMenuLinkSummary,
 programMenuLinksFromSource,
 type ProgramMenuLinkCell,
} from './programMenuLinks';
import { useMenuStructureSource } from './useMenuStructureSource';
import {
 SCREEN_KIND_FILTER_OPTIONS,
 canAddScreenToMenu,
 createScreenMenuLinkLookup,
 filterAliases,
 filterScreens,
 listedAliases,
 listedScreens,
 noMenuOptionHint,
 screenDisplayName,
 screenKindFilterUnavailableReason,
 screenListFallbackMessage,
 type ScreenKindFilter,
} from './screenList';
import {
 PanelNote,
 ProgramAdminTabList,
 ScreenAliasList,
 ScreenBadgeList,
 ScreenEntryCell,
 ScreenMenuLinkCellView,
 ScreenNameCell,
 programAdminTabId,
 type ProgramAdminTab,
} from './ScreenListParts';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

/** 서버(BaseSearchDto)의 기본 페이지 크기와 동일하게 맞춘다. */
/** 페이지당 건수 기본값(A1 필수 — 사용자가 바꿀 수 있다). URL 에는 싣지 않는다. */
const DEFAULT_PAGE_SIZE = 10;
/** 화면 목록의 페이지당 건수 기본값. 화면 목록은 앱에 들어 있는 목록이라 화면 안에서 나눈다. */
const SCREEN_PAGE_SIZE = 20;

/** 화면 목록 모집단과 별칭은 빌드에 들어 있다 — 렌더마다 다시 거르지 않는다. */
const LISTED_SCREENS = listedScreens();
const LISTED_ALIASES = listedAliases();

const FILTER_SELECT_CLASS = 'h-[var(--control-h)] rounded-md border border-input bg-background px-2 text-[length:var(--font-size-body)]';

/** 조회 실패 사유를 Error 로 정규화한다(StandardDataTable 의 error prop 계약). */
function toError(value: unknown): Error {
 if (value instanceof Error) return value;
 if (typeof value === 'string' && value) return new Error(value);
 return new Error('데이터를 불러오는 중 오류가 발생했습니다.');
}

/**
 * 현재 페이지를 URL 에 반영한다(공유·새로고침 복원). 서버 재실행 없이 주소만 갱신한다.
 * '이전 프로그램' 탭의 목록만 쓴다 — 화면 목록 탭과 탭 상태는 URL 에 싣지 않는다.
 */
function syncPageToUrl(page: number) {
 if (typeof window === 'undefined') return;
 const url = new URL(window.location.href);
 if (page <= 1) url.searchParams.delete('page');
 else url.searchParams.set('page', String(page));
 window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

/**
 * 연결 메뉴 칸. 연결이 있으면 펼쳐서 메뉴 이름을 본다(사용 안 함 메뉴는 그렇게 표시한다).
 * 메뉴를 불러오는 중이거나 조회가 거부·실패하면 0건('연결 없음')으로 말하지 않고 그 사실을 그대로 보인다.
 * 실패 문구의 글자색은 전경 전용 토큰(-emphasis)이다 — 배경용 destructive 는 다크에서 대비가 1.8:1 이다.
 */
function ProgramMenuLinkCellView({ cell }: { cell: ProgramMenuLinkCell }) {
 const summary = programMenuLinkSummary(cell);
 if (cell.kind === 'linked') {
 return (
 <details className="text-sm">
 <summary className="cursor-pointer font-medium text-foreground">{summary}</summary>
 <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
 {cell.menus.map((menu) => (
 <li key={menu.menuNo}>
 {menu.menuNm}
 <span className="ml-1 font-mono">(ID: {menu.menuNo})</span>
 {!menu.inUse && <span className="ml-1">· 사용 안 함</span>}
 </li>
 ))}
 </ul>
 </details>
 );
 }
 return (
 <span
 className={cell.kind === 'failed' ? 'text-sm text-destructive-emphasis' : 'text-sm text-muted-foreground'}
 aria-busy={cell.kind === 'checking' || undefined}
 >
 {summary}
 </span>
 );
}

/**
 * 화면 관리(/admin/system/programs, 2026-10-02 D3). 앱 화면 목록(기본 탭)과 이전 프로그램 원장 탭을 한 셸(h1 하나)에
 * 둔다. 메뉴는 이제 화면 경로로 연결하므로 화면 목록이 기본이고, 이전 프로그램은 1단계 표·폼 그대로다.
 * 두 탭이 같은 메뉴 구조 조회 한 번(MENU_READ 일 때만)을 나눠 쓴다.
 */
export default function ProgramAdminClient({
 initialData,
 searchWrd,
 initialError = null,
 initialPage = 1,
}: {
 initialData: PageResponse<Program>;
 searchWrd: string;
 /** 서버 컴포넌트 조회 실패 사유. 실패를 빈 목록으로 위장하지 않기 위해 그대로 전달받는다. */
 initialError?: string | null;
 /** URL `?page=` 로 복원된 '이전 프로그램' 탭의 초기 페이지(1-base) */
 initialPage?: number;
}) {
 const { toast } = useToast();
 const confirm = useConfirm();
 const router = useRouter();
 // [2026-10-01] 쓰기 버튼은 그 동작의 기능 권한으로 보인다 — 조회 권한(PROGRAM_READ)만으로 들어와 폼을 채운 뒤에야 403 을 만나지 않게 한다(표시 판정일 뿐 서버 인가는 그대로다).
 const { user } = useAuth();
 const canCreateProgram = canPermission(user, 'PROGRAM_CREATE');
 const canUpdateProgram = canPermission(user, 'PROGRAM_UPDATE');
 const canDeleteProgram = canPermission(user, 'PROGRAM_DELETE');
 /*
 * [2026-10-02 D3] '메뉴에 추가' 는 메뉴 관리가 새 메뉴를 만들고 저장할 수 있는 사람에게만 보인다 — 새 메뉴 등록
 * (MENU_CREATE)과 구조 저장(MENU_UPDATE)(canAddScreensToMenus), 그리고 메뉴 관리 화면에 들어갈 수 있는가(라우트
 * 게이트와 같은 판정). 두 메뉴 권한은 메뉴 관리 화면의 권한이라 이 화면의 표시 권한으로 세지 않는다(그 판정이 공용
 * 모듈에 있는 이유 — 화면 목록 생성기는 화면 파일의 리터럴만 이 화면 줄에 센다).
 */
 const canAddMenus = canAddScreensToMenus(user) && canOpenPage(user, '/admin/system/menus');
 /*
 * [2026-10-02] 연결 메뉴 — MENU_READ 가 있을 때만 메뉴 구조를 한 번 읽는다(서버에 403 거부 기록을 남기지 않는다).
 * 실패는 화면 전체 오류로 올리지 않고 칸과 목록 위 안내·다시 불러오기로 알린다(useMenuStructureSource).
 */
 const { menus: menuSource, retry: retryMenus, retrying: retryingMenus } = useMenuStructureSource();

 const tabIdPrefix = useId();
 const panelId = `${tabIdPrefix}-panel`;
 const [activeTab, setActiveTab] = useState<ProgramAdminTab>('screens');

 // ─── 화면 목록 탭 ───
 const [screenKeyword, setScreenKeyword] = useState('');
 const [screenKind, setScreenKind] = useState<ScreenKindFilter>('all');
 const [screenPage, setScreenPage] = useState(1);
 const [screenPageSize, setScreenPageSize] = useState(SCREEN_PAGE_SIZE);
 const screenLinkOf = useMemo(() => createScreenMenuLinkLookup(menuSource), [menuSource]);
 const filteredScreens = useMemo(
 () => filterScreens(LISTED_SCREENS, { keyword: screenKeyword, kind: screenKind }, screenLinkOf),
 [screenKeyword, screenKind, screenLinkOf],
 );
 const filteredAliases = useMemo(() => filterAliases(LISTED_ALIASES, screenKeyword), [screenKeyword]);
 const screenTotalPages = Math.max(1, Math.ceil(filteredScreens.length / screenPageSize));
 // 거르기로 줄어든 목록이 지금 쪽보다 짧으면 마지막 쪽을 보인다(빈 쪽에 갇히지 않게).
 const currentScreenPage = Math.min(screenPage, screenTotalPages);
 const pagedScreens = filteredScreens.slice((currentScreenPage - 1) * screenPageSize, currentScreenPage * screenPageSize);
 const screenFilterReason = screenKindFilterUnavailableReason(screenKind, menuSource);
 const kindFilterHintId = `${tabIdPrefix}-kind-hint`;
 // '메뉴에 없는 화면' 선택지가 비활성인 동안(불러오는 중·권한 없음·실패) 그 이유를 늘 말한다(G10).
 const noMenuFilterHint = noMenuOptionHint(menuSource);

 /**
 * 화면 하나를 메뉴 관리의 새 메뉴로 넘긴다(화면 인계 — 이 탭의 sessionStorage, URL 비노출). 넘기지 못하면 이동하지 않는다 —
 * 메뉴 관리에 가도 넘긴 화면이 없으니 '메뉴에 추가' 가 아무 일도 하지 않은 것처럼 보이지 않게 그 사실을 알린다.
 */
 const handleAddScreenToMenu = (screen: ScreenRegistryEntry) => {
 if (!handOffScreen({ route: screen.route, label: screen.label })) {
 toast('화면을 메뉴 관리로 넘기지 못했습니다. 메뉴 관리에서 화면을 직접 추가해 주세요.', 'error');
 return;
 }
 router.push('/admin/system/menus');
 };

 // ─── 이전 프로그램 탭(1단계 표·폼 그대로) ───
 const [isModalOpen, setIsOpen] = useState(false);
 const programWritePendingRef = useRef(false);
 const [deletingProgramFileName, setDeletingProgramFileName] = useState<string | null>(null);
 const [mode, setMode] = useState<'create' | 'edit'>('create');
 const [editingProgram, setEditingProgram] = useState<Program | null>(null);
 const editingProgramFormData: ProgrmManage | undefined = editingProgram
 ? {
 prgrmFileNm: editingProgram.prgrmFileNm,
 prgrmStrgPath: editingProgram.prgrmStrgPath,
 prgrmKornNm: editingProgram.prgrmKornNm,
 prgrmExpln: editingProgram.prgrmExpln ?? '',
 url: editingProgram.url,
 }
 : undefined;

 const [data, setData] = useState<Program[]>(() => {
 return (initialData?.list || []) as Program[];
 });
 const [total, setTotal] = useState<number>(() => {
 return initialData?.total || 0;
 });
 const [totalPage, setTotalPage] = useState<number>(() => {
 return initialData?.totalPage || 1;
 });
 const [page, setPage] = useState(initialPage);
 const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<Error | null>(initialError ? toError(initialError) : null);
 const [currentSearchWrd, setCurrentSearchWrd] = useState(searchWrd);
 // 메뉴 구조를 한 번 색인한다 — 쪽 이동·검색으로 목록이 바뀌어도 메뉴를 다시 조회하지 않는다.
 const menuLinkOf = useMemo(() => createProgramMenuLinkLookup(programMenuLinksFromSource(menuSource)), [menuSource]);

 /**
  * 목록 조회. 서버는 @ModelAttribute BaseSearchDto(pageIndex 1-based / pageUnit / searchKeyword)로 받는다.
  * pageIndex 는 직접 계산하지 않고 ApiService 의 자동 매핑(page 0-based → pageIndex = page+1)에 위임한다.
  * 페이지 크기는 BaseSearchDto.pageUnit 이 결정하므로 pageUnit 을 함께 보낸다(size 는 recordCountPerPage 로만 매핑됨).
  * 검색어도 BaseSearchDto.searchKeyword 로 실어야 서버에 닿는다(searchWrd 는 바인딩 대상이 아니다).
  */
 const loadData = async (wrd: string = currentSearchWrd, targetPage: number = 1, size: number = pageSize) => {
 try {
 setLoading(true);
 setError(null);
 const res = await programAdminService.getProgramList({
 page: targetPage - 1,
 size,
 pageUnit: size,
 searchKeyword: wrd
 });

 const list = (res.list || []) as Program[];
 const totalCount = res.total || 0;

 setData(list);
 setTotal(totalCount);
 setTotalPage(res.totalPage || 1);
 setPage(targetPage);
 syncPageToUrl(targetPage);
 } catch (err: unknown) {
 // 실패를 "데이터 없음"으로 위장하지 않는다 — 목록 영역에 오류와 재시도 수단을 노출한다.
 setError(toError(err));
 setData([]);
 toast(failureMessage(err, '프로그램 목록을 불러오지 못했습니다.'), 'error');
 } finally {
 setLoading(false);
 }
 };

 /** 검색은 항상 1페이지부터 — 3페이지에서 검색하면 빈 화면이 되는 결함 방지. */
 const handleOpenCreate = () => {
 if (programWritePendingRef.current || isModalOpen) return;
 setMode('create');
 setEditingProgram(null);
 setIsOpen(true);
 };

 const handleOpenEdit = (program: Program) => {
 if (programWritePendingRef.current || isModalOpen) return;
 setMode('edit');
 setEditingProgram(program);
 setIsOpen(true);
 };

 const handleDelete = async (program: Program) => {
 if (programWritePendingRef.current || isModalOpen) return;
 programWritePendingRef.current = true;
 setDeletingProgramFileName(program.prgrmFileNm);
 try {
 const isConfirmed = await confirm({
 title: '프로그램 삭제',
 // 서버는 이 프로그램을 연결한 메뉴(사용 안 함 포함)가 있으면 삭제를 거부한다(409). 연결 메뉴를 알고 있으면
 // 그 수·이름을 밝힌다. 화면을 연 시점의 메뉴 구조라 삭제를 막지는 않고 최종 판정은 서버에 맡긴다.
 message: `[${program.prgrmKornNm}] (${program.prgrmFileNm}) 프로그램을 삭제하시겠습니까? ${programDeleteLinkNotice(menuLinkOf(program.prgrmFileNm))}`,
 variant: 'destructive',
 confirmText: '프로그램 삭제'
 });
 if (isConfirmed) {
 await programAdminService.deleteProgram(program.prgrmFileNm);
 toast('프로그램이 삭제되었습니다.', 'success');
 loadData(currentSearchWrd, page);
 }
 } catch (err) {
 toast(failureMessage(err, '프로그램을 삭제하지 못했습니다.'), 'error');
 } finally {
 programWritePendingRef.current = false;
 setDeletingProgramFileName(null);
 }
 };

 const closeProgramModal = () => {
 if (programWritePendingRef.current) return;
 setIsOpen(false);
 };

 const screenColumns: Column<ScreenRegistryEntry>[] = [
 {
 header: '화면 이름',
 accessor: (screen: ScreenRegistryEntry) => <ScreenNameCell screen={screen} name={screenDisplayName(screen)} />,
 },
 {
 header: '경로',
 accessor: (screen: ScreenRegistryEntry) => (
 <span className="block break-all text-left font-mono text-xs text-muted-foreground">{screen.route}</span>
 ),
 className: 'w-64',
 },
 {
 header: '진입 권한',
 accessor: (screen: ScreenRegistryEntry) => <ScreenEntryCell screen={screen} />,
 },
 {
 // 메뉴 경로(쿼리 제외)가 여는 화면으로 센다. 별칭을 가리키는 메뉴는 그 목적지 화면으로 센다. 사용 안 함 메뉴도 센다.
 header: '연결 메뉴',
 accessor: (screen: ScreenRegistryEntry) => <ScreenMenuLinkCellView cell={screenLinkOf(screen.route)} />,
 className: 'w-44',
 },
 {
 header: '구분',
 accessor: (screen: ScreenRegistryEntry) => <ScreenBadgeList screen={screen} cell={screenLinkOf(screen.route)} />,
 className: 'w-32',
 },
 // 메뉴를 만들 수 없으면 관리 열을 두지 않는다.
 ...(canAddMenus ? [{
 header: '관리',
 className: 'text-right w-36',
 accessor: (screen: ScreenRegistryEntry) => (canAddScreenToMenu(screen) ? (
 <div className="flex justify-end pr-4">
 <Button
 type="button"
 size="sm"
 variant="outline"
 aria-label={`메뉴에 추가: ${screenDisplayName(screen)} (${screen.route})`}
 onClick={() => handleAddScreenToMenu(screen)}
 className="gap-1"
 >
 <ListPlus size={14} aria-hidden="true" /> 메뉴에 추가
 </Button>
 </div>
 ) : null),
 }] : []),
 ];

 const programColumns: Column<Program>[] = [
 {
 header: '프로그램 이름',
 accessor: (item: Program) => (
 <div className="py-1 text-left">
 <span className="block font-semibold text-foreground">{item.prgrmKornNm}</span>
 {/* 근거 없는 고정 문구(SYSTEM_MODULE) 대신 실제 저장 경로를 노출한다. */}
 <span className="mt-1 block font-mono text-xs text-muted-foreground">
 {item.prgrmStrgPath || '저장 경로 미지정'}
 </span>
 </div>
 )
 },
 {
 header: '프로그램 파일명',
 accessor: (item: Program) => (
 <div className="flex justify-start">
 <div className="px-3 py-1 bg-muted border border-border rounded-lg w-fit">
 <span className="text-xs font-bold text-primary tracking-tight font-mono">{item.prgrmFileNm}</span>
 </div>
 </div>
 ),
 className: 'w-48'
 },
 {
 header: 'URL 또는 API 경로',
 accessor: (item: Program) => (
 <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground text-left">
 <LinkIcon size={12} className="text-primary shrink-0" aria-hidden="true" />
 <span className="truncate">{item.url}</span>
 </div>
 ),
 className: 'w-64'
 },
 {
 // 서버 삭제 거부(409)와 같은 규칙·같은 표(사용 안 함 메뉴도 센다)이지만 화면을 연 시점의 메뉴 구조다.
 // 탭 설명이 같은 사실을 말한다.
 header: '연결 메뉴',
 accessor: (item: Program) => <ProgramMenuLinkCellView cell={menuLinkOf(item.prgrmFileNm)} />,
 className: 'w-44'
 },
 // 수정·삭제 권한이 하나도 없으면 관리 열을 두지 않는다.
 ...(canUpdateProgram || canDeleteProgram ? [{
 header: '관리',
 className: 'text-right w-32',
 accessor: (item: Program) => {
 const isDeleting = deletingProgramFileName === item.prgrmFileNm;
 return (
 <div className="flex justify-end gap-2 pr-4">
 {canUpdateProgram && (
 <Tooltip>
 <TooltipTrigger asChild>
 <Button size="icon" aria-label={`${item.prgrmKornNm} 프로그램 수정`} disabled={deletingProgramFileName !== null || isModalOpen} className="rounded-lg bg-muted border border-border text-muted-foreground hover:bg-primary hover:border-primary hover:text-primary-foreground transition-colors" onClick={() => handleOpenEdit(item)}>
 <Settings size={16} aria-hidden="true" />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="top" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-3 py-1.5 text-xs font-medium">
 프로그램 수정
 </TooltipContent>
 </Tooltip>
 )}

 {canDeleteProgram && (
 <Tooltip>
 <TooltipTrigger asChild>
 <Button
 size="icon"
 aria-label={`${item.prgrmKornNm} 프로그램 ${isDeleting ? '삭제 중…' : '삭제'}`}
 aria-busy={isDeleting || undefined}
 disabled={deletingProgramFileName !== null || isModalOpen}
 className="text-destructive-emphasis bg-destructive/10 border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-colors rounded-lg"
 onClick={() => handleDelete(item)}
 >
 {isDeleting
 ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
 : <Trash2 size={16} aria-hidden="true" />}
 </Button>
 </TooltipTrigger>
 <TooltipContent side="top" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-3 py-1.5 text-xs font-medium">
 프로그램 삭제
 </TooltipContent>
 </Tooltip>
 )}
 </div>
 );
 }
 }] : []),
 ];

 const onScreensTab = activeTab === 'screens';
 // 목록이 실패했으면 표의 오류 안내가 먼저다 — '목록은 표시했지만' 이라고 말하지 않는다(화면 목록은 앱에 들어 있어 실패하지 않는다).
 const menuFailureNotice = menuSource.status === 'failed' && (onScreensTab || !error)
 ? (onScreensTab
 ? '화면 목록은 표시했지만 연결 메뉴를 불러오지 못했습니다.'
 : '프로그램 목록은 표시했지만 연결 메뉴를 불러오지 못했습니다.')
 : null;

 return (
 <WorkListPage
 title="화면 관리"
 description="앱 화면 목록과 이전 프로그램 원장을 봅니다."
 breadcrumbItems={[{ label: '시스템관리' }, { label: '화면 관리' }]}
 filterStateKey="system-programs"
 // 거를 수 없는 구분이면(메뉴 구조를 모름) 0건이라고 말하지 않는다 — 빈 상태가 그 이유를 말한다.
 totalCount={onScreensTab ? (screenFilterReason ? undefined : filteredScreens.length) : (error ? undefined : total)}
 navigation={(
 <ProgramAdminTabList active={activeTab} onChange={setActiveTab} idPrefix={tabIdPrefix} panelId={panelId} />
 )}
 actions={!onScreensTab && canCreateProgram ? (
 <Button size="sm" onClick={handleOpenCreate} disabled={deletingProgramFileName !== null || isModalOpen} className="gap-2">
 <Plus size={16} aria-hidden="true" /> 프로그램 등록
 </Button>
 ) : undefined}
 filter={onScreensTab ? (
 <KeywordFilter
 key="screens"
 label="화면 이름 · 경로"
 placeholder="화면 이름 또는 경로로 검색"
 value={screenKeyword}
 onSearch={(keyword) => { setScreenKeyword(keyword); setScreenPage(1); }}
 onReset={() => { setScreenKeyword(''); setScreenKind('all'); setScreenPage(1); }}
 >
 <div className="space-y-1">
 <label htmlFor={`${tabIdPrefix}-kind`} className="block text-[length:var(--font-size-body)] font-medium">구분</label>
 <select
 id={`${tabIdPrefix}-kind`}
 value={screenKind}
 onChange={(event) => { setScreenKind(event.target.value as ScreenKindFilter); setScreenPage(1); }}
 aria-describedby={noMenuFilterHint ? kindFilterHintId : undefined}
 className={FILTER_SELECT_CLASS}
 >
 {SCREEN_KIND_FILTER_OPTIONS.map((option) => (
 <option
 key={option.value}
 value={option.value}
 disabled={option.value === 'no-menu' && menuSource.status !== 'loaded' && screenKind !== 'no-menu'}
 >
 {option.label}
 </option>
 ))}
 </select>
 {noMenuFilterHint && <p id={kindFilterHintId} className="text-xs text-muted-foreground">{noMenuFilterHint}</p>}
 </div>
 </KeywordFilter>
 ) : (
 <KeywordFilter
 key="programs"
 label="프로그램명 · 파일명"
 placeholder="프로그램명 또는 파일명으로 검색"
 value={currentSearchWrd}
 onSearch={(keyword) => { setCurrentSearchWrd(keyword); loadData(keyword, 1); }}
 />
 )}
 >
 <div
 role="tabpanel"
 id={panelId}
 aria-labelledby={programAdminTabId(tabIdPrefix, activeTab)}
 className="space-y-3"
 >
 {onScreensTab ? (
 <PanelNote>
 앱에 있는 화면과 그 화면에 들어가는 데 필요한 권한, 그 화면을 여는 메뉴를 봅니다. 연결 메뉴는 메뉴 경로(쿼리 제외)가
 여는 화면으로 세고, 다른 화면으로 넘어가는 경로를 가리키는 메뉴는 넘어간 화면으로 셉니다. 메뉴에 없는 화면은 사용 중인
 메뉴로 열리지 않는 화면이며, 동적 경로 화면은 목록에서 골라 들어가는 화면이라 세지 않습니다.
 </PanelNote>
 ) : (
 <PanelNote>
 메뉴가 프로그램으로 화면을 연결하던 때의 원장입니다. 메뉴는 이제 화면 목록의 경로로 연결하며, 메뉴 관리의 구조 편집은
 메뉴의 연결 프로그램을 바꾸지 않습니다. 연결 메뉴는 화면을 연 시점의 메뉴 구조 기준(사용 안 함 포함)이고, 연결이 남은
 프로그램은 삭제되지 않습니다 — 삭제할 때 서버가 다시 확인합니다.
 </PanelNote>
 )}
 {menuFailureNotice && (
 <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted px-4 py-2 text-sm">
 <span className="text-foreground">{menuFailureNotice}</span>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={retryMenus}
 disabled={retryingMenus}
 aria-busy={retryingMenus || undefined}
 >
 연결 메뉴 다시 불러오기
 </Button>
 </div>
 )}
 {onScreensTab ? (
 <>
 <StandardDataTable
 accessibleLabel="화면 목록"
 columns={screenColumns}
 data={pagedScreens}
 keyField="route"
 emptyMessage={screenFilterReason ?? emptyResultMessage(screenKeyword, screenListFallbackMessage(screenKind))}
 pagination={{
 currentPage: currentScreenPage,
 totalPages: screenTotalPages,
 pageSize: screenPageSize,
 onPageSizeChange: (size) => { setScreenPageSize(size); setScreenPage(1); },
 onPageChange: (next) => setScreenPage(next),
 }}
 />
 <ScreenAliasList
 aliases={filteredAliases}
 total={LISTED_ALIASES.length}
 keywordApplied={screenKeyword.trim() !== ''}
 />
 </>
 ) : (
 <StandardDataTable
 accessibleLabel="이전 프로그램 목록"
 columns={programColumns}
 data={data}
 loading={loading}
 error={error}
 onRetry={() => loadData(currentSearchWrd, page)}
 keyField="prgrmFileNm"
 emptyMessage={emptyResultMessage(currentSearchWrd, '등록된 이전 프로그램이 없습니다. 메뉴는 화면 목록의 경로로 연결합니다.')}
 pagination={{
 currentPage: page,
 totalPages: totalPage,
 pageSize,
 onPageSizeChange: (size) => { setPageSize(size); void loadData(currentSearchWrd, 1, size); },
 onPageChange: (p) => loadData(currentSearchWrd, p)
 }}
 />
 )}
 </div>

 <StandardModal
 isOpen={isModalOpen}
 onClose={closeProgramModal}
 title={mode === 'create' ? '신규 프로그램 등록' : '프로그램 정보 수정'}
 maxWidth="2xl"
 >
 <ProgramForm
 open={isModalOpen}
 onOpenChange={setIsOpen}
 onWritePendingChange={(pending) => { programWritePendingRef.current = pending; }}
 data={mode === 'edit' ? editingProgramFormData : undefined}
 deletable={canDeleteProgram}
 deleteNotice={editingProgram ? programDeleteLinkNotice(menuLinkOf(editingProgram.prgrmFileNm)) : undefined}
 onSuccess={() => {
 loadData(currentSearchWrd, page);
 setIsOpen(false);
 }}
 />
 </StandardModal>
 </WorkListPage>
 );
}
