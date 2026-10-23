'use client';

import { useCallback, useRef, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { CalendarClock, CalendarX, Loader2, Pin, PinOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, type Column } from '@/app/components/ui/standard-data-table';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { canEditConfiguredBoard } from '@/lib/auth/board-edit-permissions';
import { toDisplayDateTime, toDisplayYmd } from '@/lib/format-date';
import { boardMasterQueryOptions, invalidateBoardOperationPosts } from '@/queries/board-master-query-options';
import { boardAdminService, type BoardMasterDetail } from '@/services/foundation/system/BoardAdminService';
import type { BoardPost, BoardPostingStatus } from '@/types/business/board';
import { PostingStatusLabel } from '../../components/PostingStatusBadge';
import { BoardPostPeriodDialog } from './BoardPostPeriodDialog';
import { BoardPostPinDialog } from './BoardPostPinDialog';
import { BoardPostBatchDialog, type BoardPostBatchMode } from './BoardPostBatchDialog';

type PostingStatusFilter = '' | BoardPostingStatus;
/** 상단 고정 조건 — 'Y' 지금 고정 중인 글, 'N' 그 밖의 글(서버가 오늘 기준으로 판정한다). */
type PinnedFilter = '' | 'Y' | 'N';
interface AppliedFilter {
  searchWrd: string;
  postingStatus: PostingStatusFilter;
  pinned: PinnedFilter;
}

const POSTING_STATUS_OPTIONS: readonly { value: PostingStatusFilter; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'POSTING', label: '게시 중' },
  { value: 'SCHEDULED', label: '예약' },
  { value: 'ENDED', label: '게시 종료' },
];
const PINNED_OPTIONS: readonly { value: PinnedFilter; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'Y', label: '고정 글' },
  { value: 'N', label: '고정 아닌 글' },
];
const NO_FILTER: AppliedFilter = { searchWrd: '', postingStatus: '', pinned: '' };
/** 진행 중인 선택 처리. 처리 하나가 도는 동안 다른 선택 처리·일정·고정 바꾸기를 잠근다. */
type BulkPendingAction = 'clear-end' | 'unpin';

/**
 * 게시판 운영 화면의 게시물 탭(ADR-0040 §5.4). B1 에서 게시 상태·조회 조건·일정 빠른 편집·종료일 일괄 처리를, B2 에서 상단 고정 열·
 * 조건·고정 바꾸기와 일괄 고정·해제를 더했다.
 *
 * 조회 대행 권한(BOARD_READ_ALL)이 있을 때만 이 탭이 보인다. 그 권한이면 서버가 사용 안 함 게시판과 예약·게시 종료 글까지 연다(결정 1).
 * 게시 상태·상단 고정은 서버 판정(postingStatus·pinned)을 그대로 그리고 날짜로 다시 계산하지 않는다(DEC-OPS-140). 조회 조건은
 * `조회`·Enter 로만 적용하고(G2) URL 밖 상태다(결정 2 — 운영 화면의 URL 키는 탭뿐이다). 쪽은 1 기반 page·size 다(ADR-0036).
 *
 * 쓰기 단추는 그 동작의 기능 권한으로 보인다(DEC-OPS-185) — 일정 바꾸기·종료일 일괄 처리는 게시글 전체 수정 권한(BOARD_UPDATE_ALL),
 * 상단 고정·해제는 게시글 상단 고정 권한(BOARD_PIN)이 있어야 하고, 공지·FAQ 지정 게시판이면 그 편집 권한(서버가 계산한
 * requiredEditPermissions)도 모두 있어야 한다. 두 동작은 권한이 달라 단추·대화상자·요청을 나눈다(D-12, H3). 서버가 같은 규칙으로 최종
 * 판정한다.
 */
