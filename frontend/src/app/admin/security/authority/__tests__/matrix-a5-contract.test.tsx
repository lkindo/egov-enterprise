import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SecurityMatrixVisualizer } from '../components/SecurityMatrixVisualizer';

/**
 * A5(매트릭스) archetype 계약.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A5.
 *
 * 이 저장소의 A5 실소비자는 권한 매트릭스 하나뿐이라 별도 셸을 만들지 않았다(§5 A5 판정).
 * 대신 스펙의 필수 항목을 이 계약이 직접 고정한다 — 셸이 없다는 것이 계약이 없어도 된다는
 * 뜻은 아니기 때문이다.
 *
 *   · 변경된 셀의 시각·접근 이름 표시
 *   · 저장 전 변경 요약과 "변경 없음 = 저장 불가"
 *   · 격자 방향키 이동
 */

const AUTHORS = [
  { authrtCd: 'ROLE_ADMIN', authrtNm: '관리자' },
  { authrtCd: 'ROLE_USER', authrtNm: '일반 사용자' },
];

const MENUS = [
  { menuNo: 1, menuNm: '사용자 관리', upMenuSn: 0 },
  { menuNo: 2, menuNm: '메뉴 관리', upMenuSn: 1 },
];

function renderMatrix(overrides: Partial<React.ComponentProps<typeof SecurityMatrixVisualizer>> = {}) {
  const props = {
    authors: AUTHORS,
    menus: MENUS,
    mappings: new Map([['ROLE_ADMIN', new Set([1])]]),
    changedCells: new Set<string>(),
    onToggle: vi.fn(),
    onSave: vi.fn(),
    isSaving: false,
    ...overrides,
  };
  return { props, ...render(<SecurityMatrixVisualizer {...props} />) };
}

describe('권한 매트릭스 — A5 계약', () => {
  it('변경된 셀을 접근 이름과 표시 상태로 알린다', () => {
    renderMatrix({ changedCells: new Set(['ROLE_ADMIN:1']) });

    const changed = screen.getByRole('button', { name: /관리자 역할의 '사용자 관리' 메뉴 접근 허용됨, 저장 대기 변경/ });
    expect(changed).toHaveAttribute('data-changed', 'true');

    // 손대지 않은 셀은 같은 접근 이름을 갖지 않는다.
    const untouched = screen.getByRole('button', { name: /일반 사용자 역할의 '사용자 관리' 메뉴 접근 차단됨$/ });
    expect(untouched).not.toHaveAttribute('data-changed');
  });

  it('저장 전 변경 요약을 노출하고 변경이 없으면 저장할 수 없다', () => {
    const { unmount } = renderMatrix({ changedCells: new Set() });

    expect(screen.getByText('저장 대기 변경')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /변경사항 저장/ })).toBeDisabled();
    unmount();

    renderMatrix({ changedCells: new Set(['ROLE_ADMIN:1', 'ROLE_USER:2']) });
    expect(screen.getByRole('button', { name: /변경사항 저장 \(2건\)/ })).toBeEnabled();
  });

  it('Ctrl+S 는 변경이 있을 때만 저장한다', async () => {
    const user = userEvent.setup();
    const { props, unmount } = renderMatrix({ changedCells: new Set() });

    await user.keyboard('{Control>}s{/Control}');
    expect(props.onSave).not.toHaveBeenCalled();
    unmount();

    const dirty = renderMatrix({ changedCells: new Set(['ROLE_ADMIN:1']) });
    await user.keyboard('{Control>}s{/Control}');
    expect(dirty.props.onSave).toHaveBeenCalledTimes(1);
  });

  it('격자 안에서 방향키로 셀을 이동한다', async () => {
    const user = userEvent.setup();
    renderMatrix();

    const first = screen.getByRole('button', { name: /관리자 역할의 '사용자 관리'/ });
    first.focus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /일반 사용자 역할의 '사용자 관리'/ })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: /일반 사용자 역할의 '메뉴 관리'/ })).toHaveFocus();
  });
});
