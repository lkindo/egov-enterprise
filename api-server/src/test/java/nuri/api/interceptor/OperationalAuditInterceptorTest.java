package nuri.api.interceptor;

import nuri.foundation.core.annotation.PrivacyAccess;
import nuri.foundation.core.event.AuditEvent;
import nuri.foundation.core.event.PrivacyAccessEvent;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.method.HandlerMethod;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OperationalAuditInterceptorTest {

    private static class PrivacyHandler {
        @PrivacyAccess("사용자 기본정보")
        public void read() {
        }
    }

    private final ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);
    // [W1-07] 감사 로그의 IP 는 신뢰 경계 판정을 거친다(종전에는 XFF 무조건 신뢰 = 위조 가능).
    //   기본 신뢰 목록으로 구성한 실제 구현을 쓴다 — 목킹하면 판정 규칙이 테스트에서 사라진다.
    private final OperationalAuditInterceptor interceptor = new OperationalAuditInterceptor(
            publisher,
            new nuri.foundation.security.net.ClientIpResolver(
                    "127.0.0.1/32,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"));

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("preHandle - 항상 true 반환")
    void preHandle_returnsTrue() {
        assertTrue(interceptor.preHandle(new MockHttpServletRequest(), new MockHttpServletResponse(), new Object()));
    }

    @Test
    @DisplayName("afterCompletion - /api 요청은 인증 사용자(CustomUserDetails)로 AuditEvent 발행")
    void afterCompletion_publishesForAuthenticatedUser() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/test");
        request.addHeader("X-Forwarded-For", "1.2.3.4");

        CustomUserDetails user = mock(CustomUserDetails.class);
        when(user.getUserId()).thenReturn("testUser");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, java.util.Collections.emptyList()));

        interceptor.preHandle(request, new MockHttpServletResponse(), new Object());
        interceptor.afterCompletion(request, new MockHttpServletResponse(), new Object(), null);

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(publisher).publishEvent(captor.capture());
        AuditEvent event = captor.getValue();
        assertEquals("/api/v1/test", event.url());
        assertEquals("testUser", event.userId());
        assertEquals("1.2.3.4", event.clientIp());
    }

    @Test
    @DisplayName("afterCompletion - 비-CustomUserDetails principal 은 authentication.name 으로 기록")
    void afterCompletion_nonCustomPrincipalUsesName() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/x");
        request.setRemoteAddr("127.0.0.1");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("plainName", null, java.util.Collections.emptyList()));

        interceptor.afterCompletion(request, new MockHttpServletResponse(), new Object(), null);

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(publisher).publishEvent(captor.capture());
        assertEquals("plainName", captor.getValue().userId());
    }

    @Test
    @DisplayName("afterCompletion - 인증 없으면 ANONYMOUS 로 기록")
    void afterCompletion_anonymousWhenNoAuth() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/y");

        interceptor.afterCompletion(request, new MockHttpServletResponse(), new Object(), null);

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(publisher).publishEvent(captor.capture());
        assertEquals("ANONYMOUS", captor.getValue().userId());
    }

    @Test
    @DisplayName("afterCompletion - 비 /api 요청(actuator/정적)은 이벤트 미발행")
    void afterCompletion_skipsNonApi() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/actuator/health");

        interceptor.afterCompletion(request, new MockHttpServletResponse(), new Object(), null);

        verifyNoInteractions(publisher);
    }

    @Test
    @DisplayName("afterCompletion - 예외가 남았으면 2xx 응답도 500 실패로 감사하고 개인정보 성공 이벤트는 발행하지 않음")
    void afterCompletion_exceptionOverridesSuccessfulResponseStatus() throws NoSuchMethodException {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/users/1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(200);
        HandlerMethod handler = new HandlerMethod(
                new PrivacyHandler(),
                PrivacyHandler.class.getMethod("read"));

        interceptor.afterCompletion(request, response, handler, new RuntimeException("handler failed"));

        ArgumentCaptor<AuditEvent> auditCaptor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(publisher).publishEvent(auditCaptor.capture());
        assertEquals(500, auditCaptor.getValue().statusCode());
        assertTrue(auditCaptor.getValue().isFailure());
        verify(publisher, never()).publishEvent(org.mockito.ArgumentMatchers.isA(PrivacyAccessEvent.class));
    }

    @Test
    @DisplayName("publishSecurityFailure - DispatcherServlet 전 인증 실패도 공통 AuditEvent로 발행")
    void publishSecurityFailure_publishesCommonAuditEvent() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/admin/system/users");
        request.setRemoteAddr("127.0.0.1");

        interceptor.publishSecurityFailure(request, 401);

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(publisher).publishEvent(captor.capture());
        AuditEvent event = captor.getValue();
        assertEquals("/api/v1/admin/system/users", event.url());
        assertEquals("GET", event.httpMethod());
        assertEquals(401, event.statusCode());
        assertEquals("ANONYMOUS", event.userId());
        assertTrue(event.isFailure());
    }

    @Test
    @DisplayName("publishSecurityFailure - 감사 발행 장애가 인증·인가 응답 경계로 전파되지 않음")
    void publishSecurityFailure_doesNotPropagateAuditFailure() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/admin/system/users");
        doThrow(new IllegalStateException("publisher unavailable"))
                .when(publisher).publishEvent(any(AuditEvent.class));

        assertDoesNotThrow(() -> interceptor.publishSecurityFailure(request, 401));
    }
}
