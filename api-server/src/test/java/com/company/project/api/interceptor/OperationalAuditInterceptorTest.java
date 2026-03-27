package com.company.project.api.interceptor;

import com.company.project.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.ModelAndView;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OperationalAuditInterceptorTest {

    private final OperationalAuditInterceptor interceptor = new OperationalAuditInterceptor();

    @Test
    @DisplayName("인터셉터 preHandle - 항상 true")
    void preHandle_returnsTrue() throws Exception {
        assertTrue(interceptor.preHandle(new MockHttpServletRequest(), new MockHttpServletResponse(), new Object()));
    }

    @Test
    @DisplayName("인터셉터 postHandle - 다양한 헤더 IP 추출 및 인증 정보 로깅")
    void postHandle_auditLogging() throws Exception {
        // Given: X-Forwarded-For header
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/test-api");
        request.addHeader("X-Forwarded-For", "1.2.3.4");
        
        // Mock Authentication (CustomUserDetails)
        CustomUserDetails user = mock(CustomUserDetails.class);
        when(user.getUserId()).thenReturn("testUser");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, java.util.Collections.emptyList())
        );

        // When & Then
        interceptor.postHandle(request, new MockHttpServletResponse(), new Object(), new ModelAndView());
        
        // Given: Proxy-Client-IP header
        request = new MockHttpServletRequest();
        request.addHeader("Proxy-Client-IP", "5.6.7.8");
        interceptor.postHandle(request, new MockHttpServletResponse(), new Object(), new ModelAndView());

        // Given: WL-Proxy-Client-IP header
        request = new MockHttpServletRequest();
        request.addHeader("WL-Proxy-Client-IP", "9.10.11.12");
        interceptor.postHandle(request, new MockHttpServletResponse(), new Object(), new ModelAndView());
        
        // Given: Standard RemoteAddr
        request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        interceptor.postHandle(request, new MockHttpServletResponse(), new Object(), new ModelAndView());

        // Given: Non-CustomUserDetails principal (String)
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("anonymousUserPrincipal", null, java.util.Collections.emptyList())
        );
        interceptor.postHandle(request, new MockHttpServletResponse(), new Object(), new ModelAndView());
        
        SecurityContextHolder.clearContext();
    }
}
