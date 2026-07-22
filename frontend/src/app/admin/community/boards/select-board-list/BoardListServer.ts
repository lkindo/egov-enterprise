import { cookies } from 'next/headers';
import client from '../../../../../lib/api/client';

/**
 * 게시글 목록 데이터를 서버 사이드에서 가져오는 함수
 */
export const getInitialBoardData = async (params: {
  bbsId: string;
  page: number;
  searchWrd: string;
  searchCnd: string;
  orderBy: string;
  startDate?: string;
  endDate?: string;
}) => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;

  // 토큰이 없는 경우 API를 호출하지 않고 빈 데이터 반환 (401 에러 방지)
  if (!accessToken) {
    return { list: [], total: 0, totalPage: 0, masterInfo: null, fetchError: null as string | null };
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

    // 감사 P1-1: 목록 조회 실패를 `{ list: [] }` 로 바꿔 삼키면 화면이 "게시글 0건"이라고 거짓말한다.
    // 목록은 실패를 삼키지 않고(= 아래 catch 로 전파) fetchError 로 표면화하며,
    // 게시판 마스터(제목·템플릿) 조회는 목록 표시를 막을 이유가 없어 부가 정보로만 취급한다.
    const [listResponse, masterResponse]: any = await Promise.all([
      client.get(`/boards/${bbsId}`, { ...axiosConfig, params: queryParams }),
      client.get(`/admin/system/board-masters/${bbsId}`, axiosConfig).catch((err: any) => {
        console.warn('BoardListServer: Failed to fetch board master info', err);
        return null;
      })
    ]);

    // PageResponse 구조에 맞춰 데이터 추출 (list, total, totalPage)
    return {
      list: listResponse.list || [],
      total: listResponse.total || 0,
      totalPage: listResponse.totalPage || 0,
      masterInfo: masterResponse || null,
      fetchError: null as string | null
    };
  } catch (error: any) {
    // 401 오류는 인증이 필요한 상태이므로 시스템 에러 대신 로그인 페이지로 리다이렉트
    if (error.response?.status === 401) {
      const { redirect } = require('next/navigation');
      redirect('/login');
    }
    console.error('BoardListServer: Failed to fetch board list', error);
    const fetchError: string =
      error?.response?.data?.message || error?.message || '게시글 목록을 불러오지 못했습니다.';
    return { list: [], total: 0, totalPage: 0, masterInfo: null, fetchError };
  }
}