export function BoardPostsTab({ detail }: { detail: BoardMasterDetail }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { toast } = useToast();
  const { user } = useAuth();
  const bbsId = detail.bbsId;
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [applied, setApplied] = useState<AppliedFilter>(NO_FILTER);
  const [statusDraft, setStatusDraft] = useState<PostingStatusFilter>('');
  const [pinnedDraft, setPinnedDraft] = useState<PinnedFilter>('');
  // 일괄 처리가 성공할 때마다 올린다 — 선택 범위에 넣어 처리한 글을 다시 고른 채로 두지 않는다.
  const [selectionEpoch, setSelectionEpoch] = useState(0);
  const selectedCountRef = useRef(0);
  const [selectionNotice, setSelectionNotice] = useState('');
  const [periodTarget, setPeriodTarget] = useState<BoardPost | null>(null);
  const [pinTarget, setPinTarget] = useState<BoardPost | null>(null);
  const [batch, setBatch] = useState<{ mode: BoardPostBatchMode; posts: BoardPost[] } | null>(null);
  const [bulkPendingAction, setBulkPendingAction] = useState<BulkPendingAction | null>(null);
  const pendingRef = useRef(false);

  // 쪽·크기·적용한 조건을 factory 인자로 직접 넘긴다 — factory 가 그 값을 조회 키에 담는다(페이지 크기 결속 census).
  const posts = useQuery({
    ...boardMasterQueryOptions.operationPosts(bbsId, {
      page,
      size,
      ...(applied.searchWrd ? { searchWrd: applied.searchWrd } : {}),
      ...(applied.postingStatus ? { postingStatus: applied.postingStatus } : {}),
      ...(applied.pinned ? { pinned: applied.pinned === 'Y' } : {}),
    }),
    placeholderData: keepPreviousData,
  });
  // 지정 게시판(공지·FAQ)의 추가 편집 권한은 서버가 계산해 메타로 준다(D-14). 모르면 쓰기 단추를 보이지 않는다.
  const meta = useQuery(boardMasterQueryOptions.meta(bbsId));
  const canSchedule = canPermission(user, 'BOARD_UPDATE_ALL') && canEditConfiguredBoard(user, meta.data);
  const canPin = canPermission(user, 'BOARD_PIN') && canEditConfiguredBoard(user, meta.data);
  // 게시판 설정이 새 고정을 받는가. 끄면 새 고정만 막고 해제는 늘 된다(결정 6) — 해제 단추는 이 값과 무관하다.
  const pinAllowed = detail.upendFixPsbltyYn === 'Y';
  const rows = posts.data?.list ?? [];
  const total = posts.data?.total ?? rows.length;
  const totalPages = posts.data?.totalPage ?? Math.max(1, Math.ceil(total / size));
  const filtered = applied.searchWrd !== '' || applied.postingStatus !== '' || applied.pinned !== '';

  const onSelectionCountChange = useCallback((count: number) => { selectedCountRef.current = count; }, []);
  const refresh = () => invalidateBoardOperationPosts(queryClient, bbsId);
  const finishBatch = () => {
    setSelectionEpoch((epoch) => epoch + 1);
    void refresh();
  };

  const applyFilter = (next: AppliedFilter) => {
    const changed = next.searchWrd !== applied.searchWrd || next.postingStatus !== applied.postingStatus || next.pinned !== applied.pinned;
    // 조건이 바뀌면 표가 선택을 푼다(selectionScope) — 몇 건을 풀었는지 알린다(§5.4).
    setSelectionNotice(changed && selectedCountRef.current > 0
      ? `조회 조건을 바꿔 선택한 ${selectedCountRef.current.toLocaleString()}건을 해제했습니다.`
      : '');
    setPage(1);
    setApplied(next);
  };

  /** 입력이 필요한 선택 처리(종료일 바꾸기·상단 고정하기)를 연다 — 다른 선택 처리가 도는 동안에는 열지 않는다. */
  const openBatch = (mode: BoardPostBatchMode, items: BoardPost[]) => {
    if (pendingRef.current || items.length === 0) return;
    setBatch({ mode, posts: items });
  };

  const handleClearEnd = async (items: BoardPost[]) => {
    if (!canSchedule || pendingRef.current || items.length === 0) return;
    pendingRef.current = true;
    setBulkPendingAction('clear-end');
    try {
      const confirmed = await confirm({
        title: '종료일 해제하기',
        message: `고른 ${items.length.toLocaleString()}건의 게시 종료일을 비웁니다. 기한 없이 계속 게시됩니다.`,
        confirmText: '종료일 해제하기',
        details: <ul className="list-disc pl-5">{items.map((item) => <li key={item.pstSn}>{item.pstSn} · {item.pstTtl}</li>)}</ul>,
        detailsLabel: '대상 글',
      });
      if (!confirmed) return;
      await boardAdminService.updatePostPeriodsInBatch(bbsId, { action: 'CLEAR_END', pstSns: items.map((item) => item.pstSn) });
      toast(`${items.length.toLocaleString()}건의 게시 종료일을 해제했습니다.`, 'success');
      finishBatch();
    } catch (error) {
      // 서버가 전체를 거부했다 — 아무것도 바뀌지 않았으므로 선택을 그대로 둔다. 사유는 서버 말 그대로다.
      toast(extractErrorMessage(error, '게시 종료일을 해제하지 못했습니다. 아무것도 바뀌지 않았습니다.'), 'error');
      void refresh();
    } finally {
      pendingRef.current = false;
      setBulkPendingAction(null);
    }
  };

  const handleUnpin = async (items: BoardPost[]) => {
    if (!canPin || pendingRef.current || items.length === 0) return;
    // 서버는 해제에도 답글을 거부한다 — 고정 중인 글(원글만 고정된다)만 보낸다. 고정 중인 글이 없으면 보내지 않는다.
    const pinnedItems = items.filter((item) => item.pinned === true);
    if (pinnedItems.length === 0) {
      toast('고른 글 가운데 상단 고정 중인 글이 없어 바꾸지 않았습니다.', 'info');
      return;
    }
    pendingRef.current = true;
    setBulkPendingAction('unpin');
    try {
      const confirmed = await confirm({
        title: '고정 해제하기',
        message: `고른 ${items.length.toLocaleString()}건 가운데 고정 중인 ${pinnedItems.length.toLocaleString()}건의 상단 고정을 해제합니다. 게시판 목록의 일반 순서로 돌아갑니다.`,
        confirmText: '고정 해제하기',
        details: <ul className="list-disc pl-5">{pinnedItems.map((item) => <li key={item.pstSn}>{item.pstSn} · {item.pstTtl}</li>)}</ul>,
        detailsLabel: '해제할 글',
      });
      if (!confirmed) return;
      await boardAdminService.updatePostPinsInBatch(bbsId, { pstSns: pinnedItems.map((item) => item.pstSn), upendFixYn: 'N' });
      toast(`${pinnedItems.length.toLocaleString()}건의 상단 고정을 해제했습니다.`, 'success');
      finishBatch();
    } catch (error) {
      // 서버가 전체를 거부했다 — 아무것도 바뀌지 않았으므로 선택을 그대로 둔다. 사유는 서버 말 그대로다.
      toast(extractErrorMessage(error, '상단 고정을 해제하지 못했습니다. 아무것도 바뀌지 않았습니다.'), 'error');
      void refresh();
    } finally {
      pendingRef.current = false;
      setBulkPendingAction(null);
    }
  };

  /** 이 글의 상단 고정을 바꿀 수 있는가 — 답글은 고정하지 않고, 고정을 받지 않는 게시판에서는 고정 중인 글의 해제만 된다. */
  const pinEditable = (post: BoardPost) => canPin && post.upPstSn == null && (pinAllowed || post.pinned === true);

  const columns: Column<BoardPost>[] = [
    {
      header: '제목',
      accessor: (post) => (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-left">
          <span className="truncate font-medium text-foreground">{post.pstTtl}</span>
          {post.pinned === true && <Badge variant="outline" className="text-xs">상단 고정</Badge>}
          {post.scrtYn === 'Y' && <Badge variant="outline" className="text-xs">비밀글</Badge>}
        </div>
      ),
    },
    { header: '게시 상태', accessor: (post) => <PostingStatusLabel status={post.postingStatus} /> },
    {
      header: '게시 기간',
      accessor: (post) => (post.pstBgngYmd || post.pstEndYmd
        ? `${toDisplayYmd(post.pstBgngYmd, '시작일 없음')} ~ ${toDisplayYmd(post.pstEndYmd, '종료일 없음')}`
        : '기간 없음'),
      className: 'tabular-nums',
    },
    {
      // 서버가 지금 고정 중이라고 판정한 글만 고정이다 — 종료일이 지난 옛 고정은 서버가 싣지 않는다(DEC-OPS-140).
      header: '상단 고정',
      accessor: (post) => (post.pinned === true ? `고정 · ~${toDisplayYmd(post.upendFixEndYmd, '종료일 모름')}` : '—'),
      className: 'tabular-nums whitespace-nowrap',
    },
    { header: '작성자', accessor: (post) => post.userNm ?? '—' },
    { header: '작성일', accessor: (post) => (post.crtDt ? post.crtDt.substring(0, 10) : '—'), className: 'tabular-nums' },
    ...(canSchedule || canPin ? [{
      header: '작업',
      accessor: (post: BoardPost) => (
        <div className="flex flex-wrap justify-end gap-1">
          {canSchedule && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5"
              aria-label={`${post.pstTtl} 일정 바꾸기`}
              disabled={bulkPendingAction !== null}
              onClick={() => setPeriodTarget(post)}
            >
              <CalendarClock className="size-4" aria-hidden="true" />
              일정 바꾸기
            </Button>
          )}
          {pinEditable(post) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5"
              aria-label={`${post.pstTtl} 상단 고정 바꾸기`}
              disabled={bulkPendingAction !== null}
              onClick={() => setPinTarget(post)}
            >
              <Pin className="size-4" aria-hidden="true" />
              상단 고정 바꾸기
            </Button>
          )}
        </div>
      ),
      className: 'text-right',
    }] : []),
  ];

  const bulkActions = [
    ...(canSchedule ? [
      {
        label: '종료일 바꾸기',
        icon: <CalendarClock size={16} aria-hidden="true" />,
        disabled: bulkPendingAction !== null,
        onClick: (items: BoardPost[]) => { openBatch('END_DATE', items); },
      },
      {
        label: '종료일 해제하기',
        icon: bulkPendingAction === 'clear-end' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CalendarX size={16} aria-hidden="true" />,
        disabled: bulkPendingAction !== null,
        ariaBusy: bulkPendingAction === 'clear-end',
        pendingLabel: '종료일 해제하는 중…',
        onClick: (items: BoardPost[]) => { void handleClearEnd(items); },
      },
    ] : []),
    // 새 고정은 게시판이 고정을 받을 때만 연다. 해제는 설정과 무관하게 늘 된다(결정 6).
    ...(canPin && pinAllowed ? [{
      label: '상단 고정하기',
      icon: <Pin size={16} aria-hidden="true" />,
      disabled: bulkPendingAction !== null,
      onClick: (items: BoardPost[]) => { openBatch('PIN', items); },
    }] : []),
    ...(canPin ? [{
      label: '고정 해제하기',
      icon: bulkPendingAction === 'unpin' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <PinOff size={16} aria-hidden="true" />,
      disabled: bulkPendingAction !== null,
      ariaBusy: bulkPendingAction === 'unpin',
      pendingLabel: '고정 해제하는 중…',
      onClick: (items: BoardPost[]) => { void handleUnpin(items); },
    }] : []),
  ];

  // 열린 대화상자는 지금 목록의 같은 글을 본다 — 충돌 뒤 다시 읽으면 새 버전·저장값으로 비교한다.
  const livePeriodTarget = periodTarget ? rows.find((row) => row.pstSn === periodTarget.pstSn) ?? periodTarget : null;

  return (
    <WorkListPage
      title="게시물"
      headingLevel={2}
      showBreadcrumb={false}
      description="이 게시판의 글입니다. 게시 상태와 상단 고정은 서버가 오늘 기준으로 정합니다. 본문·첨부 수정은 글 상세의 작성 화면에서 합니다."
      totalCount={posts.isError ? undefined : total}
      filter={
        <KeywordFilter
          label="제목"
          placeholder="제목 검색"
          value={applied.searchWrd}
          onSearch={(keyword) => applyFilter({ searchWrd: keyword, postingStatus: statusDraft, pinned: pinnedDraft })}
          onReset={() => { setStatusDraft(''); setPinnedDraft(''); applyFilter(NO_FILTER); }}
        >
          <div className="space-y-1">
            <label htmlFor="board-posts-status-filter" className="text-[length:var(--font-size-body)] font-medium">게시 상태</label>
            <select
              id="board-posts-status-filter"
              value={statusDraft}
              onChange={(event) => setStatusDraft(event.target.value as PostingStatusFilter)}
              className="h-[var(--control-h)] rounded-md border border-border bg-card px-3 text-[length:var(--font-size-body)]"
            >
              {POSTING_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="board-posts-pinned-filter" className="text-[length:var(--font-size-body)] font-medium">상단 고정</label>
            <select
              id="board-posts-pinned-filter"
              value={pinnedDraft}
              onChange={(event) => setPinnedDraft(event.target.value as PinnedFilter)}
              className="h-[var(--control-h)] rounded-md border border-border bg-card px-3 text-[length:var(--font-size-body)]"
            >
              {PINNED_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </KeywordFilter>
      }
      toolbarActions={
        <span className="text-[length:var(--font-size-body)] text-muted-foreground">
          {posts.dataUpdatedAt > 0 && <>조회 시각 {toDisplayDateTime(posts.dataUpdatedAt)}</>}
          {/* 고정 수는 화면이 세지 않는다 — 상한 판정은 서버가 게시판을 잠그고 한다(결정 5). */}
          {pinAllowed && (
            <span className="ml-2">
              고정 상한 {detail.upendFixUplmtNocs.toLocaleString()}건 · 기본 {detail.upendFixBscDayCnt.toLocaleString()}일
            </span>
          )}
          <span role="status" className="ml-2">{selectionNotice}</span>
        </span>
      }
    >
      <StandardDataTable<BoardPost>
        columns={columns}
        data={rows}
        loading={posts.isLoading}
        error={posts.isError ? posts.error : null}
        onRetry={() => posts.refetch()}
        keyField="pstSn"
        enableSelection={canSchedule || canPin}
        selectionLabel={(post) => `${post.pstTtl} 선택`}
        selectionScope={`${applied.searchWrd}|${applied.postingStatus}|${applied.pinned}|${size}|${selectionEpoch}`}
        onSelectionCountChange={onSelectionCountChange}
        bulkActions={bulkActions}
        onRowClick={(post) => router.push(`/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${post.pstSn}`)}
        rowActionLabel={(post) => `${post.pstTtl} 글 상세 열기`}
        pagination={{
          currentPage: page,
          totalPages,
          onPageChange: setPage,
          pageSize: size,
          onPageSizeChange: (next) => { setSize(next); setPage(1); },
          pageSizeOptions: [20, 50, 100],
        }}
        accessibleLabel={`${detail.bbsTtl} 게시물 목록`}
        emptyMessage={emptyResultMessage(applied.searchWrd, filtered ? '조건에 맞는 글이 없습니다.' : '이 게시판에 글이 없습니다.')}
      />

      {livePeriodTarget && (
        <BoardPostPeriodDialog
          bbsId={bbsId}
          post={livePeriodTarget}
          reservationClosed={detail.rsvtPstgPsbltyYn !== 'Y'}
          onClose={() => setPeriodTarget(null)}
          onSaved={() => { void refresh(); }}
          onConflict={() => { void refresh(); }}
        />
      )}
      {pinTarget && (
        <BoardPostPinDialog
          bbsId={bbsId}
          post={pinTarget}
          pinAllowed={pinAllowed}
          defaultDays={detail.upendFixBscDayCnt}
          onClose={() => setPinTarget(null)}
          onSaved={() => { void refresh(); }}
        />
      )}
      {batch && (
        <BoardPostBatchDialog
          bbsId={bbsId}
          mode={batch.mode}
          posts={batch.posts}
          defaultDays={detail.upendFixBscDayCnt}
          onClose={() => setBatch(null)}
          onDone={finishBatch}
          onConflict={() => { void refresh(); }}
        />
      )}
    </WorkListPage>
  );
}
