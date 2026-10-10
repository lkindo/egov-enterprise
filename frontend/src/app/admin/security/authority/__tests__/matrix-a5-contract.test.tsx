import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OperationPermissionMatrix, type OperationPermissionMatrixProps } from '../components/OperationPermissionMatrix';
import { ScreenTableHarness, selectionOf, type HarnessNavigation } from './screen-permission-table-harness';
import { pageInProjection } from '@/test-utils/projection';

// 기능 예시(모두 충족 판정·별칭·쪽지함 등)에 기대는 시험은 그 화면이 투영으로 빠진 생성물에서 등록하지 않는다 — page 파일이 원장에 있고 실제로 없을 때다(원본에서는 그대로다).

// 화면별 권한 표의 칸 내용은 화면 목록에서 온다 — 다른 영역의 화면 소스가 바뀌어도 계약이 흔들리지 않게 고정 목록을 쓴다.
vi.mock('@/types/generated-screen-registry', async (importOriginal) =>
  (await import('./screen-registry-fixture')).withFixtureScreenRegistry(await importOriginal()));

/**
 * A5(교차 상태 편집) archetype 계약.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A5.
 *
 * [2026-10-02] A5 의 실소비자는 권한 그룹 편집기의 '기능별 권한' 표(업무 영역 × 행위)다. 종전 대상이던 역할 × 메뉴
 * 격자(SecurityMatrixVisualizer)는 운영 화면 소비자가 없어 걷고, 이 계약을 실제로 쓰이는 표로 옮겨 넓혔다.
 * [2026-10-02 2단계] 편집기의 기본 보기인 '화면별 권한' 표(메뉴 트리 × 메뉴 표시·화면 진입·등록·수정·삭제·그 밖의 기능)도
 * A5 소비자다 — 같은 필수 항목을 아래 두 번째 묶음이 고정한다.
 * 셸이 없다는 것이 계약이 없어도 된다는 뜻은 아니다 — 스펙의 필수 항목을 이 계약이 직접 고정한다.
 *
 *   · 행·열 머리글 고정(스크롤 상자 안에서)
 *   · 변경된 칸의 표시와 설명, 바뀐 칸 수 = 저장 전 요약 수
 *   · 즉시 반영 금지 — 칸은 초안만 바꾸고 저장은 단축키·저장 버튼으로만
 *   · 방향키 이동, Space 토글, Ctrl+S 는 변경이 있을 때만
 *   · 인가 의미가 다른 칸(보호 권한)을 일괄 동작에 섞지 않는다(H3)
 */

const OPERATIONS = [
  { code: 'BOARD_READ', domain: 'BOARD', action: 'READ', name: '게시글 조회' },
  { code: 'BOARD_CREATE', domain: 'BOARD', action: 'CREATE', name: '게시글 등록' },
  { code: 'BOARD_UPDATE', domain: 'BOARD', action: 'UPDATE', name: '게시글 수정' },
  { code: 'BOARD_DELETE', domain: 'BOARD', action: 'DELETE', name: '게시글 삭제' },
  { code: 'BOARD_READ_ALL', domain: 'BOARD', action: 'READ_ALL', name: '타인 게시글 조회' },
  { code: 'BOARD_LIKE', domain: 'BOARD', action: 'LIKE', name: '게시글 추천' },
  { code: 'AUTHRT_READ', domain: 'AUTHRT', action: 'READ', name: '권한 조회' },
  { code: 'AUTHRT_GRANT', domain: 'AUTHRT', action: 'GRANT', name: '권한 설정' },
  { code: 'AUTHRT_ASSIGN', domain: 'AUTHRT', action: 'ASSIGN', name: '권한 배정' },
  { code: 'AUTHRT_AUDIT', domain: 'AUTHRT', action: 'AUDIT', name: '권한 감사' },
  { code: 'MENU_READ', domain: 'MENU', action: 'READ', name: '메뉴 조회' },
  { code: 'MENU_UPDATE', domain: 'MENU', action: 'UPDATE', name: '메뉴 수정' },
  { code: 'QESTNR_READ', domain: 'QESTNR', action: 'READ', name: '설문지 조회' },
];
const key = (code: string) => `OPERATION:${code}`;
const cell = (name: RegExp) => screen.getByRole('checkbox', { name });

/**
 * jsdom 은 레이아웃을 계산하지 않는다 — 표 상자가 넘친다고 직접 준다(스크롤 영역 계약). 끝나면 원래 서술자로 되돌린다.
 * 상자는 결과가 없으면 안내 문장으로 바뀌었다가 다시 생기므로, 늦게 마운트되는 경우까지 렌더 결과로 본다 — 훅을 표 컴포넌트
 * 맨 위로 올리면 늦게 생긴 상자를 다시 재지 않아 영역 속성이 붙지 않는다.
 */
function withOverflow(run: () => void) {
  const restore = (['scrollHeight', 'clientHeight'] as const)
    .map((prop) => [prop, Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop)] as const);
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 500 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 100 });
  try {
    run();
  } finally {
    for (const [prop, descriptor] of restore) {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, prop, descriptor);
      else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[prop];
    }
  }
}

