'use client';

import React, { use, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Trash2,
  Download,
  Calendar, Eye, User,
  FileText, Quote, AlertTriangle,
  Package, ThumbsUp, CircleCheck, Tag
} from 'lucide-react';
import { BoardRichTextContent } from '@/components/ui/BoardRichTextContent';
import { cn } from '@/lib/utils';
import { RICH_TEXT_TABLE_CLASSES } from '@/lib/rich-text-styles';
import { canPermission } from '@/lib/auth/permissions';
import { canEditConfiguredBoard } from '@/lib/auth/board-edit-permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useAuth } from '@/contexts/AuthContext';
import { knowledgeService, KnowledgeDto } from '@/services/business/knowledge/knowledgeService';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { fileService } from '@/services/foundation/file/FileService';
import { deleteBoardArticle } from '@/app/actions/boardActions';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import type { BoardMeta } from '@/services/business/user/board/BoardUserService';
import { boardMasterQueryOptions } from '@/queries/board-master-query-options';
import { postActions } from '@/extensions/generated-post-actions';
import { visibleEntries, type PostAction } from '@/extensions/slots';
import CommentSection from '@/components/features/comment/CommentSection';
import SatisfactionSection from '@/components/features/satisfaction/SatisfactionSection';

import { CommentVO } from '@/types/business/comment';
import { useReturnToList } from '@/lib/navigation/use-return-to-list';
import { matchesRoute, previousRoute } from '@/lib/navigation/previous-route';
import { qnaCategoryLabel, qnaStatusLabel } from '@/lib/board/qna-status';
import { boardMasterKeys } from '@/queries/board-master-query-options';
import { commentKeys } from '@/queries/comment-query-options';
import { PinnedBadge, PostingStatusBadge } from '../components/PostingStatusBadge';

/**
 * 게시글 상세로 들어오는 목록 화면들. 여기서 왔으면 뒤로 가서 목록의 조건·스크롤을 살린다.
 * [2026-10-26 ADR-0043 1차 OPS-01·OPS-06] 운영 화면 게시물 탭(`/admin/community/boards/master/{bbsId}?tab=posts`)과 댓글 관리
 * (`/admin/system/comments`)도 이 상세를 연다 — 거기서 왔으면 그 화면으로 돌아간다. 운영 탭은 조건·쪽을 세션 목록 상태로, 댓글 관리는
 * 주소(page·bbsId·pstSn)로 되살린다.
 */
const BOARD_LIST_ORIGINS = [
  '/admin/community/boards/select-board-list',
  '/admin/help',
  '/cop/cmy/selectCommunityDetail/*',
  '/search',
  '/admin/community/board',
  '/admin/community/boards/master/*',
  '/admin/system/comments',
  // [2026-10-26 ADR-0043 1차 UX-04] 도움말 센터의 1:1 문의 내역도 이 상세를 연다 — 탭·쪽·검색어는 세션 목록 상태로 되살린다.
  '/help',
] as const;

/**
 * 글을 지운 뒤 돌아갈 수 있는 목록(BOARD_LIST_ORIGINS)의 캐시 — 이용 목록·운영 게시물 탭·지식 허브(목록·인기 문서·통계)·게시글
 * 모아보기·댓글 관리. 뒤로 가기는 남은 캐시로 그리므로 함께 무효화하지 않으면 지운 글이 다시 보인다. 통합 검색과 도움말 센터는 캐시가
 * 아니라 화면이 다시 조회한다. 지운 글의 상세는 다시 읽지 않는다(404).
 */
function invalidateDeletedPostLists(queryClient: QueryClient, bbsId: string | null) {
  const keys: QueryKey[] = [['boardList', bbsId], ['knowledge-articles'], ['hot-articles'], ['knowledge-stats'], commentKeys.adminLists()];
  if (bbsId) keys.push(boardMasterKeys.operationPostsAll(bbsId), ['community-board', bbsId]);
  for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
}

interface BoardDetailClientProps {
  dataPromise: Promise<{
    article: KnowledgeDto | null;
    masterInfo: BoardMeta | null;
    initialComments: CommentVO[];
    /** 서버가 센 전체 댓글 수(상세는 첫 100개만 받는다). */
    commentTotal?: number;
    /** 감사 P1-1: 서버 조회 실패 사유. null 이면 정상(또는 404 = 실제로 없는 글). */
    fetchError: string | null;
    /** 서버가 권한으로 막았다(403). 재시도를 권하지 않는다(DIP V9). */
    forbidden?: boolean;
  }>;
}

