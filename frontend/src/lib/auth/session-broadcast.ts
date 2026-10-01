/**
 * 같은 브라우저의 다른 탭에 로그인·로그아웃을 알린다(2026-10-01 결정 17).
 *
 * 종전에는 한 탭에서 로그아웃해도 다른 탭은 그대로 화면을 보이다가, 다음 요청이 401 로 끊기며 '세션이
 * 만료되었습니다' 로 튕겼다 — 사용자가 한 일(로그아웃)과 다른 말을 들었다. 다른 탭에서 다시 로그인해도 이
 * 탭은 이전 사람의 권한 상태를 들고 있었다. 쿠키는 탭끼리 공유되므로 알림만 있으면 된다.
 *
 * 메시지에는 사용자 정보를 싣지 않는다 — 받은 탭이 서버에 다시 묻는다. BroadcastChannel 이 없는 환경에서는
 * 아무 일도 하지 않는다(종전 동작).
 */
const CHANNEL = 'egov-auth-session';

export type SessionMessage = { type: 'signed-out' } | { type: 'signed-in' };

function isSessionMessage(value: unknown): value is SessionMessage {
  return typeof value === 'object' && value !== null
    && ((value as { type?: unknown }).type === 'signed-out' || (value as { type?: unknown }).type === 'signed-in');
}

export function announceSession(message: SessionMessage) {
  if (typeof BroadcastChannel === 'undefined') return;
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    // 알림 실패는 종전 동작(다음 요청에서 알게 된다)으로 남는다.
  }
}

/** 다른 탭의 알림을 받는다. 보낸 탭 자신은 받지 않는다(BroadcastChannel 의 성질). */
export function listenSession(handler: (message: SessionMessage) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel(CHANNEL);
  } catch {
    return () => {};
  }
  channel.onmessage = (event: MessageEvent) => { if (isSessionMessage(event.data)) handler(event.data); };
  return () => channel.close();
}
