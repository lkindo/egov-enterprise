/**
 * 백엔드로 넘길 사용자 IP 헤더 — ADR-0019 · GAP-SEC-004.
 *
 * <p>Next 가 백엔드를 서버 쪽에서 부르면(로그인·재발급·로그아웃 BFF, 서버 컴포넌트·서버 액션) 백엔드의
 * 피어는 Next 컨테이너다. 사용자 IP 를 싣지 않으면 로그인 IP 제한 정책·로그인 IP 기록·요청 제한이 모두
 * Next 주소 하나로 판정된다.
 *
 * <p>그렇다고 받은 `X-Forwarded-For` 를 그대로 넘기면 안 된다. Next 는 이 헤더가 **없을 때만** 소켓 주소로
 * 채우므로, Next 가 외부에 직접 공개된 형상에서는 클라이언트가 보낸 값이 남는다. 백엔드는 Next 를 신뢰
 * 프록시로 보므로 그 값이 곧 IP 제한 우회가 된다. 그래서 앞단 프록시가 헤더를 접속 주소로 **덮어쓰는**
 * 운영 형상(docker-compose.prod.yml 의 edge)에서만 `TRUSTED_EDGE_PROXY=true` 로 켠다. 꺼져 있으면 아무것도
 * 넘기지 않아 종전과 같다.
 *
 * <p>앞단 프록시는 단일 주소를 쓴다. 쉼표로 이어진 목록이나 주소가 아닌 값은 그 프록시를 거치지 않았다는
 * 뜻이므로 넘기지 않는다(fail-closed).
 */

const MAX_IP_LENGTH = 45;
const IP_CHARACTERS = /^[0-9A-Fa-f:.]+$/;

type HeaderSource = { get(name: string): string | null };

// 운영 compose 전달 계약(scripts/deploy-env-forwarding-contract)은 process 환경변수 읽기를 문자 그대로 찾는다 —
// 이 이름을 다른 형태(구조 분해·동적 키)로 읽으면 전달 누락을 계약이 보지 못한다.
export function isTrustedEdgeProxyEnabled(flag: string | undefined = process.env.TRUSTED_EDGE_PROXY): boolean {
  return flag === 'true';
}

export function forwardedClientIpHeaders(
  incoming: HeaderSource,
  flag: string | undefined = process.env.TRUSTED_EDGE_PROXY,
): Record<string, string> {
  if (!isTrustedEdgeProxyEnabled(flag)) return {};
  const value = incoming.get('x-forwarded-for')?.trim();
  if (!value || value.length > MAX_IP_LENGTH || !IP_CHARACTERS.test(value)) return {};
  return { 'X-Forwarded-For': value };
}
