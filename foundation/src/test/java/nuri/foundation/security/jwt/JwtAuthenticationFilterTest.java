package nuri.foundation.security.jwt;

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
        when(tokenProvider.resolveToken(request)).thenReturn(token);
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
        when(tokenProvider.resolveToken(request)).thenReturn(token);
        when(tokenProvider.validateToken(token)).thenReturn(false);
        request.addHeader("Authorization", "Bearer " + token);

        // When
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);

        // Then
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void currentAccountRevocationClearsAnyPreviousSecurityContext() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(mock(Authentication.class));
        when(tokenProvider.resolveToken(request)).thenReturn("existing-token");
        when(tokenProvider.validateToken("existing-token")).thenReturn(true);
        when(tokenProvider.getAuthentication("existing-token"))
                .thenThrow(new org.springframework.security.authentication.DisabledException("inactive"));
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(filterChain.getRequest()).isSameAs(request);
    }
    @Test
    void unavailableIdentityStoreReturns503WithoutDiscardingTheClientTokenAndCanRecover() throws Exception {
        when(tokenProvider.resolveToken(request)).thenReturn("same-token");
        when(tokenProvider.validateToken("same-token")).thenReturn(true);
        Authentication auth = mock(Authentication.class);
        when(tokenProvider.getAuthentication("same-token"))
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("private-db-detail"))
                .thenReturn(auth);
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);
        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(response.getHeader("Retry-After")).isEqualTo("5");
        assertThat(response.getContentAsString()).contains("S002").doesNotContain("private-db-detail", "same-token");
        assertThat(response.getHeaders("Set-Cookie")).isEmpty();
        assertThat(filterChain.getRequest()).isNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        var recovered = new MockHttpServletResponse();
        var recoveredChain = new MockFilterChain();
        jwtAuthenticationFilter.doFilterInternal(request, recovered, recoveredChain);
        assertThat(recovered.getStatus()).isEqualTo(200);
        assertThat(recoveredChain.getRequest()).isSameAs(request);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isSameAs(auth);
    }

    @Test
    void transactionStartFailureReturns503AndClearsAnExistingContext() throws Exception {
        when(tokenProvider.resolveToken(request)).thenReturn("token");
        when(tokenProvider.validateToken("token")).thenReturn(true);
        when(tokenProvider.getAuthentication("token")).thenThrow(new org.springframework.transaction.CannotCreateTransactionException("unavailable"));
        SecurityContextHolder.getContext().setAuthentication(mock(Authentication.class));
        jwtAuthenticationFilter.doFilterInternal(request, response, filterChain);
        assertThat(response.getStatus()).isEqualTo(503);
        assertThat(filterChain.getRequest()).isNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

}
