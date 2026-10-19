import { describe, expect, it } from 'vitest';
import { buildNavigationPermissionTree } from '@/lib/auth/navigation-permission-tree';
import { resolveMenuScreen, screensWithoutMenu } from '@/lib/navigation/menu-screen-resolution';
import { PERMISSION_CODES } from '@/types/generated-permissions';
import { SCREEN_ALIASES, SCREEN_REGISTRY } from '@/types/generated-screen-registry';
import { aggregateCell, buildScreenPermissionModel, menuRowKey, rowsUnder, SCREEN_CODE_COLUMNS, UNMATCHED_GROUP_KEY } from '../components/screen-permission-model';
import { isOthersDataPermission, isProtectedPermission } from '../components/operation-permission-matrix-model';
import { pageInProjection, projectionRemovedFiles } from '@/test-utils/projection';

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

/*
 * [10단계 10a — 이 파일에서 특정 화면을 단언하는 유일한 예외] 슬롯 기여 항목의 노출 술어(visibleWhen.permissions)가 그 항목을 그리는
 * 화면의 표시 권한이 되면서(DEC-OPS-284) '그 밖의 기능' 칸과 영역·섹션 줄의 일괄 대상이 넓어졌다. 그 변화를 화면별로 고정한다 — 술어
 * 귀속을 걷거나 엉뚱한 화면으로 넓히면 여기서 붉다. 노출일 뿐 인가는 그대로다(H3). 투영으로 빠진 화면과, 생성물의 권한 목록(구성
 * 코드, 10단계 10b)에 없는 코드는 보지 않는다 — 그 코드를 노출 술어로 둔 기여는 그 기능과 함께 빠진다.
 *   · 일괄 대상에 드는 것: 메일·문자의 주소록 조회(ADBK_READ), 협업 허브 두 화면의 쪽지·스크랩 조회(NOTE_READ·SCRAP_READ),
 *     업무 홈의 결재·팝업·배너 조회(APPROVAL_READ·POPUP_READ·BANNER_READ). 어느 화면의 진입 권한도 아니다.
 *   · 칸에만 드는 것: 통계 셸 네 화면의 설문 전체 조회(SURVEY_READ_ALL) — 타인 자료 권한이자 설문 관리 화면의 진입 권한이라 일괄에서
 *     빠진다. 통계 요약(/admin/stats)은 설문 탭을 그리지 않으므로 칸에도 없다.
 */
const PREDICATE_DISPLAY: ReadonlyArray<{ route: string; bulk: readonly string[]; cellOnly: readonly string[] }> = [
  { route: '/', bulk: ['APPROVAL_READ', 'BANNER_READ', 'POPUP_READ'], cellOnly: [] },
  { route: '/admin/collaboration', bulk: ['NOTE_READ', 'SCRAP_READ'], cellOnly: [] },
  { route: '/admin/collaboration/scraps', bulk: ['NOTE_READ', 'SCRAP_READ'], cellOnly: [] },
  { route: '/admin/collaboration/mail-send', bulk: ['ADBK_READ'], cellOnly: [] },
  { route: '/admin/uss/ion/sms', bulk: ['ADBK_READ'], cellOnly: [] },
  // [2026-10-19 DEC-OPS-368] 보고서 통계 화면(/admin/stats/report)은 퇴역했다 — 남은 통계 셸 화면은 넷이다.
  ...['board', 'data-usage', 'screen', 'user'].map((tab) => ({ route: `/admin/stats/${tab}`, bulk: [], cellOnly: ['SURVEY_READ_ALL'] })),
];

/*
 * [10단계 검토] 화면 진입 묶음 칸이 직접 고를 화면(manual)으로 남기는 화면의 예 — 원본 진입 원장의 '모두 있어야 열림' 투표 관리 두 화면
 * (POLL_READ + POLL_READ_ALL)과 COMMENT_READ_ALL 하나로 열리는 댓글 관리다. 생성물에서는 그 기능과 함께 빠진다(core 시작 구성·결재 단독에는
 * 하나도 없다). 남은 예만 단언하고, 원본에서는 모두 있어야 한다 — 빈 검사가 아님을 원본이 보인다.
 */
