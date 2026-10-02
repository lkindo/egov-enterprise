import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ScreenTableHarness, selectionOf } from './screen-permission-table-harness';

// 칸의 내용은 화면 목록에서 온다 — 다른 영역의 화면 소스가 바뀌어도 이 시험이 흔들리지 않게 고정 목록을 쓴다.
vi.mock('@/types/generated-screen-registry', async (importOriginal) =>
  (await import('./screen-registry-fixture')).withFixtureScreenRegistry(await importOriginal()));

/**
 * '화면별 권한' 표의 동작(2026-10-02, 관리 콘솔 UX 2단계 A3). A5 규범(머리글 고정·변경 표시·키보드·저장 단축키)은
 * matrix-a5-contract.test.tsx 가 고정하고, 여기서는 칸의 종류(하나·여럿·모두 필요·묶음), 상태 칸, 펼침·검색을 본다.
 */
const cell = (name: string | RegExp) => screen.getByRole('checkbox', { name });

describe('화면별 권한 표', () => {
  it('하나라도 있으면 열리는 화면 진입은 k/n 버튼이 권한마다 고르게 하고, 그 화면의 상태를 바꾼다', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={['NAVIGATION:AREA', 'NAVIGATION:AUTHORITY']} />);
    const row = screen.getByRole('row', { name: /^권한 그룹 관리/ });
    expect(within(row).getByText('진입 권한 없음')).toBeInTheDocument();
    const trigger = screen.getByRole('button', { name: '권한 그룹 관리 × 화면 진입 0/2' });
    expect(trigger).toHaveTextContent('0/2');
    await user.click(trigger);
    const picker = await screen.findByRole('dialog', { name: '권한 그룹 관리 × 화면 진입 권한 고르기' });
    expect(within(picker).getByText('하나라도 있으면 이 화면에 들어갈 수 있습니다.')).toBeInTheDocument();
    await user.click(within(picker).getByRole('checkbox', { name: /AUTHRT_AUDIT/ }));
    expect(selectionOf(view.container)).toContain('OPERATION:AUTHRT_AUDIT');
    expect(selectionOf(view.container)).not.toContain('OPERATION:AUTHRT_READ');
    expect(trigger).toHaveTextContent('1/2');
    expect(trigger).toHaveAttribute('data-changed', 'true');
    expect(within(screen.getByRole('row', { name: /^권한 그룹 관리/ })).getByText('보임')).toBeInTheDocument();
  });

  it('모두 있어야 열리는 화면 진입은 한 체크로 전부 켜고 끄며, 일부만 있으면 일부 선택으로 보인다', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={['OPERATION:POLL_READ']} />);
    const entry = cell('투표 관리 × 화면 진입');
    expect(entry).toHaveAttribute('aria-checked', 'mixed');
    expect(entry).toHaveAttribute('title', '모두 있어야 열림: POLL_READ, POLL_READ_ALL');
    await user.click(entry);
    expect(selectionOf(view.container)).toEqual(['OPERATION:POLL_READ', 'OPERATION:POLL_READ_ALL']);
    expect(entry).toBeChecked();
    await user.click(entry);
    expect(selectionOf(view.container)).toEqual([]);
  });

  it('영역 줄의 화면 진입은 들어갈 수 없는 화면에 필요한 만큼만 더한다 — 후보가 여럿이면 조회 하나', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={['OPERATION:MENU_READ']} />);
    const area = cell('관리 × 화면 진입');
    expect(area).toHaveAttribute('aria-checked', 'mixed');
    expect(area).toHaveAttribute('title', '아래 화면 4개 중 1개 · 보호 권한 제외');
    await user.click(area);
    expect(selectionOf(view.container)).toEqual(['OPERATION:AUTHRT_READ', 'OPERATION:MENU_READ', 'OPERATION:POLL_READ', 'OPERATION:POLL_READ_ALL', 'OPERATION:USER_READ']);
    expect(area).toBeChecked();
    // 모두 들어갈 수 있으면 같은 칸이 진입 권한을 끈다.
    await user.click(area);
    expect(selectionOf(view.container)).toEqual([]);
  });

  it('섹션 줄의 등록 칸은 아래 화면의 등록 권한을 한 번에 켜고, 메뉴 표시 칸은 그 메뉴 자신만 켠다', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={[]} />);
    await user.click(cell('시스템 × 등록'));
    expect(selectionOf(view.container)).toEqual(['OPERATION:DEPT_CREATE', 'OPERATION:MENU_CREATE', 'OPERATION:USER_CREATE']);
    await user.click(cell('시스템 × 메뉴 표시 (SECTION)'));
    // 상위만 켜면 하위 메뉴 표시는 켜지지 않는다(상위는 명시적으로 함께 켜진다).
    expect(selectionOf(view.container)).toEqual(['NAVIGATION:AREA', 'NAVIGATION:SECTION', 'OPERATION:DEPT_CREATE', 'OPERATION:MENU_CREATE', 'OPERATION:USER_CREATE']);
    await user.click(screen.getByRole('button', { name: '시스템 하위 메뉴 펼치기' }));
    expect(cell('메뉴 관리 × 메뉴 표시 (MENUS)')).not.toBeChecked();
    // 상위를 끄면 하위도 끈다.
    await user.click(cell('메뉴 관리 × 메뉴 표시 (MENUS)'));
    await user.click(cell('관리 × 메뉴 표시 (AREA)'));
    expect(selectionOf(view.container).filter((key) => key.startsWith('NAVIGATION:'))).toEqual([]);
  });

  it('사용 안 함 메뉴를 표시하고, 메뉴 없이 주소로만 열리는 화면을 상태로 말한다', () => {
    render(<ScreenTableHarness initial={['OPERATION:PROGRAM_READ']} />);
    const old = screen.getByRole('row', { name: /^옛 메뉴/ });
    expect(within(old).getByText('사용 안 함', { selector: 'span.rounded' })).toBeInTheDocument();
    expect(within(old).getByText('로그인만 하면 열림')).toBeInTheDocument();
    // 메뉴에 없는 화면 묶음은 접혀 시작한다.
    const group = screen.getByRole('button', { name: '메뉴에 없는 화면 하위 메뉴 펼치기' });
    expect(group).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(group);
    const programs = screen.getByRole('row', { name: /^화면 관리/ });
    expect(within(programs).getByText('/admin/system/programs')).toBeInTheDocument();
    expect(within(programs).getByText('메뉴 없이 주소로만 열림')).toBeInTheDocument();
    // 메뉴가 없으므로 메뉴 표시 칸은 비어 있다.
    expect(screen.queryByRole('checkbox', { name: /^화면 관리 × 메뉴 표시/ })).not.toBeInTheDocument();
  });

  it('진입 권한이 없는 메뉴가 있는 섹션은 펼친 채 시작하고, 상태 칸에서 진입 권한을 더한다', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={['NAVIGATION:AREA', 'NAVIGATION:SECTION', 'NAVIGATION:USERS']} />);
    // 사용자 관리(섹션 아래 화면)에 문제가 있어 섹션이 펼쳐져 있다.
    expect(screen.getByRole('button', { name: '시스템 하위 메뉴 접기' })).toHaveAttribute('aria-expanded', 'true');
    const row = screen.getByRole('row', { name: /^사용자 관리/ });
    expect(within(row).getByText('진입 권한 없음')).toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: '사용자 관리 진입 권한 추가' }));
    expect(selectionOf(view.container)).toContain('OPERATION:USER_READ');
    expect(within(screen.getByRole('row', { name: /^사용자 관리/ })).getByText('보임')).toBeInTheDocument();
    // 누른 버튼은 사라진다 — 포커스는 표 밖으로 가지 않고 같은 줄의 화면 진입 칸에 남는다(다음 줄을 이어서 고친다).
    await waitFor(() => expect(cell('사용자 관리 × 화면 진입 (USER_READ)')).toHaveFocus());
  });

  it('화면 검색 중에는 영역·섹션 줄의 칸이 검색 결과에 보이는 화면만 바꾼다', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={[]} />);
    await user.type(screen.getByRole('textbox', { name: '화면 검색' }), 'USER_STATUS');
    const area = cell('관리 × 화면 진입');
    // 보이는 화면은 사용자 관리 하나다 — 숨은 메뉴 관리·투표 관리·권한 그룹 관리는 세지도 바꾸지도 않는다.
    expect(area).toHaveAttribute('title', '검색 결과의 화면 1개 중 0개 · 보호 권한 제외');
    expect(area).toHaveAccessibleDescription(/검색 결과의 화면 1개 중 0개/);
    await user.click(area);
    expect(selectionOf(view.container)).toEqual(['OPERATION:USER_READ']);
    await user.click(cell('시스템 × 등록'));
    expect(selectionOf(view.container)).toEqual(['OPERATION:DEPT_CREATE', 'OPERATION:USER_CREATE', 'OPERATION:USER_READ']);
    // 검색을 비우면 다시 아래 화면 전체를 센다.
    await user.clear(screen.getByRole('textbox', { name: '화면 검색' }));
    expect(cell('관리 × 화면 진입')).toHaveAttribute('title', '아래 화면 4개 중 1개 · 보호 권한 제외');
  });

  it('화면 검색은 맞는 줄과 그 상위를 보이고, 검색 밖의 선택은 그대로 둔다', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={['OPERATION:POLL_CREATE']} />);
    await user.type(screen.getByRole('textbox', { name: '화면 검색' }), 'USER_STATUS');
    expect(screen.getByRole('row', { name: /^사용자 관리/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /^투표 관리/ })).not.toBeInTheDocument();
    // 검색 중에는 펼침 버튼을 누를 수 없다(맞는 줄의 상위가 모두 보인다).
    expect(screen.getByRole('button', { name: '시스템 하위 메뉴 접기' })).toBeDisabled();
    await user.clear(screen.getByRole('textbox', { name: '화면 검색' }));
    expect(selectionOf(view.container)).toEqual(['OPERATION:POLL_CREATE']);
    await user.type(screen.getByRole('textbox', { name: '화면 검색' }), '없는 검색어');
    expect(screen.getByRole('status')).toHaveTextContent('조건에 맞는 메뉴나 화면이 없습니다.');
  });

  it('추가가 막힌 그룹(공개 메뉴)은 꺼진 기능권한 칸을 켤 수 없고 켜진 칸은 끌 수 있다', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={['OPERATION:POLL_CREATE']} allowAdd={false} />);
    expect(cell('투표 관리 × 등록 (POLL_CREATE)')).toBeEnabled();
    expect(cell('투표 관리 × 화면 진입')).toBeDisabled();
    // 메뉴 표시는 공개 메뉴 그룹도 정한다.
    expect(cell('투표 관리 × 메뉴 표시 (POLLS)')).toBeEnabled();
    await user.click(cell('투표 관리 × 등록 (POLL_CREATE)'));
    expect(selectionOf(view.container)).toEqual([]);
  });

  it('권한 설정 권한이 없으면 칸과 묶음 칸을 잠그고 진입 권한 추가 버튼을 두지 않는다', () => {
    render(<ScreenTableHarness initial={['NAVIGATION:AREA', 'NAVIGATION:POLLS']} editable={false} />);
    for (const checkbox of within(screen.getByRole('table')).getAllByRole('checkbox')) expect(checkbox).toBeDisabled();
    expect(screen.queryByRole('button', { name: /진입 권한 추가$/ })).not.toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /^투표 관리/ })).getByText('진입 권한 없음')).toBeInTheDocument();
  });

  it('줄로 가기 요청은 접힌 상위를 펼치고 그 줄의 머리글로 포커스한다', async () => {
    const view = render(<ScreenTableHarness initial={[]} focusRequest={null} />);
    expect(screen.queryByRole('row', { name: /^사용자 관리/ })).not.toBeInTheDocument();
    view.rerender(<ScreenTableHarness initial={[]} focusRequest={{ menuCode: 'USERS', nonce: 1 }} />);
    await waitFor(() => expect(screen.getByRole('rowheader', { name: '사용자 관리' })).toHaveFocus());
    expect(screen.getByRole('button', { name: '시스템 하위 메뉴 접기' })).toHaveAttribute('aria-expanded', 'true');
  });
});
