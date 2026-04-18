import { cookies } from 'next/headers';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';
import { boardAdminService } from '@/services/foundation/system/BoardAdminService';

/**
 * 게시글 상세 데이터와 마스터 정보를 서버 사이드에서 가져오는 함수
 */
export async function getInitialBoardDetailData(bbsId: string, nttId: string) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  // 토큰이 없는 경우 빈 데이터 반환
  if (!accessToken) {
    return { article: null, masterInfo: null };
  }

  const axiosConfig = { headers: { Authorization: `Bearer ${accessToken}` } };

  try {
    const [article, masterInfo] = await Promise.all([
      knowledgeService.getArticle(bbsId, nttId),
      boardAdminService.getBoardMaster(bbsId, axiosConfig)
    ]);

    return { article, masterInfo };
  } catch (error) {
    console.error('BoardDetailServer: Failed to fetch board detail', error);
    return { article: null, masterInfo: null };
  }
}
