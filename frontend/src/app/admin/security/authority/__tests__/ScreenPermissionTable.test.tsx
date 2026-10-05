import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  /*
   * [2026-10-05 H3 정합 — 동작 변경] 종전(main) 이 시험은 영역 줄 '화면 진입' 한 번이 '투표 관리'(모두 있어야 열림)의 타인 자료 권한
   * POLL_READ_ALL 까지 더하는 것을 고정했다. 같은 줄의 '진입 권한 추가'·'진입 권한 모두 추가'와 카탈로그 A5 묶음 칸 규칙(보호·…_ALL 은
   * 일괄 선택에서 뺀다)에 맞춰, 그런 화면은 묶음 칸의 수에서 빠지고 '직접 고르기 n'으로 남아 화면 줄에서 고른다(권한을 좁히는 방향).
   */
  it('영역 줄의 화면 진입은 들어갈 수 없는 화면에 필요한 만큼만 더한다 — 후보가 여럿이면 조회 하나, 타인 자료 권한이 필요한 화면은 직접 고른다', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={['OPERATION:MENU_READ']} />);
    const area = cell('관리 × 화면 진입');
    expect(area).toHaveAttribute('aria-checked', 'mixed');
    expect(area).toHaveAttribute('title', '아래 화면 3개 중 1개 · 보호 권한·타인 자료 권한 제외 · 직접 고르기 1(보호·타인 자료 권한이 필요한 화면)');
    expect(area).toHaveAccessibleDescription(/직접 고르기 1/);
    await user.click(area);
    // 투표 관리(POLL_READ + POLL_READ_ALL)는 더하지 않는다 — 타인 자료 권한을 묶음 칸 한 번으로 주지 않는다.
    expect(selectionOf(view.container)).toEqual(['OPERATION:AUTHRT_READ', 'OPERATION:MENU_READ', 'OPERATION:USER_READ']);
    expect(area).toBeChecked();
    // 빠진 화면의 이름은 '현재 줄' 띠가 보이는 글자로 말한다(누른 줄이 영역 줄이다).
    expect(screen.getByTestId('screen-permission-current-row')).toHaveTextContent("'화면 진입' 칸에서 빠져 직접 고를 화면(보호·타인 자료 권한 필요): 투표 관리");
    // 투표 관리는 화면 줄의 칸에서 고른다.
    await user.click(cell('투표 관리 × 화면 진입'));
    expect(selectionOf(view.container)).toEqual(['OPERATION:AUTHRT_READ', 'OPERATION:MENU_READ', 'OPERATION:POLL_READ', 'OPERATION:POLL_READ_ALL', 'OPERATION:USER_READ']);
    // 모두 들어갈 수 있으면 같은 칸이 진입 권한을 끄되, 묶음 칸이 다루지 않는 투표 관리의 두 권한은 남긴다.
    await user.click(area);
    expect(selectionOf(view.container)).toEqual(['OPERATION:POLL_READ', 'OPERATION:POLL_READ_ALL']);
  });

  it('보호·타인 자료 권한이 있어야 들어가는 화면만 있는 묶음 줄의 화면 진입 칸은 체크 대신 직접 고를 화면 수를 글자로 보인다', () => {
    const navigation = [
      { code: 'VOTE', name: '투표', parentCode: null, route: null, useYn: 'Y' as const },
      { code: 'POLLS', name: '투표 관리', parentCode: 'VOTE', route: '/admin/survey/polls', useYn: 'Y' as const },
    ];
    render(<ScreenTableHarness initial={[]} navigation={navigation} />);
    const row = screen.getByRole('rowheader', { name: '투표' }).closest('tr')!;
    expect(within(row).queryByRole('checkbox', { name: '투표 × 화면 진입' })).toBeNull();
    expect(within(row).getByText('직접 고르기 1')).toBeVisible();
    // 화면 줄의 칸은 그대로 고를 수 있다.
    expect(cell('투표 관리 × 화면 진입')).toBeEnabled();
  });

  /*
   * [2026-10-05 사용자 승인 — 시안 의미] 영역·섹션 줄의 메뉴 표시 칸은 그 아래 메뉴 전체를 켜고 끈다. 종전에는 그 메뉴 자신만 켰다.
   * 켤 때는 상위도 함께 켜 상위 누락을 만들지 않고, 끌 때는 아래 전체를 끈다. 기능권한(OPERATION)은 그대로다(H3).
   */
  it('섹션 줄의 등록 칸은 아래 화면의 등록 권한을 한 번에 켜고, 메뉴 표시 칸은 그 아래 메뉴 전체를 켜고 끈다', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={[]} />);
    const navigationOf = () => selectionOf(view.container).filter((key) => key.startsWith('NAVIGATION:'));
    await user.click(cell('시스템 × 등록'));
    expect(selectionOf(view.container)).toEqual(['OPERATION:DEPT_CREATE', 'OPERATION:MENU_CREATE', 'OPERATION:USER_CREATE']);
    const section = cell('시스템 × 메뉴 표시 (SECTION)');
    expect(section).toHaveAccessibleDescription(/아래 메뉴 3개 중 0개 표시 · 이 메뉴 표시 안 함/);
    await user.click(section);
    // 섹션과 그 아래 메뉴 전체, 그리고 상위(관리)가 함께 켜진다. 등록 권한은 그대로다.
    expect(selectionOf(view.container)).toEqual(['NAVIGATION:AREA', 'NAVIGATION:MENUS', 'NAVIGATION:SECTION', 'NAVIGATION:USERS', 'OPERATION:DEPT_CREATE', 'OPERATION:MENU_CREATE', 'OPERATION:USER_CREATE']);
    expect(section).toBeChecked();
    expect(section).toHaveAttribute('data-changed', 'true');
    // 영역 줄은 아래 메뉴 6개 중 4개라 일부 선택이고, 보이는 수를 함께 적는다.
    expect(cell('관리 × 메뉴 표시 (AREA)')).toBePartiallyChecked();
    expect(within(screen.getByRole('row', { name: /^관리/ })).getByText('4/6')).toBeInTheDocument();
    // 다시 누르면 섹션과 그 아래만 끈다(상위는 남는다).
    await user.click(section);
    expect(navigationOf()).toEqual(['NAVIGATION:AREA']);
    // 화면 줄의 메뉴 표시는 그 메뉴 자신이다(상위는 함께 켠다).
    await user.click(screen.getByRole('button', { name: '시스템 하위 메뉴 펼치기' }));
    await user.click(cell('메뉴 관리 × 메뉴 표시 (MENUS)'));
    expect(navigationOf()).toEqual(['NAVIGATION:AREA', 'NAVIGATION:MENUS', 'NAVIGATION:SECTION']);
    // 일부 선택인 영역 줄을 누르면 먼저 아래 전체를 켜고, 한 번 더 누르면 아래 전체를 끈다.
    await user.click(cell('관리 × 메뉴 표시 (AREA)'));
    expect(navigationOf()).toEqual(['NAVIGATION:AREA', 'NAVIGATION:AUTHORITY', 'NAVIGATION:MENUS', 'NAVIGATION:POLLS', 'NAVIGATION:SECTION', 'NAVIGATION:USERS']);
    await user.click(cell('관리 × 메뉴 표시 (AREA)'));
    expect(navigationOf()).toEqual([]);
    expect(selectionOf(view.container).filter((key) => key.startsWith('OPERATION:'))).toEqual(['OPERATION:DEPT_CREATE', 'OPERATION:MENU_CREATE', 'OPERATION:USER_CREATE']);
  });

  it('검색 중 섹션 줄의 메뉴 표시는 보이는 메뉴만 켜고, 끌 때는 상위 누락을 남기지 않게 아래 전체를 끈다', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={[]} />);
    const navigationOf = () => selectionOf(view.container).filter((key) => key.startsWith('NAVIGATION:'));
    await user.type(screen.getByRole('textbox', { name: '화면 검색' }), 'USER_STATUS');
    const section = cell('시스템 × 메뉴 표시 (SECTION)');
    expect(section).toHaveAccessibleDescription(/검색 결과의 메뉴 2개 중 0개 표시/);
    await user.click(section);
    // 보이는 것은 섹션과 사용자 관리뿐이다 — 숨은 메뉴 관리는 켜지 않는다.
    expect(navigationOf()).toEqual(['NAVIGATION:AREA', 'NAVIGATION:SECTION', 'NAVIGATION:USERS']);
    await user.clear(screen.getByRole('textbox', { name: '화면 검색' }));
    await user.click(screen.getByRole('button', { name: '시스템 하위 메뉴 펼치기' }));
    await user.click(cell('메뉴 관리 × 메뉴 표시 (MENUS)'));
    expect(navigationOf()).toContain('NAVIGATION:MENUS');
    // 다시 검색해 섹션을 끄면 검색 밖의 메뉴 관리도 함께 꺼진다 — 상위가 꺼진 하위는 보이지 않고 저장도 막히기 때문이다.
    await user.type(screen.getByRole('textbox', { name: '화면 검색' }), 'USER_STATUS');
    await user.click(cell('시스템 × 메뉴 표시 (SECTION)'));
    expect(navigationOf()).toEqual(['NAVIGATION:AREA']);
  });

  it('섹션 줄의 상태 칸은 보임 n/m · 경고 n 과 그 섹션의 자동 가능한 진입 권한만 더하는 버튼을 둔다', async () => {
    const user = userEvent.setup();
    // 메뉴 관리·사용자 관리(시스템 섹션)와 권한 그룹 관리(영역 바로 아래)에 메뉴 표시만 있고 진입 권한이 없다.
    const view = render(<ScreenTableHarness initial={['NAVIGATION:AREA', 'NAVIGATION:SECTION', 'NAVIGATION:MENUS', 'NAVIGATION:USERS', 'NAVIGATION:AUTHORITY']} />);
    const sectionRow = screen.getByRole('row', { name: /^시스템/ });
    expect(within(sectionRow).getByText('보임 0/2')).toBeInTheDocument();
    expect(within(sectionRow).getByText('· 경고 2')).toBeInTheDocument();
    const areaRow = screen.getByRole('row', { name: /^관리/ });
    // 영역은 아래 화면 4개(투표 관리는 메뉴 표시 없음) 가운데 경고 3 — 권한 그룹 관리는 후보가 여럿이라 섹션 단위 추가에서 빠진다.
    expect(within(areaRow).getByText('· 경고 3')).toBeInTheDocument();
    expect(within(areaRow).getByRole('button', { name: '관리 아래 메뉴 2개 진입 권한 추가' })).toHaveTextContent('진입 권한 추가');
    // 더할 권한은 누르기 전에 설명 요소로도 읽힌다 — title 은 마우스를 올려야 보이고 화면낭독기마다 읽는 방식이 달라, 설명 요소를 따로 둔다.
    const sectionAdd = within(areaRow).getByRole('button', { name: '관리 아래 메뉴 2개 진입 권한 추가' });
    expect(sectionAdd).toHaveAccessibleDescription('더할 권한: 메뉴 × 조회 (MENU_READ), 사용자 × 조회 (USER_READ)');
    expect(document.getElementById(sectionAdd.getAttribute('aria-describedby') ?? '')).toHaveTextContent('더할 권한: 메뉴 × 조회 (MENU_READ), 사용자 × 조회 (USER_READ)');
    // 후보가 여럿인 권한 그룹 관리는 '직접 고르기'로 센다. 섹션 단추가 더할 권한은 '현재 줄' 띠가 글자로 보인다(누르기 전에).
    expect(within(areaRow).getByText('· 직접 고르기 1')).toBeInTheDocument();
    act(() => screen.getByRole('rowheader', { name: '관리' }).focus());
    expect(screen.getByTestId('screen-permission-current-row')).toHaveTextContent(
      "현재 줄 관리 · '진입 권한 추가'가 더할 권한: 메뉴 조회 (MENU_READ), 사용자 조회 (USER_READ) · 화면 줄에서 직접 고를 메뉴 1개");
    await user.click(within(sectionRow).getByRole('button', { name: '시스템 아래 메뉴 2개 진입 권한 추가' }));
    expect(selectionOf(view.container)).toEqual(expect.arrayContaining(['OPERATION:MENU_READ', 'OPERATION:USER_READ']));
    expect(selectionOf(view.container)).not.toContain('OPERATION:AUTHRT_READ');
    expect(within(screen.getByRole('row', { name: /^시스템/ })).getByText('보임 2/2')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /^시스템/ })).queryByRole('button', { name: /진입 권한 추가/ })).toBeNull();
    // 버튼이 사라져도 포커스는 표 밖으로 가지 않고 그 섹션 줄의 화면 진입 칸에 남는다.
    await waitFor(() => expect(cell('시스템 × 화면 진입')).toHaveFocus());
  });

  it('문제 줄만은 누른 때 고칠 일이 있는 줄(과 상위)만 고정해 보이고, 고쳐도 줄이 사라지지 않는다', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={['NAVIGATION:AREA', 'NAVIGATION:SECTION', 'NAVIGATION:USERS', 'NAVIGATION:POLLS', 'OPERATION:POLL_READ', 'OPERATION:POLL_READ_ALL']} />);
    const problems = screen.getByRole('button', { name: /^문제 줄만/ });
    expect(problems).toHaveAttribute('aria-pressed', 'false');
    // 사용자 관리(진입 권한 없음)와 그 때문에 열 수 있는 하위가 없어 숨는 시스템 섹션 — 둘 다 고칠 일이다.
    expect(problems).toHaveTextContent('문제 줄만 2');
    await user.click(problems);
    expect(screen.getByRole('button', { name: /^문제 줄만/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('row', { name: /^사용자 관리/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /^시스템/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /^투표 관리/ })).toBeNull();
    expect(screen.queryByRole('row', { name: /^메뉴 관리/ })).toBeNull();
    // 거르는 동안에는 펼침을 바꿀 수 없다(보이는 줄의 상위가 모두 보인다).
    expect(screen.getByRole('button', { name: '시스템 하위 메뉴 접기' })).toBeDisabled();
    await user.click(within(screen.getByRole('row', { name: /^사용자 관리/ })).getByRole('button', { name: /^사용자 관리 진입 권한 추가/ }));
    expect(selectionOf(view.container)).toContain('OPERATION:USER_READ');
    // 고친 줄은 그대로 남아 '보임'을 말하고, 포커스는 그 줄의 화면 진입 칸에 있다.
    expect(within(screen.getByRole('row', { name: /^사용자 관리/ })).getByText('보임')).toBeInTheDocument();
    await waitFor(() => expect(cell('사용자 관리 × 화면 진입 (USER_READ)')).toHaveFocus());
    await user.click(screen.getByRole('button', { name: /^문제 줄만/ }));
    expect(screen.getByRole('row', { name: /^투표 관리/ })).toBeInTheDocument();
  });

  it('바뀐 줄만은 누른 때 저장하지 않은 변경이 있는 줄(과 상위)만 고정해 보인다', async () => {
    const user = userEvent.setup();
    render(<ScreenTableHarness initial={[]} />);
    await user.click(cell('투표 관리 × 등록 (POLL_CREATE)'));
    const changedOnly = screen.getByRole('button', { name: '바뀐 줄만' });
    await user.click(changedOnly);
    expect(changedOnly).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('row', { name: /^투표 관리/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /^권한 그룹 관리/ })).toBeNull();
    expect(screen.queryByRole('row', { name: /^시스템/ })).toBeNull();
    // 되돌려도 줄은 남는다(누른 때 고정) — 포커스한 칸이 사라지지 않는다.
    await user.click(cell('투표 관리 × 등록 (POLL_CREATE)'));
    expect(screen.getByRole('row', { name: /^투표 관리/ })).toBeInTheDocument();
    expect(screen.queryByText(/바꾼 권한/)).toBeNull();
    await user.click(changedOnly);
    expect(screen.getByRole('row', { name: /^권한 그룹 관리/ })).toBeInTheDocument();
  });

  /*
   * [2026-10-05 반박 리뷰 반영] 종전에는 그 줄의 칸에 포커스가 오면 이름을 펼쳤다(group-focus-within 줄바꿈). Chromium 은 mousedown 에
   * 포커스를 주므로 줄 높이가 33→73px 로 바뀌며 칸이 밀려, 긴 이름 줄의 첫 클릭이 칸을 바꾸지 못했다(구조 재현 실측 — Playwright
   * check 도 실패). 이제 이름은 늘 한 줄이고, 이름 전체·경로·필요한 권한은 표 아래 '현재 줄' 띠가 보이는 글자로 보인다.
   */
  it('이름은 늘 한 줄이고(포커스로 줄 높이를 바꾸지 않는다) 경로는 설명이다 — 표 위 설명은 이 표 읽는 법 하나에 모인다', () => {
    render(<ScreenTableHarness initial={[]} />);
    const header = screen.getByRole('rowheader', { name: '투표 관리' });
    expect(header).toHaveAccessibleDescription('/admin/survey/polls');
    const name = within(header).getByText('투표 관리');
    expect(name).toHaveClass('truncate');
    expect(name).toHaveAttribute('title', '투표 관리 · /admin/survey/polls');
    // 표 안 어디에도 포커스로 배치를 바꾸는 변형을 두지 않는다.
    expect(screen.getByRole('table').innerHTML).not.toMatch(/group-focus-within/);
    const help = screen.getByText('이 표 읽는 법').closest('details')!;
    expect(help).not.toHaveAttribute('open');
    expect(within(help).getByText(/메뉴 숨김은 기능권한을 회수하지 않습니다/)).toBeInTheDocument();
    expect(within(help).getByText(/보호 표시가 붙은 권한은/)).toBeInTheDocument();
    // [2026-10-05 과제 B] 도움말은 도구 줄 오른쪽 끝에 붙이지 않는다 — 탭 내용(스크롤 상자)의 잘림 경계·표 오른쪽 테두리에 맞닿아 1366×768 에서
    //   마지막 글자가 잘린 것처럼 보였다(구조 측정: 글자 끝 1289 = 경계 안쪽 끝). 거르기 단추 뒤에 잇고 글자는 한 줄을 지킨다.
    expect(help).not.toHaveClass('ml-auto');
    expect(screen.getByText('이 표 읽는 법')).toHaveClass('whitespace-nowrap');
    expect(help.compareDocumentPosition(screen.getByRole('button', { name: /^바뀐 줄/ })) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it('사용 안 함 메뉴를 표시하고, 메뉴 없이 주소로만 열리는 화면을 상태로 말한다', () => {
    render(<ScreenTableHarness initial={['OPERATION:ADMCODE_READ']} />);
    const old = screen.getByRole('row', { name: /^옛 메뉴/ });
    expect(within(old).getByText('사용 안 함', { selector: 'span.rounded' })).toBeInTheDocument();
    expect(within(old).getByText('로그인만 하면 열림')).toBeInTheDocument();
    // 메뉴에 없는 화면 묶음은 접혀 시작한다.
    const group = screen.getByRole('button', { name: '메뉴에 없는 화면 하위 메뉴 펼치기' });
    expect(group).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(group);
    const programs = screen.getByRole('row', { name: /^행정 표준코드 관리/ });
    expect(within(programs).getByText('메뉴 없이 주소로만 열림')).toBeInTheDocument();
    // 경로는 보이는 글자로 '현재 줄' 띠에 있다 — 종전 단언은 sr-only 설명을 찾아 통과했다(경로가 보이는지는 보지 않던 빈 검사).
    fireEvent.click(within(programs).getByRole('rowheader'));
    const route = within(screen.getByTestId('screen-permission-current-row')).getByText('/admin/system/codes/administ');
    expect(route).not.toHaveClass('sr-only');
    expect(route.closest('.sr-only')).toBeNull();
    // 메뉴가 없으므로 메뉴 표시 칸은 비어 있다.
    expect(screen.queryByRole('checkbox', { name: /^행정 표준코드 관리 × 메뉴 표시/ })).not.toBeInTheDocument();
  });

  it('진입 권한이 없는 메뉴가 있는 섹션은 펼친 채 시작하고, 상태 칸에서 진입 권한을 더한다', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={['NAVIGATION:AREA', 'NAVIGATION:SECTION', 'NAVIGATION:USERS']} />);
    // 사용자 관리(섹션 아래 화면)에 문제가 있어 섹션이 펼쳐져 있다.
    expect(screen.getByRole('button', { name: '시스템 하위 메뉴 접기' })).toHaveAttribute('aria-expanded', 'true');
    const row = screen.getByRole('row', { name: /^사용자 관리/ });
    expect(within(row).getByText('진입 권한 없음')).toBeInTheDocument();
    // 상태 칸은 한 줄이다 — 상태 글자와 짧은 '권한 추가'(이름에 메뉴와 더할 권한 이름).
    // 보이는 글자가 더할 권한 이름이다 — 누르기 전에 무엇이 더해지는지 글자로 본다(종전 '권한 추가'는 title·설명에만 두었다).
    const add = within(row).getByRole('button', { name: '사용자 관리 진입 권한 추가: 사용자 조회' });
    expect(add).toHaveTextContent('사용자 조회');
    expect(add).not.toHaveTextContent('권한 추가');
    expect(add).toHaveAccessibleDescription('필요한 권한: 사용자 × 조회 (USER_READ)');
    expect(add.parentElement).toHaveClass('whitespace-nowrap');
    await user.click(add);
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
    // [2026-10-05 H3 정합] 칸 설명이 실제 제외 규칙을 말한다(종전 '보호 권한 제외' 만 말하고 타인 자료 권한을 더했다).
    expect(area).toHaveAttribute('title', '검색 결과의 화면 1개 중 0개 · 보호 권한·타인 자료 권한 제외');
    expect(area).toHaveAccessibleDescription(/검색 결과의 화면 1개 중 0개/);
    await user.click(area);
    expect(selectionOf(view.container)).toEqual(['OPERATION:USER_READ']);
    await user.click(cell('시스템 × 등록'));
    expect(selectionOf(view.container)).toEqual(['OPERATION:DEPT_CREATE', 'OPERATION:USER_CREATE', 'OPERATION:USER_READ']);
    // 검색을 비우면 다시 아래 화면 전체를 센다.
    await user.clear(screen.getByRole('textbox', { name: '화면 검색' }));
    // 타인 자료 권한이 필요한 투표 관리는 묶음 칸의 수에서 빠지고 '직접 고르기'로 센다.
    expect(cell('관리 × 화면 진입')).toHaveAttribute('title', '아래 화면 3개 중 1개 · 보호 권한·타인 자료 권한 제외 · 직접 고르기 1(보호·타인 자료 권한이 필요한 화면)');
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
    // [2026-10-05] 버튼 이름 뒤에 권한 이름이 붙는다 — 끝 고정($)을 두면 늘 맞지 않아 빈 검사가 된다.
    expect(screen.queryByRole('button', { name: /진입 권한 추가|권한 추가/ })).not.toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /^투표 관리/ })).getByText('진입 권한 없음')).toBeInTheDocument();
  });

  it('현재 줄 띠는 키보드로 옮긴 줄과 누른 줄의 이름 전체·경로·화면 진입에 필요한 권한을 보이는 글자로 보인다', async () => {
    const user = userEvent.setup();
    render(<ScreenTableHarness initial={['NAVIGATION:AREA', 'NAVIGATION:POLLS']} />);
    const strip = screen.getByTestId('screen-permission-current-row');
    expect(strip).toHaveTextContent(/줄을 누르거나 키보드로 옮기면/);
    // 키보드 포커스는 바로 보인다.
    act(() => cell('투표 관리 × 메뉴 표시 (POLLS)').focus());
    expect(strip).toHaveTextContent('현재 줄 투표 관리 · /admin/survey/polls · 화면 진입(모두 필요): 투표 조회 (POLL_READ) + 타인 투표 조회 (POLL_READ_ALL)');
    expect(screen.getByRole('row', { name: /^투표 관리/ })).toHaveAttribute('data-current', 'true');
    // 마우스·터치는 누른 줄로 바뀐다.
    await user.click(cell('권한 그룹 관리 × 메뉴 표시 (AUTHORITY)'));
    expect(strip).toHaveTextContent('현재 줄 권한 그룹 관리 · /admin/security/authority · 화면 진입(하나만 있으면 됨): 권한 조회 (AUTHRT_READ) 또는 권한 감사 (AUTHRT_AUDIT)');
    expect(screen.getByRole('row', { name: /^투표 관리/ })).not.toHaveAttribute('data-current');
  });

  it('포인터로 누르는 동안의 포커스로는 현재 줄을 바꾸지 않고 뗀 뒤 바꾼다 — 누르는 사이 배치가 움직여 클릭이 빗나가지 않게', () => {
    render(<ScreenTableHarness initial={[]} />);
    const strip = screen.getByTestId('screen-permission-current-row');
    const target = cell('투표 관리 × 메뉴 표시 (POLLS)');
    fireEvent.pointerDown(target);
    act(() => target.focus());
    expect(strip).not.toHaveTextContent('투표 관리');
    fireEvent.pointerUp(target);
    fireEvent.click(target);
    expect(strip).toHaveTextContent('현재 줄 투표 관리 · ');
    // 뗀 뒤의 키보드 포커스는 다시 바로 보인다.
    act(() => screen.getByRole('rowheader', { name: '옛 메뉴' }).focus());
    expect(strip).toHaveTextContent('현재 줄 옛 메뉴 · 사용 안 함 · /note · ');
  });

  /*
   * [2026-10-05 반박 리뷰 반영, H3] 섹션 줄의 '진입 권한 추가'는 묶음 칸과 같은 제외 규칙을 따른다 — '모두 있어야 열림' 투표 관리
   * (POLL_READ + POLL_READ_ALL)처럼 타인 자료 권한이 필요한 메뉴는 빼고 '직접 고르기'로 센다. 종전에는 영역 줄 한 번이 POLL_READ_ALL
   * 을 초안에 넣었고, 더할 코드는 title 에만 있었다.
   */
  it('섹션 줄의 진입 권한 추가는 타인 자료 권한이 필요한 메뉴를 빼고, 그 메뉴는 화면 줄에서 고른다', async () => {
    const user = userEvent.setup();
    const view = render(<ScreenTableHarness initial={['NAVIGATION:AREA', 'NAVIGATION:SECTION', 'NAVIGATION:MENUS', 'NAVIGATION:POLLS']} />);
    const areaRow = screen.getByRole('row', { name: /^관리/ });
    expect(within(areaRow).getByText('· 직접 고르기 1')).toBeInTheDocument();
    await user.click(within(areaRow).getByRole('button', { name: '관리 아래 메뉴 1개 진입 권한 추가' }));
    expect(selectionOf(view.container)).toContain('OPERATION:MENU_READ');
    expect(selectionOf(view.container)).not.toContain('OPERATION:POLL_READ_ALL');
    expect(selectionOf(view.container)).not.toContain('OPERATION:POLL_READ');
    // 투표 관리 줄은 더할 권한을 보이는 글자로 둔 채 남는다 — 사람이 그 화면 하나를 골라 더한다.
    const polls = within(screen.getByRole('row', { name: /^투표 관리/ })).getByRole('button', { name: '투표 관리 진입 권한 추가: 투표 조회, 타인 투표 조회' });
    expect(polls).toHaveTextContent('투표 조회, 타인 투표 조회');
    await user.click(polls);
    expect(selectionOf(view.container)).toEqual(expect.arrayContaining(['OPERATION:POLL_READ', 'OPERATION:POLL_READ_ALL']));
  });

  it('거를 줄이 없으면 문제 줄만·바뀐 줄만을 막고 없다고 말한다 — 눌러도 표가 비지 않는다(G15)', async () => {
    const user = userEvent.setup();
    render(<ScreenTableHarness initial={[]} />);
    const problems = screen.getByRole('button', { name: '문제 줄 없음' });
    expect(problems).toHaveAttribute('aria-disabled', 'true');
    // disabled 가 아니다 — 포커스를 받아 이유를 들을 수 있다.
    expect(problems).not.toBeDisabled();
    await user.click(problems);
    expect(problems).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('조건에 맞는 메뉴나 화면이 없습니다.')).toBeNull();
    const changed = screen.getByRole('button', { name: '바뀐 줄 없음' });
    expect(changed).toHaveAttribute('aria-disabled', 'true');
    await user.click(changed);
    expect(changed).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('조건에 맞는 메뉴나 화면이 없습니다.')).toBeNull();
    // 바꾸면 다시 누를 수 있다.
    await user.click(cell('투표 관리 × 등록 (POLL_CREATE)'));
    expect(screen.getByRole('button', { name: '바뀐 줄만' })).not.toHaveAttribute('aria-disabled');
  });

  it('그 밖의 기능 칸이 권한 하나면 권한 이름을 보이는 글자로 두고 접근 이름에도 싣는다', () => {
    render(<ScreenTableHarness initial={[]} />);
    // 옛 메뉴(/note)의 그 밖의 기능은 사용자 조회 하나다(화면 목록 고정본) — 열 이름만으로는 무엇인지 알 수 없다.
    const checkbox = cell('옛 메뉴 × 그 밖의 기능: 사용자 조회 (USER_READ)');
    // 보이는 글자다 — 같은 칸의 sr-only 설명(권한 이름)이 아니다.
    const visible = [...checkbox.parentElement!.children].filter((child) => !child.classList.contains('sr-only') && child.textContent === '사용자 조회');
    expect(visible).toHaveLength(1);
    // 등록·수정·삭제 칸은 열 이름이 곧 행위다 — 이름을 덧붙이지 않는다(설명으로만 읽힌다).
    const create = cell('투표 관리 × 등록 (POLL_CREATE)');
    expect([...create.parentElement!.children].filter((child) => !child.classList.contains('sr-only') && child !== create)).toEqual([]);
  });

  it('줄로 가기 요청은 접힌 상위를 펼치고 그 줄의 머리글로 포커스한다', async () => {
    const view = render(<ScreenTableHarness initial={[]} focusRequest={null} />);
    expect(screen.queryByRole('row', { name: /^사용자 관리/ })).not.toBeInTheDocument();
    view.rerender(<ScreenTableHarness initial={[]} focusRequest={{ menuCode: 'USERS', nonce: 1 }} />);
    await waitFor(() => expect(screen.getByRole('rowheader', { name: '사용자 관리' })).toHaveFocus());
    expect(screen.getByRole('button', { name: '시스템 하위 메뉴 접기' })).toHaveAttribute('aria-expanded', 'true');
  });
});
