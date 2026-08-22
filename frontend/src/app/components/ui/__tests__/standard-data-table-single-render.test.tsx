import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Column, StandardDataTable } from '../standard-data-table';

/**
 * 단일 렌더 계약 (ADR-0006).
 *
 * 종전 StandardDataTable 은 데스크톱 `<table>`(hidden md:block)과 모바일 카드(md:hidden)를
 * **형제로 항상 함께 렌더**했다. 한쪽은 `display:none` 이라 눈에도 접근성 트리에도 보이지 않지만
 * DOM 에는 존재해서, accessor 가 행×열마다 2회 실행되고 accessor 가 만든 `data-testid`·
 * `aria-label` 이 2벌씩 생겼다. Playwright 의 `getByTestId`/CSS 로케이터는 hidden 요소도
 * resolve 하므로 strict mode violation 이 났다(2026-08-22 CI run 32555133776).
 *
 * 이 계약은 "표현이 아니라 **DOM 개수**"를 고정한다. 반응형 전환은 CSS 가 담당하므로
 * 뷰포트와 무관하게 산출물은 언제나 1벌이어야 한다.
 *
 * ⚠ 이 파일은 "비우면 통과"하지 않도록 **양성·음성 대조군을 함께** 둔다.
 *   렌더가 통째로 사라지면 음성 대조군(표 1개·행 수·열 머리글 수)이 먼저 red 가 된다.
 */

interface Row {
  id: number;
  name: string;
  state: string;
}

const rows: Row[] = [
  { id: 1, name: '홍길동', state: '활성' },
  { id: 2, name: '김영희', state: '대기' },
  { id: 3, name: '이철수', state: '정지' },
];

describe('StandardDataTable 단일 렌더 계약', () => {
  it('accessor 를 행×열마다 정확히 한 번만 호출한다', () => {
    const nameAccessor = vi.fn((row: Row) => row.name);
    const stateAccessor = vi.fn((row: Row) => row.state);
    const columns: Column<Row>[] = [
      { header: '이름', accessor: nameAccessor },
      { header: '상태', accessor: stateAccessor },
    ];

    render(<StandardDataTable columns={columns} data={rows} keyField="id" />);

    // 2배가 되면 이중 트리가 부활한 것이다. accessor 는 부수효과(fetch·로깅)를 가질 수 있어
    // 중복 실행 자체가 결함이다.
    expect(nameAccessor).toHaveBeenCalledTimes(rows.length);
    expect(stateAccessor).toHaveBeenCalledTimes(rows.length);
  });

  it('accessor 가 만든 식별자와 컨트롤이 문서 전체에서 정확히 1개다', () => {
    // 실제 소비자들이 하는 일을 그대로 재현한다 — accessor 안에서 testid·aria-label 을 만든다
    // (MailHistoryHubClient·EventManagementClient·WorkHubClient 가 이 패턴이다).
    const columns: Column<Row>[] = [
      { header: '이름', accessor: 'name' },
      {
        header: '관리',
        accessor: (row) => (
          <button type="button" data-testid={`delete-${row.id}`} aria-label={`${row.name} 삭제`}>
            삭제
          </button>
        ),
      },
    ];

    render(<StandardDataTable columns={columns} data={rows} keyField="id" />);

    for (const row of rows) {
      expect(screen.getAllByTestId(`delete-${row.id}`)).toHaveLength(1);
      expect(screen.getAllByRole('button', { name: `${row.name} 삭제` })).toHaveLength(1);
    }
  });

  it('rowTestId 는 행마다 정확히 1개다 — 모바일 사본이 스코프 없이 늘어나지 않는다', () => {
    const columns: Column<Row>[] = [{ header: '이름', accessor: 'name' }];

    render(
      <StandardDataTable columns={columns} data={rows} keyField="id" rowTestId="data-row" />,
    );

    expect(screen.getAllByTestId('data-row')).toHaveLength(rows.length);
  });

  it('음성 대조군 — 표 구조가 비어 있지 않고 시맨틱이 살아 있다', () => {
    // 위 세 단언은 "아무것도 렌더하지 않으면" 전부 통과할 수 있다(getAllBy 는 0개면 throw 하지만
    // toHaveLength(1) 을 만족시키려 렌더를 줄이는 방향의 회귀는 막지 못한다).
    // 여기서 표가 실제로 데이터를 담고 있음을 반대 방향에서 고정한다.
    const columns: Column<Row>[] = [
      { header: '이름', accessor: 'name' },
      { header: '상태', accessor: 'state' },
    ];

    render(<StandardDataTable columns={columns} data={rows} keyField="id" />);

    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(1);

    const table = tables[0];
    // 머리글 행 1 + 데이터 행 n
    expect(within(table).getAllByRole('row')).toHaveLength(rows.length + 1);
    expect(within(table).getAllByRole('columnheader')).toHaveLength(columns.length);
    // thead·tbody 두 rowgroup 이 모두 존재한다(구조 확인).
    // ⚠ 이 단언은 **명시 role 속성을 보호하지 못한다** — jsdom 은 CSS 를 적용하지 않아
    //   role 속성을 지워도 <tbody> 의 암시 role 로 통과한다(2026-08-22 red 증명에서 실측).
    //   md 미만 display:block 전환 시 시맨틱을 지키는 명시 role 은
    //   src/__tests__/dom-identity-invariants.test.ts 의 소스 계약이 담당한다.
    expect(within(table).getAllByRole('rowgroup')).toHaveLength(2);
  });
});
