import { describe, expect, it } from 'vitest';
import type { MenuInfo } from '@/types/foundation/menu';
import { flattenTree, listToTree } from '../treeUtils';
import {
  areaOf,
  boardTargetOf,
  dropPosition,
  dropsInto,
  isSectionCard,
  MENU_BOARD_DND_INSTRUCTIONS,
  menuBoardAnnouncements,
  menuSearchMatches,
  moveDestinations,
  nextSearchMatch,
  pasteTarget,
  resolveBoardDrop,
} from '../menuBoardModel';

/**
 * [2026-10-02 D1] 보드 판정 — 끌어 놓기·붙여넣기·'다른 곳으로 옮기기' 목적지·찾기. 이동 자체는 menuDraft.moveBlock 이다.
 */
const row = (menuNo: number, menuOrdr: number, upMenuSn = 0, extra: Partial<MenuInfo> = {}): MenuInfo => ({
  menuNo, menuNm: `메뉴${menuNo}`, menuOrdr, upMenuSn, upperMenuId: upMenuSn, ...extra,
});

/*
  영역 1 ─ 섹션 2 ─ 줄 3, 줄 4
         └ 화면 카드 8(/admin/a, 하위 없음)
  영역 5 ─ 섹션 6(경로 없음, 하위 없음)
  영역 7
*/
const board = () => flattenTree(listToTree([
  row(1, 1), row(2, 1, 1), row(3, 1, 2), row(4, 2, 2), row(8, 2, 1, { modernRoute: '/admin/a' }),
  row(5, 2), row(6, 1, 5),
  row(7, 3),
]));
const none = new Set<number>();

describe('보드 구성', () => {
  it('영역·섹션 카드·한 줄 카드를 가른다', () => {
    const items = board();
    expect(areaOf(items, 4)).toBe(1);
    expect(areaOf(items, 5)).toBe(5);
    expect(areaOf(items, 999)).toBeNull();
    const byNo = (menuNo: number) => items.find((item) => item.menuNo === menuNo)!;
    expect(isSectionCard(items, byNo(2))).toBe(true); // 하위가 있다
    expect(isSectionCard(items, byNo(6))).toBe(true); // 경로가 없다
    expect(isSectionCard(items, byNo(8))).toBe(false); // 경로가 있고 하위가 없다
  });
});

describe('resolveBoardDrop — 끌어 놓을 곳', () => {
  it('같은 카드 안 줄의 앞·뒤로 놓으면 그 형제 자리다. 제자리는 바뀐 것이 없다', () => {
    const items = board();
    expect(resolveBoardDrop(items, none, 3, { kind: 'row', menuNo: 4, position: 'after' })).toEqual({ kind: 'move', parent: 2, index: 1 });
    expect(resolveBoardDrop(items, none, 3, { kind: 'row', menuNo: 4, position: 'before' })).toEqual({ kind: 'none' });
    expect(resolveBoardDrop(items, none, 3, { kind: 'row', menuNo: 3, position: 'after' })).toEqual({ kind: 'none' });
  });

  it('줄을 다른 카드의 머리나 끝에 놓으면 그 카드 안 맨 뒤다(다른 영역의 카드도 된다)', () => {
    const items = board();
    expect(resolveBoardDrop(items, none, 3, { kind: 'card', menuNo: 6, position: 'before' }))
      .toEqual({ kind: 'move', parent: 6, index: Number.POSITIVE_INFINITY });
    expect(resolveBoardDrop(items, none, 4, { kind: 'section-end', menuNo: 8 }))
      .toEqual({ kind: 'move', parent: 8, index: Number.POSITIVE_INFINITY });
  });

  it('카드를 카드에 놓으면 카드 순서이고, 영역 탭·머리·끝에 놓으면 그 영역 맨 뒤 2단계다', () => {
    const items = board();
    expect(resolveBoardDrop(items, none, 8, { kind: 'card', menuNo: 2, position: 'before' })).toEqual({ kind: 'move', parent: 1, index: 0 });
    expect(resolveBoardDrop(items, none, 3, { kind: 'area', menuNo: 7 })).toEqual({ kind: 'move', parent: 7, index: Number.POSITIVE_INFINITY });
    expect(resolveBoardDrop(items, none, 2, { kind: 'area', menuNo: 5 })).toEqual({ kind: 'move', parent: 5, index: Number.POSITIVE_INFINITY });
  });

  it('3단계를 넘는 자리·자기 하위·삭제 예정 상위는 이유와 함께 거부한다', () => {
    const items = board();
    // 하위가 있는 섹션(2)은 다른 카드 안으로 갈 수 없다 — 영역 바로 아래에만 둔다.
    expect(resolveBoardDrop(items, none, 2, { kind: 'section-end', menuNo: 6 }))
      .toEqual({ kind: 'reject', reason: '하위가 있는 메뉴는 영역 바로 아래에만 둘 수 있습니다.' });
    expect(resolveBoardDrop(items, none, 2, { kind: 'row', menuNo: 3, position: 'after' }))
      .toEqual({ kind: 'reject', reason: '자기 자신이나 자기 하위 메뉴 아래로는 옮길 수 없습니다.' });
    expect(resolveBoardDrop(items, new Set([6]), 3, { kind: 'section-end', menuNo: 6 }))
      .toEqual({ kind: 'reject', reason: '삭제 예정 메뉴 아래로는 옮길 수 없습니다.' });
  });

  it('놓을 곳의 위·아래 절반으로 앞·뒤를 정하고, 위치 정보가 없으면 앞이다', () => {
    expect(dropPosition({ top: 0, height: 10 }, { top: 0, height: 10 })).toBe('before');
    expect(dropPosition({ top: 8, height: 10 }, { top: 0, height: 10 })).toBe('after');
    expect(dropPosition(null, { top: 0, height: 10 })).toBe('before');
  });
});

