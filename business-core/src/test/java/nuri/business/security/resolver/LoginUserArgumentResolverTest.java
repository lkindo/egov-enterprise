package nuri.business.security.resolver;

import nuri.business.security.annotation.LoginUser;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("LoginUserArgumentResolver 테스트")
class LoginUserArgumentResolverTest {

    private LoginUserArgumentResolver resolver;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @Mock
    private CustomUserDetails userDetails;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        resolver = new LoginUserArgumentResolver();
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    @DisplayName("supportsParameter 지원 여부 확인 - @LoginUser와 CustomUserDetails")
    void testSupportsParameter_Success() {
        // Given
        MethodParameter parameter = mock(MethodParameter.class);
        when(parameter.hasParameterAnnotation(LoginUser.class)).thenReturn(true);
        // Using doReturn to avoid generics issues
        doReturn(CustomUserDetails.class).when(parameter).getParameterType();

        // When
        boolean result = resolver.supportsParameter(parameter);

        // Then
        assertTrue(result);
    }

    // Helper for Mockito to avoid type issues with Class
    private org.mockito.stubbing.Stubber doReturn(Object value) {
        return org.mockito.Mockito.doReturn(value);
    }

    @Test
    @DisplayName("supportsParameter 지원 여부 확인 - 어노테이션 없음")
    void testSupportsParameter_NoAnnotation() {
        // Given
        MethodParameter parameter = mock(MethodParameter.class);
        when(parameter.hasParameterAnnotation(LoginUser.class)).thenReturn(false);
        doReturn(CustomUserDetails.class).when(parameter).getParameterType();

        // When
        boolean result = resolver.supportsParameter(parameter);

        // Then
        assertFalse(result);
    }

    @Test
    @DisplayName("resolveArgument - 로그인 사용자 정보 반환")
    void testResolveArgument_Success() throws Exception {
        // Given
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(userDetails);

        // When
        Object result = resolver.resolveArgument(null, null, null, null);

        // Then
        assertEquals(userDetails, result);
    }

    @Test
    @DisplayName("resolveArgument - 인증 정보 없음")
    void testResolveArgument_NoAuthentication() throws Exception {
        // Given
        when(securityContext.getAuthentication()).thenReturn(null);

        // When
        Object result = resolver.resolveArgument(null, null, null, null);

        // Then
        assertNull(result);
    }
}
