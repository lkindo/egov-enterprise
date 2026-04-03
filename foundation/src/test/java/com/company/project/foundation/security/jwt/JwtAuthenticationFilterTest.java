package com.company.project.foundation.security.jwt;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.servlet.ServletException;
import java.io.IOException;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("JwtAuthenticationFilter 테스트")
class JwtAuthenticationFilterTest {

    @Mock
    private JwtTokenProvider tokenProvider;

    @InjectMocks
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    private MockHttpServletRequest request;
    private MockHttpServletResponse response;
    private MockFilterChain filterChain;

    @BeforeEach
    void setUp() {
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        filterChain = new MockFilterChain();
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("유효한 토큰이 있는 경우 인증 성공")
    void doFilterInternal_withValidToken_authenticationSuccess() throws ServletException, IOException {
        // Given
        String token = "validToken123";
        Authentication mockAuth = mock(Authentication.class);
        when(tokenProvider.validateToken(token)).thenReturn(true);
        when(tokenProvider.getAuthentication(token)).thenReturn(mockAuth);

        request.addHeader("Authorization", "Bearer " + token);

        // When
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isSameAs(mockAuth);
    }

    @Test
    @DisplayName("토큰이 없는 경우 인증 없이 통과")
    void doFilterInternal_noToken_passWithoutAuthentication() throws ServletException, IOException {
        // When
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("잘못된 토큰인 경우 인증 없이 통과")
    void doFilterInternal_invalidToken_passWithoutAuthentication() throws ServletException, IOException {
        // Given
        String token = "invalidToken";
        when(tokenProvider.validateToken(token)).thenReturn(false);
        request.addHeader("Authorization", "Bearer " + token);

        // When
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}