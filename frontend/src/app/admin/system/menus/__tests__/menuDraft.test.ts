import { describe, expect, it } from 'vitest';
import type { MenuInfo } from '@/types/foundation/menu';
import { MenuStructureSaveRequestSchema } from '@/types/generated-zod';
import { flattenTree, listToTree, type FlattenedItem } from '../treeUtils';
import {
  addMenu,
  addOperations,
  ancestorIds,
  draftCounts,
  editMenu,
  groupGrants,
  markDeleted,
  MENU_LIMITS,
  menuBadges,
  menuChanges,
  menuNoOfRef,
  menuRef,
  menuStructurePayload,
  moveBlock,
  moveMenu,
  parentPathLabel,
  placementProblem,
  removeNewMenu,
  revertGroup,
  revertMenu,
  revertPlacement,
  revertProperties,
  setNavigation,
  shiftBlock,
  shiftMenu,
  siblingOrder,
  startDraft,
  structureItems,
  subtreeHeight,
  summarizeDraft,
  validateMenuFields,
  type MenuDraft,
  type MenuGroup,
} from '../menuDraft';

/**
 * 메뉴 구조 초안 모델. 서버 구조 → 선순회 목록 → 블록 이동·새 메뉴·삭제·속성·그룹 배정 → 기준선 대비 변경·저장 요청.
 */
const row = (menuNo: number, menuOrdr: number, upMenuSn = 0, menuNm = `메뉴${menuNo}`): MenuInfo => ({
  menuNo, menuNm, menuOrdr, upMenuSn, upperMenuId: upMenuSn,
});
const flat = (rows: MenuInfo[]) => flattenTree(listToTree(rows));
const ids = (items: readonly FlattenedItem[]) => items.map((item) => item.menuNo);
const shape = (items: readonly FlattenedItem[]) => items.map(({ menuNo, parentId, depth }) => [menuNo, parentId, depth]);
const ok = (result: ReturnType<typeof moveMenu>): MenuDraft => {
  if (!result.ok) throw new Error(result.reason);
  return result.draft;
};
const group = (code: string, grants: string[], version = `${code}-v1`): MenuGroup => ({ code, name: `${code} 그룹`, version, grants: new Set(grants) });
const parsePayload = (payload: unknown) => MenuStructureSaveRequestSchema.parse(payload);

/*
  1(루트) ─ 2 ─ 3
          └ 4
  5(루트) ─ 6
  7(루트)
*/
const tree = () => flat([
  row(1, 1), row(2, 1, 1), row(3, 1, 2), row(4, 2, 1),
  row(5, 2), row(6, 1, 5),
  row(7, 3),
]);

describe('형제 목록 모델', () => {
  it('서버 순서는 menuOrdr 오름차순이고, 같으면 메뉴 번호로 정한다', () => {
    const items = flat([row(30, 5), row(10, 5), row(20, 1), row(40, 2, 20), row(41, 2, 20)]);
    expect(ids(items)).toEqual([20, 40, 41, 10, 30]);
    expect(siblingOrder(items)).toEqual(new Map([[null, [20, 10, 30]], [20, [40, 41]]]));
  });

  it('하위 높이와 상위 경로를 계산한다', () => {
    const items = tree();
    expect(subtreeHeight(items, 1)).toBe(2);
    expect(subtreeHeight(items, 5)).toBe(1);
    expect(subtreeHeight(items, 7)).toBe(0);
    expect(ancestorIds(items, 3)).toEqual([1, 2]);
    expect(parentPathLabel(items, 2)).toBe('메뉴1 › 메뉴2');
    expect(parentPathLabel(items, null)).toBe('최상위');
  });

  it('메뉴 구조 응답을 선순회 목록으로 편다 — null 상위는 최상위, 상위가 없는 메뉴도 최상위로 남긴다', () => {
    const items = structureItems([
      { menuNo: 2, menuNm: '둘', upMenuSn: 1, menuOrdr: 1, modernRoute: '/admin/a', menuExpln: null, useYn: 'Y', prgrmFileNm: 'old.do' },
      { menuNo: 1, menuNm: '하나', upMenuSn: null, menuOrdr: 1, modernRoute: null, menuExpln: '설명', useYn: 'N', prgrmFileNm: null },
      { menuNo: 9, menuNm: '고아', upMenuSn: 77, menuOrdr: 2, modernRoute: null, menuExpln: null, useYn: 'Y', prgrmFileNm: null },
    ]);
    expect(shape(items)).toEqual([[1, null, 0], [2, 1, 1], [9, null, 0]]);
    expect(items[0]).toMatchObject({ menuExpln: '설명', useYn: 'N', modernRoute: undefined });
    expect(items[1]).toMatchObject({ modernRoute: '/admin/a', prgrmFileNm: 'old.do' });
  });

  it('새 메뉴는 음수 번호로 두고 저장 요청에서는 new-n 키다', () => {
    expect(menuRef(12)).toBe('12');
    expect(menuRef(-3)).toBe('new-3');
    expect(menuNoOfRef('new-3')).toBe(-3);
    expect(menuNoOfRef('12')).toBe(12);
    expect(menuNoOfRef('0')).toBeNull();
    expect(menuNoOfRef('new-0')).toBeNull();
  });
});

