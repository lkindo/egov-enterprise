import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PermissionCode } from '@/types/generated-permissions';
import type { PermissionBundle } from '@/types/generated-screen-registry';
import { ALL_PRESENT_REASON, OPEN_SCREEN_NOTICE, PermissionBundleDialog, PROTECTED_BUNDLE_NOTICE } from '../components/PermissionBundleDialog';

// 메뉴가 여는 화면은 화면 목록에서 온다 — 다른 영역의 화면 소스가 바뀌어도 계약이 흔들리지 않게 고정 목록을 쓴다.
vi.mock('@/types/generated-screen-registry', async (importOriginal) =>
  (await import('./screen-registry-fixture')).withFixtureScreenRegistry(await importOriginal()));

/**
 * '권한 묶음 적용' 대화상자(2026-10-02, 관리 콘솔 UX 3단계 G2). 묶음 목록(이름·설명·기능권한 수·여는 화면 수·보호 표시)과
 * 미리보기(추가 수·화면과 메뉴·사용 안 함 상위·고정 안내·보호 안내), 초안에만 더하는 버튼을 고정한다.
 */
const NAVIGATION = [
  { code: 'AREA', name: '관리', parentCode: null, route: null, useYn: 'Y' as const },
  { code: 'SECTION', name: '시스템', parentCode: 'AREA', route: null, useYn: 'Y' as const },
  { code: 'MENUS', name: '메뉴 관리', parentCode: 'SECTION', route: '/admin/system/menus', useYn: 'Y' as const },
  { code: 'PROGRAMS', name: '화면 관리', parentCode: 'SECTION', route: '/admin/system/programs', useYn: 'Y' as const },
  { code: 'HIDDEN', name: '옛 시스템', parentCode: 'AREA', route: null, useYn: 'N' as const },
  { code: 'MENUS_COPY', name: '메뉴 관리(옛)', parentCode: 'HIDDEN', route: '/admin/system/menus?tab=old', useYn: 'Y' as const },
  { code: 'USERS', name: '사용자 관리', parentCode: 'AREA', route: '/admin/user/manage', useYn: 'Y' as const },
];
const OPERATION_CODES = ['MENU_READ', 'MENU_UPDATE', 'PROGRAM_READ', 'USER_READ', 'USER_PASSWORD'];
const MENU_BUNDLE: PermissionBundle = {
  id: 'menu-screen', name: '메뉴·화면 설정', description: '메뉴와 화면 관리를 맡깁니다.', protected: false,
  permissions: ['MENU_READ', 'MENU_UPDATE', 'PROGRAM_READ'] as PermissionCode[], screens: ['/admin/system/menus', '/admin/system/programs'], relatedScreens: [],
};
const RECOVERY_BUNDLE: PermissionBundle = {
  id: 'account-recovery', name: '계정 복구', description: '비밀번호 초기화를 맡깁니다.', protected: true,
  permissions: ['USER_PASSWORD', 'USER_READ'] as PermissionCode[], screens: ['/admin/user/manage'], relatedScreens: [],
};
/** 누구나 들어가는 관련 화면(업무 쪽지함)이 있는 묶음. */
const NOTE_BUNDLE: PermissionBundle = {
  id: 'note-work', name: '쪽지 업무', description: '사용자 조회와 쪽지 보내기를 맡깁니다.', protected: false,
  permissions: ['USER_READ', 'NOTE_SEND'] as PermissionCode[], screens: ['/admin/user/manage'], relatedScreens: ['/note', '/smart-toolkit/dept-job/[id]'],
};
const NOTE_NAVIGATION = [
  ...NAVIGATION,
  { code: 'WORK', name: '나의 업무', parentCode: null, route: null, useYn: 'Y' as const },
  { code: 'NOTE', name: '쪽지함', parentCode: 'WORK', route: '/note', useYn: 'Y' as const },
];

function renderDialog(overrides: Partial<Parameters<typeof PermissionBundleDialog>[0]> = {}) {
  const selection: ReadonlySet<string> = overrides.selection ?? new Set(['OPERATION:MENU_READ']);
  const props = {
    // 저장본은 따로 주지 않으면 초안과 같다(저장하지 않은 변경 없음).
    groupName: '콘텐츠 담당', bundles: [MENU_BUNDLE, RECOVERY_BUNDLE], selection, saved: selection,
    navigation: NAVIGATION, operationCodes: OPERATION_CODES, canAssign: true, onAddToDraft: vi.fn(), onClose: vi.fn(), ...overrides,
  };
  render(<PermissionBundleDialog {...props} />);
  return props;
}
const addButton = () => screen.getByRole('button', { name: '선택한 묶음을 초안에 추가' });

