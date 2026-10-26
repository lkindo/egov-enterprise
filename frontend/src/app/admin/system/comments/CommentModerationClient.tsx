'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare, RefreshCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { StandardDataTable, type Column } from '@/app/components/ui/standard-data-table';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { pickAllowedParams } from '@/lib/navigation/allowlist-params';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { commentMutationOptions, commentQueryOptions } from '@/queries/comment-query-options';
import { boardMasterQueryOptions } from '@/queries/board-master-query-options';
import type { CommentDetail } from '@/services/foundation/system/CommentAdminService';

/**
 * 댓글 및 평가 관리(/admin/system/comments) — 댓글 기능이 소유하는 독립 목록 화면(허브 분해 H6).
 *
 * 종전에는 이 경로가 감시 허브 전체를 그리고 '사용자 의견 관리' 탭을 기본으로 열었다. 그래서 댓글 담당자에게 로그 탭 넷이 보였고
 * 그 API 는 403 이었으며, 반대로 허브의 로그 조회 권한만으로 들어온 사람에게는 댓글 탭이 보이고 목록은 403 이었다. 이제 이 화면은
 * 댓글만 다루고 라우트 게이트(댓글 전체 조회 권한)가 곧 목록 API 의 권한이다. 감시 허브에는 댓글 탭이 없다.
 *
 * 만족도 평가는 이 화면에 없다 — 관리자 대리 삭제는 각 게시글 화면의 만족도 영역이 맡는다(DEC-OPS-064). 제목은 메뉴 이름을 따른다.
 *
 * [2026-10-26 ADR-0043 1차 OPS-06] 어느 게시판·어느 글의 댓글인지 보고 판단하도록 게시판·글 번호 조건, 게시판 이름·글 번호(상세 링크)·
 * 작성일 열, 항목별 상세를 더했다. 서버는 그 조건(bbsId·pstSn)과 값을 이미 주고 있었는데 화면이 쓰지 않았다. 이동 경로는 메뉴 위치
 * (관리 센터 › 콘텐츠 운영)를 따른다. 검색어로 거르는 것은 서버가 받지 않아 두지 않는다.
 */

/**
 * 이 라우트가 URL 에 싣는 쿼리 키 전수. 쪽 번호와, 게시판·글 조건(승인된 리소스 식별자 부류 bbsId·pstSn)이다 — 공유·새로고침·뒤로 가기
 * (게시글 상세의 '목록으로' 포함)가 조회 위치를 복원한다. 새 파라미터를 도입하면 이 목록에 함께 넣어야 하고, 빠뜨리면 이동 시 조용히
 * 사라진다.
 */
const URL_PARAM_KEYS = ['page', 'bbsId', 'pstSn'] as const;

/** 페이지당 건수 기본값. 사용자가 바꾸면 화면 상태가 이긴다(A1 필수 — 페이지당 건수 선택). URL 에는 싣지 않는다. */
const DEFAULT_PAGE_SIZE = 50;

/** 이 화면의 목록 이름 — 행 동작의 접근 이름과 반출 안내가 같은 이름을 쓴다. */
const LIST_LABEL = '댓글';

/** 게시판 ID 형식(영문·숫자·`_`·`-`). 주소에서 읽은 값이 이 꼴이 아니면 조건으로 쓰지 않는다. */
const BOARD_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;
/** 글 번호 형식(양의 정수). */
const POST_NUMBER_PATTERN = /^[1-9]\d{0,17}$/;

/** CSV 반출 컬럼 매핑 — 백엔드 CommentDetail 의 실제 필드명을 따른다. */
const COMMENT_EXPORT_HEADERS = [
  { label: '댓글번호', key: 'ansSn' },
  { label: '내용', key: 'ansCn' },
  { label: '작성자ID', key: 'wrterId' },
  { label: '작성자명', key: 'wrterNm' },
  { label: '작성일시', key: 'crtDt' },
  { label: '게시판ID', key: 'bbsId' },
  { label: '게시글ID', key: 'pstSn' },
];

/**
 * 서버 일시 → 'yyyy-MM-dd HH:mm'(DEC-OPS-100 — 초는 뜻이 없다). 댓글 일시는 서버가 Asia/Seoul 로 시간대 표기 없이 준다 — Date 로 바꾸면
 * 브라우저 시간대로 옮겨질 수 있어 문자열로만 자른다. 해석할 수 없으면 '—' 다(없는 시각을 지어내지 않는다).
 */
function formatCommentedAt(value?: string | null): string {
  const match = value ? /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(value.trim()) : null;
  return match ? `${match[1]} ${match[2]}` : '—';
}

