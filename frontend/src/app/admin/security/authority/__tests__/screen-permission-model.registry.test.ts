import { describe, expect, it } from 'vitest';
import { buildNavigationPermissionTree } from '@/lib/auth/navigation-permission-tree';
import { resolveMenuScreen, screensWithoutMenu } from '@/lib/navigation/menu-screen-resolution';
import { PERMISSION_CODES } from '@/types/generated-permissions';
import { SCREEN_ALIASES, SCREEN_REGISTRY } from '@/types/generated-screen-registry';
import { aggregateCell, buildScreenPermissionModel, menuRowKey, rowsUnder, SCREEN_CODE_COLUMNS, UNMATCHED_GROUP_KEY } from '../components/screen-permission-model';
import { isOthersDataPermission, isProtectedPermission } from '../components/operation-permission-matrix-model';

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

  /*
   * [2026-10-05 H3 정합] 영역·섹션 줄의 '화면 진입' 묶음 칸도 다른 묶음 칸과 같은 제외 규칙이다 — 실제 진입 원장 전체에서, 묶음 칸 한
   * 번이 더하거나 끄는 권한에 보호·타인 자료 권한(…_ALL)이 없고, 그런 권한이 있어야 들어가는 화면은 직접 고를 화면(manual)으로 남는다.
   * 실제 원장에는 '모두 있어야 열림' 투표 관리(POLL_READ + POLL_READ_ALL)와 COMMENT_READ_ALL 하나로 열리는 댓글 관리 같은 화면이 있다.
   */
  it('모든 화면을 한 영역에 두어도 화면 진입 묶음 칸은 보호·타인 자료 권한을 더하거나 끄지 않는다', () => {
    const screens = SCREEN_REGISTRY.filter((screen) => !screen.dynamic);
    const navigation = [
      { code: 'AREA', name: '영역', parentCode: null, route: null, useYn: 'Y' as const },
      ...screens.map((screen, index) => ({ code: `M${index}`, name: screen.label ?? screen.route, parentCode: 'AREA', route: screen.route, useYn: 'Y' as const })),
    ];
    const built = buildScreenPermissionModel(buildNavigationPermissionTree(navigation), operationCodes);
    const under = rowsUnder(built, built.byKey.get(menuRowKey('AREA'))!);
    const gated = under.filter((row) => row.entry?.state === 'gated');
    const excluded = (code: string) => isProtectedPermission(code) || isOthersDataPermission(code);
    const needsExcluded = (row: (typeof gated)[number]) => (row.entry!.mode === 'ALL'
      ? row.entry!.codes.some(excluded) : row.entry!.codes.every(excluded));
    const added = aggregateCell(under, 'entry', new Set(), true)!;
    expect(added.plan.mode).toBe('select');
    expect(added.plan.keys.filter((key) => excluded(key.slice('OPERATION:'.length)))).toEqual([]);
    expect(new Set(added.manual.map((row) => row.key))).toEqual(new Set(gated.filter(needsExcluded).map((row) => row.key)));
    expect(added.manual.length, '빠지는 화면이 하나도 없으면 이 정합은 빈 검사다').toBeGreaterThan(0);
    expect(added.total + added.manual.length).toBe(gated.length);
    // 모든 진입 권한이 켜져 있어도 끄는 동작은 보호·타인 자료 권한을 남긴다.
    const everything = new Set(gated.flatMap((row) => row.entry!.codes).map((code) => `OPERATION:${code}`));
    const cleared = aggregateCell(under, 'entry', everything, true)!;
    expect(cleared.plan.mode).toBe('clear');
    expect(cleared.plan.keys.filter((key) => excluded(key.slice('OPERATION:'.length)))).toEqual([]);
  });
});
