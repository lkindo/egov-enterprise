'use client';

import { useMemo, useState } from 'react';
import {
  MENU_HIDDEN_REASON_LABELS,
  menuPreviewKey,
  type MenuVisibilityPreview,
} from '@/lib/navigation/menu-visibility-preview';
import { menuRef, type MenuBadgeKind, type MenuDraft, type MenuGroup } from './menuDraft';
import { areaOf, menuSearchMatches } from './menuBoardModel';
import type { MenuBoardAreaCount } from './MenuBoard';
import type { GroupMenuVerdict } from './MenuGroupVisibility';
import { draftVisibility } from './menuAdminModel';

/**
 * 시스템 메뉴 관리 보드의 보기 상태(2026-10-18 화면 분해 때 MenuAdminClient 에서 옮겼다 — 동작 변경 없음): 찾기, 그룹
 * 미리보기, 영역 탭의 개수, 상세의 그룹별 결과 칩. 초안은 바꾸지 않는다.
 */
export function useMenuBoardView({ draft, groups, badges, selectedMenuNo, selectedNo }: {
  draft: MenuDraft;
  groups: readonly MenuGroup[];
  badges: ReadonlyMap<number, readonly MenuBadgeKind[]>;
  /** 고른 메뉴(영역과 무관한 원래 값). */
  selectedMenuNo: number | null;
  /** 지금 영역에서 보이는 고른 메뉴. */
  selectedNo: number | null;
}) {
  const [keyword, setKeyword] = useState('');
  const [previewGroup, setPreviewGroup] = useState('');

  const searching = keyword.trim() !== '';
  const matches = useMemo(() => menuSearchMatches(draft.items, keyword), [draft.items, keyword]);
  const matchSet = useMemo(() => (searching ? new Set(matches) : null), [searching, matches]);

  const preview: MenuVisibilityPreview | null = useMemo(() => {
    const group = groups.find((candidate) => candidate.code === previewGroup);
    return group ? draftVisibility(draft, group) : null;
  }, [groups, previewGroup, draft]);
  const previewCounts = useMemo(() => {
    if (!preview) return null;
    const verdicts = [...preview.byMenu.values()];
    return { shown: verdicts.filter((verdict) => verdict.visible).length, hidden: verdicts.filter((verdict) => !verdict.visible).length };
  }, [preview]);

  /*
    그룹마다 저장 전 초안 기준 사이드바 판정(상세의 결과 칩). 고른 메뉴가 있을 때만 계산하고, 미리보기 중인 그룹은 그 결과를
    다시 쓴다. 고른 메뉴의 결과는 아래 verdictOf 가 꺼낸다.
  */
  const groupVisibilities = useMemo(() => {
    if (selectedMenuNo === null || groups.length === 0) return null;
    return new Map(groups.map((group) => [group.code, group.code === previewGroup && preview ? preview : draftVisibility(draft, group)] as const));
  }, [selectedMenuNo, groups, previewGroup, preview, draft]);
  const verdictOf = (groupCode: string): GroupMenuVerdict | null => {
    if (selectedNo === null) return null;
    const visibility = groupVisibilities?.get(groupCode)?.byMenu.get(menuPreviewKey(menuRef(selectedNo)));
    if (!visibility) return null;
    return { visible: visibility.visible, reason: visibility.visible ? null : MENU_HIDDEN_REASON_LABELS[visibility.reason] };
  };

  const viewOf = (menuNo: number) => {
    const verdict = preview?.byMenu.get(menuPreviewKey(menuRef(menuNo)));
    return {
      badges: badges.get(menuNo) ?? [],
      hiddenReason: verdict && !verdict.visible ? MENU_HIDDEN_REASON_LABELS[verdict.reason] : null,
    };
  };

  const areaChangeCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const menuNo of badges.keys()) {
      const area = areaOf(draft.items, menuNo);
      if (area !== null) counts.set(area, (counts.get(area) ?? 0) + 1);
    }
    return counts;
  }, [badges, draft.items]);

  /** 영역 탭의 개수 — 하위 메뉴 수, 미리보기 중 보이는 하위 수, 찾는 중 일치 수(영역 자신 포함). 초안은 선순회 순서다. */
  const areaCounts = useMemo(() => {
    const counts = new Map<number, MenuBoardAreaCount>();
    let current: MenuBoardAreaCount | null = null;
    for (const item of draft.items) {
      if (item.depth === 0) {
        current = { total: 0, shown: preview ? 0 : null, matched: matchSet ? 0 : null };
        counts.set(item.menuNo, current);
      } else if (current) {
        current.total += 1;
        if (current.shown !== null && preview?.byMenu.get(menuPreviewKey(menuRef(item.menuNo)))?.visible) current.shown += 1;
      }
      if (current && current.matched !== null && matchSet?.has(item.menuNo)) current.matched += 1;
    }
    return counts;
  }, [draft.items, preview, matchSet]);

  const previewGroupName = groups.find((group) => group.code === previewGroup)?.name;

  return {
    keyword,
    setKeyword,
    previewGroup,
    setPreviewGroup,
    searching,
    matches,
    matchSet,
    preview,
    previewCounts,
    previewGroupName,
    verdictOf,
    viewOf,
    areaChangeCounts,
    areaCounts,
  };
}