export default function CommentModerationClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  // 주소의 조건은 형식이 맞을 때만 쓴다 — 손으로 고친 값을 그대로 서버에 보내지 않는다.
  const rawBoardId = searchParams.get('bbsId') ?? '';
  const boardId = BOARD_ID_PATTERN.test(rawBoardId) ? rawBoardId : '';
  const rawPostNumber = searchParams.get('pstSn') ?? '';
  const postNumber = POST_NUMBER_PATTERN.test(rawPostNumber) && Number.isSafeInteger(Number(rawPostNumber)) ? rawPostNumber : '';
  const [isPending, startTransition] = useTransition();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const deleteCommentPendingRef = useRef(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  // 고르는 중인 게시판(조회 전). 주소의 조건이 바뀌면(초기화·뒤로 가기) 그 값을 따른다 — 렌더 중 조정.
  const [boardDraft, setBoardDraft] = useState(boardId);
  const [boardDraftBase, setBoardDraftBase] = useState(boardId);
  if (boardDraftBase !== boardId) {
    setBoardDraftBase(boardId);
    setBoardDraft(boardId);
  }
  const [postNumberError, setPostNumberError] = useState('');
  // [2026-10-01] 댓글 삭제 버튼은 관리자 삭제 대행 권한(COMMENT_DELETE_ALL)으로 보인다. 조회 권한만 가진 사람은 목록만 본다.
  //   표시 판정일 뿐이며 서버 인가는 그대로 집행된다(H3).
  const canDeleteComment = canPermission(user, 'COMMENT_DELETE_ALL');

  /**
   * 주소의 쿼리를 이 화면이 아는 키로만 다시 만든다. 키는 이름으로 적는다 — URL 상태 census 가 키를 계산 값(<computed>)이 아니라 승인된
   * 이름(page·bbsId·pstSn)으로 읽게 한다. 조건을 바꾸면 쪽은 1로 돌아간다(page 를 지운다).
   */
  const replaceQuery = (next: { page: number; bbsId: string; pstSn: string }) => {
    const params = pickAllowedParams(searchParams, URL_PARAM_KEYS);
    if (next.page > 1) params.set('page', String(next.page));
    else params.delete('page');
    if (next.bbsId) params.set('bbsId', next.bbsId);
    else params.delete('bbsId');
    if (next.pstSn) params.set('pstSn', next.pstSn);
    else params.delete('pstSn');
    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  };
  // 쪽을 옮길 때는 지금 적용한 조건(형식이 맞는 값)을 그대로 둔다.
  const setPage = (nextPage: number) => replaceQuery({ page: nextPage, bbsId: boardId, pstSn: postNumber });

  // ⚠ 백엔드 CommentApiController 는 키워드 검색을 지원하지 않는다(CommentAdminService 주석 참조) — 검색어 입력을 두지 않는다.
  //   게시판·글 조건(bbsId·pstSn)은 서버가 받는다. 빈 조건은 보내지 않는다.
  const { data: commentData, isLoading, error, refetch } = useQuery(commentQueryOptions.adminList({
    page,
    size: pageSize,
    ...(boardId ? { bbsId: boardId } : {}),
    ...(postNumber ? { pstSn: Number(postNumber) } : {}),
  }));
  const comments = useMemo(() => commentData?.list || [], [commentData]);
  const selectedItem = useMemo(
    () => (selectedItemId === null ? null : comments.find((comment) => comment.ansSn === selectedItemId) ?? null),
    [comments, selectedItemId],
  );

  /*
    게시판 이름·선택지 — 이용 화면이 쓰는 서버 선택지(ADR-0040 결정 11)를 읽는다. 사용 중이고 이 사람이 열 수 있는 게시판만 오므로 사용 안 함
    게시판의 댓글은 이름 대신 게시판 ID 로 보인다. 선택지 API 는 게시판 읽기 권한(BOARD_READ)을 요구한다 — 없으면 부르지 않고 ID 로 보인다.
  */
  const canReadBoards = canPermission(user, 'BOARD_READ');
  const boardOptionsQuery = useQuery({ ...boardMasterQueryOptions.options(), enabled: canReadBoards, staleTime: 5 * 60 * 1000 });
  const boardNames = useMemo(
    () => new Map((boardOptionsQuery.data ?? []).filter((board) => board.bbsId).map((board) => [board.bbsId, board.bbsTtl || board.bbsId])),
    [boardOptionsQuery.data],
  );
  const boardName = (bbsId?: string | null) => (bbsId ? boardNames.get(bbsId) ?? bbsId : '—');
  const boardChoices = [
    ...(boardOptionsQuery.data ?? []).filter((board) => board.bbsId).map((board) => ({ value: board.bbsId, label: board.bbsTtl || board.bbsId })),
    // 주소로 받은 게시판이 선택지에 없으면(사용 안 함 게시판 등) 그 조건을 잃지 않게 ID 로 한 칸 더 둔다.
    ...(boardId && !boardNames.has(boardId) ? [{ value: boardId, label: boardId }] : []),
  ];
  const filtered = boardId !== '' || postNumber !== '';

  const deleteCommentMutation = useMutation({
    ...commentMutationOptions.removeAdmin(queryClient),
    onSuccess: () => {
      toast('댓글이 성공적으로 삭제되었습니다.', 'success');
      setSelectedItemId(null);
    },
    onError: (deleteError: Error) => {
      toast(deleteError.message || '댓글 삭제 중 오류가 발생했습니다.', 'error');
    },
  });

  /**
   * 댓글 삭제는 반드시 확인 모달을 거친다. 확인 전에 동기로 선점해 두 번 눌러도 한 번만 묻는다.
   * 과거에는 서비스 경로 오조립(404)으로 삭제가 "잠복"해 있었을 뿐, 무확인 1클릭 삭제 구조였다.
   */
  const handleDeleteComment = async (comment: { ansSn?: number | null; ansCn?: string; wrterNm?: string }) => {
    if (comment?.ansSn === undefined || comment?.ansSn === null || deleteCommentPendingRef.current) return;
    const ansSn = comment.ansSn;
    deleteCommentPendingRef.current = true;
    setDeletingCommentId(ansSn);
    try {
      const preview = (comment.ansCn || '').trim();
      const isConfirmed = await confirm({
        title: '댓글 삭제',
        message: `${preview ? `"${preview.length > 60 ? `${preview.slice(0, 60)}…` : preview}" ` : ''}댓글(작성자: ${comment.wrterNm || '알 수 없음'})을 삭제하시겠습니까? 삭제한 댓글은 목록에 표시되지 않으며, 이 화면에서 복구할 수 없습니다.`,
        confirmText: '삭제',
        variant: 'destructive',
      });
      if (!isConfirmed) return;
      try {
        await deleteCommentMutation.mutateAsync(ansSn);
      } catch {
        // mutation onError가 오류 안내를 소유하며 선택된 댓글은 그대로 보존한다.
      }
    } finally {
      deleteCommentPendingRef.current = false;
      setDeletingCommentId(null);
    }
  };

  const columns: Column<CommentDetail>[] = [
    {
      header: '댓글',
      accessor: (c) => (
        <div className="flex w-full items-center gap-3 py-1 pr-4">
          <div className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md transition-colors',
            selectedItemId === c.ansSn ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}>
            <MessageSquare size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <h4 className="truncate text-[length:var(--font-size-body)] font-medium text-foreground">{c.ansCn}</h4>
            <p className="text-xs text-muted-foreground">{c.wrterNm ?? '작성자 정보 없음'}</p>
          </div>
          {selectedItemId === c.ansSn && canDeleteComment && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={deletingCommentId === c.ansSn ? '댓글 삭제 중' : '댓글 삭제'}
              aria-busy={deletingCommentId === c.ansSn || undefined}
              disabled={deletingCommentId !== null}
              onClick={(e) => { e.stopPropagation(); void handleDeleteComment(c); }}
              className="relative z-10 size-8 shrink-0 rounded-md text-destructive-emphasis hover:bg-destructive/10"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      ),
    },
    { header: '게시판', accessor: (c) => boardName(c.bbsId) },
    {
      header: '글 번호',
      // 이 댓글이 달린 글의 상세 — 상세의 '목록으로' 가 이 화면(조건 그대로)으로 돌아온다.
      accessor: (c) => (c.bbsId && c.pstSn
        ? (
          <Link
            href={`/admin/community/boards/detail?bbsId=${encodeURIComponent(c.bbsId)}&pstSn=${c.pstSn}`}
            aria-label={`글 ${c.pstSn} 상세 보기`}
            className="tabular-nums text-primary underline-offset-2 hover:underline"
          >
            {c.pstSn}
          </Link>
        )
        : '—'),
      className: 'tabular-nums',
    },
    { header: '작성일', accessor: (c) => formatCommentedAt(c.crtDt), className: 'tabular-nums whitespace-nowrap' },
  ];

  return (
    <WorkListPage
      title="댓글 및 평가 관리"
      description="게시글에 등록된 댓글을 게시판·글로 걸러 보고 관리자 권한으로 삭제합니다. 만족도 평가는 각 게시글 화면에서 관리합니다."
      breadcrumbItems={[{ label: '관리 센터' }, { label: '콘텐츠 운영' }, { label: '댓글 및 평가 관리' }]}
      totalCount={error ? undefined : commentData?.total}
      actions={
        <DataExportExcel
          scope="page"
          data={comments as unknown as Record<string, unknown>[]}
          headers={COMMENT_EXPORT_HEADERS}
          filename="댓글목록"
        />
      }
      filter={
        <div className="space-y-2">
          <KeywordFilter
            label="글 번호"
            placeholder="글 번호(숫자)"
            value={postNumber}
            onSearch={(keyword) => {
              if (keyword !== '' && !POST_NUMBER_PATTERN.test(keyword)) {
                setPostNumberError('글 번호는 1 이상의 숫자로 입력하세요. 조회 조건은 바뀌지 않았습니다.');
                return;
              }
              setPostNumberError('');
              replaceQuery({ page: 1, bbsId: boardDraft, pstSn: keyword });
            }}
            onReset={() => {
              setPostNumberError('');
              setBoardDraft('');
              replaceQuery({ page: 1, bbsId: '', pstSn: '' });
            }}
          >
            <div className="space-y-1">
              <label htmlFor="comment-board-filter" className="text-[length:var(--font-size-body)] font-medium">게시판</label>
              <select
                id="comment-board-filter"
                value={boardDraft}
                onChange={(event) => setBoardDraft(event.target.value)}
                className="h-[var(--control-h)] max-w-xs rounded-md border border-border bg-card px-3 text-[length:var(--font-size-body)]"
              >
                <option value="">전체 게시판</option>
                {boardChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
              </select>
            </div>
          </KeywordFilter>
          {postNumberError && <p role="alert" className="text-[length:var(--font-size-body)] text-destructive">{postNumberError}</p>}
        </div>
      }
      toolbarActions={
        <Button variant="outline" size="sm" aria-label="목록 새로고침" onClick={() => { void refetch(); }}>
          <RefreshCcw size={16} aria-hidden="true" />
        </Button>
      }
    >
      <div className="space-y-4">
        <StandardDataTable
          columns={columns}
          data={comments}
          loading={isLoading || isPending}
          error={error}
          onRetry={() => { void refetch(); }}
          onRowClick={(item) => setSelectedItemId(item.ansSn)}
          rowActionLabel={(item) => `${LIST_LABEL} ${String(item.ansSn)} 상세 열기`}
          keyField="ansSn"
          // 조건으로 거른 0건은 '댓글 없음' 이 아니라 '조건에 맞는 결과 없음' 이다(G15). 검색어(글 번호)가 있으면 공용 문구로 그 값을 말한다.
          emptyMessage={emptyResultMessage(
            postNumber ? `글 번호 ${postNumber}` : null,
            filtered ? '조건에 맞는 댓글이 없습니다.' : '등록된 댓글이 없습니다.',
          )}
          pagination={{
            currentPage: page,
            totalPages: commentData?.totalPage || 1,
            pageSize,
            onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
            onPageChange: (p) => setPage(p),
          }}
        />

        {selectedItem && (
          <section aria-label="선택한 댓글 상세" className="rounded-md border border-border bg-card">
            <header className="flex items-start justify-between gap-2 border-b border-border p-[var(--filter-pad)]">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">선택한 댓글 상세</h2>
                <p className="mt-1 text-[length:var(--font-size-body)] text-muted-foreground">댓글 번호 {selectedItem.ansSn}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedItemId(null)}>닫기</Button>
            </header>
            {/* 항목별로 읽는다 — 종전에는 응답 JSON 원문을 그대로 보였다. */}
            <dl className="grid gap-x-4 gap-y-2 p-[var(--filter-pad)] text-[length:var(--font-size-body)] sm:grid-cols-[8rem_1fr]">
              <dt className="text-muted-foreground">게시판</dt>
              <dd className="min-w-0 break-words text-foreground">{boardName(selectedItem.bbsId)}</dd>
              <dt className="text-muted-foreground">글 번호</dt>
              <dd className="text-foreground">
                {selectedItem.bbsId && selectedItem.pstSn ? (
                  <Link
                    href={`/admin/community/boards/detail?bbsId=${encodeURIComponent(selectedItem.bbsId)}&pstSn=${selectedItem.pstSn}`}
                    className="tabular-nums text-primary underline-offset-2 hover:underline"
                  >
                    {selectedItem.pstSn} 글 상세 보기
                  </Link>
                ) : '—'}
              </dd>
              <dt className="text-muted-foreground">작성자</dt>
              <dd className="text-foreground">{selectedItem.wrterNm || '작성자 정보 없음'}</dd>
              <dt className="text-muted-foreground">작성일</dt>
              <dd className="tabular-nums text-foreground">{formatCommentedAt(selectedItem.crtDt)}</dd>
              <dt className="text-muted-foreground">내용</dt>
              <dd className="min-w-0 whitespace-pre-wrap break-words text-foreground">{selectedItem.ansCn || '—'}</dd>
            </dl>
          </section>
        )}
      </div>
    </WorkListPage>
  );
}
