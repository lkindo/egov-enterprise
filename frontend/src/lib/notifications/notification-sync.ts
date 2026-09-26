/**
 * 헤더 알림(드로어·배지)과 알림 센터 사이의 변경 신호.
 *
 * [2026-09-26 DIP B4 P2] 종전에는 알림 센터가 헤더와 같은 실시간 훅(useNotifications)을 한 벌 더 띄워, 같은 개인 큐를
 * 두 번 구독하고 60초 폴링도 두 벌 돌렸다(새 알림 토스트도 두 번). 이제 실시간 구독·폴링은 헤더 한 곳만 갖고,
 * 알림 센터는 서버 페이지 조회만 한다. 한쪽에서 읽음·삭제·새 알림이 생기면 이 신호로 다른 쪽이 다시 읽는다.
 *
 * 신호는 보낸 쪽을 싣는다 — 자기가 보낸 신호로 자기를 다시 읽지 않는다.
 */
export type NotificationChangeSource = 'header' | 'center';

const EVENT_NAME = 'app:notifications-changed';

export function announceNotificationsChanged(source: NotificationChangeSource): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<NotificationChangeSource>(EVENT_NAME, { detail: source }));
}

/** 다른 쪽이 보낸 변경만 듣는다. 해제 함수를 돌려준다. */
export function subscribeNotificationsChanged(
  self: NotificationChangeSource,
  listener: () => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => {
    const source = (event as CustomEvent<NotificationChangeSource>).detail;
    if (source !== self) listener();
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
