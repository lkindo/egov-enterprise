package com.company.project.security.service;

import com.company.project.domain.user.Role;
import egovframework.com.cmm.LoginVO;
import egovframework.com.uat.uia.service.EgovLoginService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * EgovAuthenticationProvider 단위 테스트
 */
@ExtendWith(MockitoExtension.class)
class EgovAuthenticationProviderTest {

    @Mock
    private EgovLoginService loginService;

    @InjectMocks
    private EgovAuthenticationProvider authenticationProvider;

    private LoginVO successLoginVO;

    @BeforeEach
    void setUp() {
        successLoginVO = new LoginVO();
        successLoginVO.setId("testUser");
        successLoginVO.setName("테스트 사용자");
        successLoginVO.setUniqId("USR00001");
        successLoginVO.setEmail("test@example.com");
        successLoginVO.setPassword("hashedPassword");
        successLoginVO.setOrgnztId("ORG001");
    }

    @Test
    @DisplayName("인증 성공 - 유효한 자격증명")
    void authenticate_success() throws Exception {
        // Given
        when(loginService.actionLogin(any(LoginVO.class))).thenReturn(successLoginVO);
        Authentication token = new UsernamePasswordAuthenticationToken("testUser", "password123");

        // When
        Authentication result = authenticationProvider.authenticate(token);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.isAuthenticated()).isTrue();
        assertThat(result.getPrincipal()).isInstanceOf(CustomUserDetails.class);

        CustomUserDetails userDetails = (CustomUserDetails) result.getPrincipal();
        assertThat(userDetails.getUsername()).isEqualTo("testUser");
        assertThat(userDetails.getUser().getUserNm()).isEqualTo("테스트 사용자");
        assertThat(userDetails.getUser().getRole()).isEqualTo(Role.USER);
    }

    @Test
    @DisplayName("인증 실패 - null 결과")
    void authenticate_failWithNullResult() throws Exception {
        // Given
        when(loginService.actionLogin(any(LoginVO.class))).thenReturn(null);
        Authentication token = new UsernamePasswordAuthenticationToken("invalidUser", "wrongPassword");

        // When & Then
        assertThatThrownBy(() -> authenticationProvider.authenticate(token))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid");
    }

    @Test
    @DisplayName("인증 실패 - 빈 ID 결과")
    void authenticate_failWithEmptyId() throws Exception {
        // Given
        LoginVO emptyResult = new LoginVO();
        emptyResult.setId("");
        when(loginService.actionLogin(any(LoginVO.class))).thenReturn(emptyResult);
        Authentication token = new UsernamePasswordAuthenticationToken("user", "pass");

        // When & Then
        assertThatThrownBy(() -> authenticationProvider.authenticate(token))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid");
    }

    @Test
    @DisplayName("인증 실패 - 서비스 예외 발생")
    void authenticate_failWithServiceException() throws Exception {
        // Given
        when(loginService.actionLogin(any(LoginVO.class)))
                .thenThrow(new RuntimeException("Database connection failed"));
        Authentication token = new UsernamePasswordAuthenticationToken("user", "pass");

        // When & Then
        assertThatThrownBy(() -> authenticationProvider.authenticate(token))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Authentication failed");
    }

    @Test
    @DisplayName("supports - UsernamePasswordAuthenticationToken 지원")
    void supports_usernamePasswordAuthenticationToken() {
        // When & Then
        assertThat(authenticationProvider.supports(UsernamePasswordAuthenticationToken.class)).isTrue();
    }

    @Test
    @DisplayName("supports - 다른 Authentication 타입 미지원")
    void supports_otherAuthenticationType() {
        // When & Then
        assertThat(authenticationProvider.supports(Authentication.class)).isFalse();
    }
}
