import { Metadata } from 'next';
import { BoardListClient } from './BoardListClient';
import { getInitialBoardData } from './BoardListServer';
import { resolveDefaultBoardId } from './BoardListServer';

export const metadata: Metadata = {
  title: '전체 게시글 - 전자정부 프레임워크',
  description: '전자정부 소프트웨어 프레임워크 프로젝트의 전체 게시글 목록입니다.',
};

function toSingleString(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0];
  return val;
}

/**
 * 서버 컴포넌트: 페이지 진입점
 */
export default async function BoardListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const resolvedSearchParams = await searchParams;
  /*
   * 종전 기본값 LEGACY_DEFAULT_BOARD_ID('BBSMSTR_000000000001')는 **어떤 시드에도 없다**
   * (Flyway·sql/ 전량 grep 실측 — 등장처가 테스트 목뿐이다). bbsId 없이 들어오면 존재하지 않는
   * 게시판을 조회해 늘 빈 화면이 됐다. 실재하는 게시판 중 첫 번째를 기본값으로 삼는다.
   */
  const rawBbsId = toSingleString(resolvedSearchParams.bbsId);
  const bbsId = rawBbsId || await resolveDefaultBoardId();
  const page = Number(toSingleString(resolvedSearchParams.page)) || 1;
  const searchWrd = toSingleString(resolvedSearchParams.searchWrd) || '';
  const searchCnd = toSingleString(resolvedSearchParams.searchCnd) || '0';
  const orderBy = toSingleString(resolvedSearchParams.orderBy) || 'date';
  const startDate = toSingleString(resolvedSearchParams.startDate);
  const endDate = toSingleString(resolvedSearchParams.endDate);

  // 첫 목록은 서버에서 완성한다. 중첩 Suspense의 숨겨진 결과를 클라이언트가
  // 드러낼 때까지 제목·설명이 기다리지 않도록, 이미 읽는 데이터를 먼저 전달한다.
  const initialData = await getInitialBoardData({
    bbsId,
    page,
    searchWrd,
    searchCnd,
    orderBy,
    startDate,
    endDate
  });

  return (
    <BoardListClient
      initialData={initialData}
      params={{ bbsId, page, searchWrd, searchCnd, orderBy, startDate, endDate }}
    />
  );
}