/** 표시 판정: 자기 글은 기능권한과 esntlId 소유자가 모두 필요하고, 전체 관리 권한은 별도다.
 * 서버가 매 요청의 현재 권한과 게시글 소유권을 최종 판정한다. */

export function canManageBoardArticle(
  user: { id: string; esntlId?: string; role?: string; permissions?: readonly string[]; authorizationVersion?: string } | null | undefined,
  authorId: string | undefined,
  action: 'UPDATE' | 'DELETE' = 'UPDATE',
): boolean {
  if (!user || !canPermission(user, `BOARD_${action}`)) return false;
  return canPermission(user, `BOARD_${action}_ALL`) || Boolean(authorId && user.esntlId && user.esntlId === authorId);
}


export function BoardDetailClient({ dataPromise }: BoardDetailClientProps) {
  const initialData = use(dataPromise);
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const bbsId = searchParams.get('bbsId');
  // [2026-10-01] '목록으로' — 게시판 목록·지식 허브·커뮤니티·통합 검색에서 왔으면 뒤로 가 조건을 살리고,
  //   딥링크·새 탭이면 이 글의 게시판 목록으로 간다. 방문 기록 밖으로 나가는 router.back() 을 직접 부르지 않는다.
  const listFallback = bbsId ? `/admin/community/boards/select-board-list?bbsId=${encodeURIComponent(bbsId)}` : '/admin/help';
  const returnToList = useReturnToList({ fallback: listFallback, origins: BOARD_LIST_ORIGINS });
  /*
    [2026-10-26 ADR-0043 1차 OPS-01·UX-16] 삭제한 뒤의 복귀 — '목록으로' 와 같은 판정이다. 목록(운영 게시물 탭 포함)에서 왔으면 뒤로 가
    그 목록의 조건·쪽을 살린다. 아니면 이 글의 게시판 목록으로 가되, 지운 글의 상세를 방문 기록에 남기지 않게 바꿔 끼운다(replace) —
    종전에는 늘 조건 없는 이용자 목록으로 push 해서 운영 화면에서 지운 운영자가 작업 맥락을 잃었다.
  */
  const leaveAfterDelete = () => {
    const previous = previousRoute();
    if (previous && BOARD_LIST_ORIGINS.some((origin) => matchesRoute(previous, origin))) {
      router.back();
      return;
    }
    // 목적지를 글자로 적는다 — URL 상태 census 가 목적지와 그 키(bbsId)를 읽는다(종전 push 와 같은 목적지).
    if (bbsId) router.replace(`/admin/community/boards/select-board-list?bbsId=${encodeURIComponent(bbsId)}`);
    else router.replace('/admin/help');
  };
  // [PD-UX-002 Q4] 서버와 같은 키 공간을 읽는다.
  //   page.tsx 는 `params.pstSn || params.nttId` 로 **두 키를 다 받는데** 여기는 pstSn 만 읽었다.
  //   그래서 `?nttId=` 로 들어오면 서버는 글을 제대로 렌더하지만 클라이언트는 pstSn=0 으로 동작했다 —
  //   화면이 "게시글 번호: 0" 을 표시하고, 수정 버튼이 0번 글로 이동하며, 댓글·만족도 섹션에도 0 이
  //   전달됐다. 추천만 hasValidPstSn 가드에 막혀 조용히 아무 일도 하지 않았다.
  //   nttId 는 레거시 별칭이다(백엔드 파라미터에는 존재하지 않고, knowledgeService 가 응답에서
  //   이미 pstSn 으로 정규화한다). 새 링크는 pstSn 을 쓰되 기존 링크·북마크는 계속 받는다.
  const rawPstSn = searchParams.get('pstSn') ?? searchParams.get('nttId');
  const pstSn = Number(rawPstSn);
  const hasValidPstSn = Number.isSafeInteger(pstSn) && pstSn > 0;
  const queryClient = useQueryClient();

  // React Query for revalidation/stale handling, seeded with initialData
  const { data: masterInfo } = useQuery({
    ...boardMasterQueryOptions.meta(bbsId ?? ''),
    initialData: initialData.masterInfo ?? undefined,
    enabled: Boolean(initialData.masterInfo && bbsId),
  });

  const { data: article } = useQuery({
    queryKey: ['article-detail', bbsId, pstSn],
    queryFn: () => knowledgeService.getArticle(bbsId!, pstSn),
    initialData: initialData.article,
    enabled: !!initialData.article && hasValidPstSn,
  });
  const canEditBoard = canEditConfiguredBoard(user, masterInfo);
  // [2026-10-23 ADR-0040 결정 1] 사용 안 함 게시판의 글은 조회 대행 권한자만 연다. 서버가 추천·댓글·새 평가를 모두 거부하므로
  //   그 입력을 감추고 사유를 보인다. 메타를 모르면(조회 전·실패) 열린 것으로 두고 판정은 서버가 한다.
  const boardInUse = masterInfo?.inUse !== false;
  const canUpdateArticle = canEditBoard && canManageBoardArticle(user, article?.userId, 'UPDATE');
  const canDeleteArticle = canEditBoard && canManageBoardArticle(user, article?.userId, 'DELETE');

  // 감사 P1-5/P1-6: 첨부 영역은 과거 "Technical_Spec_Unit_XXXX.pdf · 3.4 MB" 라는 존재하지 않는 파일을
  // 하드코딩해 보여주고, 다운로드 아이콘에는 핸들러조차 없었다. 이미 있는 fileService 로 실제 목록을 배선한다.
  const atchFileSn = article?.atchFileSn;
  const {
    data: attachments = [],
    isError: isAttachmentError,
    refetch: refetchAttachments,
  } = useQuery({
    queryKey: ['article-files', atchFileSn],
    queryFn: () => fileService.getFileList(atchFileSn!),
    enabled: !!atchFileSn,
  });

  const tmpltId = masterInfo?.tmpltId || 'TMPLT_LIST';

  /*
    [스크랩 슬롯] 부가 동작(스크랩 등)은 다른 기능이 post-actions 슬롯에 기여한다. 이 화면은 레지스트리만 읽고, 잠금·토스트·
    완료 표시를 소유한다 — 기여는 쓰기 함수(submit) 하나만 준다. 그래서 부가 동작도 추천·삭제·해결 표시와 같은 잠금을 쓴다.
    기여한 기능이 빠진 구성에서는 레지스트리가 빈 배열이라 버튼이 없다. 주체는 위 useAuth 의 사용자다(머리글과 같다).
  */
  const contributedActions = React.useMemo(() => visibleEntries(user, postActions), [user]);

  // React state 반영 전 같은 tick의 추천/삭제/해결 표시/부가 동작 재진입까지 막기 위해 ref를 먼저 선점한다.
  const actionPendingRef = React.useRef(false);
  const [activeAction, setActiveAction] = useState<'like' | 'delete' | 'solve' | `post:${string}` | null>(null);

  /*
    [2026-09-25 DIP I3] Q&A 해결 표시. 해결 상태 컬럼과 목록의 배지는 있었지만 SOLVED 로 바꾸는 경로가 없어
    답을 받은 질문도 계속 '접수' 로 남았다. 작성자·전체 수정 권한자에게만 보이며 서버가 다시 판정한다.
  */
  const canMarkSolved = tmpltId === 'TMPLT_QNA' && article?.qnaSttsCd !== 'SOLVED' && canUpdateArticle;
  const handleMarkSolved = async () => {
    if (actionPendingRef.current || !bbsId || !hasValidPstSn) return;
    actionPendingRef.current = true;
    setActiveAction('solve');
    try {
      await boardUserService.markQuestionSolved(bbsId, pstSn);
      await queryClient.invalidateQueries({ queryKey: ['article-detail', bbsId, pstSn] });
      toast('질문을 해결됨으로 표시했습니다.', 'success');
    } catch (solveError) {
      toast(extractErrorMessage(solveError, '해결 표시 중 오류가 발생했습니다.'), 'error');
    } finally {
      actionPendingRef.current = false;
      setActiveAction(null);
    }
  };
  /*
    [2026-10-01] 이미 추천한 글(서버 판정 recommended)을 알아 409 를 미리 막는다.
    [2026-10-23 ADR-0040 결정 6] 추천은 토글이다 — 내가 추천한 글에서 다시 누르면 추천을 거둔다(cancelLikePost). 이름은 '게시글 추천'
    으로 두고 상태는 aria-pressed 로 전한다. 단추는 추천 권한(BOARD_LIKE)이 있을 때만 보인다(DEC-OPS-185). 게시판이 추천을 받지
    않으면(rcmdtnUseYn 'N') 새 추천 단추 대신 수만 보이고, 이미 내가 추천한 글에는 거두는 단추를 남긴다 — 서버가 새 추천만 막고
    취소는 받는다. 메타를 모르면 받는 쪽으로 두고 판정은 서버가 한다.
    낙관 값은 그 값을 만든 글 응답에만 붙는다 — 글을 다시 읽으면(새 응답) 서버 값이 이긴다. 성공하면 서버가 돌려준 수를 쓰고,
    실패하면 되돌린 뒤 글을 다시 읽는다(이미 추천함 409 처럼 서버 상태가 화면과 달랐을 수 있다).
  */
  const canLike = canPermission(user, 'BOARD_LIKE');
  const acceptsLikes = masterInfo?.rcmdtnUseYn !== 'N';
  const [likeOverride, setLikeOverride] = useState<{ base: KnowledgeDto | null | undefined; liked: boolean; count: number } | null>(null);
  const like = likeOverride && likeOverride.base === article
    ? likeOverride
    : { liked: article?.recommended === true, count: article?.likeCnt ?? 0 };
  const recommended = like.liked;
  const showLikeToggle = boardInUse && canLike && (acceptsLikes || recommended);
  const handleLike = async () => {
    if (actionPendingRef.current || !bbsId || !hasValidPstSn || !article) return;
    const cancelling = recommended;
    if (!cancelling && !acceptsLikes) return;
    const before = { liked: like.liked, count: like.count };
    actionPendingRef.current = true;
    setActiveAction('like');
    setLikeOverride({ base: article, liked: !cancelling, count: Math.max(0, before.count + (cancelling ? -1 : 1)) });
    try {
      const count = cancelling
        ? await boardUserService.cancelLikePost(bbsId, pstSn)
        : await boardUserService.likePost(bbsId, pstSn);
      if (typeof count === 'number') setLikeOverride({ base: article, liked: !cancelling, count });
    } catch (likeError) {
      setLikeOverride({ base: article, ...before });
      // 이미 추천했거나(409) 읽을 수 없는 글이면(403·404) 서버가 사유를 말한다(DIP I6 ④).
      toast(extractErrorMessage(likeError, cancelling ? '추천 취소 중 오류가 발생했습니다.' : '추천 처리 중 오류가 발생했습니다.'), 'error');
      void queryClient.invalidateQueries({ queryKey: ['article-detail', bbsId, pstSn] });
    } finally {
      actionPendingRef.current = false;
      setActiveAction(null);
    }
  };

  // 이번 방문에서 완료한 부가 동작. oncePerVisit 동작(스크랩)은 저장에 성공하면 같은 화면에서 다시 누르지 못하게 잠근다 —
  // 같은 주소의 두 번째 스크랩은 서버가 409 로 거부하므로(1인 1주소, V2_136) 그 요청을 보내지 않으려는 것이다. 새로고침하면
  // 잠금이 풀리고, 다시 누르면 서버 사유가 토스트로 보인다.
  const [completedActions, setCompletedActions] = useState<ReadonlySet<string>>(() => new Set());

  const handlePostAction = async (action: PostAction) => {
    if (actionPendingRef.current || completedActions.has(action.id) || !bbsId || !hasValidPstSn || !article) return;
    actionPendingRef.current = true;
    setActiveAction(`post:${action.id}`);
    try {
      await action.submit({
        bbsId,
        pstSn,
        title: article.pstTtl ?? '',
        boardTitle: masterInfo?.bbsTtl ?? '',
        canonicalPath: `/admin/community/boards/detail?bbsId=${bbsId}&pstSn=${pstSn}`,
        queryClient,
      });
      if (action.oncePerVisit) setCompletedActions((previous) => new Set(previous).add(action.id));
      toast(action.successMessage, 'success');
    } catch (error) {
      toast(extractErrorMessage(error, action.failureMessage), 'error');
    } finally {
      actionPendingRef.current = false;
      setActiveAction(null);
    }
  };

  const handleDelete = async () => {
    if (actionPendingRef.current) return;
    actionPendingRef.current = true;
    setActiveAction('delete');
    try {
      const isConfirmed = await confirm({
        title: '게시글 삭제',
        message: `[${article?.pstTtl || '제목 없음'}] 게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
        confirmText: '삭제',
        variant: 'destructive'
      });
      if (!isConfirmed) return;

      const formData = new FormData();
      formData.append('bbsId', bbsId ?? '');
      formData.append('pstSn', String(pstSn));

      const res = await deleteBoardArticle(null, formData);
      if (res.success) {
        toast('게시글이 삭제되었습니다.', 'success');
        // 돌아갈 목록이 지운 글을 다시 그리지 않게 한다 — 뒤로 가는 출처 목록 모두다.
        invalidateDeletedPostLists(queryClient, bbsId);
        leaveAfterDelete();
      } else {
        /*
          [2026-10-26 ADR-0043 1차 UX-16] 실패 사유를 상태별로 말한다 — 권한이 없어진 것(403)과 글이 이미 없는 것(404)은 할 일이 다르다.
          서버 액션이 상태를 싣지 않으면(종전 응답) 액션의 문장을 그대로 쓴다. 어느 쪽이든 글과 화면은 그대로다.
        */
        const status = 'status' in res && typeof res.status === 'number' ? res.status : undefined;
        if (status === 403) {
          toast('이 게시글을 삭제할 권한이 없습니다. 권한이 바뀌었을 수 있습니다. 게시글은 그대로입니다.', 'error');
        } else if (status === 404) {
          if (bbsId) void queryClient.invalidateQueries({ queryKey: ['boardList', bbsId] });
          toast('이미 삭제됐거나 찾을 수 없는 게시글입니다. 목록으로 돌아가 확인하세요.', 'error');
        } else {
          toast(res.message || '게시글을 삭제하지 못했습니다. 잠시 후 다시 시도하세요.', 'error');
        }
      }
    } catch {
      toast('게시글 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      actionPendingRef.current = false;
      setActiveAction(null);
    }
  };

  // 권한으로 막힌 글은 장애가 아니다 — '다시 시도' 대신 이유와 돌아갈 길만 준다(DIP V9).
  if (!article && initialData.forbidden) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center min-h-[600px] space-y-6 text-center px-6">
        <AlertTriangle size={48} className="text-muted-foreground" aria-hidden="true" />
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">볼 수 없는 게시글입니다</h1>
          <p className="text-sm font-medium text-muted-foreground max-w-md">{initialData.fetchError}</p>
        </div>
        <Button variant="outline" onClick={returnToList}>목록으로</Button>
      </div>
    );
  }

  // 감사 P1-1: 조회 장애(fetchError)와 '실제로 없는 글'(404)을 구분해 표시한다.
  if (!article && initialData.fetchError) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center min-h-[600px] space-y-6 text-center px-6">
        <AlertTriangle size={48} className="text-destructive-emphasis" aria-hidden="true" />
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">게시글을 불러오지 못했습니다</h1>
          <p className="text-sm font-medium text-muted-foreground max-w-md">{initialData.fetchError}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.refresh()}>다시 시도</Button>
          <Button variant="outline" onClick={returnToList}>목록으로</Button>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
        <h1 className="text-[length:var(--font-size-body)] font-semibold text-foreground">게시글을 찾을 수 없습니다. 삭제되었거나 주소가 올바르지 않습니다.</h1>
        <Button onClick={returnToList}>목록으로</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[var(--page-max-w)] space-y-4 pb-6">
      {/* --- Action Header --- */}
      <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={returnToList}
            className="h-auto gap-1.5 px-0 text-muted-foreground hover:bg-transparent hover:text-primary"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="text-[length:var(--font-size-body)]">목록으로</span>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-xs font-medium text-primary">
              {masterInfo?.bbsTtl || '게시판'}
            </Badge>
            <span className="text-xs tabular-nums text-muted-foreground">게시글 번호: {pstSn}</span>
          </div>
          <h1 className="text-xl font-bold leading-snug tracking-tight text-foreground">
            {article.pstTtl}
          </h1>
          {/*
            [결정 23·2026-10-23 ADR-0040 결정 3] 게시 종료일이 지났거나 시작일 전인 글 — 작성자·조회 대행 권한자에게만 온다. 상태는 서버
            판정(postingStatus)을 그대로 쓴다(DEC-OPS-140). 제목(h1)의 이름은 바꾸지 않는다. [결정 5] 상단 고정도 서버 판정(pinned)만 그린다.
          */}
          <PinnedBadge pinned={article.pinned} endYmd={article.upendFixEndYmd} />
          <PostingStatusBadge status={article.postingStatus} startYmd={article.pstBgngYmd} />
          {!boardInUse && (
            <p role="note" className="text-[length:var(--font-size-body)] text-muted-foreground">
              사용 안 함 게시판입니다. 이용자에게 닫혀 있고, 운영자는 글을 정리할 수 있습니다.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canMarkSolved && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkSolved}
              disabled={activeAction !== null}
              aria-busy={activeAction === 'solve'}
              className="gap-1.5"
            >
              {activeAction === 'solve' ? '표시하는 중…' : '해결됨으로 표시'}
            </Button>
          )}
          {canUpdateArticle && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/admin/community/boards/insert-board-article?bbsId=${bbsId}&pstSn=${pstSn}`)}
              className="gap-1.5"
              aria-label="게시글 수정"
            >
              <Edit3 size={16} className="text-primary" aria-hidden="true" /> 수정
            </Button>
          )}
          {/*
            [2026-08-28] '답글' 버튼 제거.

            이 버튼은 등록 화면으로 parnts·replyYn 을 실어 보냈고, 등록 화면은 그 두 값을
            그대로 요청 본문에 넣었다. 그런데 BoardSaveRequest 에는 두 필드가 없고
            application.yml 이 fail-on-unknown-properties: true 라 **요청이 항상 400** 이었다.
            사용자는 제목·본문을 다 쓰고 '등록' 을 눌러도 재시도 안내만 받았고, 몇 번을 눌러도
            성공하지 않았다.

            엔드포인트를 여는 대신 어포던스를 걷은 이유: BoardService.replyPost 는 실재하지만
            **화면에 답글 계층 표현이 전혀 없다** — 목록·상세 어디도 upPstSn·ansLv 를 읽지
            않는다(전수 grep 0건). 지금 엔드포인트만 열면 답글이 일반 글과 구분되지 않는
            반쪽 기능이 된다. 서버 구현은 남겨 둔다(요청 밖 삭제 금지) — 계층 표현과 함께
            설계할 때 되살릴 자산이다.
          */}
          {showLikeToggle ? (
            <Button
              variant={recommended ? 'default' : 'outline'}
              onClick={handleLike}
              disabled={activeAction !== null}
              aria-busy={activeAction === 'like' || undefined}
              aria-pressed={recommended}
              aria-label="게시글 추천"
              aria-describedby={recommended ? 'board-detail-like-hint' : undefined}
              size="sm"
              className="gap-1.5"
            >
              <ThumbsUp size={16} className={recommended ? undefined : 'text-primary'} aria-hidden="true" /> 추천 <span className="tabular-nums">{like.count.toLocaleString()}</span>
            </Button>
          ) : (
            // 추천 단추가 없을 때(권한 없음·사용 안 함 게시판·추천을 받지 않는 게시판)도 쌓인 추천 수는 그대로 보인다.
            <span className="inline-flex items-center gap-1.5 text-[length:var(--font-size-body)] text-muted-foreground">
              <ThumbsUp size={16} aria-hidden="true" /> 추천 <span className="tabular-nums">{like.count.toLocaleString()}</span>
            </span>
          )}
          {showLikeToggle && recommended && (
            <span id="board-detail-like-hint" className="text-xs text-muted-foreground">
              {acceptsLikes ? '추천한 글입니다. 다시 누르면 추천을 거둡니다.' : '이 게시판은 새 추천을 받지 않습니다. 내 추천은 거둘 수 있습니다.'}
            </span>
          )}
          {contributedActions.map((action) => {
            const busy = activeAction === `post:${action.id}`;
            const done = completedActions.has(action.id);
            const ActionIcon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                onClick={() => { void handlePostAction(action); }}
                disabled={activeAction !== null || done}
                aria-busy={busy || undefined}
                aria-label={busy ? action.busyName : done ? action.doneName : action.name}
                size="sm"
                className="gap-1.5"
              >
                <ActionIcon size={16} className="text-primary" aria-hidden="true" /> {done ? action.doneLabel : action.label}
              </Button>
            );
          })}
          {/*
            감사 P1-9: native confirm() → useConfirm(변형 destructive).
            본문에 대상 게시글 제목을 노출하고, 실패(res.success === false)도 삼키지 않고 토스트로 드러낸다.
          */}
          {/*
            [2026-07-27 결함 수정] 종전에는 `<form action={async (fd) => { await confirm(...) ... }}>` 였고,
            그 구조에서는 **삭제가 전혀 동작하지 않았다.** React 19 의 form action 은 transition 으로
            실행되는데, `confirm()` 이 일으키는 모달 open state 갱신이 그 transition 에 묶인다. 액션은
            모달의 응답을 기다리고, 모달의 렌더는 액션이 끝나야 커밋되므로 서로를 막는 **교착**이 된다.
            실측(프로덕션 빌드): 클릭 시 액션 진입 로그는 찍히는데 dialog 는 0개, 재클릭·requestSubmit
            모두 동일. 콘솔 오류도 없어 "눌러도 아무 일이 없는" 증상으로만 드러났다.
            → 확인을 transition 밖(onClick)에서 먼저 받고, 확정된 뒤에 서버 액션을 호출한다.
              폼이 없어졌으므로 FormData 는 직접 구성한다(종전 hidden input 과 동일한 키).
          */}
          {canDeleteArticle && (
            <Button
              type="button"
              variant="outline"
              disabled={activeAction !== null}
              onClick={() => { void handleDelete(); }}
              aria-busy={activeAction === 'delete' || undefined}
              size="sm"
              className="gap-1.5 border-destructive/40 text-destructive-emphasis hover:bg-destructive/10"
              aria-label={activeAction === 'delete' ? '게시글 삭제 중' : '게시글 삭제'}
            >
              {/* 아이콘만 있는 파괴적 버튼은 무엇이 지워지는지 말하지 않는다 — 라벨을 함께 둔다. */}
              <Trash2 size={16} aria-hidden="true" /> 삭제
            </Button>
          )}
        </div>
      </div>

      {/* --- Meta Info Bar --- */}
      {/* 감사 P1-5: 'Integrity: Verified Node' 는 어떤 검증도 수행하지 않는 고정 문구라 카드 자체를 삭제하고,
          실제 응답 필드로 계산 가능한 3개만 남긴다. */}
      {/* [2026-10-26 ADR-0043 1차 UX-16] 등록일은 'yyyy-MM-dd HH:mm' 이다(DEC-OPS-100 — 초는 뜻이 없다). 전송 원문('T')을 보이지 않는다. */}
      <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-border bg-card px-3 py-2">
        <MetaItem icon={<User size={14} />} label="작성자" value={article.userNm || '-'} />
        <MetaItem icon={<Calendar size={14} />} label="등록일" value={formatPostedAt(article.crtDt)} />
        <MetaItem icon={<Eye size={14} />} label="조회수" value={`${(article.inqCnt || 0).toLocaleString()}회`} />
        {/*
          [ADR-0043 1차 OPS-02·UX-05·UX-16] Q&A 의 해결 상태와 분류. 상태 이름은 정본 표(qna-status.ts)의 '미해결 / 해결됨' 이다. 분류
          체계(C1)를 정하기 전이라 'CAT01' 같은 코드는 보이지 않고 '일반' 이라 부른다 — 목록과 상세가 같은 이름을 쓴다.
        */}
        {tmpltId === 'TMPLT_QNA' && (
          <>
            <MetaItem icon={<CircleCheck size={14} />} label="해결 상태" value={qnaStatusLabel(article.qnaSttsCd)} />
            <MetaItem icon={<Tag size={14} />} label="분류" value={qnaCategoryLabel(article.qnaCatCd)} />
          </>
        )}
      </dl>

      {/* --- CONTENT AREA --- */}
      <section aria-label="본문" className="rounded-md border border-border bg-card p-4 md:p-6">
        <h2 className="mb-3 flex items-center gap-2 border-b border-border pb-2 text-[length:var(--font-size-body)] font-semibold text-muted-foreground">
          <Quote size={14} className="text-primary" aria-hidden="true" />
          {tmpltId === 'TMPLT_QNA' ? '질문' : '본문'}
        </h2>

        <BoardRichTextContent
          className={cn(
            "prose dark:prose-invert max-w-none text-foreground",
            "leading-relaxed",
            "prose-headings:font-semibold prose-headings:text-foreground",
            "prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:not-italic prose-blockquote:text-foreground",
            "prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-pre:bg-surface-inverse prose-pre:rounded-md",
            RICH_TEXT_TABLE_CLASSES
          )}
          html={article.pstCn || ''}
          atchFileSn={atchFileSn}
          attachments={attachments}
        />
      </section>

      {/* --- 첨부파일 --- */}
      {atchFileSn && (
        <section aria-label="첨부파일" className="rounded-md border border-border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 border-b border-border pb-2 text-[length:var(--font-size-body)] font-semibold text-foreground">
            <Package size={14} className="text-primary" aria-hidden="true" />
            첨부파일 {attachments.length > 0 ? `${attachments.length}건` : ''}
          </h2>

          {isAttachmentError ? (
            <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
              <span className="text-[length:var(--font-size-body)] text-foreground">첨부파일 목록을 불러오지 못했습니다.</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void refetchAttachments()}>
                다시 시도
              </Button>
            </div>
          ) : attachments.length === 0 ? (
            <p className="text-[length:var(--font-size-body)] text-muted-foreground">등록된 첨부파일이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-border">
              {attachments.map((file) => (
                <li key={`${file.atchFileSn}-${file.fileSn}`}>
                  <button
                    type="button"
                    onClick={() => {
                      // 인증 axios 로 바이트를 받으므로 실패할 수 있다. 조용히 삼키면
                      // 사용자는 아무 일도 일어나지 않은 것으로 오해한다.
                      fileService
                        .downloadFile(file.atchFileSn, file.fileSn, file.orignlFileNm)
                        .catch(() => toast('첨부파일을 내려받지 못했습니다.', 'error'));
                    }}
                    aria-label={`${file.orignlFileNm} 다운로드`}
                    className="flex w-full items-center justify-between gap-3 px-1 py-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText size={16} className="shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-[length:var(--font-size-body)] text-foreground">{file.orignlFileNm}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatFileSize(file.fileMg)}{file.fileExtsn ? ` · ${file.fileExtsn.toUpperCase()}` : ''}
                        </span>
                      </span>
                    </span>
                    <Download size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* --- Comments Section --- */}
      <div>
        <CommentSection
          bbsId={bbsId!}
          pstSn={pstSn}
          initialComments={initialData.initialComments}
          totalComments={initialData.commentTotal}
          // [2026-09-27 DIP B5 F9] 게시판 설정을 모르면(조회 전·실패) 입력을 보이고 판정은 서버가 한다.
          acceptsNewComments={masterInfo?.ansYn !== 'N'}
          boardInUse={boardInUse}
        />

        {/* D-8 만족도 — 백엔드는 #302 에서 배선됐고 이 위젯이 그 짝을 맞춘다. 사용 안 함 게시판은 새 평가를 받지 않는다. */}
        <SatisfactionSection bbsId={bbsId!} pstSn={pstSn} acceptsNewRatings={boardInUse && masterInfo?.stsfdgYn !== 'N'} />
      </div>
    </div>
  );
}

/**
 * [2026-10-26 ADR-0043 1차 UX-16] 서버 일시 → 'yyyy-MM-dd HH:mm'. 게시글 일시는 서버가 Asia/Seoul 로 시간대 표기 없이 준다 — Date 로
 * 바꾸면 브라우저 시간대로 옮겨질 수 있어 문자열로만 자른다. 날짜만 오면 날짜만, 해석할 수 없으면 '-' 다(없는 시각을 지어내지 않는다).
 */
export function formatPostedAt(value?: string | null): string {
  const text = value?.trim() ?? '';
  const dateTime = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(text);
  if (dateTime) return `${dateTime[1]} ${dateTime[2]}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '-';
}

/** 바이트 단위 파일 크기를 사람이 읽는 표기로 변환한다. */
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '크기 정보 없음';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground" aria-hidden="true">{icon}</span>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-[length:var(--font-size-body)] font-medium text-foreground">{value}</dd>
    </div>
  );
}
