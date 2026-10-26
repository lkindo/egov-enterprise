'use client';

import { PagePagination } from '@/components/common/PagePagination';

interface BoardPaginationProps {
  /** 서버가 내려준 조건 전체의 글 수. */
  totalCount: number;
  /** 한 쪽의 글 수. 목록 조회와 같은 값이다. */
  pageSize: number;
  /** 현재 쪽(1부터, ADR-0036). */
  currentPage: number;
  onPageChange: (page: number) => void;
}

/**
 * 게시판 이용 목록의 쪽 이동.
 *
 * [2026-10-26 ADR-0043 UX-15] 종전에는 '이전·다음' 단추와 현재/전체 쪽 숫자만 있어 특정 쪽으로 바로 갈 수 없었다(20쪽이면 19번 눌러야
 * 했다). 다른 목록 화면과 같은 공용 쪽 이동(PagePagination — 쪽 번호·처음·끝 쪽 링크)을 쓴다. 장식(큰 그림자·고정 회색 구분선)도 함께
 * 걷혔다.
 */
export const BoardPagination = ({ totalCount, pageSize, currentPage, onPageChange }: BoardPaginationProps) => (
  <PagePagination total={totalCount} page={currentPage} size={pageSize} onPageChange={onPageChange} />
);
