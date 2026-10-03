import { describe, expect, it, vi } from 'vitest';
import type { PermissionBundle } from '@/types/generated-screen-registry';
import type { PermissionCode } from '@/types/generated-permissions';
import { bundleDraftKeys, previewBundle, unnamedScreenLabel, withBundle } from '../components/permission-bundle-model';

// 메뉴가 여는 화면은 화면 목록에서 온다 — 다른 영역의 화면 소스가 바뀌어도 계약이 흔들리지 않게 고정 목록을 쓴다.
vi.mock('@/types/generated-screen-registry', async (importOriginal) =>
  (await import('./screen-registry-fixture')).withFixtureScreenRegistry(await importOriginal()));

/**
 * '권한 묶음 적용' 미리보기·초안 반영의 순수 모델(2026-10-02, 관리 콘솔 UX 3단계 G2).
 *  · 기능권한: 더할 것·이미 있는 것·현재 기능 목록에 없는 것(더하지 않는다)을 나눈다.
 *  · 메뉴 표시: 묶음 화면을 여는 사용 중 메뉴와 그 상위 메뉴 전부를 명시적으로 더하고, 이미 있는 것은 세지 않는다.
 *    사용 안 함 상위가 있는 메뉴는 더하지 않고 알린다. 사용 안 함 메뉴 자체는 대상이 아니다.
 *  · 같은 묶음을 두 번 더해도 초안이 변하지 않고(멱등), 빼는 키가 없다.
 */
type Navigation = { code: string; name: string; parentCode: string | null; route: string | null; useYn: 'Y' | 'N' };

const NAVIGATION: readonly Navigation[] = [
  { code: 'AREA', name: '관리', parentCode: null, route: null, useYn: 'Y' },
  { code: 'SECTION', name: '시스템', parentCode: 'AREA', route: null, useYn: 'Y' },
  { code: 'MENUS', name: '메뉴 관리', parentCode: 'SECTION', route: '/admin/system/menus', useYn: 'Y' },
  { code: 'PROGRAMS', name: '화면 관리', parentCode: 'SECTION', route: '/admin/system/programs', useYn: 'Y' },
  { code: 'HIDDEN', name: '옛 시스템', parentCode: 'AREA', route: null, useYn: 'N' },
  { code: 'MENUS_COPY', name: '메뉴 관리(옛)', parentCode: 'HIDDEN', route: '/admin/system/menus?tab=old', useYn: 'Y' },
  { code: 'OLD_MENUS', name: '쓰지 않는 메뉴 관리', parentCode: 'AREA', route: '/admin/system/menus', useYn: 'N' },
  { code: 'USERS', name: '사용자 관리', parentCode: 'AREA', route: '/admin/user/manage', useYn: 'Y' },
  { code: 'OTHER', name: '다른 영역', parentCode: null, route: null, useYn: 'Y' },
];
const CATALOG_CODES = ['MENU_READ', 'MENU_UPDATE', 'PROGRAM_READ', 'PROGRAM_UPDATE', 'USER_READ'];

function bundleOf(overrides: Partial<PermissionBundle> = {}): PermissionBundle {
  return {
    id: 'menu-screen', name: '메뉴·화면 설정', description: '메뉴와 화면 관리를 맡깁니다.', protected: false,
    permissions: ['MENU_READ', 'MENU_UPDATE', 'PROGRAM_READ'] as PermissionCode[],
    screens: ['/admin/system/menus', '/admin/system/programs'],
    relatedScreens: [],
    ...overrides,
  };
}

/** 누구나 들어가는 관련 화면(업무 쪽지함)을 여는 메뉴가 다른 영역에 있는 메뉴 트리. */
const WITH_NOTE: readonly Navigation[] = [
  ...NAVIGATION,
  { code: 'WORK', name: '나의 업무', parentCode: null, route: null, useYn: 'Y' },
  { code: 'COMM', name: '소통', parentCode: 'WORK', route: null, useYn: 'Y' },
  { code: 'NOTE', name: '쪽지함', parentCode: 'COMM', route: '/note', useYn: 'Y' },
  { code: 'OLD_WORK', name: '옛 업무', parentCode: null, route: null, useYn: 'N' },
  { code: 'NOTE_OLD', name: '쪽지함(옛)', parentCode: 'OLD_WORK', route: '/note?tab=old', useYn: 'Y' },
];

