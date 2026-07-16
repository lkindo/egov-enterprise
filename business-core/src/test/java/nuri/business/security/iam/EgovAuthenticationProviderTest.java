package nuri.business.security.iam;

import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.business.domain.auth.UserAuthority;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.service.EgovPasswordEncoder;
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
                .pswd("{egov}hashedPassword")
                .userNm("Test User")
                .lckYn("N")
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
                .scrtyDcsnTrgtId("USR_0000000000001")
                .authrtId("ROLE_USER")
                .build();
        lenient().when(userAuthorityRepository.findById("USR_0000000000001")).thenReturn(Optional.of(userAuthority));

        // When
        Authentication result = authenticationProvider.authenticate(auth);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("USR_0000000000001");
        assertThat(result.getAuthorities()).extracting("authority").contains("ROLE_USER");
        verify(userRepository).save(any(User.class)); // Unlock and save
        // [잠금 해제 검증] 성공 시 unlock() → lckYn='N', lckCnt=0.
        // (뮤턴트: unlock() 라인 삭제 시 lckCnt 는 초기 null 로 남아 이 어서션이 킬)
        assertThat(testUser.getLckYn()).isEqualTo("N");
        assertThat(testUser.getLckCnt()).isEqualTo(0);
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
        // [잠금 카운터 검증] 실패 시 incrementLockCount() → null→1.
        // (뮤턴트: incrementLockCount() 라인 삭제 시 lckCnt 는 null 로 남아 이 어서션이 킬)
        assertThat(testUser.getLckCnt()).isEqualTo(1);
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
        testUser.lock();
        Authentication auth = new UsernamePasswordAuthenticationToken("testuser", "password");
        lenient().when(userRepository.findById("testuser")).thenReturn(Optional.of(testUser));

        // When & Then
        assertThatThrownBy(() -> authenticationProvider.authenticate(auth))
                .hasMessageContaining("locked");
    }

    @Test
    @DisplayName("인증 성공 - DB 권한(ROLE_ADMIN) 기반 역할 부여")
    void authenticate_success_dbAuthorityAdmin() {
        // webmaster '특수 처리'(하드코딩 자동 ADMIN)는 보안 하드닝으로 제거됨.
        // 현행 모델: 역할은 DB 권한 매핑(tb_user_authrt_map, esntlId 기준)에서 결정된다.
        // Given — [P2 키 규약] User.changeUserId 제거(loginId 불변 선언)에 따라 빌더로 직접 구성
        User webmasterUser = User.builder()
                .userId("webmaster")
                .esntlId("USR_0000000000001")
                .pswd("{egov}hashedPassword")
                .userNm("Test User")
                .lckYn("N")
                .build();
        Authentication auth = new UsernamePasswordAuthenticationToken("webmaster", "password");
        lenient().when(userRepository.findById("webmaster")).thenReturn(Optional.of(webmasterUser));
        lenient().when(egovPasswordEncoder.encode("password", "webmaster")).thenReturn("hashedPassword");
        UserAuthority adminAuthority = UserAuthority.builder()
                .scrtyDcsnTrgtId("USR_0000000000001")
                .authrtId("ROLE_ADMIN")
                .build();
        lenient().when(userAuthorityRepository.findById("USR_0000000000001")).thenReturn(Optional.of(adminAuthority));

        // When
        Authentication result = authenticationProvider.authenticate(auth);

        // Then
        assertThat(result.getAuthorities()).extracting("authority").contains("ROLE_ADMIN");
    }
}
