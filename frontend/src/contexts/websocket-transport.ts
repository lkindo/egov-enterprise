/**
 * 연결 라이브러리(STOMP·SockJS)는 로그인한 사용자에게만 필요하다. 루트 공급자가 정적으로 가져오면 로그인 화면을 포함한 모든 첫
 * 화면 번들에 실린다 — 연결을 시작할 때 불러온다(2026-11-14).
 *
 * <p>공급자와 따로 둔 이유: 불러오기 실패 뒤의 재시도를 시험이 흉내 낼 수 있게 한다. 같은 모듈 안의 호출은 바꿔 끼울 수 없다.
 */
export const loadTransport = () => Promise.all([import('@stomp/stompjs'), import('sockjs-client')]);
