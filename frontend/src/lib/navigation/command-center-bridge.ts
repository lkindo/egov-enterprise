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

/**
 * 화면 버튼이 헤더의 '추가 인증 관리' 대화상자를 여는 경로(2026-10-01 결정 18). 사용자 상세의 '추가 인증 복구 승인'
 * 이 대상을 인계(target-handoff 'mfa-recover-user')한 뒤 이 이벤트를 보낸다 — 복구 승인 양식은 그 대화상자가 소유한다.
 */
export const ACCOUNT_MFA_OPEN_EVENT = 'egov:open-account-mfa';

export function requestAccountMfa() {
  window.dispatchEvent(new Event(ACCOUNT_MFA_OPEN_EVENT));
}
