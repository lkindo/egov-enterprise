import { describe, expect, it } from 'vitest';
import { buildNavigationPermissionTree } from '@/lib/auth/navigation-permission-tree';
import { resolveMenuScreen, screensWithoutMenu } from '@/lib/navigation/menu-screen-resolution';
import { PERMISSION_CODES } from '@/types/generated-permissions';
import { SCREEN_ALIASES, SCREEN_REGISTRY } from '@/types/generated-screen-registry';
import { buildScreenPermissionModel, menuRowKey, SCREEN_CODE_COLUMNS, UNMATCHED_GROUP_KEY } from '../components/screen-permission-model';
import { isProtectedPermission } from '../components/operation-permission-matrix-model';

/**
 * '화면별 권한' 표 모델과 실제 생성물(화면 목록·별칭·진입 원장)의 정합(2026-10-02, 관리 콘솔 UX 2단계 D3·D4).
 *
 * 칸의 내용은 다른 영역의 화면 소스가 바뀔 때마다 바뀌므로 여기서 특정 화면의 코드를 단언하지 않는다(그것은 고정 목록을 쓰는
 * screen-permission-model.test.ts 의 몫이다). 여기서는 화면 목록이 어떻게 바뀌어도 참이어야 하는 것만 본다:
 *   · 메뉴 줄의 화면과 '메뉴에 없는 화면'이 화면 관리와 같은 공용 판정(menu-screen-resolution)과 같다.
 *   · 칸 코드는 그 화면의 진입 밖 권한이고, 일괄 코드는 거기서 보호·타인 자료·진입 권한을 뺀 부분집합이다(H3).
 */
const operationCodes: readonly string[] = PERMISSION_CODES;
const entryCodes = new Set<string>(SCREEN_REGISTRY.flatMap((screen) => screen.entry.permissions));

describe('화면별 권한 표 모델 — 실제 화면 목록과의 정합', () => {
  it('메뉴 줄의 화면과 메뉴에 없는 화면은 화면 관리와 같은 공용 판정이다(별칭·사용 안 함 메뉴 포함)', () => {
    const alias = SCREEN_ALIASES.find((candidate) => !candidate.route.includes('[') && resolveMenuScreen(candidate.route) !== null);
    expect(alias, '정적 별칭이 하나도 없으면 이 정합을 볼 수 없다').toBeDefined();
    const aliasTarget = resolveMenuScreen(alias!.route)!.screen.route;
    const [used, unusedOnly] = SCREEN_REGISTRY.filter((screen) => !screen.dynamic && screen.route !== aliasTarget);
    const navigation = [
      { code: 'AREA', name: '영역', parentCode: null, route: null, useYn: 'Y' as const },
      { code: 'ALIAS', name: '별칭 메뉴', parentCode: 'AREA', route: alias!.route, useYn: 'Y' as const },
      { code: 'USED', name: '사용 메뉴', parentCode: 'AREA', route: `${used.route}?tab=TEST`, useYn: 'Y' as const },
      { code: 'UNUSED', name: '사용 안 함 메뉴', parentCode: 'AREA', route: unusedOnly.route, useYn: 'N' as const },
    ];
    const built = buildScreenPermissionModel(buildNavigationPermissionTree(navigation), operationCodes);
    for (const menu of navigation) {
      expect(built.byKey.get(menuRowKey(menu.code))!.screen, menu.code).toBe(resolveMenuScreen(menu.route)?.screen ?? null);
    }
    const unmatched = built.byKey.get(UNMATCHED_GROUP_KEY)!.childKeys.map((childKey) => built.byKey.get(childKey)!.route);
    expect(unmatched).toEqual(screensWithoutMenu(navigation).map((screen) => screen.route).sort());
    expect(unmatched).not.toContain(aliasTarget);
    expect(unmatched).not.toContain(used.route);
    expect(unmatched).toContain(unusedOnly.route);
  });

  it('모든 화면에서 칸 코드는 진입 밖 화면 권한이고, 일괄 코드는 보호·타인 자료·진입 권한을 뺀 부분집합이다', () => {
    const navigation = SCREEN_REGISTRY.filter((screen) => !screen.dynamic)
      .map((screen, index) => ({ code: `M${index}`, name: screen.label ?? screen.route, parentCode: null, route: screen.route, useYn: 'Y' as const }));
    const built = buildScreenPermissionModel(buildNavigationPermissionTree(navigation), operationCodes);
    // 모든 화면에 메뉴가 있으므로 메뉴에 없는 화면은 없다.
    expect(built.byKey.has(UNMATCHED_GROUP_KEY)).toBe(false);
    for (const row of built.rows) {
      const screen = row.screen!;
      const actions = new Map(screen.permissions.map((permission) => [permission.code as string, permission.action]));
      const ownEntry = new Set(row.entry?.codes ?? []);
      for (const column of SCREEN_CODE_COLUMNS) {
        for (const code of row.codes[column]) {
          expect(actions.has(code), `${screen.route} ${column} ${code}`).toBe(true);
          expect(ownEntry.has(code), `${screen.route} ${column} ${code}`).toBe(false);
        }
        for (const code of row.bulkCodes[column]) {
          expect(row.codes[column], `${screen.route} ${column}`).toContain(code);
          expect(isProtectedPermission(code), `${screen.route} ${code} 보호 권한`).toBe(false);
          expect(actions.get(code)!.endsWith('_ALL'), `${screen.route} ${code} 타인 자료 권한`).toBe(false);
          expect(entryCodes.has(code), `${screen.route} ${code} 진입 권한`).toBe(false);
        }
      }
    }
  });
});
