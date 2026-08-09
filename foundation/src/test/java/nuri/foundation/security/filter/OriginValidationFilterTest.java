package nuri.foundation.security.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class OriginValidationFilterTest {

    private OriginValidationFilter filter;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        filter = new OriginValidationFilter(List.of("http://localhost:3000", "http://127.0.0.1:3000"));
        filterChain = mock(FilterChain.class);
    }

    @Test
    @DisplayName("허용된 Origin을 가진 POST 요청은 통과한다")
    void allowedOrigin_postRequest_passesFilter() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        request.addHeader("Origin", "http://localhost:3000");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("차단된 Origin을 가진 POST 요청은 403 Forbidden 응답으로 차단된다")
    void forbiddenOrigin_postRequest_blocked() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        request.addHeader("Origin", "http://evil-attacker.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("INVALID_ORIGIN");
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("GET 요청은 Origin 검증 대상에서 제외되어 통과한다")
    void getRequest_passesFilterWithoutOrigin() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/users");
        request.addHeader("Origin", "http://untrusted.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("[회귀] localhost 를 접미사로 위장한 외부 도메인은 차단된다 (부분문자열 매칭 우회 방지)")
    void suffixDomainImpersonatingLocalhost_blocked() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        // serverName 기본값은 "localhost" — contains("localhost") 비교였다면 이 Origin 이 통과했다.
        request.addHeader("Origin", "http://localhost.attacker.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("INVALID_ORIGIN");
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("Origin 헤더가 없는 POST 요청(동일 출처/서버 간 호출)은 통과한다")
    void missingOrigin_postRequest_passesFilter() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/reissue");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // [2026-08-09 뮤테이션 보강] PIT 이 31개 중 12개를 살려 보냈다(스코어 61%).
    //   이 클래스는 **상태변경 요청의 Origin/Referer 경계**다 — 살아남은 뮤턴트는
    //   곧 "그 분기를 뒤집어도 아무도 모른다" 는 뜻이고, 경계 코드에서 그것은 우회 경로다.
    //   isAllowedOrigin 한 곳에만 5개가 몰려 있었다.
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("와일드카드(*) 허용 설정이면 임의 Origin 도 통과한다")
    void wildcardAllowsAnyOrigin() throws ServletException, IOException {
        OriginValidationFilter wildcard = new OriginValidationFilter(List.of("*"));
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/x");
        request.addHeader("Origin", "http://anything.example.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        wildcard.doFilter(request, response, filterChain);

        // `replaced boolean return with false` 뮤턴트는 403 을 내 여기서 죽는다.
        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("생성자: allowedOrigins 가 null 이면 빈 목록으로 대체된다 (NPE 없이 차단)")
    void nullAllowedOriginsBecomesEmptyList() throws ServletException, IOException {
        OriginValidationFilter nullConfig = new OriginValidationFilter(null);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/x");
        request.addHeader("Origin", "http://evil.example.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        // 조건을 뒤집은 뮤턴트는 null 을 그대로 넣어 NPE 를 던진다 → 죽는다.
        nullConfig.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("Origin 이 없으면 Referer 에서 출처를 복원해 판정한다")
    void refererIsUsedWhenOriginAbsent() throws ServletException, IOException {
        MockHttpServletRequest blocked = new MockHttpServletRequest("POST", "/api/v1/x");
        blocked.addHeader("Referer", "http://evil-attacker.com/some/path");
        MockHttpServletResponse blockedRes = new MockHttpServletResponse();
        filter.doFilter(blocked, blockedRes, filterChain);
        // Referer 분기를 뒤집으면 source 가 null 로 남아 **검사 없이 통과**한다 → 여기서 죽는다.
        assertThat(blockedRes.getStatus()).isEqualTo(403);

        MockHttpServletRequest allowed = new MockHttpServletRequest("POST", "/api/v1/x");
        allowed.addHeader("Referer", "http://localhost:3000/admin/work-hub");
        MockHttpServletResponse allowedRes = new MockHttpServletResponse();
        filter.doFilter(allowed, allowedRes, filterChain);
        assertThat(allowedRes.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("Origin·Referer 가 모두 없으면 검사를 건너뛴다 (서버간 호출 보존)")
    void noOriginAndNoRefererPasses() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/x");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("깨진 Referer 는 출처 복원에 실패해 검사를 건너뛴다 (500 이 아니다)")
    void malformedRefererDoesNotBreakFilter() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/x");
        request.addHeader("Referer", "ht!tp://[malformed");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("동일 출처(same-origin)는 설정에 없어도 통과한다 — 기본 포트는 생략된다")
    void sameOriginIsAllowedWithDefaultPortOmitted() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/x");
        request.setScheme("https");
        request.setServerName("app.example.go.kr");
        request.setServerPort(443);
        request.addHeader("Origin", "https://app.example.go.kr");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        // 포트 조건(80/443)을 뒤집으면 ":443" 이 붙어 불일치 → 403 이 되어 죽는다.
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("동일 출처: 비표준 포트는 Origin 에 포함돼야 일치한다")
    void sameOriginWithNonDefaultPortRequiresPort() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/x");
        request.setScheme("http");
        request.setServerName("internal.example");
        request.setServerPort(8080);
        request.addHeader("Origin", "http://internal.example:8080");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("루프백 동치: 서버가 localhost 일 때 127.0.0.1 Origin 을 허용한다")
    void loopbackEquivalenceIsHonored() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/x");
        request.setScheme("http");
        request.setServerName("localhost");
        request.setServerPort(9999);              // 설정 목록·same-origin 모두 불일치
        request.addHeader("Origin", "http://127.0.0.1:5173");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        // isLoopback 조건을 뒤집으면 403 이 되어 죽는다.
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("루프백 동치: 서버가 루프백이 아니면 127.0.0.1 Origin 을 거부한다")
    void loopbackOriginRejectedWhenServerIsNotLoopback() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/x");
        request.setScheme("https");
        request.setServerName("prod.example.go.kr");
        request.setServerPort(443);
        // ⚠ 포트 3000 은 setUp 의 허용 목록에 있어 **명시적 허용**으로 통과한다 —
        //   그러면 루프백 분기까지 가지 않아 이 테스트가 의도를 잃는다(첫 작성 시 실제로 그랬다).
        //   목록에 없는 포트를 써서 판정이 마지막 루프백 분기에 도달하게 한다.
        request.addHeader("Origin", "http://127.0.0.1:5173");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        // `isLoopback(serverName)` 을 제거한 뮤턴트는 통과시켜 여기서 죽는다.
        // 이것이 뒤집히면 **운영 서버가 로컬 Origin 을 신뢰**하게 된다.
        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("상태변경이 아닌 메서드(GET/HEAD)는 Origin 검사를 받지 않는다")
    void nonStateChangingMethodsSkipValidation() throws ServletException, IOException {
        for (String method : new String[] { "GET", "HEAD", "OPTIONS" }) {
            MockHttpServletRequest request = new MockHttpServletRequest(method, "/api/v1/x");
            request.addHeader("Origin", "http://evil-attacker.com");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, mock(FilterChain.class));
            assertThat(response.getStatus()).as(method + " 는 검사 대상이 아니다").isEqualTo(200);
        }
    }

    @Test
    @DisplayName("차단 응답은 JSON 본문과 Content-Type 을 함께 낸다")
    void blockedResponseCarriesJsonBody() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/x");
        request.addHeader("Origin", "http://evil-attacker.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        // `removed call to setContentType` 뮤턴트는 여기서 죽는다.
        assertThat(response.getContentType()).contains("application/json");
        assertThat(response.getContentAsString()).contains("INVALID_ORIGIN");
    }
}
