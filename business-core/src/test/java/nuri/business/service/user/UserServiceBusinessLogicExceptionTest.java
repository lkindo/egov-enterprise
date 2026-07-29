package nuri.business.service.user;
import nuri.business.domain.user.exception.UserErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.business.service.user.dto.UserSignupRequest;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.mockStatic;

/**
 * UserServiceBusinessLogicExceptionTest
 * 서비스 레이어에서 발생하는 각종 예외 상황 및 비즈니스 제약 조건 검증
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserService (비즈니스 로직 예외 상황) 테스트")
class UserServiceBusinessLogicExceptionTest {

        @Mock
        private UserRepository userRepository;

        @Mock
        private UserAuthorityRepository userAuthorityRepository;

        @Mock
        private nuri.business.domain.auth.RefreshTokenRepository refreshTokenRepository;

        @Mock
        private nuri.business.domain.login.LoginPolicyRepository loginPolicyRepository;

        @Mock
        private nuri.business.domain.user.repository.UserAbsenceRepository userAbsenceRepository;

        @Mock
        private nuri.business.domain.log.UserLogRepository userLogRepository;

        // [V2_32 결속] UserService 생성자의 required() 가드 — mock 이 없으면 null 주입으로 전 테스트가 즉사한다.
        @Mock
        private nuri.business.domain.deptjob.DeptJobRepository deptJobRepository;

        @Mock
        private PasswordEncoder passwordEncoder;

        @Mock
        private org.springframework.context.ApplicationEventPublisher eventPublisher;

        @InjectMocks
        private UserService userService;

        private UserSignupRequest signupRequest;

        @BeforeEach
        void setUp() {
                signupRequest = UserSignupRequest.builder()
                                .userId("newUser")
                                .pswd("password123!")
                                .userNm("테스트사용자")
                                .role("USER")
                                .pswdHint("hint")
                                .pswdCrans("answer")
                                .build();
        }

        @Test
        @DisplayName("회원가입 실패 - 중복된 사용자 ID (BusinessException 발생)")
        void signup_fail_withDuplicateUserId() {
                // Given
                when(userRepository.findByUserId("newUser")).thenReturn(java.util.Optional.of(org.mockito.Mockito.mock(User.class)));

                // When & Then
                assertThatThrownBy(() -> userService.signup(signupRequest))
                                .isInstanceOf(BusinessException.class)
                                .hasFieldOrPropertyWithValue("errorCode", UserErrorCode.DUPLICATE_USER_ID);
        }

        @Test
        @DisplayName("회원가입 실패 - DB 저장 오류 (RuntimeException 발생)")
        void signup_fail_withDatabaseConnectionError() {
                // Given
                when(userRepository.findByUserId("newUser")).thenReturn(java.util.Optional.empty());
                when(passwordEncoder.encode(any(String.class))).thenReturn("encodedPassword");
                doThrow(new RuntimeException("Database connection failed"))
                                .when(userRepository).save(any(User.class));

                // When & Then
                assertThatThrownBy(() -> userService.signup(signupRequest))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database connection failed");
        }

        @Test
        @DisplayName("사용자 조회 실패 - 존재하지 않는 사용자 ID (BusinessException 발생)")
        void getUserById_fail_withNonExistentUserId() {
                // Given (User @Id==esntlId 이므로 findById 로 esntlId 조회까지 커버 — findByEsntlId 중복 stub 제거)
                when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());

                // When & Then
                assertThatThrownBy(() -> userService.getUserById("nonexistent"))
                                .isInstanceOf(BusinessException.class)
                                .hasFieldOrPropertyWithValue("errorCode", UserErrorCode.USER_NOT_FOUND);
        }

        @Test
        @DisplayName("페이지 사용자 목록 조회 실패 - 잘못된 페이지 번호")
        void getPagedUserList_fail_withInvalidPageNumber() {
                // PageRequest.of(-1, 10)은 생성 시점에 IllegalArgumentException을 직접 발생시킨다.
                assertThatThrownBy(() -> PageRequest.of(-1, 10))
                                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("사용자 등록 실패 - DB 저장 오류")
        void registerUser_fail_withDatabaseSaveError() {
                try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
                        mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
                        // Given
                        when(passwordEncoder.encode("password123!")).thenReturn("encodedPassword");
                        doThrow(new RuntimeException("Database save failed"))
                                        .when(userRepository).save(any(User.class));

                        // When & Then
                        assertThatThrownBy(
                                        () -> userService.registerUser("newUser", "password123!", "테스트사용자", "hint", "answer",
                                                        "USER"))
                                        .isInstanceOf(RuntimeException.class)
                                        .hasMessage("Database save failed");
                }
        }

        @Test
        @DisplayName("비밀번호 검증 - 인코딩된 비밀번호가 null인 경우")
        void verifyPassword_fail_withNullEncodedPassword() {
                // Given
                when(passwordEncoder.matches("rawPassword", null)).thenReturn(false);

                // When
                boolean result = userService.verifyPassword("rawPassword", null);

                // Then
                org.assertj.core.api.Assertions.assertThat(result).isFalse();
        }

        @Test
        @DisplayName("사용자 등록 실패 - 필수 필드(UserId) 누락")
        void registerUser_fail_withNullUserId() {
                try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
                        mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
                        // When & Then
                        assertThatThrownBy(() -> userService.registerUser(null, "password123!", "테스트사용자", "hint", "answer",
                                        "USER"))
                                        .isInstanceOf(IllegalArgumentException.class);
                }
        }

        @Test
        @DisplayName("사용자 등록 실패 - 필수 필드(UserNm) 누락")
        void registerUser_fail_withNullUserNm() {
                try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
                        mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
                        // When & Then
                        assertThatThrownBy(() -> userService.registerUser("newUser", "password123!", null, "hint", "answer",
                                        "USER"))
                                        .isInstanceOf(IllegalArgumentException.class);
                }
        }

        @Test
        @DisplayName("사용자 등록 실패 - 비밀번호 인코딩 오류")
        void registerUser_fail_withPasswordEncodingError() {
                try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
                        mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
                        // Given
                        when(passwordEncoder.encode("password123!"))
                                        .thenThrow(new RuntimeException("Password encoding failed"));

                        // When & Then
                        assertThatThrownBy(
                                        () -> userService.registerUser("newUser", "password123!", "테스트사용자", "hint", "answer",
                                                        "USER"))
                                        .isInstanceOf(RuntimeException.class)
                                        .hasMessage("Password encoding failed");
                }
        }

        @Test
        @DisplayName("사용자 목록 조회 실패 - DB 연동 오류")
        void getUserList_fail_withDatabaseConnectionError() {
                // Given
                when(userRepository.findAllWithAuthorities()).thenThrow(new RuntimeException("Database connection error"));

                // When & Then
                assertThatThrownBy(() -> userService.getUserList())
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database connection error");
        }

        @Test
        @DisplayName("페이지 사용자 목록 조회 실패 - DB 연동 오류")
        void getPagedUserList_fail_withDatabaseConnectionError() {
                // Given
                PageRequest pageable = PageRequest.of(0, 10);
                when(userRepository.getPagedUserList(any(), eq(pageable))).thenThrow(new RuntimeException("Database connection error"));

                // When & Then
                assertThatThrownBy(() -> userService.getUserPage(pageable))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database connection error");
        }

        @Test
        @DisplayName("사용자 상세 조회 실패 - DB 연동 오류")
        void getUserById_fail_withDatabaseConnectionError() {
                // Given
                when(userRepository.findById("testUser")).thenThrow(new RuntimeException("Database connection error"));

                // When & Then
                assertThatThrownBy(() -> userService.getUserById("testUser"))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database connection error");
        }
}