describe('moveBlock — 하위와 함께 옮긴다', () => {
  it('메뉴를 하위 전체와 함께 새 상위의 지정 순번으로 옮기고 깊이를 맞춘다', () => {
    const items = tree();
    const moved = moveBlock(items, 5, 1, 1);
    expect(moved).not.toBeNull();
    expect(shape(moved!)).toEqual([
      [1, null, 0], [2, 1, 1], [3, 2, 2], [5, 1, 1], [6, 5, 2], [4, 1, 1], [7, null, 0],
    ]);
    // 형제 안 순번도 다시 매긴다.
    expect(moved!.find((item) => item.menuNo === 4)?.index).toBe(2);
    // 원본은 그대로다.
    expect(ids(items)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('최상위로 옮기면 index 를 넘는 값은 맨 뒤다', () => {
    const moved = moveBlock(tree(), 2, null, Number.POSITIVE_INFINITY);
    expect(shape(moved!)).toEqual([
      [1, null, 0], [4, 1, 1], [5, null, 0], [6, 5, 1], [7, null, 0], [2, null, 0], [3, 2, 1],
    ]);
  });

  it('자기 자신과 자기 하위 아래로는 옮기지 않는다', () => {
    const items = tree();
    expect(moveBlock(items, 1, 1, 0)).toBeNull();
    expect(moveBlock(items, 1, 3, 0)).toBeNull();
    expect(moveBlock(items, 2, 3, 0)).toBeNull();
  });

  it('옮긴 뒤 하위까지 3단계를 넘으면 거부한다', () => {
    const items = tree();
    expect(moveBlock(items, 5, 2, 0)).toBeNull();
    expect(moveBlock(items, 1, 7, 0)).toBeNull();
    expect(moveBlock(items, 7, 2, 0)).not.toBeNull();
  });

  it('제자리면 입력 배열 그대로를 돌려준다', () => {
    const items = tree();
    expect(moveBlock(items, 4, 1, 1)).toBe(items);
    expect(moveBlock(items, 5, null, 1)).toBe(items);
  });

  it('shiftBlock 은 같은 상위의 형제 블록끼리 자리를 바꾸고, 끝이면 null 이다', () => {
    const items = tree();
    expect(ids(shiftBlock(items, 1, 1)!)).toEqual([5, 6, 1, 2, 3, 4, 7]);
    expect(ids(shiftBlock(items, 4, -1)!)).toEqual([1, 4, 2, 3, 5, 6, 7]);
    expect(shiftBlock(items, 1, -1)).toBeNull();
    expect(shiftBlock(items, 7, 1)).toBeNull();
    expect(shiftBlock(items, 3, 1)).toBeNull();
  });
});

describe('menuChanges — 기준선 대비 계산값', () => {
  const kinds = (baseline: readonly FlattenedItem[], current: readonly FlattenedItem[]) =>
    menuChanges(baseline, current).map(({ menuNo, kind }) => [menuNo, kind]);

  it('하나를 맨 앞으로 옮기면 그 하나만 순서 변경이다(최장 증가 부분수열)', () => {
    const base = flat([row(1, 1), row(2, 2), row(3, 3), row(4, 4)]);
    const current = moveBlock(base, 4, null, 0)!;
    expect(ids(current)).toEqual([4, 1, 2, 3]);
    expect(kinds(base, current)).toEqual([[4, 'order']]);
  });

  it('인접한 둘을 맞바꾸면 한 건만 표시한다', () => {
    const base = flat([row(1, 1), row(2, 2), row(3, 3)]);
    expect(menuChanges(base, shiftBlock(base, 1, 1)!)).toHaveLength(1);
  });

  it('상위가 바뀐 메뉴는 이동이고, 남은 형제는 표시하지 않는다', () => {
    const base = tree();
    const current = moveBlock(base, 2, 5, 0)!;
    expect(menuChanges(base, current)).toEqual([{ menuNo: 2, kind: 'move', fromParent: 1, toParent: 5 }]);
  });

  it('제자리 놓기와 원래 자리 복귀는 변경 0 이다', () => {
    const base = tree();
    expect(menuChanges(base, moveBlock(base, 4, 1, 1)!)).toEqual([]);
    const away = moveBlock(base, 4, 5, 0)!;
    expect(menuChanges(base, moveBlock(away, 4, 1, 1)!)).toEqual([]);
  });
});

describe('revertMenu — 위치 하나만 되돌린다', () => {
  it('기준선 상위 아래, 기준선에서 바로 앞이던 형제 뒤로 돌린다', () => {
    const base = tree();
    const current = moveBlock(moveBlock(base, 4, 5, 1)!, 7, null, 0)!;
    expect(ids(current)).toEqual([7, 1, 2, 3, 5, 6, 4]);
    const reverted = revertMenu(base, current, 4)!;
    expect(shape(reverted).filter(([menuNo]) => menuNo === 4)).toEqual([[4, 1, 1]]);
    expect(siblingOrder(reverted).get(1)).toEqual([2, 4]);
    expect(menuChanges(base, reverted).map(({ menuNo }) => menuNo)).toEqual([7]);
    expect(menuChanges(base, revertMenu(base, reverted, 7)!)).toEqual([]);
  });

  it('바로 앞 형제가 다른 곳으로 옮겨졌으면 더 앞의 형제 뒤, 없으면 맨 앞이다', () => {
    const base = flat([row(1, 1), row(2, 2), row(3, 3), row(9, 4)]);
    const current = moveBlock(moveBlock(base, 3, null, 0)!, 2, 9, 0)!;
    expect(siblingOrder(revertMenu(base, current, 3)!).get(null)).toEqual([1, 3, 9]);
    const shifted = shiftBlock(base, 1, 1)!;
    expect(siblingOrder(revertMenu(base, shifted, 1)!).get(null)).toEqual([1, 2, 3, 9]);
  });

  it('되돌릴 자리가 지금 구조와 맞지 않으면 null 이다', () => {
    const base = flat([row(1, 1), row(2, 1, 1), row(3, 2)]);
    const current = moveBlock(moveBlock(base, 2, null, 0)!, 1, 2, 0)!;
    expect(revertMenu(base, current, 2)).toBeNull();
    expect(revertMenu(base, base, 3)).toBe(base);
    // 초안 연산도 같은 판정을 이유와 함께 돌려준다.
    const reverted = revertPlacement({ ...startDraft(base), items: current }, base, 2);
    expect(reverted.ok).toBe(false);
  });

  it('원래 상위가 삭제 예정이면 위치를 되돌리지 않고 이유를 말한다 — 삭제 예정 메뉴 아래로 돌아가면 서버가 저장을 거부한다', () => {
    const base = tree();
    // 6 을 5 에서 1 아래로 옮긴 뒤, 하위가 빈 5 를 삭제 예정으로 표시한다.
    const deleted = ok(markDeleted(ok(moveMenu(startDraft(base), 6, 1, Number.POSITIVE_INFINITY)), 5, true));
    expect(revertPlacement(deleted, base, 6)).toEqual({
      ok: false,
      reason: "원래 상위 메뉴 '메뉴5'이(가) 삭제 예정이라 되돌릴 수 없습니다. 그 메뉴의 삭제를 먼저 취소하세요.",
    });
    // 삭제를 먼저 취소하면 되돌린다.
    const restored = ok(revertPlacement(ok(markDeleted(deleted, 5, false)), base, 6));
    expect(summarizeDraft(base, restored, []).hasChanges).toBe(false);
  });
});

describe('placementProblem — 옮길 수 없는 자리와 이유', () => {
  it('자기·하위, 삭제 예정 상위, 깊이를 이유와 함께 막는다', () => {
    const items = tree();
    expect(placementProblem(items, new Set(), 2, 3)).toBe('자기 자신이나 자기 하위 메뉴 아래로는 옮길 수 없습니다.');
    expect(placementProblem(items, new Set([7]), 6, 7)).toBe('삭제 예정 메뉴 아래로는 옮길 수 없습니다.');
    expect(placementProblem(items, new Set([6]), 6, 7)).toBe('삭제 예정 메뉴는 옮길 수 없습니다. 삭제를 먼저 취소하세요.');
    // 하위가 있는 메뉴(5)는 영역 바로 아래에만, 하위가 두 단계인 메뉴(1)는 최상위에만 둔다.
    expect(placementProblem(items, new Set(), 5, 2)).toBe('하위가 있는 메뉴는 영역 바로 아래에만 둘 수 있습니다.');
    expect(placementProblem(items, new Set(), 1, 7)).toBe('하위 메뉴가 두 단계까지 있는 메뉴는 영역(최상위)으로만 둘 수 있습니다.');
    // 3단계 줄 아래에 새 메뉴를 둘 수 없다.
    expect(placementProblem(items, new Set(), null, 3)).toBe('메뉴는 3단계까지만 둘 수 있습니다.');
    expect(placementProblem(items, new Set(), 5, 1)).toBeNull();
    expect(placementProblem(items, new Set(), 1, null)).toBeNull();
  });

  it('moveMenu·shiftMenu 는 막힌 자리를 이유와 함께 거부하고, 제자리면 같은 초안을 돌려준다', () => {
    const draft = startDraft(tree());
    const rejected = moveMenu(draft, 5, 2, 0);
    expect(rejected).toEqual({ ok: false, reason: '하위가 있는 메뉴는 영역 바로 아래에만 둘 수 있습니다.' });
    const inPlace = moveMenu(draft, 4, 1, 1);
    expect(inPlace.ok && inPlace.draft).toBe(draft);
    expect(shiftMenu(draft, 7, 1)).toEqual({ ok: false, reason: '메뉴7 메뉴는 같은 상위 안에서 더 아래로 옮길 수 없습니다.' });
  });
});

describe('새 메뉴·삭제 예정', () => {
  it('새 메뉴는 그 자리 맨 끝에 음수 번호로 만들고, 번호를 이어 매긴다', () => {
    const base = tree();
    const first = ok(addMenu(startDraft(base), 2, Number.POSITIVE_INFINITY));
    const second = ok(addMenu(first, null, Number.POSITIVE_INFINITY, { menuNm: '새 영역', modernRoute: '/admin/x' }));
    expect(siblingOrder(second.items).get(2)).toEqual([3, -1]);
    expect(siblingOrder(second.items).get(null)).toEqual([1, 5, 7, -2]);
    expect(second.items.find((item) => item.menuNo === -2)).toMatchObject({ menuNm: '새 영역', modernRoute: '/admin/x', useYn: 'Y', depth: 0 });
    expect(second.nextNew).toBe(3);
    // 3단계 줄 아래·삭제 예정 아래에는 만들지 않는다.
    expect(addMenu(startDraft(base), 3, 0)).toEqual({ ok: false, reason: '메뉴는 3단계까지만 둘 수 있습니다.' });
    expect(addMenu({ ...startDraft(base), deleted: new Set([7]) }, 7, 0).ok).toBe(false);
  });

  it('새 메뉴를 지우면 그 메뉴 표시도 그룹 초안에서 빠지고, 하위가 있으면 지우지 않는다', () => {
    const admin = group('ROLE_USER', ['NAVIGATION:1', 'NAVIGATION:2']);
    let draft = ok(addMenu(startDraft(tree()), 2, Number.POSITIVE_INFINITY, { menuNm: '새 화면' }));
    draft = ok(setNavigation(draft, admin, -1, true));
    expect(groupGrants(draft, admin).has('NAVIGATION:new-1')).toBe(true);
    const removed = ok(removeNewMenu(draft, -1));
    expect(removed.items.some((item) => item.menuNo === -1)).toBe(false);
    // 그 그룹은 기준선과 같아졌으므로 초안에서 빠진다.
    expect(removed.groups.has('ROLE_USER')).toBe(false);

    const folder = ok(addMenu(startDraft(tree()), null, Number.POSITIVE_INFINITY, { menuNm: '새 영역' }));
    const withChild = ok(moveMenu(folder, 7, -1, 0));
    expect(removeNewMenu(withChild, -1)).toEqual({ ok: false, reason: '하위 메뉴가 있어 지울 수 없습니다. 하위 메뉴를 먼저 옮기거나 지우세요.' });
  });

  it('하위가 남은 메뉴는 삭제 예정으로 표시하지 않고, 상위가 삭제 예정이면 하위의 삭제를 먼저 거두지 않는다', () => {
    const draft = startDraft(tree());
    expect(markDeleted(draft, 5, true)).toEqual({ ok: false, reason: '하위 메뉴가 있어 삭제할 수 없습니다. 하위 메뉴를 먼저 옮기거나 삭제하세요.' });
    const both = ok(markDeleted(ok(markDeleted(draft, 6, true)), 5, true));
    expect([...both.deleted].sort()).toEqual([5, 6]);
    expect(markDeleted(both, 6, false)).toEqual({ ok: false, reason: '상위 메뉴의 삭제를 먼저 취소하세요.' });
    expect(editMenu(both, 6, { menuNm: 'x' }).ok).toBe(false);
  });
});

describe('속성·검증', () => {
  it('이름·경로는 앞뒤 공백을 떼고, 빈 경로·설명은 없음으로 같게 본다', () => {
    const base = flat([{ ...row(1, 1), modernRoute: '', menuExpln: undefined }]);
    const same = ok(editMenu(startDraft(base), 1, { menuNm: ' 메뉴1 ', modernRoute: '   ', menuExpln: '' }));
    expect(summarizeDraft(base, same, []).properties).toEqual([]);
    const changed = ok(editMenu(same, 1, { modernRoute: '/admin/a', useYn: 'N' }));
    expect(summarizeDraft(base, changed, []).properties).toEqual([{ menuNo: 1, fields: ['modernRoute', 'useYn'] }]);
    expect(summarizeDraft(base, ok(revertProperties(changed, base, 1)), []).hasChanges).toBe(false);
  });

  it('이름 필수·100자, 경로는 서버와 같은 형식·500자, 설명 4000자', () => {
    expect(validateMenuFields({ menuNm: '  ' })).toEqual({ menuNm: '메뉴 이름을 입력하세요.' });
    expect(validateMenuFields({ menuNm: '가'.repeat(101) }).menuNm).toBe('메뉴 이름은 100자까지 쓸 수 있습니다.');
    expect(validateMenuFields({ menuNm: '가'.repeat(100) })).toEqual({});
    for (const route of ['/admin/system/menus', '/cop/bbs/list?tab=QNA&bbsId=B1', 'cop/bbs/selectBoardList.do', '/admin#top']) {
      expect(validateMenuFields({ menuNm: '메뉴', modernRoute: route }), route).toEqual({});
    }
    for (const route of ['/admin/x?q=홍길동', 'http://example.com', '/admin x']) {
      expect(validateMenuFields({ menuNm: '메뉴', modernRoute: route }).modernRoute, route).toMatch(/연결 경로 형식이 올바르지 않습니다/);
    }
    expect(validateMenuFields({ menuNm: '메뉴', modernRoute: `/${'a'.repeat(500)}` }).modernRoute).toBe('연결 경로는 500자까지 쓸 수 있습니다.');
    expect(validateMenuFields({ menuNm: '메뉴', menuExpln: '가'.repeat(4001) }).menuExpln).toBe('설명은 4000자까지 쓸 수 있습니다.');
  });

  it('입력 상한은 생성 계약(서버 @Size)과 같다', () => {
    expect(MENU_LIMITS).toMatchObject({ name: 100, route: 500, description: 4000, creations: 200, deletions: 200 });
    const creation = (n: number) => ({ key: `new-${n}`, menuNm: '새', modernRoute: null, menuExpln: null, useYn: 'Y' as const });
    const save = (creations: number, deletions: number) => MenuStructureSaveRequestSchema.safeParse({
      version: 'v', placements: [], properties: [], grants: [],
      creations: Array.from({ length: creations }, (_, i) => creation(i + 1)),
      deletions: Array.from({ length: deletions }, (_, i) => i + 1),
    }).success;
    expect(save(MENU_LIMITS.creations, MENU_LIMITS.deletions)).toBe(true);
    expect(save(MENU_LIMITS.creations + 1, 0)).toBe(false);
    expect(save(0, MENU_LIMITS.deletions + 1)).toBe(false);
  });

  it('입력 오류는 저장할 메뉴(새 메뉴·속성을 고친 메뉴)만 센다 — 손대지 않은 기존 메뉴의 옛 경로는 막지 않는다', () => {
    const base = flat([{ ...row(1, 1), modernRoute: '/legacy?q=1' }, row(2, 2)]);
    const draft = startDraft(base);
    expect(summarizeDraft(base, draft, []).errors.size).toBe(0);
    const renamed = ok(editMenu(draft, 1, { menuNm: '새 이름' }));
    expect(summarizeDraft(base, renamed, []).errors.get(1)?.modernRoute).toMatch(/연결 경로 형식이 올바르지 않습니다/);
    const created = ok(addMenu(draft, null, 9));
    expect(summarizeDraft(base, created, []).errors.get(-1)).toEqual({ menuNm: '메뉴 이름을 입력하세요.' });
  });
});

describe('그룹 메뉴 표시', () => {
  it('켜면 상위를 명시적으로 함께 켜고, 끄면 하위를 함께 끈다. 기준선과 같아지면 그룹 초안을 버린다', () => {
    const user = group('ROLE_USER', ['OPERATION:MENU_READ']);
    const draft = startDraft(tree());
    const on = ok(setNavigation(draft, user, 3, true));
    expect([...groupGrants(on, user)].sort()).toEqual(['NAVIGATION:1', 'NAVIGATION:2', 'NAVIGATION:3', 'OPERATION:MENU_READ']);
    const off = ok(setNavigation(on, user, 2, false));
    expect([...groupGrants(off, user)].sort()).toEqual(['NAVIGATION:1', 'OPERATION:MENU_READ']);
    const back = ok(setNavigation(off, user, 1, false));
    expect(back.groups.has('ROLE_USER')).toBe(false);
    expect(revertGroup(on, 'ROLE_USER').groups.size).toBe(0);
  });

  it('그룹 초안은 처음 건드린 시점의 버전을 지킨다 — 전체 그룹 권한을 다시 읽어도 남의 변경을 덮지 않는다', () => {
    const before = group('ROLE_USER', [], 'v1');
    const draft = ok(setNavigation(startDraft(tree()), before, 7, true));
    const refreshed = group('ROLE_USER', ['NAVIGATION:5'], 'v2');
    const summary = summarizeDraft(tree(), draft, [refreshed]);
    expect(summary.groups).toEqual([{
      code: 'ROLE_USER', name: 'ROLE_USER 그룹', version: 'v1', navigationAdd: [7], navigationRemove: [], operationAdd: [],
    }]);
  });

  it('공개 메뉴용 그룹에는 기능 권한을 더하지 않는다', () => {
    expect(addOperations(startDraft(tree()), group('ROLE_ANONYMOUS', []), ['MENU_READ']).ok).toBe(false);
    const added = ok(addOperations(startDraft(tree()), group('ROLE_USER', []), ['MENU_READ']));
    expect(summarizeDraft(tree(), added, [group('ROLE_USER', [])]).groups[0].operationAdd).toEqual(['MENU_READ']);
  });
});

describe('숨김 검사 — 옮긴 메뉴가 그룹에서 숨겨지는가(서버 navigationVisibilityConflicts 와 같다)', () => {
  it('그 그룹이 메뉴는 보는데 새 상위는 보지 않으면 경고하고, 상위 표시 추가나 이 메뉴 표시 회수로 풀린다', () => {
    const base = tree();
    const user = group('ROLE_USER', ['NAVIGATION:5', 'NAVIGATION:6']);
    const other = group('ROLE_OTHER', ['NAVIGATION:1']);
    const moved = ok(moveMenu(startDraft(base), 6, 1, 0));
    expect(summarizeDraft(base, moved, [user, other]).conflicts).toEqual([
      { menuNo: 6, parentNo: 1, groupCode: 'ROLE_USER', groupName: 'ROLE_USER 그룹' },
    ]);
    expect(summarizeDraft(base, ok(setNavigation(moved, user, 1, true)), [user, other]).conflicts).toEqual([]);
    expect(summarizeDraft(base, ok(setNavigation(moved, user, 6, false)), [user, other]).conflicts).toEqual([]);
    // 최상위로 옮기거나 순서만 바꾸면 검사하지 않는다.
    expect(summarizeDraft(base, ok(moveMenu(startDraft(base), 6, null, 0)), [user]).conflicts).toEqual([]);
  });

  it('새 폴더를 만들고 관리자 그룹이 보던 메뉴를 그 아래로 옮겨도, 저장 뒤 받을 호환 배정을 미리 반영해 경고하지 않는다', () => {
    const base = tree();
    const admin = group('ROLE_ADMIN', ['NAVIGATION:5', 'NAVIGATION:6']);
    const folder = ok(addMenu(startDraft(base), null, Number.POSITIVE_INFINITY, { menuNm: '새 폴더' }));
    const moved = ok(moveMenu(folder, 6, -1, 0));
    expect(summarizeDraft(base, moved, [admin]).conflicts).toEqual([]);
    // 같은 상황이 관리자 그룹이 아니면 경고다(호환 배정은 관리자 그룹만 받는다).
    const user = group('ROLE_USER', ['NAVIGATION:5', 'NAVIGATION:6']);
    expect(summarizeDraft(base, moved, [user]).conflicts.map((conflict) => conflict.groupCode)).toEqual(['ROLE_USER']);
  });

  it('표시를 켠 새 메뉴를 그 그룹이 보지 않는 상위로 옮겨도 경고한다 — 새 메뉴는 옮긴 메뉴 검사에 들지 않아 서버가 상위 선택 누락으로 거부한다', () => {
    const base = tree();
    const user = group('ROLE_USER', ['NAVIGATION:1', 'NAVIGATION:2', 'NAVIGATION:3']);
    const shown = ok(setNavigation(ok(addMenu(startDraft(base), 2, Number.POSITIVE_INFINITY, { menuNm: '새 화면' })), user, -1, true));
    expect(summarizeDraft(base, shown, [user]).conflicts).toEqual([]);
    const moved = ok(moveMenu(shown, -1, 5, 0));
    expect(summarizeDraft(base, moved, [user]).conflicts).toEqual([
      { menuNo: -1, parentNo: 5, groupCode: 'ROLE_USER', groupName: 'ROLE_USER 그룹' },
    ]);
    // 상위 표시를 켜면(그 위 상위도 함께) 풀리고, 이 메뉴 표시를 거둬도 풀린다.
    expect(summarizeDraft(base, ok(setNavigation(moved, user, 5, true)), [user]).conflicts).toEqual([]);
    expect(summarizeDraft(base, ok(setNavigation(moved, user, -1, false)), [user]).conflicts).toEqual([]);
  });

  it('옮긴 메뉴의 숨김을 새 상위 표시로 풀고 그 새 상위를 다른 영역으로 옮기면 다시 경고한다', () => {
    const base = tree();
    const user = group('ROLE_USER', ['NAVIGATION:1', 'NAVIGATION:2', 'NAVIGATION:3']);
    const section = ok(moveMenu(ok(addMenu(startDraft(base), 1, Number.POSITIVE_INFINITY, { menuNm: '새 섹션' })), 3, -1, 0));
    expect(summarizeDraft(base, section, [user]).conflicts).toEqual([
      { menuNo: 3, parentNo: -1, groupCode: 'ROLE_USER', groupName: 'ROLE_USER 그룹' },
    ]);
    const resolved = ok(setNavigation(section, user, -1, true));
    expect(summarizeDraft(base, resolved, [user]).conflicts).toEqual([]);
    expect(summarizeDraft(base, ok(moveMenu(resolved, -1, 5, 0)), [user]).conflicts).toEqual([
      { menuNo: -1, parentNo: 5, groupCode: 'ROLE_USER', groupName: 'ROLE_USER 그룹' },
    ]);
  });

  it('이 저장이 상위의 표시를 거둔 하위는 세지 않는다 — 서버가 그 하위 표시를 조용히 빼고 거부하지 않는다', () => {
    const base = tree();
    const user = group('ROLE_USER', ['NAVIGATION:1', 'NAVIGATION:2', 'NAVIGATION:3']);
    // 2·3 의 표시를 거두고, 5 아래 새 메뉴의 표시를 켠 뒤 그 새 메뉴를 2 아래로 옮긴다.
    const revoked = ok(setNavigation(startDraft(base), user, 2, false));
    const created = ok(setNavigation(ok(addMenu(revoked, 5, Number.POSITIVE_INFINITY, { menuNm: '새 화면' })), user, -1, true));
    expect(summarizeDraft(base, ok(moveMenu(created, -1, 2, Number.POSITIVE_INFINITY)), [user]).conflicts).toEqual([]);
    // 거둔 적이 없는 상위(6)면 경고한다.
    expect(summarizeDraft(base, ok(moveMenu(created, -1, 6, Number.POSITIVE_INFINITY)), [user]).conflicts).toEqual([
      { menuNo: -1, parentNo: 6, groupCode: 'ROLE_USER', groupName: 'ROLE_USER 그룹' },
    ]);
  });
});

describe('menuStructurePayload — 서버 MenuStructureSave 그대로', () => {
  it('형제 서버 순번이 조밀하지 않아도(12·13·999) 바뀐 상위의 형제 전체를 1..n 으로 보낸다', () => {
    const base = flat([row(11, 12, 0, '가'), row(12, 13, 0, '나'), row(13, 999, 0, '다'), row(14, 1, 11), row(15, 2, 11)]);
    const draft = ok(shiftMenu(startDraft(base), 13, -1));
    const summary = summarizeDraft(base, draft, []);
    const payload = menuStructurePayload('v1', base, draft, summary);
    expect(payload).toEqual({
      version: 'v1',
      creations: [],
      placements: [
        { ref: '11', parentRef: null, menuOrdr: 1 },
        { ref: '13', parentRef: null, menuOrdr: 2 },
        { ref: '12', parentRef: null, menuOrdr: 3 },
      ],
      properties: [],
      deletions: [],
      grants: [],
    });
    expect(() => parsePayload(payload)).not.toThrow();
  });

  it('동순위 형제는 메뉴 번호 순을 기준선으로 삼아, 옮긴 결과대로 1..n 을 매긴다', () => {
    const base = flat([row(1, 1), row(21, 5, 1), row(20, 5, 1), row(22, 5, 1)]);
    expect(siblingOrder(base).get(1)).toEqual([20, 21, 22]);
    const draft = ok(moveMenu(startDraft(base), 22, 1, 0));
    expect(menuStructurePayload('v', base, draft, summarizeDraft(base, draft, [])).placements).toEqual([
      { ref: '22', parentRef: '1', menuOrdr: 1 },
      { ref: '20', parentRef: '1', menuOrdr: 2 },
      { ref: '21', parentRef: '1', menuOrdr: 3 },
    ]);
  });

  it('새 메뉴(새 상위 아래 새 메뉴 포함)·속성·삭제·그룹 배정을 한 요청에 담는다', () => {
    const base = tree();
    const user = group('ROLE_USER', ['NAVIGATION:1', 'NAVIGATION:7', 'NAVIGATION:2'], 'user-v1');
    let draft = ok(addMenu(startDraft(base), null, Number.POSITIVE_INFINITY, { menuNm: '새 영역' }));
    draft = ok(addMenu(draft, -1, 0, { menuNm: ' 새 화면 ', modernRoute: '/admin/system/menus' }));
    draft = ok(editMenu(draft, 4, { menuNm: '메뉴4 고침', menuExpln: '설명' }));
    draft = ok(markDeleted(draft, 7, true));
    draft = ok(setNavigation(draft, user, -2, true));
    draft = ok(setNavigation(draft, user, 2, false));
    const summary = summarizeDraft(base, draft, [user]);
    const payload = menuStructurePayload('v9', base, draft, summary);
    expect(payload.creations).toEqual([
      { key: 'new-1', menuNm: '새 영역', modernRoute: null, menuExpln: null, useYn: 'Y' },
      { key: 'new-2', menuNm: '새 화면', modernRoute: '/admin/system/menus', menuExpln: null, useYn: 'Y' },
    ]);
    // 최상위 형제 목록이 바뀌었다(7 삭제 예정은 빼고, 새 영역 추가). 새 영역 아래 새 화면도 위치가 있다.
    expect(payload.placements).toEqual([
      { ref: '1', parentRef: null, menuOrdr: 1 },
      { ref: '5', parentRef: null, menuOrdr: 2 },
      { ref: 'new-1', parentRef: null, menuOrdr: 3 },
      { ref: 'new-2', parentRef: 'new-1', menuOrdr: 1 },
    ]);
    expect(payload.properties).toEqual([{ menuNo: 4, menuNm: '메뉴4 고침', modernRoute: null, menuExpln: '설명', useYn: 'Y' }]);
    expect(payload.deletions).toEqual([7]);
    // 삭제 예정 메뉴(7)의 표시는 건드리지 않는다(서버가 삭제와 함께 지운다). 상위 표시는 명시적으로 함께 더했다.
    expect(payload.grants).toEqual([{
      groupCode: 'ROLE_USER',
      groupVersion: 'user-v1',
      navigationAdd: ['new-1', 'new-2'],
      navigationRemove: [2],
      operationAdd: [],
    }]);
    expect(() => parsePayload(payload)).not.toThrow();
    expect(draftCounts(summary)).toEqual({ created: 2, deleted: 1, placed: 0, properties: 1, grants: 3, groups: 1 });
    expect(menuBadges(summary)).toEqual(new Map([[-1, ['new']], [-2, ['new']], [7, ['deleted']], [4, ['edited']]]));
  });

  it('옮겼다가 삭제 예정으로 표시한 메뉴는 위치를 보내지 않는다(서버가 삭제 메뉴의 위치 변경을 거부한다)', () => {
    const base = tree();
    const moved = ok(moveMenu(startDraft(base), 7, 5, 0));
    const deleted = ok(markDeleted(moved, 7, true));
    const payload = menuStructurePayload('v', base, deleted, summarizeDraft(base, deleted, []));
    expect(payload.placements).toEqual([]);
    expect(payload.deletions).toEqual([7]);
  });

  it('변경이 없으면 보낼 것이 없다', () => {
    const base = tree();
    const draft = startDraft(base);
    const summary = summarizeDraft(base, draft, []);
    expect(summary.hasChanges).toBe(false);
    expect(menuStructurePayload('v', base, draft, summary)).toEqual({
      version: 'v', creations: [], placements: [], properties: [], deletions: [], grants: [],
    });
  });
});
