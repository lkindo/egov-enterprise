import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StandardDataTable, type Column } from '../standard-data-table';

/**
 * 정렬 범위 고지 계약.
 *
 * [무엇이 문제였나 — 2026-08-25 실측]
 * `sortKey` 정렬은 **서버가 내려준 현재 페이지 행만** 재배열하는 클라이언트 정렬이다
 * (`createSortedRowModel` 이 `data` prop 위에서 동작한다). 그런데 화면이 사용자에게 주는 신호는
 * 정렬 화살표와 `aria-sort="descending"` 뿐이라, 여러 페이지짜리 결과에서 **전체가 정렬됐다**고
 * 읽힌다. 로그 조사 화면 5개(privacy·system·user·web·login)와 주소록이 정확히 이 상태였다.
 *
 * "가장 최근 것부터 보고 있다"는 전제로 판단하는 화면에서 이 오해는 결론을 바꾼다.
 * 서버 정렬 계약이 생기기 전까지 화면이 범위를 말하게 하고, 그 문구를 계약으로 고정한다.
 */
interface Row { id: number; name: string }

const rows: Row[] = [
  { id: 1, name: '가' },
  { id: 2, name: '나' },
];

const sortableColumns: Column<Row>[] = [
  { header: '이름', accessor: (item) => item.name, sortKey: 'name' },
];

const plainColumns: Column<Row>[] = [
  { header: '이름', accessor: (item) => item.name },
];

const NOTICE = '정렬은 현재 페이지 안에서만 적용됩니다';

describe('정렬 범위 고지', () => {
  it('정렬 가능 열 + 여러 페이지면 범위를 밝힌다', () => {
    render(
      <StandardDataTable<Row>
        columns={sortableColumns}
        data={rows}
        keyField="id"
        pagination={{ currentPage: 1, totalPages: 3, totalCount: 25, pageSize: 10, onPageChange: () => {} }}
      />,
    );

    expect(screen.getByText(NOTICE)).toBeInTheDocument();
  });

  it('정렬 가능 열이 없으면 고지하지 않는다(불필요한 소음 금지)', () => {
    render(
      <StandardDataTable<Row>
        columns={plainColumns}
        data={rows}
        keyField="id"
        pagination={{ currentPage: 1, totalPages: 3, totalCount: 25, pageSize: 10, onPageChange: () => {} }}
      />,
    );

    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });

  it('페이지가 하나뿐이면 고지하지 않는다(그때는 정렬 범위 = 전체다)', () => {
    render(
      <StandardDataTable<Row>
        columns={sortableColumns}
        data={rows}
        keyField="id"
        pagination={{ currentPage: 1, totalPages: 1, totalCount: 2, pageSize: 10, onPageChange: () => {} }}
      />,
    );

    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });
});
