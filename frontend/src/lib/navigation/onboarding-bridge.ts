/**
 * 계정 메뉴의 '사용 안내' 가 온보딩을 여는 경로(2026-10-01). 온보딩은 더 이상 저절로 모달로 열리지 않는다.
 */
export const ONBOARDING_OPEN_EVENT = 'egov:open-onboarding';

export function requestOnboarding() {
  window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT));
}
