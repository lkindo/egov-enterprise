'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Library, BookOpen, MessageCircleQuestion,
  TrendingUp, History,
  User, Eye, Settings2, AlertTriangle, RefreshCcw, ChevronRight, List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { knowledgeService, toKnowledgeActivities, type KnowledgeDto, type KnowledgeActivityItem } from '@/services/business/knowledge/knowledgeService';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { boardMasterKeys } from '@/queries/board-master-query-options';
import {
  NOTICE_BOARD_ID,
} from '@/config/board-ids';
import { canOpenPage } from '@/lib/auth/page-access';
import { canPermission } from '@/lib/auth/permissions';
import { canEditConfiguredBoard } from '@/lib/auth/board-edit-permissions';
import { QNA_STATUS_LABELS, isQnaSolved } from '@/lib/board/qna-status';
import type { BoardPost } from '@/types/business/board';
import { PinnedBadge } from '@/app/admin/community/boards/components/PostingStatusBadge';
import { PostStateBadges } from '@/app/admin/community/boards/select-board-list/components/BoardTemplates';
import { Button } from '@/components/ui/button';
import { PagePagination } from '@/components/common/PagePagination';
import { visibleEntries, type HubTabViews } from '@/extensions/slots';
import { hubTabsKnowledge } from '@/extensions/generated-hub-tabs-knowledge';
import { userFacingErrorMessage } from '@/lib/safe-error-log';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, type Column } from '@/app/components/ui/standard-data-table';
import { pickAllowedParams } from '@/lib/navigation/allowlist-params';
import { Tab, TabList, TabPanel } from '@/app/components/ui/standard-tabs';
import { parseKnowledgeTab, type KnowledgeShellTab } from './knowledge-tabs';
import { KNOWLEDGE_SHELL_TAB_BOARDS } from './knowledge-tab-boards';

/**
 * 이 라우트가 URL 에 싣는 쿼리 키 전수. `bbsId` 는 진입 전용이라 카테고리를 바꾸면 버린다(종전 delete 와 같은 결과).
 *
 * 종전에는 들어온 쿼리를 통째로 복사해 재발행했다 — 모르는 이름이 한 번 들어오면 이동마다
 * 다시 붙는 캐리어였다(DEC-OPS-029 Q2). 새 파라미터를 도입하면 이 목록에 함께 넣어야 하고,
 * 빠뜨리면 이동 시 조용히 사라진다.
 */
const HUB_PARAM_KEYS = ['tab'] as const;

// 탭 목록과 `?tab=` 해석은 knowledge-tabs.ts 에 있다(탭 목적지 계약이 메뉴·별칭과 대조한다).
/**
 * 탭 하나. 셸 고유 탭(위키·FAQ·Q&A)은 이 파일이 정하고, 다른 기능의 탭(커뮤니티)은 hub-tabs-knowledge 기여의 뷰에서 온다(허브 분해 H2).
 * 셸이 그 게시판(bbsId)의 글 목록을 그리고, 탭이 열렸을 때 기여의 머리 동작(Actions)을 더한다.
 */
type KnowledgeTab = { readonly id: string; readonly label: string } & HubTabViews['knowledge'];
const SHELL_TABS: readonly KnowledgeTab[] = [
  // 탭 → 게시판 대응은 게시판 운영 화면의 메뉴 연결 판정과 공유한다(knowledge-tab-boards.ts, ADR-0040 결정 8).
  { id: 'WIKI', label: '위키', description: '기술 사양', icon: Library, bbsId: KNOWLEDGE_SHELL_TAB_BOARDS.WIKI },
  { id: 'FAQ', label: '자주 묻는 질문', description: '빠른 답변', icon: BookOpen, bbsId: KNOWLEDGE_SHELL_TAB_BOARDS.FAQ },
  { id: 'QNA', label: '질의응답(Q&A)', description: '질문과 답변', icon: MessageCircleQuestion, bbsId: KNOWLEDGE_SHELL_TAB_BOARDS.QNA },
];

/** 열린 탭의 머리 동작. 기여 뷰의 컴포넌트를 그대로 그린다. */
function ContributedActions({ view: { Actions } }: { view: HubTabViews['knowledge'] }) {
  return Actions ? <Actions /> : null;
}

const PAGE_SIZE = 20;

/** 이용 화면 경로(게시판 전체 화면). 허브 탭 하나는 그 게시판의 제목 목록만 보인다. */
const BOARD_LIST_ROUTE = '/admin/community/boards/select-board-list';

