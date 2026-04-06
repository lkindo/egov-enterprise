package nuri.foundation.security.iam;

import nuri.foundation.domain.auth.UserAuthorityRepository;
import nuri.foundation.domain.auth.UserAuthority;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.security.service.EgovPasswordEncoder;
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
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EgovAuthenticationProvider 인증 테스트")
class EgovAuthenticationProviderTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserAuthorityRepository userAuthorityRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EgovPasswordEncoder egovPasswordEncoder;

    @InjectMocks
    private EgovAuthenticationProvider authenticationProvider;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .userId("testuser")
                .esntlId("USR_0000000000001")
                .password("{egov}hashedPassword")
                .userNm("Test User")
                .lockAt("N")
                .build();
    }

    @Test
    @DisplayName("인증 성공 - Egov 패턴")
    void authenticate_success_egov() {
        // Given
        Authentication auth = new UsernamePasswordAuthenticationToken("testuser", "password");
        lenient().when(userRepository.findById("testuser")).thenReturn(Optional.of(testUser));
        lenient().when(egovPasswordEncoder.encode("password", "testuser")).thenReturn("hashedPassword");
        
        UserAuthority userAuthority = UserAuthority.builder()
                .uniqId("USR_0000000000001")
                .authorCode("ROLE_USER")
                .build();
        lenient().when(userAuthorityRepository.findById("USR_0000000000001")).thenReturn(Optional.of(userAuthority));

        // When
        Authentication result = authenticationProvider.authenticate(auth);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("USR_0000000000001");
        assertThat(result.getAuthorities()).extracting("authority").contains("ROLE_USER");
        verify(userRepository).save(any(User.class)); // Unlock and save
    }

    @Test
    @DisplayName("인증 실패 - 비밀번호 불일치")
    void authenticate_fail_wrongPassword() {
        // Given
        Authentication auth = new UsernamePasswordAuthenticationToken("testuser", "wrongpassword");
        lenient().when(userRepository.findById("testuser")).thenReturn(Optional.of(testUser));
        lenient().when(egovPasswordEncoder.encode("wrongpassword", "testuser")).thenReturn("wrongHash");
        lenient().when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> authenticationProvider.authenticate(auth))
                .isInstanceOf(BadCredentialsException.class);
        verify(userRepository).save(any(User.class)); // Lock count incremented
    }

    @Test
    @DisplayName("인증 실패 - 사용자 없음")
    void authenticate_fail_userNotFound() {
        // Given
        Authentication auth = new UsernamePasswordAuthenticationToken("nonexistent", "password");
        lenient().when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());
        lenient().when(userRepository.findByEsntlId("nonexistent")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> authenticationProvider.authenticate(auth))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    @DisplayName("인증 실패 - 계정 잠금")
    void authenticate_fail_accountLocked() {
        // Given
        testUser.setLockAt("Y");
        Authentication auth = new UsernamePasswordAuthenticationToken("testuser", "password");
        lenient().when(userRepository.findById("testuser")).thenReturn(Optional.of(testUser));

        // When & Then
        assertThatThrownBy(() -> authenticationProvider.authenticate(auth))
                .hasMessageContaining("locked");
    }

    @Test
    @DisplayName("인증 성공 - webmaster 특수 처리")
    void authenticate_success_webmaster() {
        // Given
        testUser.setUserId("webmaster");
        Authentication auth = new UsernamePasswordAuthenticationToken("webmaster", "password");
        lenient().when(userRepository.findById("webmaster")).thenReturn(Optional.of(testUser));
        lenient().when(egovPasswordEncoder.encode("password", "webmaster")).thenReturn("hashedPassword");
        lenient().when(userAuthorityRepository.findById(anyString())).thenReturn(Optional.empty());

        // When
        Authentication result = authenticationProvider.authenticate(auth);

        // Then
        assertThat(result.getAuthorities()).extracting("authority").contains("ROLE_ADMIN");
    }
}
