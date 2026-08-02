package nuri.foundation.security.net;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * 신뢰 경계 기반 클라이언트 IP 판정 계약.
 *
 * <p>[존재 이유 — W1-07] 이 판정의 출력은 레이트리밋 키·로그인 IP 제한·감사 로그 IP 로 쓰인다.
 * 셋 다 <b>틀리면 조용히 우회되는</b> 종류라, 판정 규칙을 테스트로 고정해야 한다.
 * 종전 구현은 X-Forwarded-For 를 무조건 신뢰해 헤더 한 줄로 전부 우회할 수 있었다.
 *
 * <p>[실행 경로 — §0.7-H5] foundation 단위 테스트라 pre-push 에서는 실행되지 않는다
 * (pre-push 는 :api-server:harnessTest 만 돌린다). 실행은 {@code ./gradlew localGate} 와 CI 다.
 */
@DisplayName("ClientIpResolver 신뢰 경계 판정")
class ClientIpResolverTest {

    private static final String DEFAULTS = "127.0.0.1/32,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16";

    private MockHttpServletRequest request(String remoteAddr, String xff) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr(remoteAddr);
        if (xff != null) {
            req.addHeader("X-Forwarded-For", xff);
        }
        return req;
    }

    // ------------------------------------------------------------ 위조 차단

    @Test
    @DisplayName("피어가 신뢰 프록시가 아니면 X-Forwarded-For 를 읽지 않는다 (헤더 위조 차단)")
    void ignoresForwardedHeaderFromUntrustedPeer() {
        ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

        // 공인 IP 에서 직접 연결하며 XFF 를 위조해 보낸 경우.
        String ip = resolver.resolve(request("203.0.113.9", "1.2.3.4"));

        assertEquals("203.0.113.9", ip,
                "신뢰하지 않는 피어의 XFF 를 채택하면 레이트리밋·IP 제한이 헤더 한 줄로 우회된다");
    }

    @Test
    @DisplayName("신뢰 목록이 비면 XFF 를 전면 불신한다")
    void distrustsForwardedHeaderWhenNoTrustedProxies() {
        ClientIpResolver resolver = new ClientIpResolver("");

        String ip = resolver.resolve(request("10.0.0.5", "1.2.3.4"));

        assertEquals("10.0.0.5", ip);
    }

    // ------------------------------------------------------------ 정상 경로

    @Test
    @DisplayName("신뢰 프록시 뒤의 단일 홉에서는 원 클라이언트 IP 를 얻는다")
    void resolvesClientBehindTrustedProxy() {
        ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

        // 브라우저 → Next(사설 대역) → 백엔드. Next 가 XFF 에 원 클라이언트를 실어 보낸다.
        String ip = resolver.resolve(request("172.18.0.4", "203.0.113.9"));

        assertEquals("203.0.113.9", ip);
    }

    @Test
    @DisplayName("XFF 에 신뢰 홉이 덧붙어도 가장 바깥의 비신뢰 주소를 클라이언트로 본다")
    void skipsTrustedHopsFromTheRight() {
        ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

        // 클라이언트, 사내 프록시, 컨테이너 네트워크 순으로 쌓인 경우.
        String ip = resolver.resolve(request("172.18.0.4", "203.0.113.9, 10.1.1.1, 172.18.0.9"));

        assertEquals("203.0.113.9", ip);
    }

    @Test
    @DisplayName("공격자가 XFF 앞에 가짜 주소를 끼워 넣어도 오른쪽 우선 판정이라 채택되지 않는다")
    void ignoresSpoofedPrefixInForwardedChain() {
        ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

        // 클라이언트가 XFF: "9.9.9.9" 를 미리 넣어 보내면 프록시가 그 뒤에 진짜 주소를 덧붙인다.
        // 왼쪽(첫 항목)을 채택하는 종전 방식이었다면 9.9.9.9 가 뽑혔다.
        String ip = resolver.resolve(request("172.18.0.4", "9.9.9.9, 203.0.113.9"));

        assertEquals("203.0.113.9", ip);
    }

    @Test
    @DisplayName("전부 신뢰 대역이면 사내 트래픽으로 보고 가장 바깥 값을 쓴다")
    void usesLeftmostWhenAllHopsTrusted() {
        ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

        String ip = resolver.resolve(request("172.18.0.4", "10.5.5.5, 172.18.0.9"));

        assertEquals("10.5.5.5", ip);
    }

    // ------------------------------------------------------------ 형식 처리

    @Test
    @DisplayName("XFF 가 없으면 remoteAddr 을 쓴다")
    void fallsBackToRemoteAddrWithoutHeader() {
        ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

        assertEquals("172.18.0.4", resolver.resolve(request("172.18.0.4", null)));
    }

    @Test
    @DisplayName("'unknown' 과 빈 항목은 건너뛴다")
    void skipsUnknownAndBlankEntries() {
        ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

        String ip = resolver.resolve(request("172.18.0.4", "203.0.113.9, unknown,  "));

        assertEquals("203.0.113.9", ip);
    }

    @Test
    @DisplayName("포트가 붙은 항목에서 주소만 취한다")
    void stripsPortSuffix() {
        ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

        assertEquals("203.0.113.9", resolver.resolve(request("172.18.0.4", "203.0.113.9:51514")));
    }

    @Test
    @DisplayName("CIDR 경계를 정확히 판정한다")
    void respectsCidrBoundaries() {
        ClientIpResolver resolver = new ClientIpResolver("172.16.0.0/12");

        // 172.16.0.0/12 는 172.16.0.0 ~ 172.31.255.255 다. 172.32.0.1 은 밖이다.
        assertEquals("172.32.0.1", resolver.resolve(request("172.32.0.1", "203.0.113.9")),
                "대역 밖 피어의 XFF 를 신뢰하면 안 된다");
        assertEquals("203.0.113.9", resolver.resolve(request("172.31.255.254", "203.0.113.9")));
    }
}
