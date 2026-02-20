package com.company.project.security.jwt;

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
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
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
    @DisplayName("JWT ?醫뤾쿃????덈뮉 ?遺욧퍕???????紐꾩쵄 ?源껊궗")
    void doFilterInternal_withValidToken_authenticationSuccess() throws ServletException, IOException {
        // Given
        String token = "validToken123";
        Authentication mockAuth = mock(Authentication.class);

        request.addHeader("Authorization", "Bearer " + token);
        when(tokenProvider.resolveToken(request)).thenReturn(token);
        when(tokenProvider.validateToken(token)).thenReturn(true);
        when(tokenProvider.getAuthentication(token)).thenReturn(mockAuth);

        // When
        jwtAuthenticationFilter.doFilterInternal(Objects.requireNonNull(request), Objects.requireNonNull(response),
                Objects.requireNonNull(filterChain));

        // Then
        verify(tokenProvider).resolveToken(request);
        verify(tokenProvider).validateToken(token);
        verify(tokenProvider).getAuthentication(token);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isEqualTo(mockAuth);
    }

    @Test
    @DisplayName("JWT ?醫뤾쿃????용뮉 ?遺욧퍕???????紐꾩쵄 ??곸뵠 ?④쑴??筌욊쑵六?)
    void doFilterInternal_withoutToken_continueWithoutAuthentication() throws ServletException, IOException {
        // Given
        when(tokenProvider.resolveToken(request)).thenReturn(null);

        // When
        jwtAuthenticationFilter.doFilterInternal(Objects.requireNonNull(request), Objects.requireNonNull(response),
                Objects.requireNonNull(filterChain));

        // Then
        verify(tokenProvider).resolveToken(request);
        verify(tokenProvider, never()).validateToken(any());
        verify(tokenProvider, never()).getAuthentication(any());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("JWT ?醫뤾쿃?????筌??醫륁뒞??? ??? 野껋럩???紐꾩쵄 ??쎈솭")
    void doFilterInternal_withInvalidToken_authenticationFailure() throws ServletException, IOException {
        // Given
        String token = "invalidToken123";

        request.addHeader("Authorization", "Bearer " + token);
        when(tokenProvider.resolveToken(request)).thenReturn(token);
        when(tokenProvider.validateToken(token)).thenReturn(false); // Invalid token

        // When
        jwtAuthenticationFilter.doFilterInternal(Objects.requireNonNull(request), Objects.requireNonNull(response),
                Objects.requireNonNull(filterChain));

        // Then
        verify(tokenProvider).resolveToken(request);
        verify(tokenProvider).validateToken(token);
        verify(tokenProvider, never()).getAuthentication(any()); // Should not be called for invalid token

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("Authorization ??삳쐭??Bearer ?臾먮あ??? ??용뮉 野껋럩???紐꾩쵄 ??곸뵠 筌욊쑵六?)
    void doFilterInternal_withoutBearerPrefix_continueWithoutAuthentication() throws ServletException, IOException {
        // Given
        request.addHeader("Authorization", "invalidPrefix token123");
        when(tokenProvider.resolveToken(request)).thenReturn(null); // Will return null due to missing Bearer prefix

        // When
        jwtAuthenticationFilter.doFilterInternal(Objects.requireNonNull(request), Objects.requireNonNull(response),
                Objects.requireNonNull(filterChain));

        // Then
        verify(tokenProvider).resolveToken(request);
        verify(tokenProvider, never()).validateToken(any());
        verify(tokenProvider, never()).getAuthentication(any());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("JWT ?醫뤾쿃 野꺜筌?餓???됱뇚 獄쏆뮇源????紐꾩쵄 ??쎈솭")
    void doFilterInternal_withTokenValidationException_authenticationFailure() throws ServletException, IOException {
        // Given
        String token = "exceptionToken123";

        request.addHeader("Authorization", "Bearer " + token);
        when(tokenProvider.resolveToken(request)).thenReturn(token);
        when(tokenProvider.validateToken(token)).thenThrow(new RuntimeException("Token validation error"));

        // When
        jwtAuthenticationFilter.doFilterInternal(Objects.requireNonNull(request), Objects.requireNonNull(response),
                Objects.requireNonNull(filterChain));

        // Then
        verify(tokenProvider).resolveToken(request);
        verify(tokenProvider).validateToken(token);
        verify(tokenProvider, never()).getAuthentication(any()); // Should not be called when validation fails

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("?袁り숲 筌ｋ똻???④쑴??筌욊쑵六??類ㅼ뵥")
    void doFilterInternal_chainContinues() throws ServletException, IOException {
        // Given
        String token = "validToken123";
        Authentication mockAuth = mock(Authentication.class);

        request.addHeader("Authorization", "Bearer " + token);
        when(tokenProvider.resolveToken(request)).thenReturn(token);
        when(tokenProvider.validateToken(token)).thenReturn(true);
        when(tokenProvider.getAuthentication(token)).thenReturn(mockAuth);

        // When
        jwtAuthenticationFilter.doFilterInternal(Objects.requireNonNull(request), Objects.requireNonNull(response),
                Objects.requireNonNull(filterChain));

        // Then
        // Verify that the filter chain continues (no exceptions thrown)
        assertThat(filterChain.getRequest()).isEqualTo(request);
    }

    @Test
    @DisplayName("Security Context???紐꾩쵄 ?類ｋ궖 ??쇱젟 ?類ㅼ뵥")
    void doFilterInternal_securityContextSetCorrectly() throws ServletException, IOException {
        // Given
        String token = "validToken123";
        Authentication mockAuth = mock(Authentication.class);
        when(mockAuth.getName()).thenReturn("testUser");

        request.addHeader("Authorization", "Bearer " + token);
        when(tokenProvider.resolveToken(request)).thenReturn(token);
        when(tokenProvider.validateToken(token)).thenReturn(true);
        when(tokenProvider.getAuthentication(token)).thenReturn(mockAuth);

        // When
        jwtAuthenticationFilter.doFilterInternal(Objects.requireNonNull(request), Objects.requireNonNull(response),
                Objects.requireNonNull(filterChain));

        // Then
        Authentication authInContext = SecurityContextHolder.getContext().getAuthentication();
        assertThat(authInContext).isEqualTo(mockAuth);
        assertThat(authInContext.getName()).isEqualTo("testUser");
    }
}