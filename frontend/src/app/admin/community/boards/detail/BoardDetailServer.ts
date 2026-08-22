import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';
import { boardAdminService } from '@/services/foundation/system/BoardAdminService';
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

  // 게시글/댓글은 인증 사용자용 API지만 게시판 메타는 관리자 API다. 세 요청을 동시에
  // 시작하되, 관리자 메타 거부가 사용자용 게시글 상세 전체를 실패시키지 않도록 결과를
  // 독립 판정한다.
  const [articleResult, masterResult, commentResult] = await Promise.allSettled([
    knowledgeService.getArticle(bbsId, pstSn),
    boardAdminService.getBoardMaster(bbsId, axiosConfig),
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
