import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { commentService } from '@/services/business/comment/commentService';

const BOARD_DETAIL_ERROR = '게시글을 불러오지 못했습니다.';

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) return undefined;
  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
}

export const getInitialBoardDetailData = cache(async (bbsId: string, pstSn: number) => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  // 토큰이 없는 경우 빈 데이터 반환
  if (!accessToken) {
    return { article: null, masterInfo: null, initialComments: [], fetchError: null as string | null };
  }

  const axiosConfig = { headers: { Authorization: `Bearer ${accessToken}` } };

  // 세 요청을 동시에 시작하되, 게시판 메타 실패가 게시글 상세 전체를 실패시키지 않도록 결과를
  // 독립 판정한다. [2026-09-26 DIP V5] 메타는 사용자용 API 로 읽는다 — 종전 관리자 API 는
  // 일반 사용자에게 403 이라 제목·템플릿이 늘 비었다.
  const [articleResult, masterResult, commentResult] = await Promise.allSettled([
    knowledgeService.getArticle(bbsId, pstSn),
    boardUserService.getBoardMeta(bbsId, axiosConfig),
    commentService.getComments({ pstSn, bbsId, size: 100 }, axiosConfig),
  ]);

  if (articleResult.status === 'rejected') {
    const status = getHttpStatus(articleResult.reason);
    if (status === 401) redirect('/login');
    if (status === 404) {
      return { article: null, masterInfo: null, initialComments: [], fetchError: null as string | null };
    }
    return { article: null, masterInfo: null, initialComments: [], fetchError: BOARD_DETAIL_ERROR };
  }

  if (commentResult.status === 'rejected') {
    if (getHttpStatus(commentResult.reason) === 401) redirect('/login');
    return { article: null, masterInfo: null, initialComments: [], fetchError: BOARD_DETAIL_ERROR };
  }

  return {
    article: articleResult.value,
    masterInfo: masterResult.status === 'fulfilled' ? masterResult.value : null,
    initialComments: commentResult.value.list || [],
    fetchError: null as string | null,
  };
});