describe('놓을 자리 표시와 끌기 안내', () => {
  it('안으로 놓기 표시는 놓을 곳의 종류가 아니라 실제 결과를 따른다 — 줄을 카드 머리에 끌면 그 카드 안이다', () => {
    const items = board();
    const show = (activeNo: number, overId: string, position: 'before' | 'after' = 'before') => {
      const target = boardTargetOf(overId, position)!;
      return dropsInto(resolveBoardDrop(items, none, activeNo, target), overId);
    };
    // 줄(3단계)을 다른 카드 머리에 → 그 카드 안 맨 뒤(안으로 표시).
    expect(show(3, 'card:6')).toBe(true);
    expect(show(3, 'card:8', 'after')).toBe(true);
    // 카드(2단계)를 카드 머리에 → 카드 앞·뒤(선 표시).
    expect(show(8, 'card:2')).toBe(false);
    // 줄을 줄에 → 앞·뒤(선 표시). 섹션 끝·영역 탭은 안으로.
    expect(show(3, 'row:4', 'after')).toBe(false);
    expect(show(4, 'section-end:6')).toBe(true);
    expect(show(3, 'area-tab:7')).toBe(true);
    // 거부·제자리는 안으로가 아니다.
    expect(show(2, 'section-end:6')).toBe(false);
    expect(show(3, 'row:4', 'before')).toBe(false);
  });

  it('끄는 동안 놓을 수 없는 자리는 이유를, 제자리는 바뀌지 않는다는 사실을 말하고, 놓은 결과는 화면 안내에 맡긴다', () => {
    const items = board();
    const deleted = new Set([6]);
    const names: Record<string, string> = { 'menu:3': '결재함', 'section-end:6': '시스템 섹션 끝', 'row:4': '권한별 메뉴', 'area-tab:7': '관리 영역' };
    const announcements = menuBoardAnnouncements(
      (id) => names[String(id)],
      (activeNo, target) => resolveBoardDrop(items, deleted, activeNo, target),
    );
    const active = { id: 'menu:3', rect: { current: { initial: null, translated: { top: 0, height: 10 } } } } as never;
    const over = (id: string) => ({ id, rect: { top: 0, height: 10 } }) as never;

    expect(announcements.onDragStart({ active })).toBe('결재함 메뉴 이동을 시작했습니다.');
    // 거부 — 이유를 말한다. 놓아도 '옮겼습니다' 라고 말하지 않는다(화면 안내가 '옮길 수 없습니다' 를 말한다).
    expect(announcements.onDragOver({ active, over: over('section-end:6') }))
      .toBe('결재함 메뉴는 시스템 섹션 끝 자리에 놓을 수 없습니다. 삭제 예정 메뉴 아래로는 옮길 수 없습니다.');
    expect(announcements.onDragEnd({ active, over: over('section-end:6') })).toBeUndefined();
    // 제자리(줄 4 의 앞) — 바뀌는 것이 없다고 말한다(화면 안내는 아무 말도 하지 않는다).
    expect(announcements.onDragOver({ active, over: over('row:4') })).toBe('결재함 메뉴의 지금 자리입니다. 여기에 놓으면 바뀌는 것이 없습니다.');
    expect(announcements.onDragEnd({ active, over: over('row:4') })).toBe('결재함 메뉴를 제자리에 두었습니다. 바뀐 것이 없습니다.');
    // 옮길 수 있는 자리 — 끄는 동안은 공유 문장, 놓은 결과는 화면 안내 한 곳이 말한다.
    expect(announcements.onDragOver({ active, over: over('area-tab:7') })).toBe('결재함 메뉴를 관리 영역 자리로 옮기는 중입니다.');
    expect(announcements.onDragEnd({ active, over: over('area-tab:7') })).toBeUndefined();
    // 놓을 곳 밖.
    expect(announcements.onDragEnd({ active, over: null })).toBe('결재함 메뉴를 놓을 곳 밖에서 놓아 옮기지 않았습니다.');
    expect(announcements.onDragCancel({ active, over: null })).toBe('결재함 메뉴 이동을 취소했습니다.');
  });

  it('지시문은 방향키로 다른 카드·영역 탭까지 옮겨 상위가 바뀐다는 사실과 끌지 않는 길을 알린다', () => {
    expect(MENU_BOARD_DND_INSTRUCTIONS.draggable).toContain('다른 카드나 영역 탭 위에 놓으면 상위 메뉴가 바뀝니다.');
    expect(MENU_BOARD_DND_INSTRUCTIONS.draggable).toContain('상세의 다른 곳으로 옮기기');
    expect(MENU_BOARD_DND_INSTRUCTIONS.draggable).not.toContain('위·아래 방향키로 자리를 옮기고');
  });
});

