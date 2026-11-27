import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StandardDataTablePagination, type StandardDataTablePaginationOptions } from '../standard-data-table-pagination';

function renderPager(pagination: Partial<StandardDataTablePaginationOptions>, sortScopeIsPageOnly = false) {
  const onPageChange = vi.fn();
  const view = render(
    <StandardDataTablePagination
      pagination={{ currentPage: 1, totalPages: 1, onPageChange, ...pagination }}
      compact={false}
      sortScopeIsPageOnly={sortScopeIsPageOnly}
    />,
  );
  return { ...view, onPageChange: pagination.onPageChange ?? onPageChange };
}

/** 번호 단추의 이름(이전·다음 제외)과 생략부호 수. */
function pageButtons() {
  const list = within(screen.getByRole('navigation', { name: '페이지 탐색' })).getByRole('list');
  const names = within(list).getAllByRole('button')
    .map((button) => button.getAttribute('aria-label') ?? '')
    .filter((name) => /^\d+ 페이지$/.test(name));
  const ellipses = [...list.querySelectorAll('li[aria-hidden="true"]')].filter((item) => item.textContent === '…').length;
  return { names, ellipses };
}

describe('StandardDataTablePagination', () => {
  it('번호 창은 현재 쪽을 가운데 둔 최대 5개이고, 창 밖의 처음·끝 쪽은 생략부호와 함께 따로 둔다', () => {
    renderPager({ currentPage: 10, totalPages: 20 });
    expect(pageButtons()).toEqual({
      names: ['1 페이지', '8 페이지', '9 페이지', '10 페이지', '11 페이지', '12 페이지', '20 페이지'],
      ellipses: 2,
    });
    expect(screen.getByRole('button', { name: '10 페이지' })).toHaveAttribute('aria-current', 'page');
  });

  it('창이 처음·끝에 닿으면 5개를 채우고, 창에 붙은 쪽에는 생략부호를 두지 않는다', () => {
    const { unmount } = renderPager({ currentPage: 1, totalPages: 20 });
    expect(pageButtons()).toEqual({
      names: ['1 페이지', '2 페이지', '3 페이지', '4 페이지', '5 페이지', '20 페이지'],
      ellipses: 1,
    });
    unmount();

    renderPager({ currentPage: 19, totalPages: 20 });
    expect(pageButtons()).toEqual({
      names: ['1 페이지', '16 페이지', '17 페이지', '18 페이지', '19 페이지', '20 페이지'],
      ellipses: 1,
    });
  });

  it('창 바로 옆의 처음·끝 쪽은 생략부호 없이 잇는다', () => {
    renderPager({ currentPage: 4, totalPages: 7 });
    expect(pageButtons()).toEqual({
      names: ['1 페이지', '2 페이지', '3 페이지', '4 페이지', '5 페이지', '6 페이지', '7 페이지'],
      ellipses: 0,
    });
  });

  it('첫·끝 쪽의 이전·다음 단추는 포커스를 잃지 않게 aria-disabled 로 막고 누르면 아무것도 하지 않는다', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { unmount } = renderPager({ currentPage: 1, totalPages: 3, onPageChange });
    const previous = screen.getByRole('button', { name: '이전 페이지' });
    expect(previous).toHaveAttribute('aria-disabled', 'true');
    expect(previous).not.toBeDisabled();
    await user.click(previous);
    expect(screen.getByRole('button', { name: '다음 페이지' })).not.toHaveAttribute('aria-disabled');
    unmount();

    renderPager({ currentPage: 3, totalPages: 3, onPageChange });
    await user.click(screen.getByRole('button', { name: '다음 페이지' }));
    expect(screen.getByRole('button', { name: '다음 페이지' })).toHaveAttribute('aria-disabled', 'true');
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('요약은 총 건수·지금 보이는 구간·현재/전체 쪽을 말하고, 쪽 안 정렬이면 그 범위를 먼저 말한다', () => {
    renderPager({ currentPage: 3, totalPages: 3, totalCount: 45, pageSize: 20 }, true);
    const summary = screen.getByText((_, element) => element?.tagName === 'P' && element.getAttribute('aria-live') === 'polite');
    expect(summary.textContent?.replace(/\s+/g, ' ')).toBe('정렬은 현재 페이지 안에서만 적용됩니다·총 45건·41–45번째·3 / 3 페이지');
  });

  it('쪽이 하나뿐이고 총 건수·크기 선택이 없으면 그리지 않고, 총 건수만 있으면 요약만 그린다', () => {
    const { container, unmount } = renderPager({ currentPage: 1, totalPages: 1 });
    expect(container).toBeEmptyDOMElement();
    unmount();

    renderPager({ currentPage: 1, totalPages: 1, totalCount: 3 });
    expect(screen.queryByRole('navigation', { name: '페이지 탐색' })).not.toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent?.includes('총 3건') === true))
      .toBeInTheDocument();
  });

  it('페이지당 건수 선택은 onPageSizeChange 를 줄 때만 그리고, 쪽이 하나뿐이고 총 건수가 없어도 그 선택만으로 페이저를 그린다', () => {
    const { unmount } = renderPager({ currentPage: 1, totalPages: 2 });
    expect(screen.queryByRole('combobox', { name: '페이지당 항목 수' })).not.toBeInTheDocument();
    unmount();

    renderPager({ currentPage: 1, totalPages: 1, pageSize: 20, onPageSizeChange: vi.fn() });
    expect(screen.getByRole('combobox', { name: '페이지당 항목 수' })).toHaveTextContent('20개씩');
    expect(screen.queryByRole('navigation', { name: '페이지 탐색' })).not.toBeInTheDocument();
  });
});
