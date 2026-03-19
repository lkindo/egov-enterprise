import { cookies } from 'next/headers';
import client from '@/lib/api/client';

/**
 * 게시판 목록 데이터를 서버 사이드에서 가져오는 함수
 */
export async function getInitialBoardData(params: {
 bbsId: string;
 page번호: number;
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
 // 백엔드 BoardController 매핑에 맞춰 경로 변경: /api/v1/boards/{bbsId}
 const { bbsId, page번호, ...restParams } = params;
 const queryParams = {
 page: page번호 - 1, // Spring Data Pageable은 0부터 시작
 size: 10,
 ...restParams
 };

 const response: any = await client.get(`/boards/${bbsId}`, { ...axiosConfig, params: queryParams });

 // Spring Data Page 객체 구조에 맞춰 데이터 추출 (content, totalElements, totalPages)
 return {
 resultList: response.content || [],
 totalCount: response.totalElements || 0,
 totalPages: response.totalPages || 0
 };
 } catch (error: any) {
 // 401 오류는 인증이 필요한 상태이므로 로깅을 최소화
 if (error.response?.status === 401) {
 console.warn('BoardListServer: Authentication token expired or invalid (401)');
 } else {
 console.error('BoardListServer: Failed to fetch board list', error);
 }
 return { resultList: [], totalCount: 0, totalPages: 0 };
 }
}
