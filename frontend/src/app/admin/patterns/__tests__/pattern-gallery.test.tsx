import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PatternGalleryClient from '../PatternGalleryClient';

/**
 * 패턴 갤러리 스모크 — 참조 화면이 실제로 동작하는지.
 *
 * 갤러리의 가치는 "카탈로그가 글로 규정한 것이 여기서 실물로 보인다"는 데 있다. 그래서
 * 렌더 여부가 아니라 **A1 필수 요소가 표본 위에서 진짜 동작하는지**를 본다 — 죽은 컨트롤을
 * 두지 않는다는 G10 이 이 화면 자체에도 적용되기 때문이다.
 */
describe('업무 화면 패턴 갤러리', () => {
  it('표본 데이터가 없는 정적 참조 화면임을 화면에서 고지한다', () => {
    render(<PatternGalleryClient />);

    expect(screen.getByRole('note')).toHaveTextContent('정적 표본 데이터');
  });

  it('A1 골격과 총 건수를 렌더한다', () => {
    render(<PatternGalleryClient />);

    expect(screen.getByRole('heading', { level: 1, name: '업무 요청 목록' })).toBeInTheDocument();
    expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 12건');
    expect(screen.getAllByTestId(/^pattern-gallery-row/)).toHaveLength(10);
  });

  it('정렬 가능 열은 aria-sort 를 노출한다(G5)', () => {
    render(<PatternGalleryClient />);

    const header = screen.getByRole('columnheader', { name: '요청번호' });
    expect(header).toHaveAttribute('aria-sort', 'none');
  });

  it('조회 조건으로 결과와 총 건수가 함께 좁혀진다', async () => {
    const user = userEvent.setup();
    render(<PatternGalleryClient />);

    await user.type(screen.getByLabelText('검색어'), '민원');
    await user.click(screen.getByRole('button', { name: '조회' }));

    const toolbar = screen.getByTestId('work-list-toolbar');
    expect(toolbar).toHaveTextContent('총 2건');
    expect(screen.getAllByTestId(/^pattern-gallery-row/)).toHaveLength(2);
  });

  it('조회 결과가 없으면 빈 상태 문구를 구분해 보여준다(G15)', async () => {
    const user = userEvent.setup();
    render(<PatternGalleryClient />);

    await user.type(screen.getByLabelText('검색어'), '존재하지않는키워드');
    await user.click(screen.getByRole('button', { name: '조회' }));

    expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 0건');
    const table = screen.getByRole('table', { name: '업무 요청 표본 목록' });
    expect(within(table).getByText('조회 조건에 맞는 요청이 없습니다.')).toBeInTheDocument();
  });
});
