'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { CalendarClock, CalendarX, History, Loader2, MessageSquare, Pin, PinOff, Plus } from 'lucide-react';
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
import { canOpenPage } from '@/lib/auth/page-access';
import { QNA_STATUS_LABELS, type QnaStatusCode } from '@/lib/board/qna-status';
import { toDisplayDateTime, toDisplayYmd } from '@/lib/format-date';
import { useSessionListState } from '@/lib/hooks/use-session-list-state';
import { boardMasterQueryOptions, invalidateBoardOperationPosts } from '@/queries/board-master-query-options';
import { boardAdminService, type BoardMasterDetail } from '@/services/foundation/system/BoardAdminService';
import type { BoardPost, BoardPostingStatus } from '@/types/business/board';
import { PostingStatusLabel, QnaStatusLabel } from '../../components/PostingStatusBadge';
import { BoardChangeHistoryDialog } from './BoardChangeHistoryDialog';
import { BoardPostPeriodDialog } from './BoardPostPeriodDialog';
import { BoardPostPinDialog } from './BoardPostPinDialog';
import { BoardPostBatchDialog, type BoardPostBatchMode } from './BoardPostBatchDialog';

type PostingStatusFilter = '' | BoardPostingStatus;
/** 상단 고정 조건 — 'Y' 지금 고정 중인 글, 'N' 그 밖의 글(서버가 오늘 기준으로 판정한다). */
type PinnedFilter = '' | 'Y' | 'N';
/** 검색 구분 — 서버 목록 API 의 searchCnd('0' 제목·'1' 본문·'2' 작성자 표시 이름, BoardPredicate). */
type SearchCondition = '0' | '1' | '2';
/** Q&A 해결 상태 조건(서버 qnaStatus) — Q&A 게시판에서만 쓴다. */
type QnaStatusFilter = '' | QnaStatusCode;
interface AppliedFilter {
  searchWrd: string;
  searchCnd: SearchCondition;
  postingStatus: PostingStatusFilter;
  pinned: PinnedFilter;
  qnaStatus: QnaStatusFilter;
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
const SEARCH_CONDITION_OPTIONS: readonly { value: SearchCondition; label: string }[] = [
  { value: '0', label: '제목' },
  { value: '1', label: '본문' },
  { value: '2', label: '작성자' },
];
const QNA_STATUS_OPTIONS: readonly { value: QnaStatusFilter; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'OPEN', label: QNA_STATUS_LABELS.OPEN },
  { value: 'SOLVED', label: QNA_STATUS_LABELS.SOLVED },
];
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const NO_FILTER: AppliedFilter = { searchWrd: '', searchCnd: '0', postingStatus: '', pinned: '', qnaStatus: '' };
/** 진행 중인 선택 처리. 처리 하나가 도는 동안 다른 선택 처리·일정·고정 바꾸기를 잠근다. */
type BulkPendingAction = 'clear-end' | 'unpin';

/**
 * [2026-10-26 ADR-0043 1차 OPS-01] 이 탭의 조회 조건·쪽·크기를 이 브라우저 탭이 살아 있는 동안 게시판별로 기억한다. 글 상세의 '목록으로'
 * 가 뒤로 가기로 이 탭에 돌아와도 탭은 새로 마운트되므로, 기억하지 않으면 1쪽·빈 조건으로 돌아갔다. URL 키는 탭 하나다(결정 2) —
 * 조건은 URL 이 아니라 세션 목록 상태(useSessionListState)에 둔다. 저장값은 같은 키·같은 원시 타입만 받고, 값 도메인은 아래에서 다시 거른다.
 */
const LIST_STATE_DEFAULTS = {
  page: 1,
  size: 20,
  searchWrd: '',
  searchCnd: '0',
  postingStatus: '',
  pinned: '',
  qnaStatus: '',
};

const asSearchCondition = (value: string): SearchCondition => (value === '1' || value === '2' ? value : '0');
const asPostingStatus = (value: string): PostingStatusFilter =>
  (POSTING_STATUS_OPTIONS.some((option) => option.value === value) ? value as PostingStatusFilter : '');
