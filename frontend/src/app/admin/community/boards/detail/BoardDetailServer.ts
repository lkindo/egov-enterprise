import { cache } from 'react';
import { cookies } from 'next/headers';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';
import { boardAdminService } from '@/services/foundation/system/BoardAdminService';
import { commentService } from '@/services/business/comment/commentService';

export const getInitialBoardDetailData = cache(async (bbsId: string, pstId: string) => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  // 토큰이 없는 경우 빈 데이터 반환
  if (!accessToken) {
    return { article: null, masterInfo: null, initialComments: [] };
  }

  const axiosConfig = { headers: { Authorization: `Bearer ${accessToken}` } };

  try {
    const [article, masterInfo, commentResult] = await Promise.all([
      knowledgeService.getArticle(bbsId, pstId),
      boardAdminService.getBoardMaster(bbsId, axiosConfig),
      commentService.getComments({ pstId: Number(pstId), bbsId, size: 100 }, axiosConfig)
    ]);

    return { 
      article, 
      masterInfo, 
      initialComments: commentResult.list || [] 
    };
  } catch (error: any) {
    // 401 오류는 세션 만료 → 로그인 페이지로 우아하게 리다이렉트
    if (error.response?.status === 401) {
      const { redirect } = require('next/navigation');
      redirect('/login');
    }
    console.error('BoardDetailServer: Failed to fetch board detail', error);
    return { article: null, masterInfo: null, initialComments: [] };
  }
});
