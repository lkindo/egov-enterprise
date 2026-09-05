package nuri.foundation.security.filter;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(OutputCaptureExtension.class)
class CredentialRequestTargetFilterTest {

    private CredentialRequestTargetFilter filter;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        filter = new CredentialRequestTargetFilter();
        filterChain = mock(FilterChain.class);
    }

    @Test
    @DisplayName("안전한 검색 query는 통과하고 값 안의 자격증명 모양 문자열은 검사하지 않는다")
    void safeSearchQueryPassesWithoutInspectingValues() throws Exception {
        MockHttpServletRequest request = requestWithQuery(
                "searchKeyword=pswd%3Dnot-a-parameter&page=1&searchCondition=name");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain).doFilter(request, response);
    }

    @ParameterizedTest(name = "{0} query 이름은 차단")
    @ValueSource(strings = {
            "password", "passwd", "pswd", "pwd", "passcode", "token", "secret",
            "credential", "apiKey", "otp", "jwt", "csrf", "authorization", "cookie",
            "user_password", "refresh-token", "clientSecret", "credentialId", "api_key",
            "otpCode", "jwtAssertion", "csrfToken", "authorizationCode", "sessionCookie",
            "currentPasswordConfirmation", "myAccessTokenValue"
    })
    @DisplayName("정규화된 자격증명 이름 계열은 400으로 차단한다")
    void credentialNameFamiliesAreRejected(String queryName) throws Exception {
        MockHttpServletRequest request = requestWithQuery(queryName + "=sensitive-value");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(400);
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("percent-encoded 자격증명 query 이름도 400으로 차단한다")
    void percentEncodedCredentialNameIsRejected() throws Exception {
        MockHttpServletRequest request = requestWithQuery("%70%73%77%64=encoded-marker");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(400);
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("차단 응답과 로그는 query 값을 복제하지 않는다")
    void rejectedValueIsAbsentFromResponseAndLogs(CapturedOutput output) throws Exception {
        String marker = "DO-NOT-ECHO-7f43c9";
        MockHttpServletRequest request = requestWithQuery("pswd=" + marker);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(400);
        assertThat(response.getContentType()).contains("application/json");
        assertThat(response.getContentAsString()).doesNotContain(marker);
        assertThat(output).doesNotContain(marker);
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("잘못된 percent encoding 이름은 해석을 계속하지 않고 fail-closed 한다")
    void malformedPercentEncodingIsRejected() throws Exception {
        MockHttpServletRequest request = requestWithQuery("search%ZZ=value-marker");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, filterChain);

        assertThat(response.getStatus()).isEqualTo(400);
        assertThat(response.getContentAsString()).doesNotContain("value-marker");
        verify(filterChain, never()).doFilter(request, response);
    }

    @Test
    @DisplayName("분류 정책은 null과 일반 이름을 허용하고 구분자·대소문자를 정규화한다")
    void sharedPolicyNormalizesNames() {
        assertThat(CredentialRequestTargetPolicy.isForbiddenName(null)).isFalse();
        assertThat(CredentialRequestTargetPolicy.isForbiddenName("searchKeyword")).isFalse();
        assertThat(CredentialRequestTargetPolicy.isForbiddenName("Access_Token")).isTrue();
        assertThat(CredentialRequestTargetPolicy.isForbiddenName("API-KEY")).isTrue();
    }

    private static MockHttpServletRequest requestWithQuery(String query) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/example");
        request.setQueryString(query);
        return request;
    }
}