describe('권한 묶음 적용 대화상자', () => {
  it('묶음마다 이름·설명·기능권한 수·여는 화면 수와 보호 표시를 보이고, 고르기 전에는 더하지 않는다', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: '권한 묶음 적용' });
    const menu = within(dialog).getByRole('radio', { name: /메뉴·화면 설정/ });
    // 관련 화면이 없는 묶음은 그 수를 말하지 않는다.
    expect(menu).toHaveAccessibleDescription('메뉴와 화면 관리를 맡깁니다. · 기능권한 3개 · 권한으로 열리는 화면 2개');
    // 이름은 묶음 이름(과 보호 표시)이고 설명은 따로 읽힌다 — 같은 문장을 두 번 읽지 않는다.
    expect(menu).toHaveAccessibleName('메뉴·화면 설정');
    expect(within(dialog).getByRole('radio', { name: '계정 복구 보호 권한 포함' })).toBeInTheDocument();
    expect(within(dialog).getAllByText('보호 권한 포함')).toHaveLength(1);
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAccessibleDescription('묶음을 고르면 이 그룹에 더해지는 권한과 메뉴를 미리 보입니다.');
    // 입력 칸 없는 라디오 목록이라 폼이 아니다 — 미저장 닫기 확인 대상이 아니다.
    expect(dialog.querySelector('form')).toBeNull();
  });

  it('고르면 추가 수·화면과 메뉴·사용 안 함 상위·고정 안내를 보이고, 초안에 추가하면 그 묶음을 넘긴다', async () => {
    const props = renderDialog();
    await userEvent.click(screen.getByRole('radio', { name: /메뉴·화면 설정/ }));
    const preview = screen.getByRole('region', { name: '묶음 미리보기' });
    expect(preview).toHaveTextContent('기능권한 추가 2개(이미 있음 1개) · 메뉴 표시 추가 4개');
    expect(preview).toHaveTextContent('권한으로 열리는 화면 2개');
    // 관련 화면이 없으면 그 목록을 두지 않는다.
    expect(preview).not.toHaveTextContent('누구나 들어가는 관련 화면 ');
    expect(preview).toHaveTextContent('메뉴 관리 — 메뉴: 메뉴 관리');
    expect(preview).toHaveTextContent('화면 관리 — 메뉴: 화면 관리');
    expect(preview).toHaveTextContent('사용 안 함 상위 메뉴 때문에 표시하지 않는 메뉴');
    expect(preview).toHaveTextContent("메뉴 관리(옛) (상위 메뉴 '옛 시스템' 사용 안 함)");
    expect(preview).toHaveTextContent(OPEN_SCREEN_NOTICE);
    expect(preview).not.toHaveTextContent(PROTECTED_BUNDLE_NOTICE);
    expect(addButton()).toBeEnabled();
    await userEvent.click(addButton());
    expect(props.onAddToDraft).toHaveBeenCalledTimes(1);
    expect(props.onAddToDraft).toHaveBeenCalledWith(MENU_BUNDLE);
  });

  it('보호 묶음은 저장에 필요한 권한을 알리고, 권한 배정 권한이 없으면 저장할 수 없다고 미리 말한다', async () => {
    renderDialog({ canAssign: false });
    await userEvent.click(screen.getByRole('radio', { name: /계정 복구/ }));
    const preview = screen.getByRole('region', { name: '묶음 미리보기' });
    expect(preview).toHaveTextContent(PROTECTED_BUNDLE_NOTICE);
    expect(within(preview).getByRole('alert')).toHaveTextContent('지금 계정에는 권한 배정 권한이 없어, 보호 권한(USER_PASSWORD)을 더한 변경은 저장할 수 없습니다.');
  });

  it('보호 권한을 이미 모두 가졌으면 권한 배정 경고를 내지 않는다(서버도 새로 더하는 저장에만 요구한다)', async () => {
    renderDialog({ canAssign: false, selection: new Set(['OPERATION:USER_PASSWORD']) });
    await userEvent.click(screen.getByRole('radio', { name: /계정 복구/ }));
    expect(within(screen.getByRole('region', { name: '묶음 미리보기' })).queryByRole('alert')).toBeNull();
  });

  it('초안에서 뺀 보호 권한을 묶음이 되돌리면 저장본과 같으므로 경고하지 않는다(서버는 저장본과 비교한다)', async () => {
    renderDialog({ canAssign: false, selection: new Set(['OPERATION:USER_READ']), saved: new Set(['OPERATION:USER_PASSWORD', 'OPERATION:USER_READ']) });
    await userEvent.click(screen.getByRole('radio', { name: /계정 복구/ }));
    const preview = screen.getByRole('region', { name: '묶음 미리보기' });
    // 초안에는 없으니 더하기는 한다.
    expect(preview).toHaveTextContent('기능권한 추가 1개(이미 있음 1개)');
    expect(within(preview).queryByRole('alert')).toBeNull();
  });

  it('더할 것이 없으면 버튼을 잠그고 이유를 말한다', async () => {
    renderDialog({ selection: new Set(['OPERATION:USER_PASSWORD', 'OPERATION:USER_READ', 'NAVIGATION:AREA', 'NAVIGATION:USERS']) });
    await userEvent.click(screen.getByRole('radio', { name: /계정 복구/ }));
    expect(screen.getByRole('region', { name: '묶음 미리보기' })).toHaveTextContent('기능권한 추가 0개(이미 있음 2개) · 메뉴 표시 추가 0개');
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAccessibleDescription(ALL_PRESENT_REASON);
  });

  it('더할 것이 없어도 더하지 못한 것이 남으면 이미 모두 있다고 말하지 않는다', async () => {
    // USER_PASSWORD 는 현재 기능 목록에 없어 더하지 않는다 — 나머지(USER_READ·메뉴 표시)는 이미 있다.
    renderDialog({ operationCodes: ['USER_READ'], selection: new Set(['OPERATION:USER_READ', 'NAVIGATION:AREA', 'NAVIGATION:USERS']) });
    await userEvent.click(screen.getByRole('radio', { name: /계정 복구/ }));
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAccessibleDescription('더할 수 있는 항목이 없습니다. 묶음이 더하지 않는 항목이 있습니다: 현재 기능 목록에 없는 권한.');
    expect(screen.getByRole('region', { name: '묶음 미리보기' })).not.toHaveTextContent(ALL_PRESENT_REASON);
  });

  it('메뉴가 사용 안 함 상위에 가려 더할 것이 없으면 그 사실을 말하고, 그 화면을 메뉴 없는 화면이라 하지 않는다', async () => {
    const navigation = [
      { code: 'OLD', name: '옛 관리', parentCode: null, route: null, useYn: 'N' as const },
      { code: 'PROGRAMS_OLD', name: '화면 관리(옛)', parentCode: 'OLD', route: '/admin/system/programs', useYn: 'Y' as const },
    ];
    const bundle: PermissionBundle = { ...MENU_BUNDLE, id: 'programs', name: '화면 관리 묶음', permissions: ['PROGRAM_READ'] as PermissionCode[], screens: ['/admin/system/programs'] };
    renderDialog({ bundles: [bundle], navigation, selection: new Set(['OPERATION:PROGRAM_READ']) });
    await userEvent.click(screen.getByRole('radio', { name: '화면 관리 묶음' }));
    expect(addButton()).toHaveAccessibleDescription('더할 수 있는 항목이 없습니다. 묶음이 더하지 않는 항목이 있습니다: 사용 안 함 상위 메뉴에 가린 메뉴.');
    const preview = screen.getByRole('region', { name: '묶음 미리보기' });
    expect(preview).toHaveTextContent("화면 관리 — 메뉴 '화면 관리(옛)'가 사용 안 함 상위 메뉴 '옛 관리' 아래에 있어 표시되지 않습니다");
    expect(preview).not.toHaveTextContent('주소로만 열립니다');
  });

  it('미리보기 알림은 요약과 이유만 읽는다 — 화면 목록·안내는 알림 밖이다', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('radio', { name: /메뉴·화면 설정/ }));
    const preview = screen.getByRole('region', { name: '묶음 미리보기' });
    expect(preview).not.toHaveAttribute('aria-live');
    const live = preview.querySelectorAll('[aria-live]');
    expect(live).toHaveLength(1);
    expect(live[0]).toHaveTextContent('기능권한 추가 2개(이미 있음 1개) · 메뉴 표시 추가 4개');
    expect(live[0]).not.toHaveTextContent('권한으로 열리는 화면');
    expect(live[0]).not.toHaveTextContent(OPEN_SCREEN_NOTICE);
  });

  it('편집기가 잠겨 있으면(저장 중·다시 읽는 중) 더하지 않고 이유를 말한다', async () => {
    const props = renderDialog({ locked: true });
    await userEvent.click(screen.getByRole('radio', { name: /메뉴·화면 설정/ }));
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAccessibleDescription(/저장 중이거나 그룹 정보를 다시 읽는 중/);
    expect(props.onAddToDraft).not.toHaveBeenCalled();
  });

  it('메뉴가 없는 화면은 주소로만 열리는 화면과 목록에서 골라 여는 화면을 구분해 말한다', async () => {
    const bundle: PermissionBundle = { ...MENU_BUNDLE, id: 'no-menu', name: '메뉴 없는 화면 묶음', screens: ['/admin/security/authority', '/smart-toolkit/dept-job/[id]'] };
    renderDialog({ bundles: [bundle] });
    await userEvent.click(screen.getByRole('radio', { name: '메뉴 없는 화면 묶음' }));
    const preview = screen.getByRole('region', { name: '묶음 미리보기' });
    expect(preview).toHaveTextContent('권한 그룹 관리 — 이 화면을 여는 사용 중 메뉴가 없어 주소로만 열립니다');
    expect(preview).toHaveTextContent('부서 업무 상세 — 목록에서 항목을 골라 여는 화면이라 메뉴가 없습니다');
  });

  it('누구나 들어가는 관련 화면은 권한으로 열리는 화면과 따로 보이고, 그 메뉴 표시도 더할 수에 센다', async () => {
    renderDialog({ bundles: [NOTE_BUNDLE], navigation: NOTE_NAVIGATION, operationCodes: [...OPERATION_CODES, 'NOTE_SEND'], selection: new Set() });
    const radio = screen.getByRole('radio', { name: '쪽지 업무' });
    expect(radio).toHaveAccessibleDescription('사용자 조회와 쪽지 보내기를 맡깁니다. · 기능권한 2개 · 권한으로 열리는 화면 1개 · 누구나 들어가는 관련 화면 2개');
    await userEvent.click(radio);
    const preview = screen.getByRole('region', { name: '묶음 미리보기' });
    // 사용자 관리(AREA·USERS)와 쪽지함(WORK·NOTE) — 관련 화면의 메뉴와 상위 메뉴까지 센다.
    expect(preview).toHaveTextContent('기능권한 추가 2개(이미 있음 0개) · 메뉴 표시 추가 4개');
    expect(preview).toHaveTextContent('권한으로 열리는 화면 1개');
    expect(preview).toHaveTextContent('계정 및 사용자 관리 — 메뉴: 사용자 관리');
    expect(preview).toHaveTextContent('누구나 들어가는 관련 화면 2개');
    expect(preview).toHaveTextContent('업무 쪽지함 — 메뉴: 쪽지함');
    expect(preview).toHaveTextContent('부서 업무 상세 — 목록에서 항목을 골라 여는 화면이라 메뉴가 없습니다');
    // 안내는 관련 화면을 더한다는 사실과, 그 밖의 누구나 들어가는 화면은 더하지 않는다는 사실을 함께 말한다.
    expect(preview).toHaveTextContent(OPEN_SCREEN_NOTICE);
    expect(OPEN_SCREEN_NOTICE).toContain('관련 화면)의 메뉴만 더합니다');
    expect(OPEN_SCREEN_NOTICE).not.toContain('메뉴는 묶음이 더하지 않습니다');
  });

  it('취소는 닫기만 한다', async () => {
    const props = renderDialog();
    await userEvent.click(screen.getByRole('button', { name: '묶음 적용 취소' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onAddToDraft).not.toHaveBeenCalled();
  });
});
