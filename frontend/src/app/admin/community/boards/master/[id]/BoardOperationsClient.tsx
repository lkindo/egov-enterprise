'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BackToListButton } from '@/app/components/navigation/BackToListButton';
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';
import { StandardTabs, TabPanel, standardTabId } from '@/app/components/ui/standard-tabs';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { canOpenPage } from '@/lib/auth/page-access';
import { pickAllowedParams } from '@/lib/navigation/allowlist-params';
import { summarizeError } from '@/lib/safe-error-log';
import { BOARD_TYPE_PAIR_MISMATCH, boardTypeDisplay } from '@/lib/board/board-types';
import { findBoardMenuLinks, summarizeBoardMenuLinks } from '@/lib/board/board-menu-links';
import { boardMasterQueryOptions } from '@/queries/board-master-query-options';
import {
  BOARD_OPERATIONS_TAB_LABELS,
  DEFAULT_BOARD_OPERATIONS_TAB,
  parseBoardOperationsTab,
  type BoardOperationsTab,
} from '../board-operations-tabs';
import { DESIGNATION_LABELS, boardAudience, boardAudienceNote, boardCommunityOf, menuSummaryLabel } from '../board-usage';
import { useBoardAccessSources } from '../useBoardAccessSources';
import { BoardPostsTab } from './BoardPostsTab';
import { BoardSettingsTab } from './BoardSettingsTab';
import { BoardAccessTab } from './BoardAccessTab';

/**
 * 이 라우트가 URL 에 싣는 쿼리 키 전수(ADR-0040 결정 2). 게시판 ID 는 경로에만 있고, 게시물 탭의 쪽·조회 조건은 URL 밖 상태다.
 * 새 키를 더하면 이 목록과 URL 상태 승인 원장을 함께 고친다.
 */
const BOARD_OPERATIONS_PARAM_KEYS = ['tab'] as const;

const PANEL_ID = 'board-operations-panel';
/** 게시판 관리 목록 — 위치 경로의 '게시판 관리' 와 '목록으로' 의 대체 목적지. */
const BOARD_MASTER_LIST_ROUTE = '/admin/community/boards/master';

/**
 * 게시판 운영 화면(ADR-0040 결정 2·§5.4~5.6). 게시물(조회 대행 권한이 있을 때만)·설정·메뉴·접근 탭을 둔다. 권한이 없어 숨긴 탭을
 * 주소로 요청하면 모르는 값과 같이 기본 탭(설정)으로 연다.
 */
