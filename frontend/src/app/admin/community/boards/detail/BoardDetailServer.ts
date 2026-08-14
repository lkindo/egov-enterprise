import { cache } from 'react';
import { cookies } from 'next/headers';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';
import { boardAdminService } from '@/services/foundation/system/BoardAdminService';
import { commentService } from '@/services/business/comment/commentService';

export const getInitialBoardDetailData = cache(async (bbsId: string, pstSn: number) => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  // 토큰이 없는 경우 빈 데이터 반환
  if (!accessToken) {
    return { article: null, masterInfo: null, initialComments: [], fetchError: null as string | null };
  }

  const axiosConfig = { headers: { Authorization: `Bearer ${accessToken}` } };

  try {
    const [article, masterInfo, commentResult] = await Promise.all([
      knowledgeService.getArticle(bbsId, pstSn),
      boardAdminService.getBoardMaster(bbsId, axiosConfig),
      commentService.getComments({ pstSn, bbsId, size: 100 }, axiosConfig)
    ]);

    return {
      article,
      masterInfo,
      initialComments: commentResult.list || [],
      fetchError: null as string | null
    };
  } catch (error: any) {
    // 401 오류는 세션 만료 → 로그인 페이지로 우아하게 리다이렉트
    if (error.response?.status === 401) {
      const { redirect } = require('next/navigation');
      redirect('/login');
    }

    // 감사 P1-1: 과거에는 404(삭제됨)와 서버/네트워크 장애를 똑같이 `article: null` 로 삼켜
    // 화면이 두 경우 모두 "게시글을 찾을 수 없습니다"로 표시했다(장애를 '없는 글'로 위장).
    // 404 만 정상적인 '없음'으로 두고, 그 외 실패는 fetchError 로 클라이언트에 전달한다.
    if (error.response?.status === 404) {
      console.warn('BoardDetailServer: Article not found (possibly deleted):', error.message || error);
      return { article: null, masterInfo: null, initialComments: [], fetchError: null as string | null };
    }

    console.error('BoardDetailServer: Failed to fetch board detail', error);
    const fetchError: string =
      error?.response?.data?.message || error?.message || '게시글을 불러오지 못했습니다.';
    return { article: null, masterInfo: null, initialComments: [], fetchError };
  }
});
