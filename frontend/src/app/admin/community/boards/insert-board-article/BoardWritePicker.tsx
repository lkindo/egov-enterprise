'use client';

import Link from 'next/link';
import { useQueries } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { canEditConfiguredBoard } from '@/lib/auth/board-edit-permissions';
import { useBoardOptions } from '@/hooks/api/use-board-options';
import { boardMasterKeys } from '@/queries/board-master-query-options';
import { boardUserService } from '@/services/business/user/board/BoardUserService';

const WRITE_ROUTE = '/admin/community/boards/insert-board-article';
/** 게시판별 메타 실패는 이 화면 안(확인하지 못한 게시판 안내)으로 드러난다 — 전역 실패 토스트를 띄우지 않는다(DEC-OPS-184). */
const QUIET = { suppressErrorToast: true } as const;

/**
 * [2026-10-26 ADR-0043 1차 UX-09] 게시판 없이 작성 화면에 들어왔을 때 글을 쓸 게시판을 고르게 한다.
 *
 * 종전 작성 화면은 게시판 식별자가 없으면 공지사항으로 정했다. 옛 주소(/admin/community/boards/write·/boards/[id])와 북마크가 식별자
 * 없이 들어오므로, 공지 편집 권한자는 모르는 채 공지사항에 글을 썼고 그 밖의 사용자는 쓸 수 없는 화면에 닿았다.
 *
 * 선택지는 서버의 사용자 선택지 API(useBoardOptions — 사용 중이고 내가 열 수 있는 게시판)에서 받고, 그 가운데 글을 쓸 수 있는
 * 게시판만 보인다. 쓰기 판정은 작성 화면과 같다 — 글쓰기 권한(BOARD_CREATE) ∧ 게시판의 추가 편집 권한(canEditConfiguredBoard,
 * 이용자 메타) ∧ 사용 중. 메타를 받지 못한 게시판은 쓸 수 있다고 추정하지 않고 빼며, 뺐다는 사실과 다시 확인할 길을 알린다.
 * 서버가 저장할 때 같은 권한을 다시 판정한다.
 */
export function BoardWritePicker() {
  const { user } = useAuth();
  const canCreate = canPermission(user, 'BOARD_CREATE');

  return (
    <div className="mx-auto max-w-[var(--page-max-w)] space-y-4 pb-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground">글을 쓸 게시판 고르기</h1>
        <p className="text-[length:var(--font-size-body)] text-muted-foreground">
          게시판을 고르면 그 게시판의 새 게시글 작성 화면으로 갑니다.
        </p>
      </div>
      {canCreate ? (
        <WritableBoardList />
      ) : (
        <p role="status" className="text-[length:var(--font-size-body)] text-muted-foreground">
          게시글을 쓸 권한이 없습니다. 필요한 권한은 관리자에게 문의해 주세요.
        </p>
      )}
    </div>
  );
}

function WritableBoardList() {
  const { user } = useAuth();
  const { options, isLoading, error, refetch } = useBoardOptions();
  const metas = useQueries({
    queries: options.map((option) => ({
      // 키는 작성·목록·상세 화면의 메타(boardMasterQueryOptions.meta)와 같다 — 고른 뒤 작성 화면이 같은 값을 다시 받지 않는다.
      queryKey: boardMasterKeys.meta(option.value),
      queryFn: () => boardUserService.getBoardMeta(option.value, QUIET),
      staleTime: 5 * 60 * 1000,
    })),
  });

  if (isLoading) {
    return <p role="status" className="text-[length:var(--font-size-body)] text-muted-foreground">게시판 목록을 불러오는 중…</p>;
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
        <AlertTriangle size={16} className="shrink-0 text-destructive-emphasis" aria-hidden="true" />
        <span className="text-[length:var(--font-size-body)]">게시판 목록을 불러오지 못했습니다.</span>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void refetch()}>
          <RefreshCcw size={14} aria-hidden="true" /> 게시판 목록 다시 불러오기
        </Button>
      </div>
    );
  }

  const writable = options.filter((option, index) => {
    const meta = metas[index]?.data;
    return Boolean(meta) && meta?.inUse !== false && canEditConfiguredBoard(user, meta);
  });
  const checking = metas.some((meta) => meta.isPending);
  const failed = metas.filter((meta) => meta.isError);

  return (
    <div className="space-y-3">
      {writable.length > 0 && (
        <ul aria-label="글을 쓸 수 있는 게시판" className="divide-y divide-border rounded-md border border-border bg-card">
          {writable.map((option) => (
            <li key={option.value}>
              <Link
                href={`${WRITE_ROUTE}?bbsId=${encodeURIComponent(option.value)}`}
                className="flex items-center justify-between gap-3 px-3 py-2 text-[length:var(--font-size-body)] font-medium text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="min-w-0 truncate">{option.label}</span>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {checking && (
        <p role="status" className="text-[length:var(--font-size-body)] text-muted-foreground">글을 쓸 수 있는 게시판을 확인하는 중…</p>
      )}
      {failed.length > 0 && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
          <span className="text-[length:var(--font-size-body)]">
            게시판 {failed.length.toLocaleString('ko-KR')}개의 쓰기 권한을 확인하지 못해 목록에서 뺐습니다.
          </span>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => failed.forEach((meta) => void meta.refetch())}>
            <RefreshCcw size={14} aria-hidden="true" /> 쓰기 권한 다시 확인
          </Button>
        </div>
      )}
      {!checking && failed.length === 0 && writable.length === 0 && (
        <p role="status" className="text-[length:var(--font-size-body)] text-muted-foreground">
          지금 글을 쓸 수 있는 게시판이 없습니다. 필요한 권한은 관리자에게 문의해 주세요.
        </p>
      )}
    </div>
  );
}