/**
 * [2026-10-05 반박 리뷰 반영] 칸의 설명(aria-describedby) 대상은 접히는 '이 표 읽는 법'(details) 밖에 있어야 한다. Chromium 은 닫힌
 * details 안을 가리키는 설명을 접근성 트리에서 비운다(CDP 실측) — 보호 권한 설명을 그 안으로 옮기자 기본 상태에서 화면낭독기가 '보호
 * 권한이라 일괄 선택에서 빠진다'는 사실을 듣지 못했다. jsdom 은 details 접힘을 모델링하지 않아 toHaveAccessibleDescription 이 계속
 * 통과했으므로(거짓 초록) 대상의 위치를 직접 본다. 하나라도 검사해야 빈 검사가 아니다.
 */
function expectDescriptionsOutsideDetails(container: HTMLElement) {
  const described = [...container.querySelectorAll<HTMLElement>('[aria-describedby]')];
  expect(described.length).toBeGreaterThan(0);
  for (const element of described) {
    for (const id of (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)) {
      const target = document.getElementById(id);
      expect(target, `${element.getAttribute('aria-label') ?? element.tagName} 의 설명 ${id} 가 없습니다`).not.toBeNull();
      expect(target!.closest('details'), `${element.getAttribute('aria-label') ?? element.tagName} 의 설명이 접히는 details 안에 있습니다`).toBeNull();
    }
  }
}

function renderMatrix(overrides: Partial<OperationPermissionMatrixProps> = {}) {
  const props: OperationPermissionMatrixProps = {
    operations: OPERATIONS,
    selection: new Set([key('BOARD_READ')]),
    baseline: new Set([key('BOARD_READ')]),
    editable: true,
    disabled: false,
    allowAdd: true,
    onChange: vi.fn(),
    onSaveShortcut: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<OperationPermissionMatrix {...props} />) };
}

/** 실제 편집기처럼 onChange 를 초안에 반영하는 상태 보유 래퍼. */
function StatefulMatrix({ initial, allowAdd = true, onSaveShortcut }: { initial: string[]; allowAdd?: boolean; onSaveShortcut?: () => void }) {
  const [selection, setSelection] = useState(() => new Set(initial.map(key)));
  const [baseline] = useState(() => new Set(initial.map(key)));
  return <OperationPermissionMatrix operations={OPERATIONS} selection={selection} baseline={baseline} editable disabled={false} allowAdd={allowAdd}
    onSaveShortcut={onSaveShortcut}
    onChange={(keys, checked) => setSelection((previous) => {
      const next = new Set(previous);
      for (const entry of keys) { if (checked) next.add(entry); else next.delete(entry); }
      return next;
    })} />;
}

/**
 * [2026-10-05 한 화면 압축, 사용자 승인] 두 표는 편집기의 업무면 fill 셸 안에서 fill 변형을 쓴다 — 넓고 높은 화면(work-fill 조건)에서
 * 남은 높이를 채우고, 조건 밖에서는 종전 70vh 상자다. 칸이 고정 머리글·첫 열 밑에 가리지 않게 스크롤 여백(scroll-padding)을
 * 둔다(WCAG 2.4.11). 머리 고정·이름 있는 스크롤 영역·방향키·Space·보호 표시 계약은 그대로다.
 * 칸 패딩은 표 셀 밀도 토큰(--cell-px/py) 대신 업무 표 행 토큰(--work-cell-px/py, 카탈로그 §4 '업무 표 행 토큰')이다 — 기본
 * comfortable 에서 한 줄이 약 77px(기능별 약 109px)였다. 화면별 밀도 선택이 아니라 배포 전역 data-density 를 따르는 컴포넌트
 * 표현이며, 토큰을 읽는 컴포넌트는 work-screen-grammar-contract 의 WORK_TABLE_TOKEN_OWNERS 에 사유와 함께 등재돼 있다.
 */
const BOX_CLASSES = ['max-h-[min(70vh,48rem)]', 'overflow-auto', 'work-fill:flex-1', 'work-fill:max-h-[var(--work-fill-height)]'];

