package nuri.foundation.security.net;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Nested;

/**
 * 신뢰 경계 기반 클라이언트 IP 판정 계약.
 *
 * <p>[존재 이유 — W1-07] 이 판정의 출력은 레이트리밋 키·로그인 IP 제한·감사 로그 IP 로 쓰인다.
 * 셋 다 <b>틀리면 조용히 우회되는</b> 종류라, 판정 규칙을 테스트로 고정해야 한다.
 * 종전 구현은 X-Forwarded-For 를 무조건 신뢰해 헤더 한 줄로 전부 우회할 수 있었다.
 *
 * <p>[실행 경로 — AGENTS.md Evidence guardrails H5] foundation 단위 테스트라 pre-push 에서는 실행되지 않는다
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
    @DisplayName("전부 신뢰 대역이면 우리 프록시가 기록한 최우측 값을 쓴다")
    void usesRightmostWhenAllHopsTrusted() {
        ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

        String ip = resolver.resolve(request("172.18.0.4", "10.5.5.5, 172.18.0.9"));

        assertEquals("172.18.0.9", ip);
    }

    @Test
    @DisplayName("사내망 클라이언트가 XFF 를 위조해도 프록시가 기록한 값이 이긴다")
    void forgedPrefixLosesToProxyRecordedHop() {
        ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

        // 공격자는 XFF 앞에 덧붙일 수만 있고, 우리 프록시가 append 하는 최우측 항목은 쓸 수 없다.
        // 종전(최좌측 채택)에는 '10.9.9.9' 가 채택되어 레이트리밋 키·감사 IP 가 오염됐다.
        String ip = resolver.resolve(request("172.18.0.4", "10.9.9.9, 192.168.0.7"));

        assertEquals("192.168.0.7", ip);
    }

    @Test
    @DisplayName("홉이 하나뿐이면 최우측=최좌측이라 종전과 동일하다 — 회귀 없음")
    void singleTrustedHopBehavesAsBefore() {
        ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

        assertEquals("10.0.0.1", resolver.resolve(request("127.0.0.1", "10.0.0.1")));
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

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] 이 스코프에 20개가 살아 있었다(실측 76%).
    //
    //   이 클래스의 출력은 **레이트리밋 키 · 로그인 IP 제한 · 감사 로그 IP** 세 곳에 쓰인다.
    //   판정이 한 칸 어긋나면 셋 다 조용히 우회된다 — 예외도 로그도 없이.
    //   특히 주소 파싱(normalize·CidrRange)은 "대충 맞으면 통과" 가 성립하지 않는 자리다:
    //   신뢰 대역 판정이 틀리면 **신뢰하지 말아야 할 피어의 XFF 를 읽게 된다.**
    // ─────────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("주소 정규화 (포트·IPv6 표기)")
    class Normalization {

        @Test
        @DisplayName("IPv4 는 포트 접미를 떼고 판정한다")
        void stripsIpv4Port() {
            ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

            // 프록시가 `1.2.3.4:5678` 형태로 기록하는 경우가 있다.
            //   포트를 떼지 못하면 신뢰 대역 판정이 전부 실패해 엉뚱한 값이 클라이언트로 잡힌다.
            assertEquals("203.0.113.9",
                    resolver.resolve(request("10.0.0.1", "203.0.113.9:44321")));
        }

        @Test
        @DisplayName("IPv6 는 대괄호 안쪽만 취하고, 콜론이 여럿이면 포트로 보지 않는다")
        void handlesIpv6Forms() {
            ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

            // `[::1]:8080` -> `::1`
            assertEquals("::1", resolver.resolve(request("10.0.0.1", "[::1]:8080")));
            // 대괄호 없는 IPv6 는 콜론이 여러 개다 - 첫 콜론을 포트 구분자로 오인하면 안 된다.
            //   `2001:db8::1` 을 `2001` 로 잘라내면 **완전히 다른 주소**가 된다.
            assertEquals("2001:db8::1", resolver.resolve(request("10.0.0.1", "2001:db8::1")));
        }

        @Test
        @DisplayName("닫는 대괄호가 없는 값은 버린다 (앞 항목으로 넘어간다)")
        void discardsUnclosedBracket() {
            ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

            // 깨진 항목을 그대로 채택하면 감사 로그에 파싱 쓰레기가 남는다.
            assertEquals("203.0.113.9",
                    resolver.resolve(request("10.0.0.1", "203.0.113.9, [malformed")));
        }

        @Test
        @DisplayName("빈 항목과 'unknown' 은 건너뛴다 (대소문자 무관)")
        void skipsEmptyAndUnknown() {
            ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

            assertEquals("203.0.113.9",
                    resolver.resolve(request("10.0.0.1", "203.0.113.9, , UNKNOWN, unknown")));
        }

        @Test
        @DisplayName("XFF 가 전부 버려질 값뿐이면 remoteAddr 로 떨어진다")
        void fallsBackWhenAllHopsDiscarded() {
            ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);

            // 여기서 빈 문자열을 돌려주면 레이트리밋 키가 "" 로 수렴해 전역 단일 버킷이 된다.
            assertEquals("10.0.0.1", resolver.resolve(request("10.0.0.1", "unknown, , unknown")));
        }

        @Test
        @DisplayName("remoteAddr 이 없으면 'unknown' 을 돌려준다")
        void unknownWhenNoRemoteAddr() {
            ClientIpResolver resolver = new ClientIpResolver(DEFAULTS);
            MockHttpServletRequest req = new MockHttpServletRequest();
            req.setRemoteAddr(null);

            // 빈 문자열이면 로그·레이트리밋에서 '값이 있다' 로 오독된다.
            assertEquals("unknown", resolver.resolve(req));
        }
    }

    @Nested
    @DisplayName("CIDR 해석")
    class CidrParsing {

        @Test
        @DisplayName("프리픽스 경계 0 과 32 를 모두 받아들인다")
        void acceptsPrefixBoundaries() {
            // /0 은 전 대역 신뢰 - 그러면 어떤 피어의 XFF 도 읽는다(설정자가 의도한 경우만 성립).
            assertEquals("198.51.100.7",
                    new ClientIpResolver("0.0.0.0/0").resolve(request("203.0.113.1", "198.51.100.7")));
            // /32 는 정확히 그 주소 하나.
            assertEquals("198.51.100.7",
                    new ClientIpResolver("10.0.0.1/32").resolve(request("10.0.0.1", "198.51.100.7")));
            // 경계 밖 주소는 신뢰하지 않는다.
            assertEquals("10.0.0.2",
                    new ClientIpResolver("10.0.0.1/32").resolve(request("10.0.0.2", "198.51.100.7")));
        }

        @Test
        @DisplayName("범위를 벗어난 프리픽스는 항목을 버린다 — 잘못된 설정이 전 대역 신뢰가 되면 안 된다")
        void rejectsOutOfRangePrefix() {
            // /33 이나 /-1 을 관대하게 해석하면 **의도치 않은 대역을 신뢰**하게 된다.
            //   항목이 버려지므로 신뢰 목록은 비고, XFF 는 전면 불신된다.
            assertEquals("203.0.113.1",
                    new ClientIpResolver("10.0.0.0/33").resolve(request("203.0.113.1", "1.2.3.4")));
            assertEquals("10.0.0.1",
                    new ClientIpResolver("10.0.0.0/33").resolve(request("10.0.0.1", "1.2.3.4")));
        }

        @Test
        @DisplayName("숫자가 아닌 프리픽스도 항목을 버린다")
        void rejectsNonNumericPrefix() {
            assertEquals("10.0.0.1",
                    new ClientIpResolver("10.0.0.0/abc").resolve(request("10.0.0.1", "1.2.3.4")));
        }

        @Test
        @DisplayName("IPv4 가 아닌 항목은 문자열 정확 일치로만 취급한다")
        void nonIpv4EntryMatchesExactlyOnly() {
            ClientIpResolver resolver = new ClientIpResolver("::1/128");

            // ::1 피어는 신뢰 - XFF 를 읽는다.
            assertEquals("203.0.113.9", resolver.resolve(request("::1", "203.0.113.9")));
            // 다른 IPv6 는 신뢰하지 않는다(부분 일치로 넓히면 조용히 우회된다).
            assertEquals("::2", resolver.resolve(request("::2", "203.0.113.9")));
        }

        @Test
        @DisplayName("옥텟이 4개가 아니거나 범위를 벗어나면 IPv4 로 보지 않는다")
        void rejectsMalformedIpv4() {
            // 256 은 옥텟이 아니다. 이것을 통과시키면 마스크 계산이 어긋나 엉뚱한 대역이 신뢰된다.
            ClientIpResolver resolver = new ClientIpResolver("10.0.0.0/8");
            assertEquals("10.256.0.1", resolver.resolve(request("10.256.0.1", "1.2.3.4")));
            assertEquals("10.0.0", resolver.resolve(request("10.0.0", "1.2.3.4")));
            assertEquals("10.0.0.1.2", resolver.resolve(request("10.0.0.1.2", "1.2.3.4")));
        }

        @Test
        @DisplayName("음수 옥텟도 거부한다")
        void rejectsNegativeOctet() {
            ClientIpResolver resolver = new ClientIpResolver("10.0.0.0/8");
            assertEquals("10.-1.0.1", resolver.resolve(request("10.-1.0.1", "1.2.3.4")));
        }

        @Test
        @DisplayName("공백과 빈 항목이 섞인 목록도 해석한다")
        void tolerantToWhitespaceInList() {
            ClientIpResolver resolver = new ClientIpResolver(" 10.0.0.0/8 , , 192.168.0.0/16 ");

            assertEquals("203.0.113.9", resolver.resolve(request("10.1.2.3", "203.0.113.9")));
            assertEquals("203.0.113.9", resolver.resolve(request("192.168.1.1", "203.0.113.9")));
        }
    }

    @Nested
    @DisplayName("신뢰 목록이 비었을 때")
    class EmptyTrustList {

        @Test
        @DisplayName("목록이 비면 XFF 를 전면 불신한다")
        void emptyListDistrustsForwardedHeader() {
            for (String csv : new String[] { "", "   ", null }) {
                ClientIpResolver resolver = new ClientIpResolver(csv);

                // 프록시 뒤에 있어도 remoteAddr 로 수렴한다 - 그래서 레이트리밋 용량 재설계가 필요하다.
                assertEquals("10.0.0.1", resolver.resolve(request("10.0.0.1", "203.0.113.9")));
            }
        }

        @Test
        @DisplayName("해석 불가 항목만 있는 목록도 빈 목록과 같다")
        void unparsableOnlyListBehavesEmpty() {
            ClientIpResolver resolver = new ClientIpResolver("not-a-cidr/99, /8");

            assertEquals("10.0.0.1", resolver.resolve(request("10.0.0.1", "203.0.113.9")));
        }
    }
}
