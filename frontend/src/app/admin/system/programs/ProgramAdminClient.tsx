'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import type { ScreenAlias, ScreenRegistryEntry } from '@/types/generated-screen-registry';
import { useToast } from '@/app/components/ui/toast';
import { ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useAuth } from '@/contexts/AuthContext';
import { canOpenPage } from '@/lib/auth/page-access';
import { canAddScreensToMenus } from '@/lib/navigation/menu-screen-resolution';
import { handOffScreen } from '@/lib/navigation/target-handoff';
import { useMenuStructureSource } from './useMenuStructureSource';
import {
  SCREEN_VIEW_OPTIONS,
  aliasKindLabel,
  aliasTargetLabel,
  canAddScreenToMenu,
  createScreenMenuLinkLookup,
  defaultScreenView,
  filterAliases,
  filterScreens,
  isScreenWithoutMenu,
  listedAliases,
  listedScreens,
  menuViewHint,
  screenDisplayName,
  screenKindFilterUnavailableReason,
  screenListFallbackMessage,
  screenSearchField,
  screenViewCounts,
  viewNeedsMenuStructure,
  viewOffersMenuAdd,
  type ScreenListView,
} from './screenList';
import {
  CountingRuleHelp,
  RouteText,
  ScreenBadgeList,
  ScreenEntryCell,
  ScreenMenuLinkCellView,
  ScreenNameCell,
  ScreenViewChips,
} from './ScreenListParts';

/**
 * 화면 목록의 페이지당 건수 기본값(사용자가 바꿀 수 있다 — A1 필수). 앱에 들어 있는 목록이라 화면 안에서 나누고 URL 에는
 * 싣지 않는다. [2026-10-05] 20 → 100 — 화면 목록 전체(92)가 한 쪽에 들어와 표 하나의 안쪽 스크롤로 훑고, 열 정렬도 목록
 * 전체에 걸린다(쪽을 나누면 정렬은 지금 쪽 안에서만 걸리고 표가 그렇다고 말한다 — G5).
 */
const SCREEN_PAGE_SIZE = 100;

/** 화면 목록 모집단과 별칭은 빌드에 들어 있다 — 렌더마다 다시 거르지 않는다. */
const LISTED_SCREENS = listedScreens();
const LISTED_ALIASES = listedAliases();

/**
 * 화면 관리(/admin/system/programs, 2026-10-02 D3). 앱 화면 목록과 그 화면의 진입 권한·연결 메뉴를 한 셸(h1 하나)에 둔다.
 * [2026-10-04 프로그램 목록 퇴역] '이전 프로그램' 탭과 그 표·폼·`?page=` 주소 동기화를 걷었다 — 원장(tb_prgrm_lst)은 0행이고
 * 메뉴를 프로그램에 잇는 화면 경로가 없어 무엇을 써도 어디에도 반영되지 않았다. 이 화면의 진입 권한은 MENU_READ 다.
 * [2026-10-05 한 화면 압축·시안 복원(사용자 승인)]
 *   - fill 셸: 페이지는 스크롤하지 않고 표 하나가 남은 높이를 채워 안쪽에서 스크롤한다(머리글 고정). 행은 업무 표 행 토큰.
 *   - 보기 단추: '구분' 선택 상자를 결과 도구 줄의 건수 붙은 단추 묶음으로 바꿨다(메뉴에 연결된 화면·넘어가는 경로 추가).
 *     처음 보기는 메뉴 구조를 불러오면 '메뉴에 없는 화면', 메뉴 조회 권한이 없거나 불러오지 못하면 '전체' 다.
 *   - 넘어가는 경로(별칭)는 표 아래에 늘 펼쳐 두지 않고 그 보기를 고를 때 표 자리에 보인다.
 *   - 표 위 세 문장 설명은 제목 옆 '집계 기준' 도움말로 옮겼다.
 */