describe('기능별 권한 표 — A5 계약', () => {
  it('행·열 머리글을 스크롤 상자 안에서 고정하고, fill 상자에 고정 머리글·첫 열만큼 스크롤 여백을 둔다(384px 상자 금지)', () => {
    renderMatrix({ fill: true });
    const table = screen.getByRole('table');
    const box = table.parentElement!;
    expect(box.className.split(/\s+/)).toEqual(expect.arrayContaining([...BOX_CLASSES, 'scroll-pt-10', 'scroll-pl-[11rem]']));
    expect(box.className).not.toContain('max-h-96');
    // 고정 첫 열의 폭이 스크롤 여백과 같다 — 다르면 칸이 첫 열 밑에 가린 채 멈춘다.
    expect(within(table).getAllByRole('columnheader')[0].className).toContain('w-[11rem]');

    for (const header of within(table).getAllByRole('columnheader')) {
      expect(header.className).toMatch(/\bsticky\b/);
      expect(header.className).toMatch(/\btop-0\b/);
    }
    // 분류 줄(scope=rowgroup)은 표 전체 폭이라 안쪽 이름표만 고정한다 — 영역 행 머리글(scope=row)을 본다.
    const rowHeaders = within(table).getAllByRole('rowheader').filter((header) => header.getAttribute('scope') === 'row');
    expect(rowHeaders.map((header) => header.textContent)).toEqual(expect.arrayContaining([expect.stringContaining('게시글')]));
    for (const header of rowHeaders) {
      expect(header.className).toMatch(/\bsticky\b/);
      expect(header.className).toMatch(/\bleft-0\b/);
    }
  });

  it('머리글과 칸의 패딩은 업무 표 행 토큰을 써 배포 밀도(data-density)가 이 표에도 닿는다(카탈로그 §4)', () => {
    renderMatrix();
    const table = screen.getByRole('table');
    const cells = [...within(table).getAllByRole('columnheader'), ...within(table).getAllByRole('rowheader').filter((header) => header.getAttribute('scope') === 'row'), ...within(table).getAllByRole('cell')];
    expect(cells.length).toBeGreaterThan(10);
    for (const element of cells) {
      expect(element.className).toContain('px-[var(--work-cell-px)]');
      expect(element.className).toContain('py-[var(--work-cell-py)]');
      expect(element.className).not.toMatch(/(^|\s)p-\d/);
    }
  });

  it('행 일괄 선택은 좁은 전체 열의 24px 버튼이다 — 행 머리는 한 줄이고, 버튼 이름이 보호 권한 제외를 말한다', () => {
    renderMatrix();
    const header = screen.getByRole('rowheader', { name: '게시글' });
    expect(within(header).queryByRole('button')).toBeNull();
    const row = header.closest('tr')!;
    const all = within(row).getByRole('button', { name: '게시글 전체 선택(보호 권한 제외)' });
    expect(all).toHaveTextContent('선택');
    expect(all).toHaveAttribute('data-size', 'xs');
    expect(all.closest('td')).not.toBeNull();
    // 열 머리의 일괄 버튼도 이름표와 한 줄이다.
    expect(within(screen.getByRole('columnheader', { name: '조회' })).getByRole('button', { name: '조회 전체 선택(보호 권한 제외)' })).toHaveAttribute('data-size', 'xs');
  });

  it('칸의 접근 이름은 영역 × 행위 (코드)이고, 없는 권한 칸은 비운다', () => {
    renderMatrix();
    expect(cell(/^게시글 × 조회 \(BOARD_READ\)$/)).toBeChecked();
    expect(cell(/^게시글 × 타인 자료 조회 \(BOARD_READ_ALL\)$/)).not.toBeChecked();
    expect(cell(/^게시글 × 추천 \(BOARD_LIKE\)$/)).toBeInTheDocument();
    // 표에 없는 영역은 '기타' 분류로 보인다 — 빠뜨린 영역을 숨기지 않는다.
    expect(screen.getByRole('rowheader', { name: /^기타/ })).toBeInTheDocument();
    expect(cell(/^QESTNR × 조회 \(QESTNR_READ\)$/)).toBeInTheDocument();
    // 메뉴 영역에는 등록·삭제 권한이 없다 — 그 칸에는 체크박스가 없다.
    expect(screen.queryByRole('checkbox', { name: /^메뉴 × 등록/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(OPERATIONS.length);
  });

  it('변경된 칸을 표시와 설명으로 알리고, 바뀐 칸 수가 저장 전 요약 수와 같다', () => {
    const { container } = renderMatrix({
      selection: new Set([key('BOARD_CREATE'), key('MENU_READ')]),
      baseline: new Set([key('BOARD_READ'), key('MENU_READ')]),
    });
    const added = cell(/BOARD_CREATE/);
    expect(added).toHaveAttribute('data-changed', 'true');
    expect(added).toHaveAccessibleDescription(/저장하지 않은 변경/);
    expect(cell(/BOARD_READ\)/)).toHaveAttribute('data-changed', 'true');
    expect(cell(/MENU_READ/)).not.toHaveAttribute('data-changed');

    const changedCells = container.querySelectorAll('[data-changed="true"]');
    expect(changedCells).toHaveLength(2);
    expect(screen.getByText(/이 표에서 바꾼 칸 (\d+)개/)).toHaveTextContent(`이 표에서 바꾼 칸 ${changedCells.length}개`);
  });

  it('칸을 바꾸면 초안만 바뀌고 저장은 하지 않는다(즉시 반영 금지)', async () => {
    const user = userEvent.setup();
    const { props } = renderMatrix();
    await user.click(cell(/BOARD_CREATE/));
    expect(props.onChange).toHaveBeenCalledWith([key('BOARD_CREATE')], true);
    expect(props.onSaveShortcut).not.toHaveBeenCalled();
  });

  it('Space 로 칸을 바꾼다', async () => {
    const user = userEvent.setup();
    render(<StatefulMatrix initial={['BOARD_READ']} />);
    cell(/BOARD_CREATE/).focus();
    await user.keyboard(' ');
    expect(cell(/BOARD_CREATE/)).toBeChecked();
    expect(cell(/BOARD_CREATE/)).toHaveAttribute('data-changed', 'true');
    await user.keyboard(' ');
    expect(cell(/BOARD_CREATE/)).not.toBeChecked();
    expect(cell(/BOARD_CREATE/)).not.toHaveAttribute('data-changed');
  });

  it('Ctrl+S 는 표 안에서, 저장할 변경이 있고 저장이 막히지 않았을 때만 저장한다', async () => {
    const user = userEvent.setup();
    const clean = renderMatrix();
    cell(/BOARD_READ\)/).focus();
    await user.keyboard('{Control>}s{/Control}');
    expect(clean.props.onSaveShortcut).not.toHaveBeenCalled();
    clean.unmount();

    const blocked = renderMatrix({ selection: new Set([key('BOARD_CREATE')]), saveShortcutDisabled: true });
    cell(/BOARD_CREATE/).focus();
    await user.keyboard('{Control>}s{/Control}');
    expect(blocked.props.onSaveShortcut).not.toHaveBeenCalled();
    blocked.unmount();

    const dirty = renderMatrix({ selection: new Set([key('BOARD_CREATE')]) });
    cell(/BOARD_CREATE/).focus();
    await user.keyboard('{Control>}s{/Control}');
    expect(dirty.props.onSaveShortcut).toHaveBeenCalledTimes(1);
    dirty.unmount();

    // 메뉴 표시만 바뀐 경우처럼 같은 저장 단위의 다른 변경도 저장 대상이다.
    const otherChanges = renderMatrix({ unsavedChangeCount: 1 });
    cell(/BOARD_READ\)/).focus();
    await user.keyboard('{Control>}s{/Control}');
    expect(otherChanges.props.onSaveShortcut).toHaveBeenCalledTimes(1);
  });

  it('방향키로 칸을 이동하고 빈 칸은 건너뛴다', async () => {
    const user = userEvent.setup();
    renderMatrix();
    cell(/BOARD_READ\)/).focus();
    await user.keyboard('{ArrowRight}');
    expect(cell(/BOARD_CREATE/)).toHaveFocus();
    // 권한 관리 영역에는 등록 칸이 없다 — 가장 가까운 열(조회)로 내려간다.
    await user.keyboard('{ArrowDown}');
    expect(cell(/AUTHRT_READ/)).toHaveFocus();
    // 수정~타인 자료 삭제 칸이 비어 있으므로 '그 밖의 기능'의 첫 칸으로 건너뛴다.
    await user.keyboard('{ArrowRight}');
    expect(cell(/AUTHRT_GRANT/)).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(cell(/AUTHRT_READ/)).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(cell(/BOARD_READ\)/)).toHaveFocus();
  });

  it('보호 권한은 표시를 붙이고 줄·분류 일괄 선택에서 뺀다(H3)', async () => {
    const user = userEvent.setup();
    const view = render(<StatefulMatrix initial={[]} />);
    expect(cell(/AUTHRT_GRANT/)).toHaveAccessibleDescription(/보호 표시가 붙은 권한/);
    expectDescriptionsOutsideDetails(view.container);
    expect(cell(/AUTHRT_READ/)).not.toHaveAccessibleDescription(/보호 표시가 붙은 권한/);

    await user.click(screen.getByRole('button', { name: '권한 관리 전체 선택(보호 권한 제외)' }));
    expect(cell(/AUTHRT_READ/)).toBeChecked();
    expect(cell(/AUTHRT_AUDIT/)).toBeChecked();
    expect(cell(/AUTHRT_GRANT/)).not.toBeChecked();
    expect(cell(/AUTHRT_ASSIGN/)).not.toBeChecked();
    // 비보호 칸이 모두 켜졌으므로 같은 버튼이 해제로 바뀐다.
    await user.click(screen.getByRole('button', { name: '권한 관리 전체 해제(보호 권한 제외)' }));
    expect(cell(/AUTHRT_READ/)).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: '사용자·조직·권한 전체 선택(보호 권한 제외)' }));
    expect(cell(/AUTHRT_AUDIT/)).toBeChecked();
    expect(cell(/AUTHRT_GRANT/)).not.toBeChecked();
    // 보호 권한은 칸마다 따로 고를 수 있다.
    await user.click(cell(/AUTHRT_GRANT/));
    expect(cell(/AUTHRT_GRANT/)).toBeChecked();
  });

  it('열 일괄 선택은 보이는 행에만 적용하고, 모두 켜져 있으면 해제한다', async () => {
    const user = userEvent.setup();
    render(<StatefulMatrix initial={['BOARD_READ']} />);
    // [2026-10-05 반박 리뷰 반영] 도구 줄을 한 줄로 — 거르지 않을 때는 결과 수를 보이지 않고(표시 수 = 전체 수), '보호' 표시의 뜻은
    // '이 표 읽는 법' 안에 있다.
    expect(screen.queryByText(/표시 \d+ \/ 전체/)).toBeNull();
    expect(screen.queryByText('일괄 선택 제외')).toBeNull();
    expect(within(screen.getByText('이 표 읽는 법').closest('details')!).getByText(/보호 표시가 붙은 권한은/)).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '기능 검색' }), '메뉴');
    // [2026-10-05] 도구 줄을 한 줄로 줄이며 '검색 결과 밖의 선택도 유지됩니다'는 '이 표 읽는 법'으로 옮겼다(DOM 에 남는다).
    expect(screen.getByText('표시 1 / 전체 4개 영역')).toBeInTheDocument();
    expect(screen.getByText(/기능 검색·업무 분류 밖의 선택도 유지됩니다/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '조회 전체 선택(보호 권한 제외)' }));
    expect(cell(/MENU_READ/)).toBeChecked();
    await user.clear(screen.getByRole('textbox', { name: '기능 검색' }));
    // 검색 밖의 영역은 건드리지 않는다.
    expect(cell(/AUTHRT_READ/)).not.toBeChecked();
    expect(cell(/QESTNR_READ/)).not.toBeChecked();
    expect(cell(/BOARD_READ\)/)).toBeChecked();

    await user.click(screen.getByRole('button', { name: '조회 전체 선택(보호 권한 제외)' }));
    for (const code of ['BOARD_READ', 'AUTHRT_READ', 'MENU_READ', 'QESTNR_READ']) expect(cell(new RegExp(`${code}\\)`))).toBeChecked();
    await user.click(screen.getByRole('button', { name: '조회 전체 해제(보호 권한 제외)' }));
    for (const code of ['BOARD_READ', 'AUTHRT_READ', 'MENU_READ', 'QESTNR_READ']) expect(cell(new RegExp(`${code}\\)`))).not.toBeChecked();
  });

  it('업무 분류로 거르고, 결과가 없으면 그렇게 말한다', async () => {
    const user = userEvent.setup();
    renderMatrix();
    await user.selectOptions(screen.getByRole('combobox', { name: '업무 분류' }), '시스템 설정');
    expect(screen.getByText(/표시 1 \/ 전체 4개 영역/)).toBeInTheDocument();
    expect(cell(/MENU_READ/)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /BOARD_READ/ })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '기능 검색' }), '게시글');
    expect(screen.getByRole('status')).toHaveTextContent('조건에 맞는 업무 영역이 없습니다.');
  });

  it('추가가 막힌 그룹은 꺼진 칸을 켤 수 없고 일괄 버튼은 해제만 한다', async () => {
    const user = userEvent.setup();
    render(<StatefulMatrix initial={['BOARD_READ']} allowAdd={false} />);
    expect(cell(/BOARD_CREATE/)).toBeDisabled();
    expect(cell(/BOARD_READ\)/)).toBeEnabled();
    await user.click(screen.getByRole('button', { name: '게시글 전체 해제(보호 권한 제외)' }));
    expect(cell(/BOARD_READ\)/)).not.toBeChecked();
    expect(screen.getByRole('button', { name: '게시글 전체 선택(보호 권한 제외)' })).toBeDisabled();
  });

  it('권한 설정 권한이 없으면 일괄 버튼을 두지 않고 칸을 잠근다', () => {
    renderMatrix({ editable: false });
    // 이름 끝이 '(보호 권한 제외)'라 끝 고정($)을 두면 늘 맞지 않아 빈 검사가 된다.
    expect(screen.queryByRole('button', { name: /전체 (선택|해제)/ })).not.toBeInTheDocument();
    for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
  });

  it('넘치는 표 상자는 칸이 모두 잠겨도 키보드로 스크롤할 수 있는 이름 있는 영역이다 — 결과가 없다가 늦게 생겨도(WCAG 2.1.1)', () => {
    withOverflow(() => {
      const props: OperationPermissionMatrixProps = {
        operations: [], selection: new Set(), baseline: new Set(), editable: false, disabled: false, allowAdd: true, onChange: vi.fn(),
      };
      const view = render(<OperationPermissionMatrix {...props} />);
      // 결과가 없으면 상자 대신 안내 문장을 그린다.
      expect(screen.getByText('조건에 맞는 업무 영역이 없습니다.')).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: '기능별 권한 표 스크롤 영역' })).toBeNull();

      view.rerender(<OperationPermissionMatrix {...props} operations={OPERATIONS} />);
      const region = screen.getByRole('region', { name: '기능별 권한 표 스크롤 영역' });
      expect(region).toHaveAttribute('tabindex', '0');
      expect(within(region).getByRole('table')).toBeInTheDocument();
      // 권한 설정 권한이 없어 상자 안의 칸은 모두 잠겨 있다 — 상자 자체가 키보드로 스크롤하는 유일한 길이다.
      for (const checkbox of within(region).getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
    });
  });

  it('넘치지 않는 표 상자에는 영역 속성과 탭 정지를 두지 않는다', () => {
    renderMatrix({ editable: false });
    const box = screen.getByRole('table').parentElement!;
    expect(box).not.toHaveAttribute('role');
    expect(box).not.toHaveAttribute('tabindex');
  });
});

