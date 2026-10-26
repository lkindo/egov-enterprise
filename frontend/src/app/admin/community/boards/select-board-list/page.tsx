import type { Metadata } from 'next';
import { SITE_IDENTITY } from '@/config/site-identity';
import { BoardListClient } from './BoardListClient';
import { getBoardTitle, getInitialBoardData } from './BoardListServer';
import { resolveDefaultBoardId } from './BoardListServer';

function toSingleString(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0];
  return val;
}

type BoardListSearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * 문서 제목은 '게시판 이름 | 사이트 이름' 이다.
 *
 * [2026-10-26 ADR-0043 UX-15] 종전 고정 제목('전체 게시글 - 전자정부 프레임워크')은 어느 게시판을 열어도 같아, 탭·방문 기록·화면낭독기가
 * 지금 어느 게시판인지 말하지 못했다. 이름은 화면 머리와 같은 사용자용 메타에서 읽고(같은 요청에서 한 번만 받는다), 받지 못하면
 * 일반 제목('게시판')을 쓴다 — 이름을 지어내지 않는다.
 */
export async function generateMetadata({ searchParams }: { searchParams: BoardListSearchParams }): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const bbsId = toSingleString(resolvedSearchParams.bbsId) || await resolveDefaultBoardId();
  const boardTitle = await getBoardTitle(bbsId);
  return {
    title: `${boardTitle ?? '게시판'} | ${SITE_IDENTITY.frameworkName}`,
    description: boardTitle ? `${boardTitle}의 글 목록입니다.` : '게시판의 글 목록입니다.',
  };
}

/**
 * 서버 컴포넌트: 페이지 진입점
 */
export default async function BoardListPage({ searchParams }: { searchParams: BoardListSearchParams }) {
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