describe('previewBundle', () => {
  it('기능권한을 더할 것·이미 있는 것으로 나누고, 묶음 화면의 메뉴와 상위 메뉴 전부를 카탈로그 순서로 더한다', () => {
    const preview = previewBundle(bundleOf(), new Set(['OPERATION:MENU_READ']), NAVIGATION, CATALOG_CODES);
    expect(preview.operationsToAdd).toEqual(['MENU_UPDATE', 'PROGRAM_READ']);
    expect(preview.operationsPresent).toEqual(['MENU_READ']);
    expect(preview.operationsUnknown).toEqual([]);
    // 상위 메뉴(AREA·SECTION)도 명시적으로 더한다 — 묵시 배정을 하지 않는다.
    expect(preview.navigationToAdd).toEqual(['AREA', 'SECTION', 'MENUS', 'PROGRAMS']);
    expect(preview.screens).toEqual([
      { route: '/admin/system/menus', label: '메뉴 관리', menus: [{ code: 'MENUS', name: '메뉴 관리' }], dynamic: false,
        blockedMenus: [{ code: 'MENUS_COPY', name: '메뉴 관리(옛)', unusedAncestor: { code: 'HIDDEN', name: '옛 시스템' } }] },
      { route: '/admin/system/programs', label: '화면 관리', menus: [{ code: 'PROGRAMS', name: '화면 관리' }], dynamic: false, blockedMenus: [] },
    ]);
    expect(bundleDraftKeys(preview)).toEqual([
      'OPERATION:MENU_UPDATE', 'OPERATION:PROGRAM_READ',
      'NAVIGATION:AREA', 'NAVIGATION:SECTION', 'NAVIGATION:MENUS', 'NAVIGATION:PROGRAMS',
    ]);
  });

  it('사용 안 함 상위가 있는 메뉴는 더하지 않고 알리며, 사용 안 함 메뉴 자체는 대상이 아니다', () => {
    const preview = previewBundle(bundleOf(), new Set(), NAVIGATION, CATALOG_CODES);
    expect(preview.blockedMenus).toEqual([
      { code: 'MENUS_COPY', name: '메뉴 관리(옛)', unusedAncestor: { code: 'HIDDEN', name: '옛 시스템' } },
    ]);
    expect(preview.navigationToAdd).not.toContain('MENUS_COPY');
    expect(preview.navigationToAdd).not.toContain('HIDDEN');
    // 같은 화면을 가리키지만 사용 안 함인 메뉴는 메뉴 표시를 더하지도, 알리지도 않는다.
    expect(preview.navigationToAdd).not.toContain('OLD_MENUS');
    expect(preview.blockedMenus.map((menu) => menu.code)).not.toContain('OLD_MENUS');
    // 묶음 화면이 아닌 메뉴는 대상이 아니다.
    expect(preview.navigationToAdd).not.toContain('USERS');
    expect(preview.screens[0].menus).toEqual([{ code: 'MENUS', name: '메뉴 관리' }]);
  });

  it('이미 초안에 있는 메뉴 표시는 세지 않는다 — 비어 있던 상위만 더한다', () => {
    const preview = previewBundle(bundleOf(), new Set(['NAVIGATION:AREA', 'NAVIGATION:MENUS']), NAVIGATION, CATALOG_CODES);
    expect(preview.navigationToAdd).toEqual(['SECTION', 'PROGRAMS']);
  });

  it('현재 기능 목록에 없는 권한은 더하지 않고 따로 알린다(저장 본문에서 빠지는 코드를 더한 것처럼 보이지 않게)', () => {
    const preview = previewBundle(bundleOf(), new Set(), NAVIGATION, ['MENU_READ', 'MENU_UPDATE']);
    expect(preview.operationsToAdd).toEqual(['MENU_READ', 'MENU_UPDATE']);
    expect(preview.operationsUnknown).toEqual(['PROGRAM_READ']);
  });

  it('별칭 메뉴는 넘기는 화면으로 센다(화면별 권한 표·화면 관리와 같은 공용 판정)', () => {
    const navigation: Navigation[] = [
      { code: 'COLLAB', name: '협업', parentCode: null, route: null, useYn: 'Y' },
      { code: 'ADDRESS', name: '주소록', parentCode: 'COLLAB', route: '/admin/collaboration/address-book', useYn: 'Y' },
    ];
    const bundle = bundleOf({ permissions: ['ADBK_CREATE'] as PermissionCode[], screens: ['/admin/collaboration/address-book/select-address-book-list'] });
    const preview = previewBundle(bundle, new Set(), navigation);
    expect(preview.navigationToAdd).toEqual(['COLLAB', 'ADDRESS']);
    expect(preview.screens[0]).toMatchObject({ label: '통합 주소록 관리', menus: [{ code: 'ADDRESS', name: '주소록' }] });
  });

  it('묶음 화면을 여는 사용 중 메뉴가 없으면 화면만 알리고 메뉴는 비운다', () => {
    const preview = previewBundle(bundleOf({ screens: ['/admin/security/authority'] }), new Set(), NAVIGATION, CATALOG_CODES);
    expect(preview.navigationToAdd).toEqual([]);
    expect(preview.screens).toEqual([{ route: '/admin/security/authority', label: '권한 그룹 관리', menus: [], blockedMenus: [], dynamic: false }]);
    // 경로 값을 받는 화면은 메뉴에 둘 수 없다 — 주소로만 열리는 화면과 구분한다.
    const detail = previewBundle(bundleOf({ screens: ['/smart-toolkit/dept-job/[id]'] }), new Set(), NAVIGATION, CATALOG_CODES);
    expect(detail.screens).toEqual([{ route: '/smart-toolkit/dept-job/[id]', label: '부서 업무 상세', menus: [], blockedMenus: [], dynamic: true }]);
  });

  it('이름이 없는 화면은 경로를 이름처럼 보이지 않고 이름 미확인과 주소로 보인다', () => {
    // 고정 목록에 없는 화면 — 실제 화면 목록에서 이름이 없는 화면(예: 게시글 상세)과 같은 처지다.
    const preview = previewBundle(bundleOf({ relatedScreens: ['/admin/community/boards/detail'] }), new Set(), NAVIGATION, CATALOG_CODES);
    expect(preview.relatedScreens).toEqual([{
      route: '/admin/community/boards/detail', label: '이름 미확인 화면(주소 /admin/community/boards/detail)', menus: [], blockedMenus: [], dynamic: false,
    }]);
    expect(unnamedScreenLabel('/x')).toBe('이름 미확인 화면(주소 /x)');
  });

  it('화면을 여는 사용 중 메뉴가 사용 안 함 상위에 가려 있으면 그 화면에 막힌 메뉴로 싣는다(메뉴가 없는 화면이 아니다)', () => {
    const navigation: Navigation[] = [
      { code: 'OLD', name: '옛 관리', parentCode: null, route: null, useYn: 'N' },
      { code: 'PROGRAMS_OLD', name: '화면 관리(옛)', parentCode: 'OLD', route: '/admin/system/programs', useYn: 'Y' },
    ];
    const preview = previewBundle(bundleOf({ screens: ['/admin/system/programs'] }), new Set(), navigation, CATALOG_CODES);
    expect(preview.navigationToAdd).toEqual([]);
    expect(preview.screens[0]).toMatchObject({
      menus: [], blockedMenus: [{ code: 'PROGRAMS_OLD', name: '화면 관리(옛)', unusedAncestor: { code: 'OLD', name: '옛 관리' } }],
    });
  });

  it('메뉴 계층을 확인하지 못하면 메뉴 표시는 더하지 않고 이유를 낸다(기능권한은 그대로 계산)', () => {
    const broken: Navigation[] = [...NAVIGATION, { code: 'MENUS', name: '중복', parentCode: null, route: '/admin/system/menus', useYn: 'Y' }];
    const preview = previewBundle(bundleOf(), new Set(), broken, CATALOG_CODES);
    expect(preview.navigationError).toMatch(/중복된 메뉴/);
    expect(preview.navigationToAdd).toEqual([]);
    expect(preview.operationsToAdd).toEqual(['MENU_READ', 'MENU_UPDATE', 'PROGRAM_READ']);
  });

  it('보호 권한 가운데 새로 더하는 것만 따로 센다', () => {
    const bundle = bundleOf({ protected: true, permissions: ['MENU_READ', 'USER_PASSWORD', 'MFA_RECOVER'] as PermissionCode[] });
    expect(previewBundle(bundle, new Set(['OPERATION:MFA_RECOVER']), NAVIGATION).protectedToAdd).toEqual(['USER_PASSWORD']);
  });

  it('보호 권한 경고는 서버처럼 저장본과 비교한다 — 초안에서 뺀 보호 권한을 묶음이 되돌리면 바뀌지 않는다', () => {
    const bundle = bundleOf({ protected: true, permissions: ['USER_PASSWORD', 'MFA_RECOVER', 'USER_READ'] as PermissionCode[] });
    const saved = new Set(['OPERATION:USER_PASSWORD', 'OPERATION:USER_READ']);
    // 초안에서 USER_PASSWORD 를 뺐다 — 묶음이 되돌리면 저장본과 같다. MFA_RECOVER 는 저장본에 없어 새로 더하는 보호 권한이다.
    const draft = new Set(['OPERATION:USER_READ']);
    const preview = previewBundle(bundle, draft, NAVIGATION, undefined, saved);
    expect(preview.operationsToAdd).toEqual(['USER_PASSWORD', 'MFA_RECOVER']);
    expect(preview.protectedToAdd).toEqual(['MFA_RECOVER']);
    // 저장본에 없는 보호 권한을 새로 더하면 경고 대상이다.
    expect(previewBundle(bundle, draft, NAVIGATION, undefined, new Set(['OPERATION:USER_READ'])).protectedToAdd).toEqual(['USER_PASSWORD', 'MFA_RECOVER']);
  });
});

