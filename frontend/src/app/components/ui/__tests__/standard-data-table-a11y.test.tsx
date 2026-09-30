import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StandardDataTable, type Column } from '../standard-data-table';

/**
 * [2026-10-01] 공용 표의 접근성 결함 세 가지.
 * ① 좁은 화면에서 숨긴 머리글 행의 정렬·전체 선택이 보이지 않는 포커스 정지점이었다 → 머리글은 탭 순서에서 빼고,
 *    카드 위에 보이는 전체 선택·정렬 기준을 한 번 둔다.
 * ② 행 체크박스가 모두 '항목 선택' 이라 일괄 삭제 대상을 구분할 수 없었다.
 * ③ 첫·끝 페이지에서 이전·다음 버튼이 disabled 가 되며 누른 버튼의 포커스가 사라졌다.
 */
type Row = { id: number; name: string; date: string };
const rows: Row[] = [{ id: 1, name: '인사팀', date: '2026-10-01' }, { id: 2, name: '재무팀', date: '2026-09-30' }];
const columns: Column<Row>[] = [
  { header: '이름', accessor: 'name', sortKey: 'name' },
  { header: '날짜', accessor: 'date' },
];

describe('StandardDataTable 접근성', () => {
  it('행 체크박스 이름은 행마다 다르다 — 첫 열 값, 또는 지정한 이름', () => {
    const { unmount } = render(<StandardDataTable columns={columns} data={rows} keyField="id" enableSelection bulkActions={[]} />);
    expect(screen.getAllByRole('checkbox', { name: '인사팀 선택' })).toHaveLength(1);
    expect(screen.getAllByRole('checkbox', { name: '재무팀 선택' })).toHaveLength(1);
    unmount();

    render(
      <StandardDataTable columns={columns} data={rows} keyField="id" enableSelection bulkActions={[]}
        selectionLabel={(row) => `${row.name} 부서 선택`} />,
    );
    expect(screen.getByRole('checkbox', { name: '인사팀 부서 선택' })).toBeInTheDocument();
  });

  it('본문 행·셀은 좁은 화면(display:block)에서도 표 의미를 잃지 않게 역할을 명시한다', () => {
    render(<StandardDataTable columns={columns} data={rows} keyField="id" />);
    const body = screen.getAllByRole('rowgroup')[1];
    expect(within(body).getAllByRole('row')).toHaveLength(2);
    expect(within(body).getAllByRole('cell').length).toBeGreaterThanOrEqual(4);
  });

  it('좁은 화면용 전체 선택·정렬 기준을 표 위에 한 번 둔다(넓은 화면에서는 CSS 로 숨김)', async () => {
    render(<StandardDataTable columns={columns} data={rows} keyField="id" enableSelection bulkActions={[]} />);
    const sortBy = screen.getByRole('combobox', { name: '정렬 기준' });
    expect(sortBy.closest('div')).toHaveClass('standard-data-table-narrow-controls');
    await userEvent.selectOptions(sortBy, within(sortBy).getByRole('option', { name: '이름 내림차순' }));
    const body = screen.getAllByRole('rowgroup')[1];
    expect(within(body).getAllByRole('row')[0]).toHaveTextContent('재무팀');
    expect(screen.getByRole('checkbox', { name: '전체 선택' }).closest('div')).toHaveClass('standard-data-table-narrow-controls');
  });

  it('좁은 화면에서 숨긴 머리글의 조작 요소만 탭 순서에서 빠지고, 머리글 칸은 열 이름을 계속 알린다', () => {
    const css = readFileSync(join(__dirname, '../../../globals.css'), 'utf8');
    const narrow = css.slice(css.indexOf('@media (max-width: 767px)'));
    const buttonRule = narrow.slice(narrow.indexOf('.standard-data-table-responsive > thead button {'));
    expect(buttonRule.slice(0, buttonRule.indexOf('}'))).toContain('visibility: hidden');
    // 머리글 행 자체를 숨기면(visibility/display) 좁은 화면에서 열 이름이 접근성 트리에서 사라진다.
    const theadRule = narrow.slice(narrow.indexOf('.standard-data-table-responsive > thead {'));
    expect(theadRule.slice(0, theadRule.indexOf('}'))).not.toMatch(/visibility|display:\s*none/);
  });

  it('끝 페이지의 다음 버튼은 disabled 가 아니라 aria-disabled 라 누른 뒤에도 포커스가 남는다', async () => {
    const onPageChange = vi.fn();
    render(
      <StandardDataTable columns={columns} data={rows} keyField="id"
        pagination={{ currentPage: 2, totalPages: 2, onPageChange }} />,
    );
    const next = screen.getByRole('button', { name: '다음 페이지' });
    expect(next).not.toBeDisabled();
    expect(next).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(next);
    expect(onPageChange).not.toHaveBeenCalled();
    expect(next).toHaveFocus();
  });
});