export function BoardOperationsClient({ bbsId }: { bbsId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canSeePosts = canPermission(user, 'BOARD_READ_ALL');
  const requested = parseBoardOperationsTab(searchParams.get('tab')) ?? DEFAULT_BOARD_OPERATIONS_TAB;
  const activeTab: BoardOperationsTab = requested === 'posts' && !canSeePosts ? DEFAULT_BOARD_OPERATIONS_TAB : requested;
  const tabs = (['posts', 'settings', 'access'] as const)
    .filter((tab) => tab !== 'posts' || canSeePosts)
    .map((tab) => ({ id: tab, label: BOARD_OPERATIONS_TAB_LABELS[tab] }));

  const changeTab = (next: string) => {
    const tab = parseBoardOperationsTab(next) ?? DEFAULT_BOARD_OPERATIONS_TAB;
    const params = pickAllowedParams(searchParams, BOARD_OPERATIONS_PARAM_KEYS);
    if (tab === DEFAULT_BOARD_OPERATIONS_TAB) params.delete('tab');
    else params.set('tab', tab);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const detailQuery = useQuery({ ...boardMasterQueryOptions.detail(bbsId), retry: false });
  const detail = detailQuery.data;
  const notFound = detailQuery.isError && summarizeError(detailQuery.error).status === 404;
  const canOpenBoard = canOpenPage(user, '/admin/community/boards/select-board-list');
  const canOpenBoardMasters = canOpenPage(user, BOARD_MASTER_LIST_ROUTE);

  // [2026-10-26 ADR-0043, G5] 머리의 메뉴 상태 요약 — 메뉴·접근 탭과 같은 원천·판정이다(두 원천이 모두 확정된 뒤에 판정한다).
  const { menuSource, groupSource } = useBoardAccessSources();
  const menuSummary = useMemo(() => (detail && menuSource !== null && groupSource !== null
    ? summarizeBoardMenuLinks(findBoardMenuLinks(detail.bbsId, menuSource, groupSource, detail.bbsTtl))
    : null), [detail, menuSource, groupSource]);

  /*
    [2026-10-26 ADR-0043] '목록으로' 는 게시판 관리 목록에서 왔을 때만 뒤로 간다. 마법사(/admin/community/boards/maker)는 출처에서
    뺐다 — 마법사의 결과 화면은 화면 안 상태라 뒤로 가면 빈 마법사 1단계가 열린다. 그때는 목록으로 간다.
  */
  const backButton = (
    <BackToListButton
      variant="ghost"
      fallback={BOARD_MASTER_LIST_ROUTE}
      origins={[BOARD_MASTER_LIST_ROUTE]}
    />
  );
  // [ADR-0043, G5] 위치 경로 — 관리 센터 › 콘텐츠 운영 › 게시판 관리 › 게시판 이름(메뉴 트리가 있으면 그 이름을 쓴다).
  const breadcrumb = (label: string) => (
    <DynamicBreadcrumb
      customItems={[
        { name: '관리 센터' },
        { name: '콘텐츠 운영' },
        { name: '게시판 관리', href: canOpenBoardMasters ? '/admin/community/boards/master' : undefined },
        { name: label },
      ]}
      currentLabel={label}
    />
  );

  if (detailQuery.isPending) {
    return <p role="status" className="text-sm text-muted-foreground">게시판 정보를 불러오는 중…</p>;
  }
  if (notFound || !detail) {
    return (
      <div className="space-y-4">
        {breadcrumb('게시판 운영')}
        {backButton}
        <h1 className="text-xl font-bold text-foreground">{notFound ? '없는 게시판입니다' : '게시판 정보를 불러오지 못했습니다'}</h1>
        <p className="text-[length:var(--font-size-body)] text-muted-foreground">
          {notFound
            ? `게시판 ${bbsId} 를 찾을 수 없습니다. 영구 삭제됐거나 주소가 올바르지 않습니다.`
            : '잠시 뒤 다시 시도하세요.'}
        </p>
        {!notFound && <Button type="button" variant="outline" size="sm" onClick={() => void detailQuery.refetch()}>다시 시도</Button>}
      </div>
    );
  }

  const inUse = detail.useYn === 'Y';
  const type = boardTypeDisplay(detail.bbsTypeCd, detail.tmpltId);
  const audience = boardAudience(boardCommunityOf(detail));
  const audienceNote = boardAudienceNote(audience);
  return (
    <div className="space-y-6">
      {breadcrumb(detail.bbsTtl)}
      {backButton}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">{detail.bbsTtl}</h1>
          <Badge variant="outline">{inUse ? '사용 중' : '사용 안 함'}</Badge>
          {detail.designations.map((designation) => (
            <Badge key={designation} variant="secondary">{DESIGNATION_LABELS[designation] ?? designation}</Badge>
          ))}
          {/* [ADR-0043, G5] 메뉴 상태 요약 — 자세한 연결은 메뉴·접근 탭에 있다. */}
          <Badge variant="outline">{menuSummary === null ? '메뉴 확인하는 중…' : `메뉴 ${menuSummaryLabel(menuSummary)}`}</Badge>
        </div>
        <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <span className="font-mono">{detail.bbsId}</span>
          {/* [ADR-0043 결정 5] 화면 유형 이름은 템플릿으로 정하고, 유형 코드 짝이 정본과 다르면 덧붙인다. */}
          <span>
            {type.name}
            {type.pairMismatch && ` · ${BOARD_TYPE_PAIR_MISMATCH}${type.storedCode ? `(저장된 코드 ${type.storedCode})` : ''}`}
          </span>
          {/* [ADR-0043, G5] 이용 범위 — 사용 중지는 아래 안내 상자가, 확인 불가는 이 줄이 말한다. */}
          <span>이용 범위: {audience.label}{audience.kind === 'community' && audience.state === 'unknown' ? ` (${audienceNote})` : ''}</span>
        </p>
        {audience.kind === 'community' && audience.state === 'stopped' && (
          <p role="note" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-[length:var(--font-size-body)] text-foreground">
            귀속 커뮤니티가 사용 중지라 이용자가 이 게시판에 들어갈 입구가 없습니다. 커뮤니티를 다시 사용으로 바꾸면 회원에게 열립니다.
          </p>
        )}
        {!inUse && (
          <p role="note" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-[length:var(--font-size-body)] text-foreground">
            사용 안 함 게시판입니다. 이용자에게 읽기·쓰기 모두 닫혀 있고, 운영자는 글을 정리할 수 있습니다.
          </p>
        )}
        {canOpenBoard && (inUse || canSeePosts) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push(`/admin/community/boards/select-board-list?bbsId=${encodeURIComponent(detail.bbsId)}`)}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            이용 화면 열기
          </Button>
        )}
      </header>

      <StandardTabs
        items={tabs}
        activeTab={activeTab}
        onChange={changeTab}
        label="게시판 운영 구분"
        idPrefix="board-operations"
        panelId={PANEL_ID}
      />
      <TabPanel id={PANEL_ID} aria-labelledby={standardTabId('board-operations', activeTab)}>
        {activeTab === 'posts' && <BoardPostsTab detail={detail} />}
        {activeTab === 'settings' && <BoardSettingsTab detail={detail} onReload={() => detailQuery.refetch()} />}
        {activeTab === 'access' && <BoardAccessTab detail={detail} />}
      </TabPanel>
    </div>
  );
}
