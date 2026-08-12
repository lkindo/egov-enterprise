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
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
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

    private EgovAuthenticationProvider authenticationProvider;

    private User testUser;

    /** 잠금 정책: 연속 5회 실패 시 15분 잠금 (application.yml 기본값과 동일). */
    private static final int MAX_FAILURES = 5;
    private static final long LOCK_MINUTES = 15;

    @BeforeEach
    void setUp() {
        // EgovPasswordEncoder도 PasswordEncoder를 구현하므로 @InjectMocks 생성자 추론은 두 mock을
        // 모호하게 매칭할 수 있다. 의존성을 명시해 표준/레거시 인코더 경계를 실행 순서와 무관하게 고정한다.
        authenticationProvider = new EgovAuthenticationProvider(
                userRepository, userAuthorityRepository, passwordEncoder, egovPasswordEncoder);
        testUser = User.builder()
                .userId("testuser")
                .esntlId("USR_0000000000001")
                .pswd("{egov}hashedPassword")
                .userNm("Test User")
                .lckYn("N")
                .build();
        // @Value 필드는 @InjectMocks 가 주입하지 않는다 (LogRetentionSchedulerTest 와 동일 관례).
        ReflectionTestUtils.setField(authenticationProvider, "maxLoginFailures", MAX_FAILURES);
        ReflectionTestUtils.setField(authenticationProvider, "lockMinutes", LOCK_MINUTES);
    }

    /** 비밀번호 불일치로 1회 실패시킨다. */
    private void attemptWithWrongPassword(String userId) {
        Authentication auth = new UsernamePasswordAuthenticationToken(userId, "wrongpassword");
        assertThatThrownBy(() -> authenticationProvider.authenticate(auth))
                .isInstanceOf(BadCredentialsException.class);
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
    @DisplayName("인증 인프라 장애는 잘못된 자격증명으로 위장하지 않음")
    void authenticate_databaseFailure_isServiceFailure() {
        Authentication auth = new UsernamePasswordAuthenticationToken("testuser", "password");
        when(userRepository.findByUserId("testuser"))
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("db unavailable"));

        assertThatThrownBy(() -> authenticationProvider.authenticate(auth))
                .isInstanceOf(AuthenticationServiceException.class)
                .isNotInstanceOf(BadCredentialsException.class)
                .hasMessage("Authentication service unavailable");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("저장 비밀번호 해시 파손은 계정 실패 횟수를 올리지 않음")
    void authenticate_brokenStoredHash_isServiceFailureNotMismatch() {
        Authentication auth = new UsernamePasswordAuthenticationToken("testuser", "password");
        when(userRepository.findById("testuser")).thenReturn(Optional.of(testUser));
        when(egovPasswordEncoder.encode("password", "testuser")).thenReturn("not-matched");
        when(egovPasswordEncoder.encode("password", "USR_0000000000001")).thenReturn("not-matched");
        when(passwordEncoder.matches("password", "{egov}hashedPassword"))
                .thenThrow(new IllegalArgumentException("unknown hash id"));

        assertThatThrownBy(() -> authenticationProvider.authenticate(auth))
                .isInstanceOf(AuthenticationServiceException.class)
                .isNotInstanceOf(BadCredentialsException.class);

        assertThat(testUser.getLckCnt()).isNull();
        verify(userRepository, never()).save(any(User.class));
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

    // ──────────────────────────────────────────────────────────────────────────
    // 계정 잠금 정책 (연속 5회 실패 → 15분 잠금, 경과 후 자동 해제)
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("잠금 - 임계값 미만(4회) 실패는 잠기지 않는다")
    void lockout_belowThreshold_notLocked() {
        // Given
        lenient().when(userRepository.findById("testuser")).thenReturn(Optional.of(testUser));
        lenient().when(egovPasswordEncoder.encode(anyString(), anyString())).thenReturn("wrongHash");
        lenient().when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        // When — 임계값 직전(4회)까지 실패
        for (int i = 0; i < MAX_FAILURES - 1; i++) {
            attemptWithWrongPassword("testuser");
        }

        // Then — 카운터만 오르고 잠기지 않는다 (정상 사용자 오타 4회는 서비스 차단이 아니다)
        assertThat(testUser.getLckCnt()).isEqualTo(MAX_FAILURES - 1);
        assertThat(testUser.isLocked()).isFalse();
        assertThat(testUser.getLckLastPnttm()).isNull();
    }

    @Test
    @DisplayName("잠금 - 임계값(5회)째 실패에서 잠기고 잠금 시각이 기록된다")
    void lockout_atThreshold_locks() {
        // Given
        lenient().when(userRepository.findById("testuser")).thenReturn(Optional.of(testUser));
        lenient().when(egovPasswordEncoder.encode(anyString(), anyString())).thenReturn("wrongHash");
        lenient().when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        // When — 5회 실패 (5회째까지는 잠금 검사를 통과하므로 전부 BadCredentials)
        for (int i = 0; i < MAX_FAILURES; i++) {
            attemptWithWrongPassword("testuser");
        }

        // Then — 잠금 성립 + 자동 해제 기준 시각 존재
        // (뮤턴트: lock() 호출을 지우면 lckYn 이 'N' 으로 남아 이 어서션이 킬)
        assertThat(testUser.getLckCnt()).isEqualTo(MAX_FAILURES);
        assertThat(testUser.isLocked()).isTrue();
        assertThat(testUser.getLckLastPnttm()).isNotNull();
        // 잠금 상태가 반드시 영속되어야 한다 (@Transactional 롤백에 휩쓸리면 기능 자체가 무음 실패)
        verify(userRepository, times(MAX_FAILURES)).save(any(User.class));

        // 그리고 이후 시도는 BadCredentials 가 아니라 잠금 예외로 전환된다
        Authentication next = new UsernamePasswordAuthenticationToken("testuser", "wrongpassword");
        assertThatThrownBy(() -> authenticationProvider.authenticate(next))
                .isInstanceOf(AccountStatusException.class)
                .hasMessageContaining("locked");
    }

    @Test
    @DisplayName("잠금 - 잠긴 계정은 '올바른' 비밀번호로도 거부된다")
    void lockout_locked_rejectsEvenCorrectPassword() {
        // Given — 방금 잠긴 계정 (잠금 시각 = now)
        User lockedUser = User.builder()
                .userId("lockeduser")
                .esntlId("USR_0000000000002")
                .pswd("{egov}hashedPassword")
                .userNm("Locked User")
                .lckYn("Y")
                .lckCnt(MAX_FAILURES)
                .lckLastPnttm(LocalDateTime.now())
                .build();
        lenient().when(userRepository.findById("lockeduser")).thenReturn(Optional.of(lockedUser));
        // 비밀번호는 '정답'이지만 잠금 검사가 먼저다
        lenient().when(egovPasswordEncoder.encode("password", "lockeduser")).thenReturn("hashedPassword");

        Authentication auth = new UsernamePasswordAuthenticationToken("lockeduser", "password");

        // When & Then
        assertThatThrownBy(() -> authenticationProvider.authenticate(auth))
                .isInstanceOf(AccountStatusException.class)
                .hasMessageContaining("locked");
        // 잠금 유지 + 재시도가 잠금 시각을 연장하지 않는다(연장하면 영구 DoS 가 성립)
        assertThat(lockedUser.isLocked()).isTrue();
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("잠금 - 잠금기간(15분) 경과 후에는 자동 해제되어 인증에 성공한다")
    void lockout_afterDuration_autoUnlocksAndAuthenticates() {
        // Given — 16분 전에 잠긴 계정 (실제 sleep 대신 잠금 시각을 과거로 세팅)
        User expiredLockUser = User.builder()
                .userId("expireduser")
                .esntlId("USR_0000000000003")
                .pswd("{egov}hashedPassword")
                .userNm("Expired Lock User")
                .lckYn("Y")
                .lckCnt(MAX_FAILURES)
                .lckLastPnttm(LocalDateTime.now().minusMinutes(LOCK_MINUTES + 1))
                .build();
        lenient().when(userRepository.findById("expireduser")).thenReturn(Optional.of(expiredLockUser));
        lenient().when(egovPasswordEncoder.encode("password", "expireduser")).thenReturn("hashedPassword");
        lenient().when(passwordEncoder.encode(anyString())).thenReturn("{bcrypt}migrated");

        Authentication auth = new UsernamePasswordAuthenticationToken("expireduser", "password");

        // When — 관리자 개입 없이 스스로 풀려야 한다
        Authentication result = authenticationProvider.authenticate(auth);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("USR_0000000000003");
        // (뮤턴트: 자동 해제 분기를 지우면 AccountStatusException 이 나서 이 테스트가 킬)
        assertThat(expiredLockUser.isLocked()).isFalse();
        assertThat(expiredLockUser.getLckCnt()).isEqualTo(0);
        assertThat(expiredLockUser.getLckLastPnttm()).isNull();
    }

    @Test
    @DisplayName("잠금 - max-failures<=0 이면 잠금 비활성(가용성 탈출구)")
    void lockout_disabledWhenThresholdNotPositive() {
        // Given — 운영 긴급 회피 스위치
        ReflectionTestUtils.setField(authenticationProvider, "maxLoginFailures", 0);
        lenient().when(userRepository.findById("testuser")).thenReturn(Optional.of(testUser));
        lenient().when(egovPasswordEncoder.encode(anyString(), anyString())).thenReturn("wrongHash");
        lenient().when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        // When — 임계값을 훌쩍 넘겨 실패
        for (int i = 0; i < MAX_FAILURES + 3; i++) {
            attemptWithWrongPassword("testuser");
        }

        // Then — 카운터는 오르되 잠기지 않는다
        assertThat(testUser.getLckCnt()).isEqualTo(MAX_FAILURES + 3);
        assertThat(testUser.isLocked()).isFalse();
    }
}
