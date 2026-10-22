'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BackToListButton } from '@/app/components/navigation/BackToListButton';
import { StandardTabs, TabPanel, standardTabId } from '@/app/components/ui/standard-tabs';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { canOpenPage } from '@/lib/auth/page-access';
import { pickAllowedParams } from '@/lib/navigation/allowlist-params';
import { summarizeError } from '@/lib/safe-error-log';
import { boardTypeLabel } from '@/lib/board/board-types';
import { boardMasterQueryOptions } from '@/queries/board-master-query-options';
import {
  DEFAULT_BOARD_OPERATIONS_TAB,
  parseBoardOperationsTab,
  type BoardOperationsTab,
} from '../board-operations-tabs';
import { DESIGNATION_LABELS } from '../board-usage';
import { BoardPostsTab } from './BoardPostsTab';
import { BoardSettingsTab } from './BoardSettingsTab';
import { BoardAccessTab } from './BoardAccessTab';

/**
 * 이 라우트가 URL 에 싣는 쿼리 키 전수(ADR-0040 결정 2). 게시판 ID 는 경로에만 있고, 게시물 탭의 쪽·조회 조건은 URL 밖 상태다.
 * 새 키를 더하면 이 목록과 URL 상태 승인 원장을 함께 고친다.
 */
const BOARD_OPERATIONS_PARAM_KEYS = ['tab'] as const;

const TAB_LABELS: Readonly<Record<BoardOperationsTab, string>> = {
  posts: '게시물',
  settings: '설정',
  access: '메뉴·접근',
};
const PANEL_ID = 'board-operations-panel';

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
    .map((tab) => ({ id: tab, label: TAB_LABELS[tab] }));

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

  const backButton = (
    <BackToListButton
      variant="ghost"
      fallback="/admin/community/boards/master"
      origins={['/admin/community/boards/master', '/admin/community/boards/maker']}
    />
  );

  if (detailQuery.isPending) {
    return <p role="status" className="text-sm text-muted-foreground">게시판 정보를 불러오는 중…</p>;
  }
  if (notFound || !detail) {
    return (
      <div className="space-y-4">
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
  return (
    <div className="space-y-6">
      {backButton}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">{detail.bbsTtl}</h1>
          <Badge variant="outline">{inUse ? '사용 중' : '사용 안 함'}</Badge>
          {detail.designations.map((designation) => (
            <Badge key={designation} variant="secondary">{DESIGNATION_LABELS[designation] ?? designation}</Badge>
          ))}
        </div>
        <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <span className="font-mono">{detail.bbsId}</span>
          <span>{boardTypeLabel(detail.bbsTypeCd, detail.tmpltId)}</span>
        </p>
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
        {activeTab === 'posts' && <BoardPostsTab bbsId={detail.bbsId} boardName={detail.bbsTtl} />}
        {activeTab === 'settings' && <BoardSettingsTab detail={detail} onReload={() => detailQuery.refetch()} />}
        {activeTab === 'access' && <BoardAccessTab detail={detail} />}
      </TabPanel>
    </div>
  );
}
