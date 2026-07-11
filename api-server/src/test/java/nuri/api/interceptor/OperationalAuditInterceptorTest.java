package nuri.api.interceptor;

import nuri.foundation.core.event.AuditEvent;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OperationalAuditInterceptorTest {

    private final ApplicationEventPublisher publisher = mock(ApplicationEventPublisher.class);
    private final OperationalAuditInterceptor interceptor = new OperationalAuditInterceptor(publisher);

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
}