const MANUAL_ENTRY_EXEMPLARS: readonly string[] = ['/admin/survey/polls', '/admin/survey/polls/manage', '/admin/system/comments'];

describe('화면별 권한 표 모델 — 실제 화면 목록과의 정합', () => {
  it('슬롯 노출 술어가 더한 표시 권한은 그 밖의 기능 칸에 들고, 일괄 대상은 진입·타인 자료 권한을 뺀 것이다(DEC-OPS-284)', () => {
    const present = PREDICATE_DISPLAY.filter(({ route }) => pageInProjection(route));
    expect(present.some(({ route }) => route === '/'), '업무 홈은 모든 구성에 있다').toBe(true);
    const navigation = present.map(({ route }, index) => ({ code: `P${index}`, name: route, parentCode: null, route, useYn: 'Y' as const }));
    const built = buildScreenPermissionModel(buildNavigationPermissionTree(navigation), operationCodes);
    const registered = (codes: readonly string[]) => codes.filter((code) => operationCodes.includes(code));
    // 원본(투영 원장 없음)에서는 술어 코드가 모두 권한 목록에 있어야 한다 — 거르기가 원본의 단언을 조용히 줄이지 않게 한다.
    if (projectionRemovedFiles().size === 0) {
      const codes = PREDICATE_DISPLAY.flatMap(({ bulk, cellOnly }) => [...bulk, ...cellOnly]);
      expect(codes.filter((code) => !operationCodes.includes(code)), '원본 권한 목록에 없는 술어 코드').toEqual([]);
    }
    for (const [index, { route, bulk, cellOnly }] of present.entries()) {
      const row = built.byKey.get(menuRowKey(`P${index}`))!;
      expect(row.screen?.route, route).toBe(route);
      for (const code of registered([...bulk, ...cellOnly])) expect(row.codes.other, `${route} 칸 ${code}`).toContain(code);
      for (const code of registered(bulk)) expect(row.bulkCodes.other, `${route} 일괄 ${code}`).toContain(code);
      for (const code of cellOnly) expect(row.bulkCodes.other, `${route} 일괄 ${code}`).not.toContain(code);
    }
    // 통계 요약은 설문 탭을 그리지 않는다 — 셸 디렉터리(/admin/stats)에 있다는 이유로 붙지 않는다.
    const overview = SCREEN_REGISTRY.find((screen) => screen.route === '/admin/stats');
    if (overview) expect(overview.permissions.map((permission) => permission.code)).not.toContain('SURVEY_READ_ALL');
  });

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
    const manualRoutes = added.manual.map((row) => row.route);
    const exemplars = MANUAL_ENTRY_EXEMPLARS.filter((route) => pageInProjection(route));
    if (projectionRemovedFiles().size === 0) {
      expect(exemplars, '원본에는 직접 고를 화면의 예가 모두 있다 — 없으면 이 정합은 빈 검사다').toEqual([...MANUAL_ENTRY_EXEMPLARS]);
    }
    for (const route of exemplars) expect(manualRoutes, `${route} 는 직접 고를 화면이다`).toContain(route);
    expect(added.total + added.manual.length).toBe(gated.length);
    // 모든 진입 권한이 켜져 있어도 끄는 동작은 보호·타인 자료 권한을 남긴다.
    const everything = new Set(gated.flatMap((row) => row.entry!.codes).map((code) => `OPERATION:${code}`));
    const cleared = aggregateCell(under, 'entry', everything, true)!;
    expect(cleared.plan.mode).toBe('clear');
    expect(cleared.plan.keys.filter((key) => excluded(key.slice('OPERATION:'.length)))).toEqual([]);
  });
});