export default function ProgramAdminClient() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  /*
   * [2026-10-02 D3] '메뉴에 추가' 는 메뉴 관리가 새 메뉴를 만들고 저장할 수 있는 사람에게만 보인다 — 새 메뉴 등록
   * (MENU_CREATE)과 구조 저장(MENU_UPDATE)(canAddScreensToMenus), 그리고 메뉴 관리 화면에 들어갈 수 있는가(라우트
   * 게이트와 같은 판정). 두 메뉴 권한은 메뉴 관리 화면의 권한이라 이 화면의 표시 권한으로 세지 않는다(그 판정이 공용
   * 모듈에 있는 이유 — 화면 목록 생성기는 화면 파일의 리터럴만 이 화면 줄에 센다).
   */
  const canAddMenus = canAddScreensToMenus(user) && canOpenPage(user, '/admin/system/menus');
  /*
   * [2026-10-02] 연결 메뉴 — MENU_READ 가 있을 때만 메뉴 구조를 읽는다(서버에 403 거부 기록을 남기지 않는다). 화면을 열
   * 때마다 다시 읽는다(useMenuStructureSource). 실패는 화면 전체 오류로 올리지 않고 칸과 목록 위 안내·다시 불러오기로 알린다.
   */
  const { menus: menuSource, retry: retryMenus, retrying: retryingMenus } = useMenuStructureSource();

  const [keyword, setKeyword] = useState('');
  /** 사용자가 고른 보기. null 이면 처음 보기를 따른다(초기화도 처음 보기로 돌아간다). */
  const [chosenView, setChosenView] = useState<ScreenListView | null>(null);
  /**
   * 처음 보기 — 메뉴 구조의 상태를 처음 알게 된 때 한 번 정하고 기억한다. 기억하지 않으면 백그라운드 재조회가 실패하는
   * 순간 '메뉴에 없는 화면' 이 말없이 '전체' 로 바뀐다. effect 가 아니라 렌더 중 조정이다(KeywordFilter 와 같은 React 공식
   * "이전 렌더의 정보 저장" 패턴 — effect 안 setState 는 처음 보기 없이 한 번 그린 뒤 다시 그린다).
   */
  const [initialView, setInitialView] = useState<ScreenListView | null>(null);
  const resolvedDefault = defaultScreenView(menuSource);
  if (initialView === null && resolvedDefault !== null) setInitialView(resolvedDefault);
  /** 지금 보기. null 이면 아직 처음 보기를 정하지 못했다(메뉴 구조를 불러오는 중) — 표는 빈 표 대신 불러오는 중이다. */
  const view: ScreenListView | null = chosenView ?? initialView ?? resolvedDefault;
  const pendingInitialView = view === null;
  /*
   * 보기 단추에는 view 를 그대로 넘긴다 — [2026-10-05 반박 리뷰] 처음 보기를 정하기 전(null)에는 어떤 단추도 눌림이 아니다.
   * 종전에는 '메뉴에 없는 화면' 을 미리 눌림으로 두었는데, 조회가 거부·실패로 끝나면 눌린 단추가 말없이 '전체' 로 바뀌었다
   * (보조기술에는 눌림 상태가 뒤집힌다). 그동안 표는 불러오는 중이고 다른 단추는 누르면 바로 그 보기로 간다.
   *
   * 표의 불러오는 중 — 처음 보기를 정하는 동안, 그리고 처음 보기를 정한 뒤에도 메뉴 구조가 필요한 보기(메뉴에 연결된 화면·
   * 메뉴에 없는 화면)를 보는데 메뉴 구조를 다시 불러오는 중일 때(권한 버전이 바뀌어 조회 키가 바뀐 경우 등)다. 그동안 빈
   * 표('…을 아직 거를 수 없습니다')를 그리지 않는다. 다른 보기는 메뉴 구조 없이 그릴 수 있으므로 표를 그대로 둔다.
   */
  const tableLoading = pendingInitialView
    || (viewNeedsMenuStructure(view) && menuSource.status === 'checking');
  /*
   * '관리' 열은 단추를 놓을 수 있는 행이 있는 보기에서만 둔다 — 메뉴 구조를 불러왔고(메뉴에 없는 화면을 말할 수 있다), 보기가
   * 메뉴에 없는 화면이 행으로 나올 수 있는 보기일 때다(viewOffersMenuAdd). 단추가 하나도 없는 빈 열을 두지 않는다. 메뉴 구조를
   * 불러오지 못하면 실패 안내가 그 사실을 말한다.
   */
  const showManageColumn = canAddMenus && menuSource.status === 'loaded' && viewOffersMenuAdd(view);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(SCREEN_PAGE_SIZE);
  const screenLinkOf = useMemo(() => createScreenMenuLinkLookup(menuSource), [menuSource]);
  const filteredScreens = useMemo(
    () => (view === null || view === 'aliases' ? [] : filterScreens(LISTED_SCREENS, { keyword, kind: view }, screenLinkOf)),
    [keyword, view, screenLinkOf],
  );
  const filteredAliases = useMemo(() => filterAliases(LISTED_ALIASES, keyword), [keyword]);
  const viewCounts = useMemo(
    () => screenViewCounts(LISTED_SCREENS, LISTED_ALIASES, keyword, screenLinkOf, menuSource),
    [keyword, screenLinkOf, menuSource],
  );
  const showingAliases = view === 'aliases';
  const rowCount = showingAliases ? filteredAliases.length : filteredScreens.length;
  const totalPages = Math.max(1, Math.ceil(rowCount / pageSize));
  // 거르기로 줄어든 목록이 지금 쪽보다 짧으면 마지막 쪽을 보인다(빈 쪽에 갇히지 않게).
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedScreens = filteredScreens.slice(pageStart, pageStart + pageSize);
  const pagedAliases = filteredAliases.slice(pageStart, pageStart + pageSize);
  const screenFilterReason = view === null ? null : screenKindFilterUnavailableReason(view, menuSource);
  const viewHint = menuViewHint(menuSource);

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

  const changeView = (next: ScreenListView) => { setChosenView(next); setPage(1); };

  /*
   * '연결 메뉴 다시 불러오기'(2026-10-05 반박 리뷰, WCAG 2.4.3). 다시 불러오는 동안 실패 안내와 단추는 그대로 남고(출처가
   * 실패를 유지한다 — useMenuStructureSource), 단추는 disabled 가 아니라 aria-disabled·aria-busy 다(disabled 는 눌린 단추에서
   * 포커스를 뺀다). 중복 요청은 동기 잠금으로 막는다. 불러오면 안내와 단추가 사라지므로 포커스를 지금 눌린 보기 단추로 옮긴다 —
   * 그 단추의 이름이 이제 셀 수 있게 된 건수를 말한다. 그동안 사용자가 포커스를 다른 곳으로 옮겼으면 빼앗지 않는다.
   */
  const viewGroupRef = useRef<HTMLDivElement>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  const retryLockRef = useRef(false);
  const handleRetryMenus = async () => {
    if (retryLockRef.current) return;
    retryLockRef.current = true;
    try {
      const loaded = await retryMenus();
      if (!loaded) return;
      const active = typeof document === 'undefined' ? null : document.activeElement;
      if (active && active !== document.body && active !== retryButtonRef.current) return;
      const group = viewGroupRef.current;
      (group?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ?? group?.querySelector<HTMLButtonElement>('button'))?.focus();
    } finally {
      retryLockRef.current = false;
    }
  };

  const screenColumns: Column<ScreenRegistryEntry>[] = [
    {
      header: '화면 이름',
      /*
       * 열 너비 비율(표 모드 md 이상만 — 좁은 화면의 카드 표현은 칸이 한 줄 전체다). 비율이 없으면 자동 배치가 경로 몇 개·권한
       * 넷인 행 같은 긴 칸에 끌려 짧은 칸(이름·구분)이 접히고 행이 두 줄이 됐다(2026-10-05 Chromium 구조 재현 실측). 넓은 화면
       * (본문 1152px)에서는 거의 모든 행이 한 줄이고, 좁아지면 칸 안에서 접힌다 — 가로로 넘치거나 글자를 생략하지 않는다.
       */
      className: 'md:w-[17%]',
      accessor: (screen: ScreenRegistryEntry) => <ScreenNameCell screen={screen} name={screenDisplayName(screen)} />,
      sortKey: 'label',
    },
    {
      header: '경로',
      className: 'md:w-[24%]',
      accessor: (screen: ScreenRegistryEntry) => <RouteText route={screen.route} className="text-muted-foreground" />,
      sortKey: 'route',
    },
    {
      header: '진입 권한',
      className: 'md:w-[17%]',
      accessor: (screen: ScreenRegistryEntry) => <ScreenEntryCell screen={screen} />,
    },
    {
      // 메뉴 경로(쿼리 제외)가 여는 화면으로 센다. 별칭을 가리키는 메뉴는 그 목적지 화면으로 센다. 사용 안 함 메뉴도 센다.
      header: '연결 메뉴',
      className: 'md:w-[15%]',
      accessor: (screen: ScreenRegistryEntry) => <ScreenMenuLinkCellView cell={screenLinkOf(screen.route)} />,
    },
    {
      header: '구분',
      className: 'md:w-[14%]',
      accessor: (screen: ScreenRegistryEntry) => <ScreenBadgeList screen={screen} cell={screenLinkOf(screen.route)} />,
    },
    // 메뉴를 만들 수 없거나 단추를 놓을 행이 없는 보기면 관리 열을 두지 않는다(showManageColumn).
    ...(showManageColumn ? [{
      header: '관리',
      className: 'w-px whitespace-nowrap text-right',
      /*
       * [2026-10-05] '메뉴에 추가' 는 메뉴에 없는 화면 행에만 둔다 — 이미 사용 중인 메뉴가 여는 화면에 두면 같은 화면의 메뉴를
       * 하나 더 만들라는 권유가 된다. 메뉴 구조를 모르면(불러오는 중·권한 없음·실패) 어떤 화면도 메뉴에 없다고 말하지
       * 않으므로 두지 않는다. 행을 한 줄로 두려고 작은 단추(24px — WCAG 2.5.8 하한)다.
       */
      accessor: (screen: ScreenRegistryEntry) => (canAddScreenToMenu(screen) && isScreenWithoutMenu(screenLinkOf(screen.route)) ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="xs"
            variant="outline"
            aria-label={`메뉴에 추가: ${screenDisplayName(screen)} (${screen.route})`}
            onClick={() => handleAddScreenToMenu(screen)}
          >
            <ListPlus aria-hidden="true" /> 메뉴에 추가
          </Button>
        </div>
      ) : null),
    }] : []),
  ];

  // 넘어가는 경로(별칭)는 화면이 아니라 링크하지 않는다 — 경로·넘어가는 곳·넘기는 곳만 보인다.
  const aliasColumns: Column<ScreenAlias>[] = [
    {
      header: '경로',
      accessor: (alias: ScreenAlias) => <RouteText route={alias.route} className="text-foreground" />,
      sortKey: 'route',
    },
    {
      header: '넘어가는 곳',
      accessor: (alias: ScreenAlias) => <RouteText route={aliasTargetLabel(alias.target)} className="text-foreground" />,
    },
    {
      header: '넘기는 곳',
      accessor: (alias: ScreenAlias) => <span className="text-xs text-muted-foreground">{aliasKindLabel(alias)}</span>,
    },
  ];

  const pagination = {
    currentPage,
    totalPages,
    pageSize,
    onPageSizeChange: (size: number) => { setPageSize(size); setPage(1); },
    onPageChange: (next: number) => setPage(next),
  };

  /*
   * 메뉴 구조를 불러오지 못했다는 안내와 다시 불러오기. 넘어가는 경로 보기는 연결 메뉴와 관계없으므로 두지 않는다(그 보기에서는
   * 보기 단추의 이유 문장이 보인다). 메뉴 구조가 필요한 보기를 보고 있으면 표가 비어 있으므로 '화면 목록은 표시했지만' 이라고
   * 말하지 않는다. 메뉴를 만들 수 있는 사람에게는 '메뉴에 추가' 가 왜 사라졌는지도 말한다 — 그 단추가 원래 놓이는 보기에서만
   * (viewOffersMenuAdd). 메뉴에 연결된 화면·동적 경로 보기에는 처음부터 없는 단추다.
   */
  const menuFailureNotice = menuSource.status === 'failed' && !showingAliases
    ? [
      viewNeedsMenuStructure(view)
        ? '연결 메뉴를 불러오지 못했습니다.'
        : '화면 목록은 표시했지만 연결 메뉴를 불러오지 못했습니다.',
      canAddMenus && viewOffersMenuAdd(view) ? '메뉴에 추가는 연결 메뉴를 불러온 뒤에 쓸 수 있습니다.' : null,
    ].filter(Boolean).join(' ')
    : null;
  const searchField = screenSearchField(view);

  return (
    <WorkListPage
      title="화면 관리"
      description="앱 화면과 그 진입 권한·연결 메뉴를 봅니다."
      breadcrumbItems={[{ label: '시스템관리' }, { label: '화면 관리' }]}
      fill
      actions={(
        <CountingRuleHelp>
          <p>
            연결 메뉴는 메뉴 경로(쿼리 제외)가 여는 화면으로 세고, 다른 화면으로 넘어가는 경로를 가리키는 메뉴는 넘어간 화면으로
            셉니다. 칸에는 사용 중인 메뉴를 먼저 하나 보입니다. 메뉴가 여럿이거나 사용 안 함·다른 경로를 거쳐 여는 메뉴가 있으면
            칸을 펼쳐 메뉴 ID 와 함께 봅니다.
          </p>
          <p>
            메뉴에 연결된 화면은 사용 중인 메뉴가 여는 화면이고, 메뉴에 없는 화면은 사용 중인 메뉴로 열리지 않는 화면입니다.
            동적 경로 화면은 목록에서 골라 들어가는 화면이라 어느 쪽에도 세지 않습니다.
          </p>
          <p>
            진입 권한 앞의 &lsquo;모두&rsquo;는 적힌 권한이 모두 있어야, &lsquo;하나&rsquo;는 그중 하나라도 있으면 열린다는 뜻입니다.
            권한이 둘 이상이면 칸을 펼쳐 모든 권한과 그 코드를 봅니다.
          </p>
          <p>넘어가는 경로는 들어오면 다른 화면으로 넘어가는 경로입니다. 화면이 아니므로 메뉴에 추가하지 않습니다.</p>
          <p>기본 순서는 경로 순입니다. 메뉴 구조는 이 화면을 열 때마다 다시 읽습니다.</p>
        </CountingRuleHelp>
      )}
      filterStateKey="system-programs"
      // 거를 수 없는 보기면(메뉴 구조를 모름) 0건이라고 말하지 않는다 — 빈 상태가 그 이유를 말한다. 처음 보기를 정하는 중이면
      // 아직 세지 않는다(표가 불러오는 중이다).
      totalCount={pendingInitialView || screenFilterReason ? undefined : rowCount}
      toolbarActions={(
        <ScreenViewChips
          options={SCREEN_VIEW_OPTIONS}
          value={view}
          groupRef={viewGroupRef}
          counts={viewCounts}
          menuStructureKnown={menuSource.status === 'loaded'}
          hint={viewHint}
          // 불러오는 중에는 표가 불러오는 중임을, 실패 안내가 보이면 그 안내가 같은 사실을 말하므로 이유 문장은 보조기술용으로만
          // 둔다(aria-describedby 는 그대로 잇는다). 같은 실패를 화면에 세 번 말하지 않는다.
          hintVisible={menuSource.status === 'forbidden' || (menuSource.status === 'failed' && !menuFailureNotice)}
          onChange={changeView}
        />
      )}
      filter={(
        <KeywordFilter
          // 라벨·자리표시는 지금 보기에서 검색어가 실제로 거르는 칸이다(넘어가는 경로 보기는 이름이 없고 넘어가는 곳을 찾는다).
          label={searchField.label}
          placeholder={searchField.placeholder}
          value={keyword}
          onSearch={(next) => { setKeyword(next); setPage(1); }}
          // 초기화는 처음 보기도 지금의 메뉴 구조로 다시 정한다 — 첫 조회가 실패해 '전체' 로 시작한 뒤 다시 불러왔다면 초기화가
          // '메뉴에 없는 화면' 으로 돌아간다(기억해 둔 처음 보기를 그대로 쓰면 '전체' 로 돌아갔다).
          onReset={() => { setKeyword(''); setChosenView(null); setInitialView(null); setPage(1); }}
        />
      )}
    >
      {menuFailureNotice && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm">
          <span className="text-foreground">{menuFailureNotice}</span>
          <Button
            ref={retryButtonRef}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => { if (!retryingMenus) void handleRetryMenus(); }}
            aria-disabled={retryingMenus || undefined}
            aria-busy={retryingMenus || undefined}
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          >
            연결 메뉴 다시 불러오기
          </Button>
        </div>
      )}
      {/*
        두 표는 같은 자리·같은 컴포넌트라 key 가 없으면 React 가 표 하나를 두 표에 재사용해 정렬 상태(열 id 는 위치 기반)와 스크롤
        상자가 샌다 — 화면 목록을 이름 내림차순으로 정렬한 채 넘어가는 경로를 고르면 정렬한 적 없는 '경로' 열이 내림차순이었다
        (2026-10-05 반박 리뷰 탐침). 화면 보기끼리는 같은 표라 정렬이 남는다.
      */}
      {showingAliases ? (
        <StandardDataTable
          key="aliases"
          accessibleLabel="다른 화면으로 넘어가는 경로"
          columns={aliasColumns}
          data={pagedAliases}
          keyField="route"
          fillHeight
          rowDensity="work"
          emptyMessage={emptyResultMessage(keyword, screenListFallbackMessage('aliases'))}
          pagination={pagination}
        />
      ) : (
        <StandardDataTable
          key="screens"
          accessibleLabel="화면 목록"
          columns={screenColumns}
          data={pagedScreens}
          keyField="route"
          loading={tableLoading}
          fillHeight
          rowDensity="work"
          emptyMessage={screenFilterReason ?? emptyResultMessage(keyword, screenListFallbackMessage(view ?? 'all'))}
          pagination={pagination}
        />
      )}
    </WorkListPage>
  );
}