const asPinned = (value: string): PinnedFilter => (value === 'Y' || value === 'N' ? value : '');
const asQnaStatus = (value: string): QnaStatusFilter => (value === 'OPEN' || value === 'SOLVED' ? value : '');
const filterKey = (filter: AppliedFilter) =>
  `${filter.searchCnd}|${filter.searchWrd}|${filter.postingStatus}|${filter.pinned}|${filter.qnaStatus}`;

/**
 * 게시판 운영 화면의 게시물 탭(ADR-0040 §5.4). B1 에서 게시 상태·조회 조건·일정 빠른 편집·종료일 일괄 처리를, B2 에서 상단 고정 열·
 * 조건·고정 바꾸기와 일괄 고정·해제를 더했다. [2026-10-26 ADR-0043 1차] 글 쓰기 진입, 상세에서의 복귀(조건·쪽 보관), 검색 구분, 조회·댓글
 * 수, 유효 고정 수, 변경 이력, Q&A 해결 상태 열·조건, 글마다 댓글 관리 바로가기를 더했다.
 *
 * 조회 대행 권한(BOARD_READ_ALL)이 있을 때만 이 탭이 보인다. 그 권한이면 서버가 사용 안 함 게시판과 예약·게시 종료 글까지 연다(결정 1).
 * 게시 상태·상단 고정·해결 상태는 서버 값(postingStatus·pinned·qnaSttsCd)을 그대로 그리고 날짜로 다시 계산하지 않는다(DEC-OPS-140).
 * 조회 조건은 `조회`·Enter 로만 적용하고(G2) URL 밖 상태다(결정 2 — 운영 화면의 URL 키는 탭뿐이다). 쪽은 1 기반 page·size 다(ADR-0036).
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
  // [ADR-0043 1차 OPS-02] 해결 상태 열·조건은 Q&A 화면 유형(템플릿)의 게시판에서만 뜻이 있다 — 서버도 해결 표시를 Q&A 게시판에만 받는다.
  const isQna = detail.tmpltId === 'TMPLT_QNA';
  const [listState, updateListState] = useSessionListState(`board-operations-posts:${bbsId}`, LIST_STATE_DEFAULTS);
  const page = Number.isSafeInteger(listState.page) && listState.page > 0 ? listState.page : 1;
  const size = (PAGE_SIZE_OPTIONS as readonly number[]).includes(listState.size) ? listState.size : LIST_STATE_DEFAULTS.size;
  const applied: AppliedFilter = {
    searchWrd: listState.searchWrd,
    searchCnd: asSearchCondition(listState.searchCnd),
    postingStatus: asPostingStatus(listState.postingStatus),
    pinned: asPinned(listState.pinned),
    qnaStatus: isQna ? asQnaStatus(listState.qnaStatus) : '',
  };
  const appliedKey = filterKey(applied);
  const setPage = (next: number) => updateListState({ page: next });
  const [statusDraft, setStatusDraft] = useState<PostingStatusFilter>(applied.postingStatus);
  const [pinnedDraft, setPinnedDraft] = useState<PinnedFilter>(applied.pinned);
  const [searchCndDraft, setSearchCndDraft] = useState<SearchCondition>(applied.searchCnd);
  const [qnaStatusDraft, setQnaStatusDraft] = useState<QnaStatusFilter>(applied.qnaStatus);
  // 적용한 조건이 바깥에서 바뀌면(하이드레이션 뒤 세션 상태 복원·초기화) 고르는 중인 값도 그 조건을 따른다 — effect 가 아니라
  // 렌더 중 조정이다(React 'prop 이 바뀔 때 state 조정' 패턴). 입력창은 KeywordFilter 가 value 로 같은 일을 한다.
  const [draftBase, setDraftBase] = useState(appliedKey);
  if (draftBase !== appliedKey) {
    setDraftBase(appliedKey);
    setStatusDraft(applied.postingStatus);
    setPinnedDraft(applied.pinned);
    setSearchCndDraft(applied.searchCnd);
    setQnaStatusDraft(applied.qnaStatus);
  }
  // 일괄 처리가 성공할 때마다 올린다 — 선택 범위에 넣어 처리한 글을 다시 고른 채로 두지 않는다.
  const [selectionEpoch, setSelectionEpoch] = useState(0);
  const selectedCountRef = useRef(0);
  const [selectionNotice, setSelectionNotice] = useState('');
  const [periodTarget, setPeriodTarget] = useState<BoardPost | null>(null);
  const [pinTarget, setPinTarget] = useState<BoardPost | null>(null);
  const [batch, setBatch] = useState<{ mode: BoardPostBatchMode; posts: BoardPost[] } | null>(null);
  const [bulkPendingAction, setBulkPendingAction] = useState<BulkPendingAction | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const pendingRef = useRef(false);

  // 빈 조건은 보내지 않는다(빈 값과 '조건 없음' 을 섞지 않는다). 검색 구분은 검색어가 있을 때만 뜻이 있다.
  const listFilters = {
    ...(applied.searchWrd ? { searchCnd: applied.searchCnd, searchWrd: applied.searchWrd } : {}),
    ...(applied.postingStatus ? { postingStatus: applied.postingStatus } : {}),
    ...(applied.pinned ? { pinned: applied.pinned === 'Y' } : {}),
    ...(applied.qnaStatus ? { qnaStatus: applied.qnaStatus } : {}),
  };
  // 쪽·크기·적용한 조건을 factory 인자로 직접 넘긴다 — factory 가 그 값을 조회 키에 담고 검색 구분·해결 상태까지 요청에 싣는다
  // (페이지 크기 결속 census, ADR-0043 1차 OPS-08①·OPS-02).
  const posts = useQuery({
    ...boardMasterQueryOptions.operationPosts(bbsId, { page, size, ...listFilters }),
    placeholderData: keepPreviousData,
  });
  /*
    [2026-10-26 ADR-0043 1차 OPS-10] 유효 고정 수 — 화면이 세지 않는다(결정 5). 같은 목록 API 의 '지금 고정 중인 글' 조건(pinned=true)
    으로 서버가 센 전체 건수(total)를 읽는다. 상한 집계(countActivePins)와 같은 판정(pinActiveOn)이고, 이 탭을 보는 조회 대행 권한자에게는
    비밀글·게시 기간 밖의 글도 목록에 오므로 같은 수다. 판정은 여전히 서버가 게시판을 잠그고 한다.
  */
  const pinCount = useQuery({
    ...boardMasterQueryOptions.operationPosts(bbsId, { page: 1, size: 1, pinned: true }),
    select: (data) => data.total,
  });
  // 지정 게시판(공지·FAQ)의 추가 편집 권한은 서버가 계산해 메타로 준다(D-14). 모르면 쓰기 단추를 보이지 않는다.
  const meta = useQuery(boardMasterQueryOptions.meta(bbsId));
  const canEditBoard = canEditConfiguredBoard(user, meta.data);
  const canSchedule = canPermission(user, 'BOARD_UPDATE_ALL') && canEditBoard;
  const canPin = canPermission(user, 'BOARD_PIN') && canEditBoard;
  // [ADR-0043 1차 OPS-01] 글 쓰기 — 사용 안 함 게시판도 운영자(조회 대행 권한)는 글을 준비할 수 있다(ADR-0040 결정 1). 등록 권한과
  //   지정 게시판 편집 권한이 모두 있어야 보이고, 서버가 같은 규칙(loadWritableMaster)으로 최종 판정한다.
  const canWrite = canPermission(user, 'BOARD_CREATE') && canEditBoard;
  // 댓글 관리 화면은 댓글 전체 조회 권한이 따로 필요하다 — 라우트 게이트와 같은 판정으로 바로가기를 보인다.
  const canOpenComments = canOpenPage(user, '/admin/system/comments');
  // 게시판 설정이 새 고정을 받는가. 끄면 새 고정만 막고 해제는 늘 된다(결정 6) — 해제 단추는 이 값과 무관하다.
  const pinAllowed = detail.upendFixPsbltyYn === 'Y';
  const rows = posts.data?.list ?? [];
  const total = posts.data?.total ?? rows.length;
  const totalPages = posts.data?.totalPage ?? Math.max(1, Math.ceil(total / size));
  const filtered = appliedKey !== filterKey(NO_FILTER);

  const onSelectionCountChange = useCallback((count: number) => { selectedCountRef.current = count; }, []);
  const refresh = () => invalidateBoardOperationPosts(queryClient, bbsId);
  const finishBatch = () => {
    setSelectionEpoch((epoch) => epoch + 1);
    void refresh();
  };

  const applyFilter = (next: AppliedFilter) => {
    const changed = filterKey(next) !== appliedKey;
    // 조건이 바뀌면 표가 선택을 푼다(selectionScope) — 몇 건을 풀었는지 알린다(§5.4).
    setSelectionNotice(changed && selectedCountRef.current > 0
      ? `조회 조건을 바꿔 선택한 ${selectedCountRef.current.toLocaleString()}건을 해제했습니다.`
      : '');
    updateListState({ ...next, page: 1 });
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

  /**
   * 제목 아래 보조 줄(OPS-10) — 목록 응답에 실린 조회·댓글 수만 보인다. 서버가 싣지 않은 값은 0 으로 지어내지 않고 뺀다. 첨부 수(fileCnt)는
   * 목록 응답에 실리지 않아(BoardMapper 가 무시한다) 보이지 않는다. Q&A 의 답은 댓글로 달리지만 질문자 자신의 댓글도 세므로 '답변'이
   * 아니라 '댓글' 이라 부른다(UX-05).
   */
  const postCounts = (post: BoardPost) => [
    ...(typeof post.inqCnt === 'number' ? [`조회 ${post.inqCnt.toLocaleString('ko-KR')}`] : []),
    ...(typeof post.commentCnt === 'number' ? [`댓글 ${post.commentCnt.toLocaleString('ko-KR')}`] : []),
  ].join(' · ');

  const hasRowActions = canSchedule || canPin || canOpenComments;
  const columns: Column<BoardPost>[] = [
    {
      header: '제목',
      accessor: (post) => {
        const counts = postCounts(post);
        return (
          <div className="min-w-0 space-y-0.5 text-left">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="truncate font-medium text-foreground">{post.pstTtl}</span>
              {post.pinned === true && <Badge variant="outline" className="text-xs">상단 고정</Badge>}
              {post.scrtYn === 'Y' && <Badge variant="outline" className="text-xs">비밀글</Badge>}
            </div>
            {counts && <p className="text-xs tabular-nums text-muted-foreground">{counts}</p>}
          </div>
        );
      },
    },
    { header: '게시 상태', accessor: (post) => <PostingStatusLabel status={post.postingStatus} /> },
    ...(isQna ? [{ header: '해결 상태', accessor: (post: BoardPost) => <QnaStatusLabel qnaSttsCd={post.qnaSttsCd} /> }] : []),
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
    ...(hasRowActions ? [{
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
          {/*
            [ADR-0043 1차 OPS-06] 이 글의 댓글을 댓글 관리 화면에서 연다 — 게시판·글 조건(bbsId·pstSn)은 승인된 리소스 식별자 부류라
            주소에 싣는다. 이동이므로 단추가 아니라 링크다.
          */}
          {canOpenComments && (
            <Button asChild size="sm" variant="ghost" className="gap-1.5">
              <Link
                href={`/admin/system/comments?bbsId=${encodeURIComponent(bbsId)}&pstSn=${post.pstSn}`}
                aria-label={`${post.pstTtl} 댓글 관리`}
              >
                <MessageSquare className="size-4" aria-hidden="true" />
                댓글 관리
              </Link>
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
  const searchLabel = SEARCH_CONDITION_OPTIONS.find((option) => option.value === searchCndDraft)?.label ?? '제목';
  // 기억한 쪽이 지금 마지막 쪽보다 뒤면(그사이 글이 줄었다) 이 게시판에 글이 없다거나 조건에 맞는 글이 없다고 말하지 않는다.
  const emptyFallback = page > 1
    ? '이 쪽에는 글이 없습니다. 앞 쪽으로 이동하세요.'
    : filtered ? '조건에 맞는 글이 없습니다.' : '이 게시판에 글이 없습니다.';

  /** 유효 고정 수(서버 집계)와 게시판의 고정 상한. 고정 수는 화면이 세지 않는다 — 상한 판정은 서버가 게시판을 잠그고 한다(결정 5). */
  const pinSummary = (() => {
    const count = pinCount.isError
      ? '유효 고정 조회 실패'
      : typeof pinCount.data === 'number' ? `유효 고정 ${pinCount.data.toLocaleString('ko-KR')}건` : null;
    if (pinAllowed) {
      return (
        <span className="ml-2">
          {count && <><span>{count}</span>{' / '}</>}
          <span>고정 상한 {detail.upendFixUplmtNocs.toLocaleString()}건 · 기본 {detail.upendFixBscDayCnt.toLocaleString()}일</span>
        </span>
      );
    }
    // 고정을 받지 않는 게시판에도 전에 고정한 글이 남을 수 있다 — 남아 있을 때만 알린다(해제는 늘 된다, 결정 6).
    return typeof pinCount.data === 'number' && pinCount.data > 0
      ? <span className="ml-2">{count} · 새 고정은 받지 않습니다</span>
      : null;
  })();

  return (
    <WorkListPage
      title="게시물"
      headingLevel={2}
      showBreadcrumb={false}
      description="이 게시판의 글입니다. 게시 상태와 상단 고정은 서버가 오늘 기준으로 정합니다. 본문·첨부 수정은 글 상세의 작성 화면에서 합니다."
      actions={canWrite ? (
        <Button asChild size="sm" className="gap-1.5">
          <Link
            href={`/admin/community/boards/insert-board-article?bbsId=${encodeURIComponent(bbsId)}`}
            aria-label={`${detail.bbsTtl}에 글 쓰기`}
          >
            <Plus className="size-4" aria-hidden="true" />
            글 쓰기
          </Link>
        </Button>
      ) : undefined}
      totalCount={posts.isError ? undefined : total}
      filter={
        <KeywordFilter
          label="검색어"
          placeholder={`${searchLabel} 검색`}
          value={applied.searchWrd}
          onSearch={(keyword) => applyFilter({
            searchWrd: keyword,
            searchCnd: searchCndDraft,
            postingStatus: statusDraft,
            pinned: pinnedDraft,
            qnaStatus: isQna ? qnaStatusDraft : '',
          })}
          onReset={() => {
            setStatusDraft('');
            setPinnedDraft('');
            setSearchCndDraft('0');
            setQnaStatusDraft('');
            applyFilter(NO_FILTER);
          }}
        >
          <div className="space-y-1">
            <label htmlFor="board-posts-search-condition" className="text-[length:var(--font-size-body)] font-medium">검색 구분</label>
            <select
              id="board-posts-search-condition"
              value={searchCndDraft}
              onChange={(event) => setSearchCndDraft(asSearchCondition(event.target.value))}
              className="h-[var(--control-h)] rounded-md border border-border bg-card px-3 text-[length:var(--font-size-body)]"
            >
              {SEARCH_CONDITION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
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
          {isQna && (
            <div className="space-y-1">
              <label htmlFor="board-posts-qna-status-filter" className="text-[length:var(--font-size-body)] font-medium">해결 상태</label>
              <select
                id="board-posts-qna-status-filter"
                value={qnaStatusDraft}
                onChange={(event) => setQnaStatusDraft(asQnaStatus(event.target.value))}
                className="h-[var(--control-h)] rounded-md border border-border bg-card px-3 text-[length:var(--font-size-body)]"
              >
                {QNA_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          )}
        </KeywordFilter>
      }
      toolbarActions={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[length:var(--font-size-body)] text-muted-foreground">
          <span>
            {posts.dataUpdatedAt > 0 && <>조회 시각 {toDisplayDateTime(posts.dataUpdatedAt)}</>}
            {pinSummary}
            <span role="status" className="ml-2">{selectionNotice}</span>
          </span>
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => setHistoryOpen(true)}>
            <History className="size-4" aria-hidden="true" />
            변경 이력
          </Button>
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
        selectionScope={`${appliedKey}|${size}|${selectionEpoch}`}
        onSelectionCountChange={onSelectionCountChange}
        bulkActions={bulkActions}
        onRowClick={(post) => router.push(`/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${post.pstSn}`)}
        rowActionLabel={(post) => `${post.pstTtl} 글 상세 열기`}
        pagination={{
          currentPage: page,
          totalPages,
          onPageChange: setPage,
          pageSize: size,
          onPageSizeChange: (next) => { updateListState({ size: next, page: 1 }); },
          pageSizeOptions: [...PAGE_SIZE_OPTIONS],
        }}
        accessibleLabel={`${detail.bbsTtl} 게시물 목록`}
        emptyMessage={emptyResultMessage(applied.searchWrd, emptyFallback)}
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
      {historyOpen && (
        <BoardChangeHistoryDialog bbsId={bbsId} boardName={detail.bbsTtl} onClose={() => setHistoryOpen(false)} />
      )}
    </WorkListPage>
  );
}