describe('화면별 권한 표 — A5 계약', () => {
  const table = () => within(screen.getByRole('group', { name: '화면별 권한 선택' })).getByRole('table');
  const cell = (name: string | RegExp) => screen.getByRole('checkbox', { name });

  it('행·열 머리글을 fill 스크롤 상자 안에서 고정하고(스크롤 여백 포함), 머리글과 칸은 업무 표 행 토큰을 쓴다', () => {
    render(<ScreenTableHarness initial={[]} fill />);
    const box = table().parentElement!;
    expect(box.className.split(/\s+/)).toEqual(expect.arrayContaining([...BOX_CLASSES, 'scroll-pt-8', 'scroll-pl-[15rem]']));
    expect(box.className).not.toContain('max-h-96');
    expect(within(table()).getAllByRole('columnheader')[0].className).toContain('w-[15rem]');
    for (const header of within(table()).getAllByRole('columnheader')) {
      expect(header.className).toMatch(/\bsticky\b/);
      expect(header.className).toMatch(/\btop-0\b/);
    }
    const rowHeaders = within(table()).getAllByRole('rowheader');
    expect(rowHeaders.length).toBeGreaterThan(3);
    for (const header of rowHeaders) {
      expect(header.className).toMatch(/\bsticky\b/);
      expect(header.className).toMatch(/\bleft-0\b/);
    }
    for (const element of [...within(table()).getAllByRole('columnheader'), ...rowHeaders, ...within(table()).getAllByRole('cell')]) {
      expect(element.className).toContain('px-[var(--work-cell-px)]');
      expect(element.className).toContain('py-[var(--work-cell-py)]');
      expect(element.className).not.toMatch(/(^|\s)p-\d/);
    }
  });

  it('칸의 접근 이름은 메뉴 × 칸 이름이고 코드가 하나면 코드를 붙이며, 화면에 없는 행위의 칸은 비운다', async () => {
    const user = userEvent.setup();
    render(<ScreenTableHarness initial={[]} />);
    await user.click(screen.getByRole('button', { name: '시스템 하위 메뉴 펼치기' }));
    expect(cell('메뉴 관리 × 메뉴 표시 (MENUS)')).not.toBeChecked();
    expect(cell('메뉴 관리 × 화면 진입 (MENU_READ)')).not.toBeChecked();
    expect(cell('메뉴 관리 × 등록 (MENU_CREATE)')).toBeInTheDocument();
    // 권한이 여럿인 칸은 'k/n' 버튼이고, 이름은 보이는 수로 끝난다(WCAG 2.5.3 — 보이는 대로 불러도 맞는 버튼이 있다).
    expect(screen.getByRole('button', { name: '사용자 관리 × 등록 0/2' })).toHaveTextContent(/^0\/2$/);
    // 메뉴 관리 화면에는 '그 밖의 기능'이 없다 — 칸에 컨트롤이 없다.
    expect(screen.queryByRole('checkbox', { name: /^메뉴 관리 × 그 밖의 기능/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^메뉴 관리 × 그 밖의 기능/ })).not.toBeInTheDocument();
  });

  it('바뀐 칸을 표시와 설명으로 알리고, 요약 수는 바뀐 권한 수와 같다(같은 권한이 여러 칸에 보여도 한 번)', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={['OPERATION:MENU_READ']} />);
    await user.click(screen.getByRole('button', { name: '시스템 하위 메뉴 펼치기' }));
    await user.click(cell('메뉴 관리 × 화면 진입 (MENU_READ)'));
    await user.click(cell('메뉴 관리 × 메뉴 표시 (MENUS)'));
    expect(cell('메뉴 관리 × 화면 진입 (MENU_READ)')).toHaveAttribute('data-changed', 'true');
    expect(cell('메뉴 관리 × 화면 진입 (MENU_READ)')).toHaveAccessibleDescription(/저장하지 않은 변경/);
    expect(cell('메뉴 관리 × 등록 (MENU_CREATE)')).not.toHaveAttribute('data-changed');
    // 메뉴 표시를 켜면 상위 메뉴도 함께 켜진다(명시적으로 초안에 들어간다) — 바뀐 권한은 MENU_READ 하나와 메뉴 표시 셋이다.
    expect(selectionOf(view.container)).toEqual(['NAVIGATION:AREA', 'NAVIGATION:MENUS', 'NAVIGATION:SECTION']);
    for (const name of ['관리 × 메뉴 표시 (AREA)', '시스템 × 메뉴 표시 (SECTION)']) expect(cell(name)).toHaveAttribute('data-changed', 'true');
    expect(screen.getByText(/바꾼 권한 (\d+)개/)).toHaveTextContent('바꾼 권한 4개');
  });

  it('칸을 바꾸면 초안만 바뀌고 저장은 하지 않는다(즉시 반영 금지). Space 로 칸을 바꾼다', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const view = render(<ScreenTableHarness initial={[]} onSaveShortcut={onSave} />);
    cell('투표 관리 × 메뉴 표시 (POLLS)').focus();
    await user.keyboard(' ');
    expect(cell('투표 관리 × 메뉴 표시 (POLLS)')).toBeChecked();
    expect(selectionOf(view.container)).toEqual(['NAVIGATION:AREA', 'NAVIGATION:POLLS']);
    await user.keyboard(' ');
    expect(cell('투표 관리 × 메뉴 표시 (POLLS)')).not.toBeChecked();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Ctrl+S 는 표 안에서, 저장할 변경이 있고 저장이 막히지 않았을 때만 저장한다', async () => {
    const user = userEvent.setup();
    const clean = vi.fn();
    const first = render(<ScreenTableHarness initial={[]} onSaveShortcut={clean} />);
    cell('투표 관리 × 메뉴 표시 (POLLS)').focus();
    await user.keyboard('{Control>}s{/Control}');
    expect(clean).not.toHaveBeenCalled();
    first.unmount();

    const blocked = vi.fn();
    const second = render(<ScreenTableHarness initial={[]} onSaveShortcut={blocked} saveShortcutDisabled />);
    await user.click(cell('투표 관리 × 메뉴 표시 (POLLS)'));
    await user.keyboard('{Control>}s{/Control}');
    expect(blocked).not.toHaveBeenCalled();
    second.unmount();

    const dirty = vi.fn();
    render(<ScreenTableHarness initial={[]} onSaveShortcut={dirty} />);
    await user.click(cell('투표 관리 × 메뉴 표시 (POLLS)'));
    await user.keyboard('{Control>}s{/Control}');
    expect(dirty).toHaveBeenCalledTimes(1);
  });

  if (pageInProjection('/admin/survey/polls')) it('방향키로 칸을 이동하고 빈 칸은 건너뛴다', async () => {
    const user = userEvent.setup();
    render(<ScreenTableHarness initial={[]} />);
    cell('투표 관리 × 메뉴 표시 (POLLS)').focus();
    await user.keyboard('{ArrowRight}');
    // 투표 관리의 화면 진입은 '모두 있어야 열림' 한 칸이다.
    expect(cell('투표 관리 × 화면 진입')).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(cell('투표 관리 × 등록 (POLL_CREATE)')).toHaveFocus();
    // 수정·삭제·그 밖의 기능 칸이 비어 있어 더 갈 곳이 없다.
    await user.keyboard('{ArrowRight}');
    expect(cell('투표 관리 × 등록 (POLL_CREATE)')).toHaveFocus();
    // 아래 줄(권한 그룹 관리)에는 등록 칸이 없다 — 가장 가까운 열의 칸('k/n' 화면 진입)으로 내려간다.
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: '권한 그룹 관리 × 화면 진입 0/2' })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(cell('투표 관리 × 화면 진입')).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(cell('투표 관리 × 메뉴 표시 (POLLS)')).toHaveFocus();
  });

  // 같은 이동 규칙을 모든 생성물에 있는 화면(메뉴 관리·권한 그룹 관리·사용자 관리)으로 본다 — 위 시험의 투표 관리는 설문 팩이다.
  it('방향키로 줄을 옮길 때 빈 열이면 가장 가까운 칸으로 가고, 더 갈 칸이 없으면 머문다 — 모든 생성물에 있는 화면', async () => {
    const coreRows: readonly HarnessNavigation[] = [
      { code: 'AREA', name: '관리', parentCode: null, route: null, useYn: 'Y' },
      { code: 'MENUS', name: '메뉴 관리', parentCode: 'AREA', route: '/admin/system/menus', useYn: 'Y' },
      { code: 'AUTHORITY', name: '권한 그룹 관리', parentCode: 'AREA', route: '/admin/security/authority', useYn: 'Y' },
      { code: 'USERS', name: '사용자 관리', parentCode: 'AREA', route: '/admin/user/manage', useYn: 'Y' },
    ];
    const user = userEvent.setup();
    render(<ScreenTableHarness initial={[]} navigation={coreRows} />);
    const authorityEntry = () => screen.getByRole('button', { name: '권한 그룹 관리 × 화면 진입 0/2' });
    cell('메뉴 관리 × 등록 (MENU_CREATE)').focus();
    // 아래 줄(권한 그룹 관리)에는 등록 칸이 없다 — 가장 가까운 열의 칸('k/n' 화면 진입)으로 내려간다.
    await user.keyboard('{ArrowDown}');
    expect(authorityEntry()).toHaveFocus();
    // 그 줄에는 오른쪽으로 더 갈 칸이 없다.
    await user.keyboard('{ArrowRight}');
    expect(authorityEntry()).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(cell('사용자 관리 × 화면 진입 (USER_READ)')).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(authorityEntry()).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(cell('메뉴 관리 × 화면 진입 (MENU_READ)')).toHaveFocus();
  });

  it('보호 권한은 표시를 붙이고 영역·섹션 줄의 일괄 선택에서 뺀다(H3)', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={[]} />);
    await user.click(cell('시스템 × 그 밖의 기능'));
    const selected = selectionOf(view.container);
    expect(selected).toEqual(expect.arrayContaining(['OPERATION:USER_STATUS', 'OPERATION:USER_DEPT']));
    expect(selected).not.toContain('OPERATION:USER_PASSWORD');
    expect(selected).not.toContain('OPERATION:MFA_RECOVER');
    // 다른 화면(권한 그룹 관리)의 진입 권한도 일괄 선택이 주지 않는다 — 사용자 관리 화면의 '그 밖의 기능'에 보이더라도.
    expect(selected).not.toContain('OPERATION:AUTHRT_READ');
    expect(selected).not.toContain('OPERATION:AUTHRT_AUDIT');
    // 일괄 대상이 모두 켜졌으므로 같은 칸은 '해제'가 된다.
    expect(cell('시스템 × 그 밖의 기능')).toBeChecked();
    expect(cell('시스템 × 그 밖의 기능')).toHaveAccessibleDescription(/아래 권한 2개 중 2개 · 보호 권한·타인 자료 권한·다른 화면 진입 권한 제외/);
    // 보호 권한은 화면 줄의 칸에서 따로 고른다.
    await user.click(screen.getByRole('button', { name: '시스템 하위 메뉴 펼치기' }));
    await user.click(screen.getByRole('button', { name: /^사용자 관리 × 그 밖의 기능 \d+\/\d+$/ }));
    const picker = await screen.findByRole('dialog', { name: '사용자 관리 × 그 밖의 기능 권한 고르기' });
    expect(within(picker).getByText('비밀번호 초기화 (USER_PASSWORD)').parentElement).toHaveTextContent('보호');
    const password = within(picker).getByRole('checkbox', { name: /USER_PASSWORD/ });
    expect(password).toHaveAccessibleDescription(/보호 표시가 붙은 권한/);
    // 고르는 창(포털)까지 문서 전체를 본다.
    expectDescriptionsOutsideDetails(document.body);
    await user.click(password);
    expect(selectionOf(view.container)).toContain('OPERATION:USER_PASSWORD');
    // 고르는 창 안의 칸도 바뀐 사실을 설명으로 싣는다.
    expect(password).toHaveAccessibleDescription(/저장하지 않은 변경/);
  });

  if (pageInProjection('/admin/survey/polls')) it('칸의 상태(몇 개 중 몇 개)는 변경·보호 설명이 붙어도 보조기술에 남는다', async () => {
    const user = userEvent.setup();
    render(<ScreenTableHarness initial={[]} />);
    const trigger = screen.getByRole('button', { name: '권한 그룹 관리 × 화면 진입 0/2' });
    expect(trigger).toHaveAccessibleDescription('권한 2개 중 0개 선택');
    await user.click(trigger);
    await user.click(within(await screen.findByRole('dialog', { name: '권한 그룹 관리 × 화면 진입 권한 고르기' })).getByRole('checkbox', { name: /AUTHRT_AUDIT/ }));
    // 이름은 보이는 수를 따라 바뀌고, 설명은 수와 변경 사실을 함께 싣는다.
    expect(trigger).toHaveAccessibleName('권한 그룹 관리 × 화면 진입 1/2');
    expect(trigger).toHaveAccessibleDescription(/권한 2개 중 1개 선택/);
    expect(trigger).toHaveAccessibleDescription(/저장하지 않은 변경/);
    // 하나짜리 칸은 권한 이름을, 묶음 칸은 범위를 설명으로 싣는다.
    expect(cell('투표 관리 × 등록 (POLL_CREATE)')).toHaveAccessibleDescription('투표 등록');
    // [2026-10-05 H3 정합] 화면 진입 묶음 칸은 타인 자료 권한이 필요한 투표 관리를 수에서 빼고 '직접 고르기'로 센다(종전 '화면 4개 중 1개 · 보호 권한 제외').
    expect(cell('관리 × 화면 진입')).toHaveAccessibleDescription(/아래 화면 3개 중 1개 · 보호 권한·타인 자료 권한 제외 · 직접 고르기 1/);
  });

  it('넘치는 표 상자는 칸이 모두 잠겨도 키보드로 스크롤할 수 있는 이름 있는 영역이다 — 메뉴를 늦게 읽어도(WCAG 2.1.1)', () => {
    withOverflow(() => {
      // 상위 메뉴 정보가 없는 메뉴 목록은 계층을 만들 수 없어 줄이 하나도 없다 — 상자 대신 안내 문장을 그린다.
      const broken = [{ code: 'ORPHAN', name: '상위 없는 메뉴', parentCode: 'MISSING', route: null, useYn: 'Y' as const }];
      const view = render(<ScreenTableHarness initial={[]} navigation={broken} editable={false} />);
      expect(screen.getByText('표시할 메뉴와 화면이 없습니다.')).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: '화면별 권한 표 스크롤 영역' })).toBeNull();

      view.rerender(<ScreenTableHarness initial={[]} editable={false} />);
      const region = screen.getByRole('region', { name: '화면별 권한 표 스크롤 영역' });
      expect(region).toHaveAttribute('tabindex', '0');
      expect(within(region).getByRole('table')).toBeInTheDocument();
      for (const checkbox of within(region).getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
    });
  });

  it('넘치지 않는 표 상자에는 영역 속성과 탭 정지를 두지 않는다', () => {
    render(<ScreenTableHarness initial={[]} />);
    const box = table().parentElement!;
    expect(box).not.toHaveAttribute('role');
    expect(box).not.toHaveAttribute('tabindex');
  });
});
