package com.company.project.security.service;

import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import egovframework.com.cmm.LoginVO;
import egovframework.com.uat.uia.service.EgovLoginService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EgovAuthenticationProviderTest {

    @Mock
    private EgovLoginService loginService;

    @Mock
    private UserAuthorityRepository userAuthorityRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private EgovAuthenticationProvider authenticationProvider;

    private LoginVO validLoginVO;
    private User mockUser;

    @BeforeEach
    void setUp() {
        validLoginVO = new LoginVO();
        validLoginVO.setId("testUser");
        validLoginVO.setName("?ŒìŠ¤???¬ìš©??);
        validLoginVO.setUniqId("USR00001");
        validLoginVO.setEmail("test@example.com");
        validLoginVO.setPassword("encodedPassword");
        validLoginVO.setOrgnztId("ORG001");

        mockUser = User.builder()
                .userId("testUser")
                .userNm("?ŒìŠ¤???¬ìš©??)
                .esntlId("USR00001")
                .password("encodedPassword")
                .lockAt("N") // Not locked
                .build();
    }

    @Test
    @DisplayName("?¸ì¦ ?±ê³µ - ? íš¨???¬ìš©???•ë³´")
    void authenticate_success_withValidCredentials() throws Exception {
        // Given
        when(loginService.actionLogin(any(LoginVO.class))).thenReturn(validLoginVO);
        when(userRepository.findById("testUser")).thenReturn(Optional.of(mockUser));
        when(userAuthorityRepository.findById("USR00001")).thenReturn(Optional.of(
                UserAuthority.builder()
                        .uniqId("USR00001")
                        .authorCode("ROLE_USER")
                        .build()));

        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken("testUser", "password123");

        // When
        Authentication result = authenticationProvider.authenticate(token);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.isAuthenticated()).isTrue();
        assertThat(result.getPrincipal()).isInstanceOf(CustomUserDetails.class);

        CustomUserDetails userDetails = (CustomUserDetails) result.getPrincipal();
        assertThat(userDetails.getUsername()).isEqualTo("testUser");
        assertThat(userDetails.getUser().getUserNm()).isEqualTo("?ŒìŠ¤???¬ìš©??);
        assertThat(userDetails.getAuthorities())
                .extracting(org.springframework.security.core.GrantedAuthority::getAuthority)
                .contains("ROLE_USER");
    }

    @Test
    @DisplayName("?¸ì¦ ?¤íŒ¨ - ?¬ìš©??IDê°€ null??ê²½ìš°")
    void authenticate_fail_withNullUserId() throws Exception {
        // Given
        LoginVO invalidLoginVO = new LoginVO();
        invalidLoginVO.setId(null);
        when(loginService.actionLogin(any(LoginVO.class))).thenReturn(invalidLoginVO);

        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken("testUser", "password123");

        // When & Then
        assertThatThrownBy(() -> authenticationProvider.authenticate(token))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid User ID or Password");
    }

    @Test
    @DisplayName("?¸ì¦ ?¤íŒ¨ - ?¬ìš©??IDê°€ ë¹?ë¬¸ìž?´ì¸ ê²½ìš°")
    void authenticate_fail_withEmptyUserId() throws Exception {
        // Given
        LoginVO invalidLoginVO = new LoginVO();
        invalidLoginVO.setId("");
        when(loginService.actionLogin(any(LoginVO.class))).thenReturn(invalidLoginVO);

        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken("testUser", "password123");

        // When & Then
        assertThatThrownBy(() -> authenticationProvider.authenticate(token))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid User ID or Password");
    }

    @Test
    @DisplayName("?¸ì¦ ?¤íŒ¨ - ì¡´ìž¬?˜ì? ?ŠëŠ” ?¬ìš©??)
    void authenticate_fail_withNonExistentUser() throws Exception {
        // Given
        when(loginService.actionLogin(any(LoginVO.class))).thenReturn(validLoginVO);
        when(userRepository.findById("testUser")).thenReturn(Optional.empty());

        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken("testUser", "password123");

        // When & Then
        assertThatThrownBy(() -> authenticationProvider.authenticate(token))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("User not found");
    }

    @Test
    @DisplayName("?¸ì¦ ?¤íŒ¨ - ? ê¸´ ê³„ì •")
    void authenticate_fail_withLockedAccount() throws Exception {
        // Given
        User lockedUser = User.builder()
                .userId("testUser")
                .userNm("?ŒìŠ¤???¬ìš©??)
                .esntlId("USR00001")
                .password("encodedPassword")
                .lockAt("Y") // Locked
                .build();

        when(loginService.actionLogin(any(LoginVO.class))).thenReturn(validLoginVO);
        when(userRepository.findById("testUser")).thenReturn(Optional.of(lockedUser));

        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken("testUser", "password123");

        // When & Then
        assertThatThrownBy(() -> authenticationProvider.authenticate(token))
                .isInstanceOf(AccountStatusException.class)
                .hasMessageContaining("User account is locked");
    }

    @Test
    @DisplayName("?¸ì¦ ?¤íŒ¨ - ë¡œê·¸???œë¹„???ˆì™¸ ë°œìƒ")
    void authenticate_fail_withLoginServiceException() throws Exception {
        // Given
        when(loginService.actionLogin(any(LoginVO.class)))
                .thenThrow(new RuntimeException("Database connection failed"));

        UsernamePasswordAuthenticationToken token = new UsernamePasswordAuthenticationToken("testUser", "password123");

        // When & Then
        assertThatThrownBy(() -> authenticationProvider.authenticate(token))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Authentication failed");
    }

    @Test
    @DisplayName("supports - UsernamePasswordAuthenticationToken ì§€??)
    void supports_usernamePasswordAuthenticationToken() {
        // When & Then
        assertThat(authenticationProvider.supports(UsernamePasswordAuthenticationToken.class)).isTrue();
    }

    @Test
    @DisplayName("supports - ?¤ë¥¸ Authentication ?€??ë¯¸ì???)
    void supports_otherAuthenticationType() {
        // When & Then
        assertThat(authenticationProvider.supports(org.springframework.security.core.Authentication.class)).isFalse();
    }
}
