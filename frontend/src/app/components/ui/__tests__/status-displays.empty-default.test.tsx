import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyStateDisplay } from '../status-displays';

/**
 * [2026-09-15 DEC-OPS-100] 빈 상태의 기본 설명은 검색 조건 안내가 아니다.
 *
 * 종전 기본 설명("검색 조건을 변경하거나 초기화한 뒤 다시 확인해 주세요.")은 검색이 없는 표에도 붙어,
 * 처음부터 비어 있는 목록을 검색 결과 없음으로 읽히게 했다(first-use-empty mustNotImply). 조건 안내는
 * 조건이 적용된 곳만 넘긴다.
 */
describe('EmptyStateDisplay 기본 설명', () => {
  it('설명을 넘기지 않으면 검색 조건 안내를 붙이지 않는다', () => {
    render(<EmptyStateDisplay message="등록된 게시물이 없습니다." />);

    expect(screen.getByText('등록된 게시물이 없습니다.')).toBeInTheDocument();
    expect(screen.queryByText(/검색 조건/)).toBeNull();
  });

  it('넘긴 설명은 그대로 보인다', () => {
    render(<EmptyStateDisplay message='"보안"에 대한 검색 결과가 없습니다.' description="검색 조건을 변경하거나 초기화한 뒤 다시 확인해 주세요." />);

    expect(screen.getByText('검색 조건을 변경하거나 초기화한 뒤 다시 확인해 주세요.')).toBeInTheDocument();
  });
});