/**
 * 허브 목록의 한 행. 서버 응답(BoardDto)은 비밀글 여부(scrtYn)도 싣는데 KnowledgeDto 가 그 이름을 적지 않아 여기서 더한다 — 값은
 * 서버가 준 그대로다.
 */
type KnowledgeRow = KnowledgeDto & Pick<BoardPost, 'scrtYn'>;

/** 메타 조회 실패는 화면 안(글쓰기 단추를 열지 않음·일반 설명)으로 드러난다 — 전역 실패 토스트를 띄우지 않는다(DEC-OPS-184). */
const QUIET = { suppressErrorToast: true } as const;

export default function KnowledgeHubClient({ defaultTab }: { defaultTab?: KnowledgeShellTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // [2026-08-28] 리터럴 비교는 SYSTEM·ROLE_SYSTEM 을 빠뜨려 **권한 있는 관리자에게 기능이
  //   사라진다**. proxy 의 /admin 게이트는 4종을 전부 통과시키므로, 라우트는 열어 주는데
  //   화면만 막히는 비대칭이 된다 — DEC-OPS-023 ②가 계약으로 막으려던 형태다.
  // [2026-09-26 DIP B4 P1] 다른 화면으로 가는 버튼은 라우트 게이트와 같은 판정(canOpenPage)을 쓴다.
  const canReadBoardMasters = canOpenPage(user, '/admin/community/boards/master');
  // [허브 분해 H2] 셸 고유 탭 뒤에 이 구성에서 보이는 기여 탭을 order 순으로 붙인다. 커뮤니티 관리 버튼·대화상자는 커뮤니티 기여의
  //   머리 동작이 소유한다(DEC-OPS-037 의 노출 규칙 그대로 — 커뮤니티 탭에서, COMMUNITY_READ_ALL 보유자에게만).
  //   레지스트리는 지식 허브 전용이다(hub-tabs-knowledge, GAP-SLOT-001) — 다른 허브의 탭 뷰는 이 화면의 번들에 실리지 않는다.
  const contributedTabs = useMemo(() => visibleEntries(user, hubTabsKnowledge), [user]);
  const tabs: readonly KnowledgeTab[] = useMemo(
    () => [...SHELL_TABS, ...contributedTabs.map(({ id, label, view }) => ({ id, label, ...view }))],
    [contributedTabs],
  );
  // [2026-09-26 DIP C9] 검색어는 `조회`/Enter 로 적용된 값이다(카탈로그 G2). 종전에는 타이핑을 디바운스해 조회했다.
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'views'>('latest');
  // [2026-10-01 결정 20] Q&A 탭에서만 '미해결만'(OPEN) 으로 좁힌다. 미해결 값은 V2_116 이 OPEN 하나로 맞췄다.
  const [unsolvedOnly, setUnsolvedOnly] = useState(false);
  const [pagination, setPagination] = useState({ context: '', page: 1 });

  const resolveCategory = (): string => {
    // `?bbsId=` 진입은 그 게시판을 보여 주는 탭을 연다(탭 값보다 먼저 본다). 이 구성에 그 탭이 없으면 탭 값으로 간다.
    const bbsId = searchParams.get('bbsId');
    const byBoard = tabs.find((tab) => tab.bbsId === bbsId);
    if (byBoard) return byBoard.id;

    // 메뉴(tb_menu_info)가 위키·FAQ·Q&A 를 모두 /admin/help/faq?tab=* 로 보내는데
    // 이 값을 읽지 않아 서로 다른 3개 메뉴가 전부 FAQ 화면으로 착지했다. 이 구성에 없는 기여 탭이면 기본 탭으로 간다.
    return parseKnowledgeTab(searchParams.get('tab'), contributedTabs.map((tab) => tab.id)) ?? defaultTab ?? 'WIKI';
  };

  // 카테고리는 URL 파생값이다. 상태를 따로 두면 공유·새로고침·뒤로가기에서 복원되지 않는다.
  const activeCategory = resolveCategory();
  const activeTab = tabs.find((tab) => tab.id === activeCategory) ?? SHELL_TABS[0];
  const qnaStatus = activeCategory === 'QNA' && unsolvedOnly ? 'OPEN' as const : undefined;
  const pageContext = JSON.stringify([activeCategory, searchQuery, sortBy, qnaStatus ?? '']);
  const page = pagination.context === pageContext ? pagination.page : 1;

  const selectCategory = (next: string) => {
    const params = pickAllowedParams(searchParams, HUB_PARAM_KEYS);
    params.set('tab', next);
    // bbsId 로 진입했어도 카테고리를 바꾸면 버린다 — tab 이 우선 해석되지만 둘이 함께 남으면 링크가 혼란스럽다.
    //   allowlist 에 bbsId 가 없으므로 재조립 단계에서 이미 빠진다(종전 delete 와 같은 결과).
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  /*
   * 종전 폴백 KNOWLEDGE_FALLBACK_BOARD_ID('BBSMSTR_NNNNNNNNNNNN')는 Flyway 시드에도
   * sql/seed_knowledge_boards.sql 에도 없다(전량 grep 실측 — 등장처가 테스트 목뿐이다).
   * DEFAULT/NOTICE 라는 주석의 의도대로 실재하는 공지 게시판을 쓴다.
   */
  const currentBbsId = activeTab.bbsId ?? NOTICE_BOARD_ID;

  /*
    [2026-10-26 ADR-0043 0차 NAV-03·UX-10] 열린 탭 게시판의 사용자용 메타. 종전 '신규 등록' 단추는 권한을 보지 않아, 공지·FAQ 처럼 추가
    편집 권한이 필요한 게시판에서 일반 사용자를 쓸 수 없는 작성 화면으로 보냈다(목록 화면에는 이미 있던 판정이 허브에만 빠졌다).
    글쓰기는 이용 목록과 같은 판정 — 글쓰기 권한(BOARD_CREATE) ∧ 게시판의 추가 편집 권한(canEditConfiguredBoard) ∧ 게시판 사용 중 —
    일 때만 연다. 메타를 받지 못하면 열지 않는다(판정 근거가 없다). 같은 메타의 게시판 이름은 탭이 실제로 보여 주는 게시판을 알린다
    (NAV-01 A안 — '자주 묻는 질문' 탭은 공지사항 게시판을 연다).
  */
  const {
    data: boardMeta,
    isPending: isBoardMetaPending,
  } = useQuery({
    // 키는 이용 목록·상세·작성 화면의 메타(boardMasterQueryOptions.meta)와 같다 — 설정 저장 뒤 invalidateBoardCaches 가 함께 다시 읽는다.
    queryKey: boardMasterKeys.meta(currentBbsId),
    queryFn: () => boardUserService.getBoardMeta(currentBbsId, QUIET),
    enabled: currentBbsId.length > 0,
  });
  const canWriteHere = canPermission(user, 'BOARD_CREATE')
    && canEditConfiguredBoard(user, boardMeta)
    && boardMeta?.inUse !== false;
  const boardName = boardMeta?.bbsTtl?.trim() || null;
  // 이름이 이미 '게시판' 으로 끝나면(업무게시판·Q&A 게시판) 덧붙이지 않는다.
  const boardLabel = boardName && (boardName.endsWith('게시판') ? boardName : `${boardName} 게시판`);
  const canOpenBoardList = boardName !== null && canOpenPage(user, BOARD_LIST_ROUTE);

  /*
    [2026-08-29] 비관리자의 WIKI·FAQ 차단(isAccessRestricted)을 제거했다.

    그 차단은 **집행자가 없는 인가 주장**이었다. 서버의 게시판 읽기 판정은 게시판 종류를 가리지
    않는 기능 권한(BOARD_READ — 기본 배정상 ROLE_USER 포함)뿐이고 WIKI·FAQ 를 관리자에게만 여는
    판정은 없으며, 같은 사용자가 같은 데이터를 세 경로로 이미 받는다 — ① 이 화면의 인기 문서·
    최근 활동 ② /admin/community/board 의 게시판 선택기(당시 비관리자 폴백 목록이 WIKI 게시판을
    '일정 게시판' 으로 포함했다. 2026-10-23 부터 선택지는 서버가 사용 중·열람 가능 게시판으로 거른다 —
    ADR-0040 결정 11) ③ GET /boards/{bbsId} 직접 호출.

    그래서 화면은 "접근 권한 없음 · 관리자에게 권한을 요청하십시오" 라고 말하면서 바로 옆에서
    그 게시판의 제목·조회수·작성자를 보여 주고 상세까지 열어 줬다. 요청할 권한도 없다.

    벽을 화면 전체로 넓히는 쪽은 택하지 않았다 — 보호는 그대로 0인데 제품이 명시적으로 부여한
    접근을 화면에서만 빼앗기 때문이다. 이 파일은 /admin/help·faq·qna 와 /admin/community 네
    라우트를 렌더하고, 그중 /admin/community 는 일반 사용자의 정상 착지 화면이다.

    실제 board ACL 이 서버에 생기면 그때 정직한 차단을 만든다(authorization-claim-honesty 계약이
    서버 상태가 바뀌는 순간 재판정을 요구하며 red 가 된다).
  */

  // --- Data Fetching ---
  const {
    data: articlesData,
    isLoading,
    isFetching,
    isError: isArticlesError,
    error: articlesError,
    refetch: refetchArticles,
  } = useQuery({
    queryKey: ['knowledge-articles', activeCategory, searchQuery, sortBy, page, qnaStatus ?? 'ALL'],
    queryFn: () => knowledgeService.getArticles({
      bbsId: currentBbsId,
      category: activeCategory,
      page,
      size: PAGE_SIZE,
      orderBy: sortBy === 'views' ? 'views' : 'date',
      searchCnd: searchQuery ? '0' : undefined,
      searchWrd: searchQuery || undefined,
      qnaStatus,
    }),
  });

  const { data: hotData, isError: isHotError } = useQuery({
    queryKey: ['hot-articles', activeCategory],
    queryFn: () => knowledgeService.getHotArticles(currentBbsId),
  });

  const { data: statsData, isError: isStatsError, isLoading: isStatsLoading } = useQuery({
    queryKey: ['knowledge-stats', activeCategory],
    queryFn: () => knowledgeService.getStats(currentBbsId),
  });

  // [2026-09-26 DIP B5 F10] 최근 활동은 기본 목록(최신순 1쪽)과 같은 조회다 — 같은 키를 써서 한 번만 요청한다.
  //   종전에는 기본 화면에서 같은 게시판을 두 번 불렀다. 검색·정렬·쪽을 바꿔도 피드는 기본 목록에 머문다.
  // [2026-10-26 ADR-0043] 기본 목록은 상단 고정 글을 먼저 싣는다(서버 정렬, 바꾸지 않는다). 그래서 오래된 고정 글이 '최근 활동' 맨 위에
  //   최신 글처럼 보였다 — 고정 글에는 상단 고정 표지를 붙이고(서버 판정 pinned 만 본다) 절 설명이 그 순서를 말한다.
  const { data: activityData, isError: isActivityError } = useQuery({
    queryKey: ['knowledge-articles', activeCategory, '', 'latest', 1, 'ALL'],
    queryFn: () => knowledgeService.getArticles({
      bbsId: currentBbsId,
      category: activeCategory,
      page: 1,
      size: PAGE_SIZE,
      orderBy: 'date',
      searchCnd: undefined,
      searchWrd: undefined,
    }),
    select: (res) => (res.list ?? []).map((item) => ({
      ...toKnowledgeActivities([item])[0],
      pinned: item.pinned === true,
      pinnedEndYmd: item.upendFixEndYmd ?? null,
    })),
  });

  const displayItems: KnowledgeRow[] = articlesData?.list || [];

  const hotItems: KnowledgeDto[] = hotData?.list || [];
  const isSearching = isFetching;

  const openArticle = React.useCallback((item: KnowledgeDto) => {
    router.push(`/admin/community/boards/detail?bbsId=${item.bbsId || currentBbsId}&pstSn=${item.pstSn}`);
  }, [router, currentBbsId]);

  /*
   * 열 구성. Q&A 에만 상태 열이 붙는다 — 다른 카테고리에는 저장할 상태 컬럼 자체가 없어
   * 열을 만들면 빈 칸이 '상태 없음' 이 아니라 '상태 모름' 으로 읽힌다(StatusBadge 주석 참조).
   */
  const columns: Column<KnowledgeRow>[] = [
    {
      header: '제목',
      className: 'w-full max-w-0',
      // [2026-10-26 ADR-0043 UX-02·03·14] 비밀글·상단 고정·예약·게시 종료 표지를 이용 목록과 같은 묶음으로 보인다. 표지는 잘리는 제목
      //   밖에 둔다 — 긴 제목이 표지를 가리지 않는다. 서버 값만 읽는다(DEC-OPS-140).
      accessor: (item: KnowledgeRow) => (
        <div className="flex min-w-0 items-center">
          <button
            type="button"
            onClick={() => openArticle(item)}
            aria-label={`${item.pstTtl} 상세 보기`}
            className="block min-w-0 truncate text-left font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {item.pstTtl}
          </button>
          <PostStateBadges item={item} />
        </div>
      ),
    },
    ...(activeCategory === 'QNA'
      ? ([{
        header: '상태',
        className: 'whitespace-nowrap',
        accessor: (item: KnowledgeDto) => <StatusBadge status={item.qnaSttsCd} type={activeCategory} />,
      }] satisfies Column<KnowledgeDto>[])
      : ([] satisfies Column<KnowledgeDto>[])),
    {
      header: '작성자',
      className: 'whitespace-nowrap',
      accessor: (item: KnowledgeDto) => (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <User size={12} aria-hidden="true" />
          <span className="max-w-[10rem] truncate">{item.userNm || '-'}</span>
        </span>
      ),
    },
    {
      header: '등록일',
      className: 'whitespace-nowrap tabular-nums text-muted-foreground',
      // [2026-09-26 DIP V2] 서버가 싣는 작성 일시(crtDt)의 날짜 부분이다. 종전에는 보내지 않는 필드를 읽어 늘 '-' 였다.
      accessor: (item: KnowledgeDto) => item.crtDt?.slice(0, 10) || '-',
    },
    {
      header: '조회수',
      className: 'whitespace-nowrap text-right tabular-nums',
      accessor: (item: KnowledgeDto) => (item.inqCnt || 0).toLocaleString(),
    },
  ];

  return (
    <>
      <WorkListPage
        title={activeTab.label}
        // [2026-10-26 ADR-0043 NAV-01 A안] 탭 이름과 실제 게시판 이름이 다를 수 있다('자주 묻는 질문' 탭 = 공지사항 게시판). 탭 머리에서
        //   이 탭이 어느 게시판의 글인지 함께 말한다. 메타를 받지 못하면 이름을 지어내지 않고 종전 설명만 둔다.
        description={boardLabel
          ? `${boardLabel}의 글을 보여 줍니다. 제목으로 검색할 수 있습니다.`
          : '문서를 검색하고 필요한 내용을 확인하세요.'}
        filterStateKey="knowledge-hub"
        // 조회 실패 시에는 총계를 말하지 않는다 — '총 0건' 은 "없다" 라는 사실 주장이 된다.
        totalCount={isArticlesError ? undefined : articlesData?.total}
        actions={
          <>
            {canReadBoardMasters && <Button variant="outline" size="sm" onClick={() => router.push('/admin/community/boards/master')}><Settings2 size={16} aria-hidden="true" /> 게시판 관리</Button>}
            {/* 기여 탭이 열렸으면 그 기여의 머리 동작(커뮤니티: 목록·가입, 관리)을 둔다. 탭을 바꾸면 다시 마운트된다. */}
            <ContributedActions key={activeTab.id} view={activeTab} />
            {/* [ADR-0043 NAV-01 A안] 허브 탭은 제목 목록만 보인다 — 게시판 화면 유형(갤러리·캘린더 등)과 기간·작성자 검색은 전체 화면에 있다. */}
            {canOpenBoardList && (
              <Button asChild variant="outline" size="sm">
                <Link href={`${BOARD_LIST_ROUTE}?bbsId=${currentBbsId}`}>
                  <List size={16} aria-hidden="true" /> 이 게시판 전체 화면으로 보기
                </Link>
              </Button>
            )}
            {canWriteHere && (
              <Button asChild size="sm">
                <Link href={`/admin/community/boards/insert-board-article?bbsId=${currentBbsId}`}>
                  <Plus size={16} aria-hidden="true" /> 글쓰기
                </Link>
              </Button>
            )}
          </>
        }
        navigation={
          <TabList aria-label="지식 카테고리" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {/* 건수는 집계 API 가 없어 표기하지 않는다(종전 142/28/567/12 는 하드코딩이었다). */}
            {tabs.map((tab) => (
              <CategoryTab key={tab.id} id={knowledgeTabId(tab.id)} title={tab.label} desc={tab.description} icon={tab.icon} active={activeCategory === tab.id} onClick={() => selectCategory(tab.id)} />
            ))}
          </TabList>
        }
        filter={
          <KeywordFilter label="지식 검색어" placeholder="제목 검색..." value={searchQuery} onSearch={setSearchQuery}>
            <div className="flex flex-wrap items-center gap-2" aria-label="문서 정렬">
              <span className="text-[length:var(--font-size-body)] text-muted-foreground">정렬</span>
              <FilterButton active={sortBy === 'latest'} onClick={() => setSortBy('latest')} label="최신순" />
              <FilterButton active={sortBy === 'views'} onClick={() => setSortBy('views')} label="조회순" />
              {activeCategory === 'QNA' && <FilterButton active={unsolvedOnly} onClick={() => setUnsolvedOnly((value) => !value)} label="미해결만" />}
            </div>
          </KeywordFilter>
        }
        toolbarActions={
          <div className="flex items-center gap-2">
            <span role="status" className="text-[length:var(--font-size-body)] text-muted-foreground">
              {isArticlesError ? '조회 실패' : isSearching ? '검색 중…' : ''}
            </span>
            <Button variant="outline" size="sm" aria-label="지식 문서 목록 새로고침" onClick={() => void refetchArticles()}>
              <RefreshCcw size={14} aria-hidden="true" /> 새로고침
            </Button>
          </div>
        }
      >
        <TabPanel id={KNOWLEDGE_PANEL_ID} aria-labelledby={knowledgeTabId(activeTab.id)} className="space-y-3">
          {/*
            [2026-10-26 ADR-0043 UX-10] FAQ 탭에서 글을 쓸 수 없는 사람에게 막다른 길 대신 질문할 곳을 알린다. 탭 전환은 화면 안 동작이라
            단추로 둔다(허브 URL 은 tab 하나만 싣는다 — HUB_PARAM_KEYS).
            [NAV-11] 같은 Q&A 게시판에 입구가 둘(지식 허브 질의응답·도움말 센터 1:1 문의)이고 두 화면이 서로를 안내하지 않았다 — 나만 볼
            문의의 자리를 알린다. 도움말 센터는 도움말 기능의 화면이라, 그 기능을 고르지 않은 구성에서는 안내 문장과 링크가 함께 빠진다.
          */}
          {activeCategory === 'FAQ' && !isBoardMetaPending && !canWriteHere && (
            <p role="note" className="rounded-md border border-border bg-muted/40 px-[var(--filter-pad)] py-2 text-[length:var(--font-size-body)] text-muted-foreground">
              질문은{' '}
              <button type="button" onClick={() => selectCategory('QNA')} className="font-medium text-primary underline underline-offset-2 hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                질의응답(Q&amp;A) 탭
              </button>
              에 남겨 주세요.
              {/* reusable-base:help:start */}
              {' '}나만 볼 문의는{' '}
              <Link href="/help" className="font-medium text-primary underline underline-offset-2 hover:text-primary/80">도움말 센터의 1:1 문의</Link>
              를 이용하세요.
              {/* reusable-base:help:end */}
            </p>
          )}
          {activeCategory === 'QNA' && (
            <p role="note" className="rounded-md border border-border bg-muted/40 px-[var(--filter-pad)] py-2 text-[length:var(--font-size-body)] text-muted-foreground empty:hidden">
              {/* 공개 범위는 게시판의 비밀글 정책(서버 값)으로만 말한다 — 정책을 모르면 말하지 않는다. */}
              {boardMeta?.prvtPstPlcyCd === 'NONE' ? '이 탭에 쓴 질문은 로그인한 모든 사용자가 볼 수 있습니다. ' : null}
              {/* reusable-base:help:start */}
              나만 볼 문의는{' '}
              <Link href="/help" className="font-medium text-primary underline underline-offset-2 hover:text-primary/80">도움말 센터의 1:1 문의</Link>
              를 이용하세요.
              {/* reusable-base:help:end */}
            </p>
          )}
          {isArticlesError ? (
            // 조회 실패를 '데이터 없음'으로 위장하지 않는다.
            <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-8">
              <AlertTriangle size={24} className="text-destructive-emphasis" aria-hidden="true" />
              <p className="text-[length:var(--font-size-body)] font-semibold text-foreground">지식 목록을 불러오지 못했습니다.</p>
              {/* [2026-09-15 DEC-OPS-100] axios 전송 오류 원문은 보이지 않는다 — 서버가 준 문장이나, axios 오류가 아닌 오류의 문장만 덧붙인다. */}
              {userFacingErrorMessage(articlesError) ? (
                <p className="text-xs text-muted-foreground">{userFacingErrorMessage(articlesError)}</p>
              ) : null}
              <Button variant="outline" size="sm" className="gap-2" onClick={() => void refetchArticles()}>
                <RefreshCcw size={14} aria-hidden="true" /> 다시 시도
              </Button>
            </div>
          ) : (
            <>
              <StandardDataTable<KnowledgeDto>
                columns={columns}
                data={displayItems}
                keyField="pstSn"
                loading={isLoading}
                accessibleLabel={`${activeTab.label} 문서 목록`}
                emptyMessage={emptyResultMessage(searchQuery, '등록된 지식 문서가 없습니다.')}
              />
              <PagePagination total={articlesData?.total ?? 0} page={page} size={PAGE_SIZE} onPageChange={(next) => setPagination({ context: pageContext, page: next })} />
            </>
          )}
        </TabPanel>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <AsideSection title="인기 문서" description="조회수가 높은 문서" icon={TrendingUp}>
            {isHotError ? (
              <p role="alert" className="py-6 text-center text-[length:var(--font-size-body)] text-destructive-emphasis">인기 문서를 불러오지 못했습니다.</p>
            ) : hotItems.length === 0 ? (
              <p className="py-6 text-center text-[length:var(--font-size-body)] text-muted-foreground">표시할 문서가 없습니다.</p>
            ) : (
              <ul className="divide-y divide-border">
                {hotItems.map((item, idx) => (
                  <li key={item.pstSn}>
                    <button
                      type="button"
                      onClick={() => openArticle(item)}
                      aria-label={`${item.pstTtl} 상세 보기`}
                      className="group flex w-full items-center gap-3 px-1 py-1.5 text-left hover:bg-muted"
                    >
                      <span data-testid="hot-article-rank" className="w-5 shrink-0 text-right text-[length:var(--font-size-body)] font-semibold tabular-nums text-muted-foreground">{idx + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[length:var(--font-size-body)] text-foreground group-hover:text-primary">{item.pstTtl}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                        <Eye size={12} aria-hidden="true" />{(item.inqCnt || 0).toLocaleString()}
                      </span>
                      <ChevronRight size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </AsideSection>

          <AsideSection title="최근 활동" description="상단 고정 글을 먼저, 그다음 최근 등록 순" icon={History}>
            {isActivityError ? (
              <p role={isArticlesError ? undefined : 'alert'} className="py-6 text-center text-[length:var(--font-size-body)] text-destructive-emphasis">{/* 최근 활동은 기본 목록과 같은 조회라, 목록이 이미 실패를 알렸으면 같은 실패를 한 번 더 알리지 않는다. */}최근 활동을 불러오지 못했습니다.</p>
            ) : (activityData || []).length === 0 ? (
              <p className="py-6 text-center text-[length:var(--font-size-body)] text-muted-foreground">표시할 활동이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-border">
                {(activityData || []).slice(0, 5).map((activity: KnowledgeActivityItem & { pinned: boolean; pinnedEndYmd: string | null }) => (
                  <li key={activity.id} className="px-1 py-1.5">
                    <div className="flex min-w-0 items-center">
                      <p className="min-w-0 truncate text-[length:var(--font-size-body)] text-foreground">{activity.title}</p>
                      <PinnedBadge pinned={activity.pinned} endYmd={activity.pinnedEndYmd} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{activity.user}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{activity.time}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </AsideSection>
        </div>

        <details className="rounded-md border border-border bg-card">
          <summary className="cursor-pointer px-[var(--filter-pad)] py-2 text-[length:var(--font-size-body)] font-semibold">게시판 이용 현황</summary>
          {/* 백엔드 /boards/{bbsId}/stats 실측값만 표기한다.
   종전의 '+12% Critical' 류 증감 배지는 산출 근거가 없어 제거했다. */}
          <div className="grid grid-cols-1 gap-2 border-t border-border p-[var(--filter-pad)] sm:grid-cols-3">
            {/*
   [2026-08-29] '지식 지수 NN/100 · 게시판 활성도 지표' 를 걷고 실제로 센 값을 보여 준다.
   그 점수는 측정값이 아니라 게시글 수에 상수를 더한 것이다 —
   BoardService.getBoardStats: `int intelligenceScore = (int) Math.min(100,
   (stats.totalArticles() * 2) + 70);` 이고 바로 위 주석이 "Logic derived from frontend"
   라고 적고 있다(화면이 지어낸 식을 서버로 옮겼을 뿐이다). 글이 하나도 없는 게시판이
   70/100 이고 15건이면 100 에 붙어 더 이상 움직이지 않는다. 100 점 만점처럼 보이는
   숫자는 관리자가 게시판 건강도로 읽는다.
   [2026-09-23] 그 서버 필드(intelligenceScore)도 응답 계약에서 걷었다 — 이 칸이 유일한 소비처였고
   2026-08-29 이후 아무도 읽지 않았다. 지어낸 점수를 계약에 남겨 두면 다음 소비자가 측정값으로 읽는다.
 */}
            <StatsCard
              label="게시글 수"
              value={statsCardValue(statsData?.totalArticles, isStatsError, isStatsLoading)}
              desc="이 게시판에 등록된 글"
            />
            <StatsCard
              label="누적 조회수"
              value={statsCardValue(statsData?.totalViews, isStatsError, isStatsLoading)}
              desc="이 게시판의 전체 조회수"
            />
            <StatsCard
              label="최다 기여자"
              value={isStatsError ? '조회 실패' : isStatsLoading ? '불러오는 중…' : (statsData?.topContributor || '-')}
              desc="게시글 등록이 가장 많은 사용자"
            />
          </div>
        </details>
      </WorkListPage>

    </>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-[var(--filter-control-h)] rounded-md border px-3 text-[length:var(--font-size-body)] transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

/**
 * 게시판 이용 현황 수치 칸의 표시 문구. [2026-09-15 DEC-OPS-100] 조회 중이거나 값을 읽을 수 없을 때
 * 0 을 쓰지 않는다 — 종전에는 불러오는 동안 "게시글 수 0" 이 보였다.
 */
function statsCardValue(value: number | null | undefined, isError: boolean, isLoading: boolean): string {
  if (isError) return '조회 실패';
  if (isLoading) return '불러오는 중…';
  return typeof value === 'number' ? value.toLocaleString() : '-';
}

function StatsCard({ label, value, desc }: { label: string, value: string, desc: string }) {
  return (
    <div data-testid="board-stat-card" className="rounded-md border border-border bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      {/* 통계 수치는 제목이 아니다. */}
      <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

/**
 * 문서 상태 배지 — **실제 상태 값이 있는 축에만** 붙인다.
 *
 * [2026-08-29] 종전에는 `item.statusCd` 를 읽었는데 그 필드는 이 제품의 백엔드에 없다
 * (api-server·business-app·business-core·foundation main 소스와 Flyway SQL 전체 grep 0건).
 * 그래서 값은 언제나 undefined 였고 세 분기가 전부 기본값으로 떨어졌다 — Q&A 는 답변이
 * 달린 문의도 빨간 '미해결', 위키는 모든 문서가 '초안', FAQ·커뮤니티는 무조건 '공개'.
 * '상태' 라는 라벨을 달고 고정 문자열을 보여 준 셈이라, 목록만 보면 아무 문의도 처리되지
 * 않은 것처럼 보였다.
 *
 * Q&A 에는 실재하는 상태 컬럼이 있다(`qnaSttsCd` — tb_bbs_item.qna_stts_cd '질의응답상태코드',
 * 목록 projection 이 이미 싣고 있다). 판정은 값 도메인이 저장소 안에서 갈려 있어
 * (엔티티 기본값 OPEN · 등록 경로 QA01 · 완료 SOLVED) 이미 있는 SSOT `isQnaSolved` 를 쓴다.
 *
 * 위키의 게시/초안과 FAQ·커뮤니티의 공개 여부는 저장할 곳 자체가 없다. 없는 상태를
 * 지어내지 않으려면 배지를 붙이지 않는 것이 맞다 — 상태 축이 생기면 그때 되살린다.
 */
function StatusBadge({ status, type }: { status?: string, type: string }) {
  if (type !== 'QNA') return null;

  const isSolved = isQnaSolved(status);
  return (
    <span className={cn(
      "inline-flex items-center rounded border px-1.5 py-0.5 text-xs",
      isSolved ? "border-success/40 bg-success/15 text-foreground" : "border-warning/40 bg-warning/15 text-foreground"
    )}>
      {isSolved ? QNA_STATUS_LABELS.SOLVED : QNA_STATUS_LABELS.OPEN}
    </span>
  );
}

/** 탭이 고르는 목록 패널(하나)과 탭 id. */
const KNOWLEDGE_PANEL_ID = 'knowledge-stream-panel';
const knowledgeTabId = (tabId: string) => `knowledge-tab-${tabId}`;

function CategoryTab({ id, title, desc, icon: Icon, active, onClick }: {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tab
      id={id}
      selected={active}
      aria-controls={KNOWLEDGE_PANEL_ID}
      onClick={onClick}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:border-primary"
      )}
    >
      <Icon size={16} aria-hidden="true" className={cn("shrink-0", active ? "text-primary" : "text-muted-foreground")} />
      <span className="min-w-0">
        {/* 탭 이름이지 절 제목이 아니다. 탭 안의 h3 는 h1 뒤 단계를 건너뛰어 heading-order 위반이었다(axe). */}
        <span className="block truncate text-[length:var(--font-size-body)] font-semibold text-foreground">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{desc}</span>
      </span>
    </Tab>
  );
}

function AsideSection({ title, description, icon: Icon, children }: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-card p-3">
      <div className="mb-2 flex items-center gap-2 border-b border-border pb-2">
        <Icon size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          {/* 화면 h1 바로 아래 절이다 — 제목 계층은 h1 → 절(h2) → 문서 제목(h3). */}
          <h2 className="truncate text-[length:var(--font-size-body)] font-semibold text-foreground">{title}</h2>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