describe('previewBundle — 누구나 들어가는 관련 화면(2026-10-03, 선택지 ①)', () => {
  const noteBundle = () => bundleOf({ permissions: ['MENU_READ', 'NOTE_SEND'] as PermissionCode[], screens: ['/admin/system/menus'], relatedScreens: ['/note'] });

  it('관련 화면의 메뉴와 그 상위 메뉴 전부도 더하고, 미리보기는 권한으로 열리는 화면과 따로 싣는다', () => {
    const preview = previewBundle(noteBundle(), new Set(), WITH_NOTE, [...CATALOG_CODES, 'NOTE_SEND']);
    // 권한으로 열리는 화면(메뉴 관리)과 관련 화면(쪽지함)의 메뉴가 카탈로그 순서로 함께 더해진다.
    expect(preview.navigationToAdd).toEqual(['AREA', 'SECTION', 'MENUS', 'WORK', 'COMM', 'NOTE']);
    expect(preview.screens.map((screen) => screen.route)).toEqual(['/admin/system/menus']);
    expect(preview.relatedScreens).toEqual([
      { route: '/note', label: '업무 쪽지함', menus: [{ code: 'NOTE', name: '쪽지함' }], dynamic: false,
        blockedMenus: [{ code: 'NOTE_OLD', name: '쪽지함(옛)', unusedAncestor: { code: 'OLD_WORK', name: '옛 업무' } }] },
    ]);
    // 사용 안 함 상위에 가린 관련 화면 메뉴도 더하지 않고 알린다.
    expect(preview.navigationToAdd).not.toContain('NOTE_OLD');
    expect(preview.blockedMenus.map((menu) => menu.code)).toContain('NOTE_OLD');
  });

  it('관련 화면이 없는 묶음은 그 메뉴를 더하지 않는다 — 누구나 들어가는 화면이라는 이유만으로 더하지 않는다', () => {
    const preview = previewBundle(bundleOf(), new Set(), WITH_NOTE, CATALOG_CODES);
    expect(preview.relatedScreens).toEqual([]);
    expect(preview.navigationToAdd).not.toContain('NOTE');
    expect(preview.navigationToAdd).not.toContain('WORK');
  });

  it('경로 값을 받는 관련 화면은 메뉴 없이 싣는다', () => {
    const preview = previewBundle(bundleOf({ relatedScreens: ['/smart-toolkit/dept-job/[id]'] }), new Set(), WITH_NOTE, CATALOG_CODES);
    expect(preview.relatedScreens).toEqual([{ route: '/smart-toolkit/dept-job/[id]', label: '부서 업무 상세', menus: [], blockedMenus: [], dynamic: true }]);
  });

  it('초안에 더하면 관련 화면 메뉴까지 들어가고, 다시 더해도 변하지 않는다', () => {
    const once = withBundle(new Set(), noteBundle(), WITH_NOTE, [...CATALOG_CODES, 'NOTE_SEND']);
    for (const key of ['NAVIGATION:WORK', 'NAVIGATION:COMM', 'NAVIGATION:NOTE', 'OPERATION:NOTE_SEND']) expect(once.has(key)).toBe(true);
    expect([...withBundle(once, noteBundle(), WITH_NOTE, [...CATALOG_CODES, 'NOTE_SEND'])].sort()).toEqual([...once].sort());
  });
});

describe('withBundle', () => {
  it('같은 묶음을 두 번 더해도 초안이 변하지 않고(멱등), 기존 선택을 빼지 않는다', () => {
    const start = new Set(['OPERATION:USER_READ', 'NAVIGATION:USERS', 'NAVIGATION:OTHER']);
    const once = withBundle(start, bundleOf(), NAVIGATION, CATALOG_CODES);
    const twice = withBundle(once, bundleOf(), NAVIGATION, CATALOG_CODES);
    expect([...twice].sort()).toEqual([...once].sort());
    for (const key of start) expect(once.has(key)).toBe(true);
    // 기능권한 3개 + 메뉴 표시 4개(관리·시스템·메뉴 관리·화면 관리).
    expect(once.size).toBe(start.size + 7);
    // 원래 집합은 바꾸지 않는다(새 초안을 돌려준다).
    expect(start.size).toBe(3);
  });
});
