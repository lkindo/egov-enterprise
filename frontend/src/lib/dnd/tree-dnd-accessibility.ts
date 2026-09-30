import type { Announcements, ScreenReaderInstructions, UniqueIdentifier } from '@dnd-kit/core';

/**
 * [2026-10-01] 끌어서 옮기는 트리(메뉴·부서)의 스크린리더 안내. 지정하지 않으면 dnd-kit 기본 영어 문장
 * ("To pick up a draggable item, press the space bar…", "Draggable item 12 was dropped over droppable area 7")
 * 이 읽혀, 한국어 화면에서 무엇을 어디로 옮기는지 알 수 없었다. 공통코드 트리의 한국어 안내와 같은 형태다.
 *
 * 키보드 센서는 순서만 옮기고 상위(깊이)는 바꾸지 못하므로, 지시문이 상위를 바꾸는 다른 길을 알린다.
 */
export function treeDndInstructions(noun: string, alternative: string): ScreenReaderInstructions {
  return {
    draggable:
      `스페이스 또는 엔터 키로 ${noun} 이동을 시작합니다. 위·아래 방향키로 자리를 옮기고 스페이스 또는 엔터 키로 확정합니다. `
      + `Escape 키로 취소합니다. 상위 ${noun}를 바꾸려면 ${alternative}를 씁니다.`,
  };
}

export function treeDndAnnouncements(
  noun: string,
  nameOf: (id: UniqueIdentifier) => string | undefined,
): Announcements {
  const label = (id: UniqueIdentifier) => nameOf(id) || `이름 없는 ${noun}`;
  return {
    onDragStart: ({ active }) => `${label(active.id)} ${noun} 이동을 시작했습니다.`,
    onDragOver: ({ active, over }) => (over && over.id !== active.id
      ? `${label(active.id)} ${noun}를 ${label(over.id)} 자리로 옮기는 중입니다.`
      : `${label(active.id)} ${noun}를 옮길 자리를 찾고 있습니다.`),
    onDragEnd: ({ active, over }) => (over && over.id !== active.id
      ? `${label(active.id)} ${noun}를 ${label(over.id)} 자리로 옮겼습니다. 저장해야 반영됩니다.`
      : `${label(active.id)} ${noun} 이동을 마쳤습니다. 바뀐 자리는 저장해야 반영됩니다.`),
    onDragCancel: ({ active }) => `${label(active.id)} ${noun} 이동을 취소했습니다.`,
  };
}
