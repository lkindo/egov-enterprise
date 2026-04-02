import { cookies } from 'next/headers';
import client from '../../../../../lib/api/client';

/**
 * 게시글 목록 데이터를 서버 사이드에서 가져오는 함수
 */
export async function getInitialBoardData(params: {
  bbsId: string;
  page: number;
  searchWrd: string;
  searchCnd: string;
  orderBy: string;
  startDate?: string;
  endDate?: string;
}) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  // 토큰이 없는 경우 API를 호출하지 않고 빈 데이터 반환 (401 에러 방지)
  if (!accessToken) {
    return { resultList: [], totalCount: 0, totalPages: 0 };
  }

  const axiosConfig = { headers: { Authorization: `Bearer ${accessToken}` } };

  try {
    // 백엔드 BoardController 매핑에 맞춰 경로 변경 /api/v1/boards/{bbsId}
    const { bbsId, page, ...restParams } = params;
    const queryParams = {
      page: page - 1, // Spring Data Pageable은 0부터 시작
      size: 10,
      ...restParams
    };

    const [listResponse, masterResponse]: any = await Promise.all([
      client.get(`/boards/${bbsId}`, { ...axiosConfig, params: queryParams }),
      client.get(`/admin/system/board-masters/${bbsId}`, axiosConfig)
    ]);

    // Spring Data Page 객체 구조에 맞춰 데이터 추출 (content, totalElements, totalPages)
    return {
      resultList: listResponse.content || [],
      totalCount: listResponse.totalElements || 0,
      totalPages: listResponse.totalPages || 0,
      masterInfo: masterResponse || null
    };
  } catch (error: any) {
    // 401 오류는 인증이 필요한 상태이므로 호출자에서 redirect 시킬 수 있도록 다시 던짐
    if (error.response?.status === 401) {
      throw error;
    }
    console.error('BoardListServer: Failed to fetch board list', error);
    return { resultList: [], totalCount: 0, totalPages: 0 };
  }
}
