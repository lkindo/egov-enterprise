package nuri.foundation.core.audit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

@DisplayName("PrivacySubject 정보주체 표시")
class PrivacySubjectTest {

    @AfterEach
    void clearRequest() {
        RequestContextHolder.resetRequestAttributes();
    }

    private static MockHttpServletRequest bindRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/admin/system/users/u1");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        return request;
    }

    @Test
    @DisplayName("현재 요청에 정보주체의 내부 키를 남긴다")
    void marksTheCurrentRequest() {
        MockHttpServletRequest request = bindRequest();

        PrivacySubject.identify("USRCNFRM_00000000001");

        assertThat(request.getAttribute(PrivacySubject.REQUEST_ATTRIBUTE)).isEqualTo("USRCNFRM_00000000001");
    }

    @Test
    @DisplayName("빈 값과 사용자 기본 키 길이를 넘는 값은 남기지 않는다")
    void ignoresBlankAndOverlongValues() {
        MockHttpServletRequest request = bindRequest();

        PrivacySubject.identify(null);
        PrivacySubject.identify("  ");
        PrivacySubject.identify("x".repeat(PrivacySubject.MAX_LENGTH + 1));

        assertThat(request.getAttribute(PrivacySubject.REQUEST_ATTRIBUTE)).isNull();
    }

    @Test
    @DisplayName("요청 밖에서는 아무것도 하지 않는다")
    void doesNothingOutsideARequest() {
        RequestContextHolder.resetRequestAttributes();

        assertThatCode(() -> PrivacySubject.identify("U1")).doesNotThrowAnyException();
        assertThat(RequestContextHolder.getRequestAttributes()).isNull();
    }
}
