import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import { NOTICE_BOARD_ID } from '@/config/board-ids';
import { boardUserService, type BoardMeta } from '@/services/business/user/board/BoardUserService';
import { getPostsOperation } from '@/types/generated-operations';
import { logErrorSafely } from '@/lib/safe-error-log';
import type { BoardPost } from '@/types/business/board';

export interface InitialBoardData {
  list: BoardPost[];
  total: number;
  totalPage: number;
  masterInfo: BoardMeta | null;
  fetchError: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * bbsId 없이 진입했을 때 쓸 기본 게시판을 **이 사용자가 실제로 볼 수 있는 게시판에서** 고른다.
 *
 * 종전 기본값 'BBSMSTR_000000000001' 은 Flyway 시드에도 sql/ 에도 없어(전량 grep 실측)
 * 조회가 늘 비었다. [2026-10-23 ADR-0040 결정 11] 관리 목록 API 는 일반 사용자에게 403 이라 일반 사용자는 늘 공지 게시판으로
 * 떨어졌다 — 이제 서버가 사용 여부·커뮤니티 회원으로 거른 사용자 선택지의 첫 게시판을 쓴다(이용 화면의 출처는 선택지 API 하나).
 * 선택지를 받지 못하거나 비어 있으면 시드가 보장하는 공지 게시판 ID 로 간다. 그 게시판을 볼 수 없으면 본 조회가 없는
 * 게시판(404) 오류를 보이고, 조회 대행 권한자가 사용 안 함 게시판을 열면 목록 머리가 사용 안 함임을 알린다. 선택지 조회의
 * 실패 자체는 화면에 따로 보이지 않는다(본 조회가 같은 서버에 닿으므로 대개 함께 실패한다).
 */
export const resolveDefaultBoardId = async (): Promise<string> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  if (!accessToken) return NOTICE_BOARD_ID;

  try {
    const options = await boardUserService.getBoardOptions({
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return options.find((option) => !!option.bbsId)?.bbsId ?? NOTICE_BOARD_ID;
  } catch {
    // 선택지 조회 실패는 따로 알리지 않는다 — 본 조회가 같은 서버에 닿아 대개 함께 실패하고 그 오류를 보인다.
    return NOTICE_BOARD_ID;
  }
};

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
}): Promise<InitialBoardData> => {
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
      page, // 1부터 센다 — 화면 번호 그대로(ADR-0036)
      size: 10,
      ...restParams
    };

    // 감사 P1-1: 목록 조회 실패를 `{ list: [] }` 로 바꿔 삼키면 화면이 "게시글 0건"이라고 거짓말한다.
    // 목록은 실패를 삼키지 않고(= 아래 catch 로 전파) fetchError 로 표면화하며,
    // 게시판 마스터(제목·템플릿) 조회는 목록 표시를 막을 이유가 없어 부가 정보로만 취급한다.
    const [listResponse, masterResponse] = await Promise.all([
      executeGeneratedOperation(getPostsOperation, {
        path: { bbsId },
        query: queryParams,
        config: axiosConfig,
      }),
      // [2026-09-26 DIP V5] 사용자용 메타 API 로 읽는다 — 관리자 API 는 일반 사용자에게 403 이라
      //   제목·설명·템플릿이 늘 비었다.
      boardUserService.getBoardMeta(bbsId, axiosConfig).catch((err: unknown) => {
        logErrorSafely('BoardListServer: Failed to fetch board master info', err);
        return null;
      }),
    ]);

    // PageResponse 구조에 맞춰 데이터 추출 (list, total, totalPage)
    return {
      list: (listResponse.list || []) as BoardPost[],
      total: listResponse.total || 0,
      totalPage: listResponse.totalPage || 0,
      masterInfo: masterResponse || null,
      fetchError: null as string | null
    };
  } catch (error: unknown) {
    // 401 오류는 인증이 필요한 상태이므로 시스템 에러 대신 로그인 페이지로 리다이렉트
    const response = isRecord(error) && isRecord(error.response) ? error.response : null;
    if (response?.status === 401) redirect('/login');
    logErrorSafely('BoardListServer: Failed to fetch board list', error);
    const responseData = response && isRecord(response.data) ? response.data : null;
    const fetchError = typeof responseData?.message === 'string'
      ? responseData.message
      : error instanceof Error && error.message
        ? error.message
        : '게시글 목록을 불러오지 못했습니다.';
    return { list: [], total: 0, totalPage: 0, masterInfo: null, fetchError };
  }
}
