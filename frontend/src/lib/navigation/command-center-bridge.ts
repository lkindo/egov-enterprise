/**
 * 화면 버튼이 전역 명령 센터(빠른 이동)를 여는 경로(2026-10-01).
 *
 * 종전에는 즐겨찾기·최근 방문이 Ctrl+K 로만 열리는 명령 센터 안에 있어, 단축키를 모르는 사용자는 등록해 둔
 * 즐겨찾기를 쓸 방법이 없었다. 헤더 버튼이 이 이벤트를 보내고 명령 센터가 받는다.
 */
export const COMMAND_CENTER_OPEN_EVENT = 'egov:open-command-center';

export function requestCommandCenter() {
  window.dispatchEvent(new Event(COMMAND_CENTER_OPEN_EVENT));
}
