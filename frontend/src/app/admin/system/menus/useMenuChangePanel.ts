'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';

/**
 * 시스템 메뉴 관리의 변경 목록 여닫기(2026-10-18 화면 분해 때 MenuAdminClient 에서 옮겼다 — 동작 변경 없음).
 *
 * <p>변경 목록을 펼쳤는가 — '변경 n건' 단추만 연다. [2026-10-05 2차 리뷰] 저장을 막는 문제가 생겨도 저절로 펼치지 않는다 — 저절로
 * 펼친 목록(변경 3건이면 약 258px)이 보드 위에서 보드를 밀어, 방금 끌어 놓은 줄이 시야 밖으로 나갔다(Chromium 실측 1920×950
 * 보이는 항목 12→0). 대신 '변경 n건' 단추의 배지(저장 전 해결 n건)와 '변경 저장' 의 설명이 이유를 말하고, 옮기기로 숨겨지는
 * 메뉴가 생기면 결과 안내가 그 사실을 함께 말한다(conflictNotice). 변경이 모두 사라지면 접는다(다음 변경 때 펼친 채 나타나
 * 보드를 밀지 않는다).
 */
export function useMenuChangePanel(hasChanges: boolean) {
  const changePanelId = useId();
  const changeToggleRef = useRef<HTMLButtonElement>(null);
  const [changesOpen, setChangesOpen] = useState(false);
  if (!hasChanges && changesOpen) setChangesOpen(false);
  /*
    목록이 저절로 접힐 때 포커스가 그 안(해결 단추 등)에 있었으면 '변경 n건' 단추로 옮긴다 — 숨겨진 요소의 포커스는 브라우저가
    문서 밖으로 내보낸다. 그리기 전에(useLayoutEffect) 옮겨, 목록 안의 포커스 이어받기(MenuChangeList)가 문서 밖 포커스를 보지 않게
    한다.
  */
  useLayoutEffect(() => {
    if (changesOpen) return;
    const panel = document.getElementById(changePanelId);
    const active = document.activeElement;
    if (panel && active instanceof HTMLElement && panel.contains(active)) changeToggleRef.current?.focus();
  }, [changesOpen, changePanelId]);

  const toggleChanges = () => {
    const opening = !changesOpen;
    setChangesOpen(opening);
    // 칸이 통째로 스크롤하는 좁은 화면(fill 조건 밖)에서 칸을 내려 둔 채 열면 목록이 보이지 않는다 — 보이게 옮긴다.
    if (opening) window.requestAnimationFrame(() => document.getElementById(changePanelId)?.scrollIntoView?.({ block: 'nearest' }));
  };

  return { changePanelId, changeToggleRef, changesOpen, toggleChanges };
}
