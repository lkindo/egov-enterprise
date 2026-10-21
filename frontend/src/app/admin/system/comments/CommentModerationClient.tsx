'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
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
import { pickAllowedParams } from '@/lib/navigation/allowlist-params';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { commentMutationOptions, commentQueryOptions } from '@/queries/comment-query-options';
import type { CommentDetail } from '@/services/foundation/system/CommentAdminService';

/**
 * 댓글 및 평가 관리(/admin/system/comments) — 댓글 기능이 소유하는 독립 목록 화면(허브 분해 H6).
 *
 * 종전에는 이 경로가 감시 허브 전체를 그리고 '사용자 의견 관리' 탭을 기본으로 열었다. 그래서 댓글 담당자에게 로그 탭 넷이 보였고
 * 그 API 는 403 이었으며, 반대로 허브의 로그 조회 권한만으로 들어온 사람에게는 댓글 탭이 보이고 목록은 403 이었다. 이제 이 화면은
 * 댓글만 다루고 라우트 게이트(댓글 전체 조회 권한)가 곧 목록 API 의 권한이다. 감시 허브에는 댓글 탭이 없다.
 *
 * 만족도 평가는 이 화면에 없다 — 관리자 대리 삭제는 각 게시글 화면의 만족도 영역이 맡는다(DEC-OPS-064). 제목은 메뉴 이름을 따른다.
 */

/**
 * 이 라우트가 URL 에 싣는 쿼리 키 전수. 쪽 번호 하나만 읽는다(공유·새로고침·뒤로가기가 조회 위치를 복원한다). 종전 감시 허브의
 * 댓글 탭도 `?page=` 를 복원했다. 새 파라미터를 도입하면 이 목록에 함께 넣어야 하고, 빠뜨리면 이동 시 조용히 사라진다.
 */
const PAGE_PARAM_KEYS = ['page'] as const;

/** 페이지당 건수 기본값. 사용자가 바꾸면 화면 상태가 이긴다(A1 필수 — 페이지당 건수 선택). URL 에는 싣지 않는다. */
const DEFAULT_PAGE_SIZE = 50;

/** 이 화면의 목록 이름 — 행 동작의 접근 이름과 반출 안내가 같은 이름을 쓴다. */
const LIST_LABEL = '댓글';

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

export default function CommentModerationClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const [isPending, startTransition] = useTransition();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const deleteCommentPendingRef = useRef(false);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  // [2026-10-01] 댓글 삭제 버튼은 관리자 삭제 대행 권한(COMMENT_DELETE_ALL)으로 보인다. 조회 권한만 가진 사람은 목록만 본다.
  //   표시 판정일 뿐이며 서버 인가는 그대로 집행된다(H3).
  const canDeleteComment = canPermission(user, 'COMMENT_DELETE_ALL');

  const setPage = (nextPage: number) => {
    const params = pickAllowedParams(searchParams, PAGE_PARAM_KEYS);
    if (nextPage <= 1) params.delete('page');
    else params.set('page', String(nextPage));
    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  };

  // ⚠ 백엔드 CommentApiController 는 키워드 검색을 지원하지 않는다(CommentAdminService 주석 참조) — 검색 입력을 두지 않는다.
  const { data: commentData, isLoading, error, refetch } = useQuery(commentQueryOptions.adminList({ page, size: pageSize }));
  const comments = useMemo(() => commentData?.list || [], [commentData]);
  const selectedItem = useMemo(
    () => (selectedItemId === null ? null : comments.find((comment) => comment.ansSn === selectedItemId) ?? null),
    [comments, selectedItemId],
  );

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
  const handleDeleteComment = async (comment: { ansSn?: number | null; ansCn?: string; wrterId?: string }) => {
    if (comment?.ansSn === undefined || comment?.ansSn === null || deleteCommentPendingRef.current) return;
    const ansSn = comment.ansSn;
    deleteCommentPendingRef.current = true;
    setDeletingCommentId(ansSn);
    try {
      const preview = (comment.ansCn || '').trim();
      const isConfirmed = await confirm({
        title: '댓글 삭제',
        message: `${preview ? `"${preview.length > 60 ? `${preview.slice(0, 60)}…` : preview}" ` : ''}댓글(작성자: ${comment.wrterId || '알 수 없음'})을 삭제하시겠습니까? 삭제한 댓글은 목록에 표시되지 않으며, 이 화면에서 복구할 수 없습니다.`,
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
  ];

  return (
    <WorkListPage
      title="댓글 및 평가 관리"
      description="게시글에 등록된 댓글을 조회하고 관리자 권한으로 삭제합니다. 만족도 평가는 각 게시글 화면에서 관리합니다."
      breadcrumbItems={[{ label: '시스템관리' }, { label: '댓글 및 평가 관리' }]}
      totalCount={error ? undefined : commentData?.total}
      actions={
        <DataExportExcel
          scope="page"
          data={comments as unknown as Record<string, unknown>[]}
          headers={COMMENT_EXPORT_HEADERS}
          filename="댓글목록"
        />
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
          emptyMessage="등록된 댓글이 없습니다."
          pagination={{
            currentPage: page,
            totalPages: commentData?.totalPage || 1,
            pageSize,
            onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
            onPageChange: (p) => setPage(p),
          }}
        />

        {selectedItem && (
          <section aria-label="선택 항목 상세" className="rounded-md border border-border bg-card">
            <header className="flex items-start justify-between gap-2 border-b border-border p-[var(--filter-pad)]">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">선택 항목 상세</h2>
                <p className="mt-1 text-[length:var(--font-size-body)] text-muted-foreground">식별자 {selectedItemId}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedItemId(null)}>닫기</Button>
            </header>
            <div className="p-[var(--filter-pad)]">
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded border border-border bg-muted p-3 text-xs text-foreground">
                {JSON.stringify(selectedItem, null, 2)}
              </pre>
            </div>
          </section>
        )}
      </div>
    </WorkListPage>
  );
}
