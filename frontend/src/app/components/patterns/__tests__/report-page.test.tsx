import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/stats/user',
  useSearchParams: () => new URLSearchParams(),
}));

import { ReportPage } from '../report-page';

/**
 * A7 셸의 내비게이션 슬롯(2026-10-20). WorkListPage·MasterDetailPage 의 `navigation` 과 같은 계약이다 — 머리글 바로 아래·조회조건 위에
 * 두고, 넘기지 않으면 슬롯 자체를 그리지 않아 기존 소비자의 DOM 이 그대로다.
 */
describe('ReportPage navigation 슬롯', () => {
  it('머리글 아래·조회 조건 위에 내비게이션을 둔다', () => {
    render(
      <ReportPage
        title="사용자 통계 분석"
        showBreadcrumb={false}
        actions={<button type="button">새로고침</button>}
        navigation={<nav aria-label="통계 분석 뷰"><button type="button">통계 개요</button></nav>}
        filter={<span>기간</span>}
        basis="집계 기준"
      >
        <table />
      </ReportPage>,
    );

    const heading = screen.getByRole('heading', { level: 1, name: '사용자 통계 분석' });
    const navigation = screen.getByTestId('report-navigation');
    const filter = screen.getByRole('heading', { level: 2, name: '조회 조건' });
    expect(navigation).toContainElement(screen.getByRole('navigation', { name: '통계 분석 뷰' }));
    expect(heading.compareDocumentPosition(navigation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(navigation.compareDocumentPosition(filter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // 주요 액션과 같은 줄(머리글)에 두지 않는다 — 화면 전환과 반출·새로고침이 붙으면 오조작이 된다.
    expect(screen.getByRole('banner')).not.toContainElement(navigation);
  });

  it('넘기지 않으면 슬롯을 그리지 않는다', () => {
    render(<ReportPage title="관리자 통계" showBreadcrumb={false} basis="집계 기준"><table /></ReportPage>);

    expect(screen.queryByTestId('report-navigation')).not.toBeInTheDocument();
  });
});