describe('붙여넣기와 목적지', () => {
  it('붙여넣기 자리: 영역이면 그 안, 카드면 카드 기준, 줄이면 그 뒤다', () => {
    const items = board();
    expect(pasteTarget(items, 5)).toEqual({ kind: 'area', menuNo: 5 });
    expect(pasteTarget(items, 2)).toEqual({ kind: 'card', menuNo: 2, position: 'after' });
    expect(pasteTarget(items, 4)).toEqual({ kind: 'row', menuNo: 4, position: 'after' });
    expect(pasteTarget(items, 999)).toBeNull();
    // 줄을 잘라 카드에 붙이면 카드 안으로, 카드를 잘라 카드에 붙이면 그 카드 뒤로 간다.
    expect(resolveBoardDrop(items, none, 3, pasteTarget(items, 6)!)).toEqual({ kind: 'move', parent: 6, index: Number.POSITIVE_INFINITY });
    expect(resolveBoardDrop(items, none, 6, pasteTarget(items, 2)!)).toEqual({ kind: 'move', parent: 1, index: 1 });
    // 이미 그 카드 바로 뒤에 있는 카드를 붙이면 바뀐 것이 없다.
    expect(resolveBoardDrop(items, none, 8, pasteTarget(items, 2)!)).toEqual({ kind: 'none' });
  });

  it('목적지는 최상위·영역·2단계 메뉴이고, 고를 수 없는 자리는 이유가 붙는다', () => {
    const items = board();
    const forSection = moveDestinations(items, none, 2);
    expect(forSection.map(({ label, level, current, problem }) => [label, level, current, problem])).toEqual([
      ['최상위(새 영역)', 0, false, null],
      ['메뉴1', 1, true, null],
      ['메뉴1 › 메뉴2', 2, false, '자기 자신이나 자기 하위 메뉴 아래로는 옮길 수 없습니다.'],
      ['메뉴1 › 메뉴8', 2, false, '하위가 있는 메뉴는 영역 바로 아래에만 둘 수 있습니다.'],
      ['메뉴5', 1, false, null],
      ['메뉴5 › 메뉴6', 2, false, '하위가 있는 메뉴는 영역 바로 아래에만 둘 수 있습니다.'],
      ['메뉴7', 1, false, null],
    ]);
    // 새 메뉴 자리(menuNo 없음)는 하위가 없는 것으로 본다.
    expect(moveDestinations(items, new Set([7]), null).filter((destination) => destination.problem === null).map((destination) => destination.parent))
      .toEqual([null, 1, 2, 8, 5, 6]);
  });
});

describe('찾기', () => {
  it('이름·번호·경로에 든 메뉴를 선순회 순서로, Enter 는 지금 고른 메뉴 다음 일치로 돌아간다', () => {
    const items = board();
    expect(menuSearchMatches(items, '')).toEqual([]);
    expect(menuSearchMatches(items, '/admin/A')).toEqual([8]);
    expect(menuSearchMatches(items, '메뉴')).toEqual([1, 2, 3, 4, 8, 5, 6, 7]);
    expect(menuSearchMatches(items, '6')).toEqual([6]);
    expect(nextSearchMatch([3, 8, 6], null)).toBe(3);
    expect(nextSearchMatch([3, 8, 6], 8)).toBe(6);
    expect(nextSearchMatch([3, 8, 6], 6)).toBe(3);
    expect(nextSearchMatch([3, 8, 6], 1)).toBe(3);
    expect(nextSearchMatch([], 1)).toBeNull();
  });
});
