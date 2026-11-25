package nuri.business.service.user;
import nuri.business.domain.user.exception.UserErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.user.dto.UserDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigInteger;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.mockStatic;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService (사용자 관리 추가 기능) 테스트")
class UserServiceAdditionalTest {
    @org.junit.jupiter.api.AfterEach
    void clearAuthorization() { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }


    @Mock
    private UserRepository userRepository;

    @Mock
    private nuri.business.domain.auth.RefreshTokenRepository refreshTokenRepository;

    @Mock
    private nuri.business.domain.login.LoginPolicyRepository loginPolicyRepository;

    @Mock
    private nuri.business.domain.user.repository.UserAbsenceRepository userAbsenceRepository;

    @Mock
    private nuri.business.domain.log.UserLogRepository userLogRepository;

    @Mock
    private nuri.business.domain.deptjob.DeptJobRepository deptJobRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @Mock private nuri.business.domain.user.repository.DeptManageRepository deptManageRepository;
    @Mock private nuri.business.security.authorization.AuthorizationSnapshotService authorizationSnapshots;
    @Mock private nuri.business.service.auth.AuthorizationAdministrationService authorizationAdministration;
    @Mock private nuri.foundation.core.audit.SensitiveAuditPort sensitiveAudit;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, refreshTokenRepository,
                loginPolicyRepository, userAbsenceRepository,
                userLogRepository, deptJobRepository, deptManageRepository, passwordEncoder, eventPublisher,
                authorizationSnapshots, authorizationAdministration, sensitiveAudit,
                org.mockito.Mockito.mock(nuri.business.domain.auth.mfa.MfaCredentialRepository.class),
                org.mockito.Mockito.mock(LoginIdReuseGuard.class));
    }

    private User.UserBuilder createBaseUser(String userId) {
        return User.builder()
                .userId(userId)
                .esntlId("ESNTL_" + userId)
                .userNm("Name_" + userId)
                .pswd("password");
    }

    private UserDto.UserDtoBuilder createBaseUserDto(String userId) {
        return UserDto.builder()
                .userId(userId)
                .esntlId("ESNTL_" + userId)
                .userNm("Name_" + userId)
                .version(0);
    }

    @Test
    @DisplayName("사용자 정보 수정 성공")
    void updateUser_success() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.getCurrentEsntlId()).thenReturn(Optional.of("ADMIN"));
            // Given
            String userId = "testUser";
            User user = createBaseUser(userId)
                    .userNm("Old Name")
                    .build();
            UserDto updateDto = createBaseUserDto(userId)
                    .userNm("New Name")
                    .emplNo("EMP001")
                    .ofcpsNm("Manager")
                    .build();

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // When
            userService.updateUser(userId, updateDto);

            // Then
            assertThat(user.getUserNm()).isEqualTo("New Name");
            assertThat(user.getEmplNo()).isEqualTo("EMP001");
            assertThat(user.getOfcpsNm()).isEqualTo("Manager");
            assertThat(user.getEditVersion()).as("저장하면 편집 버전이 오른다(V2_156)").isEqualTo(1);
        }
    }

    @Test
    @DisplayName("🚨 [V2_156] 읽은 뒤 다른 사람이 먼저 저장했으면 409 이고 아무것도 바꾸지 않는다 — 버전이 없으면 400")
    void updateUser_rejectsStaleOrMissingEditVersion() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.getCurrentEsntlId()).thenReturn(Optional.of("ADMIN"));
            String userId = "testUser";
            User user = createBaseUser(userId).userNm("Old Name").build();
            user.markProfileEdited(); // 다른 관리자가 먼저 저장했다 — 지금 버전 1
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            BusinessException stale = org.junit.jupiter.api.Assertions.assertThrows(BusinessException.class,
                    () -> userService.updateUser(userId, createBaseUserDto(userId).userNm("Stale Name").version(0).build()));
            assertThat(stale.getErrorCode()).isEqualTo(nuri.foundation.core.exception.CommonErrorCode.CONCURRENT_MODIFICATION);

            BusinessException missing = org.junit.jupiter.api.Assertions.assertThrows(BusinessException.class,
                    () -> userService.updateUser(userId, createBaseUserDto(userId).userNm("No Version").version(null).build()));
            assertThat(missing.getErrorCode()).isEqualTo(nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE);

            assertThat(user.getUserNm()).isEqualTo("Old Name");
            assertThat(user.getEditVersion()).isEqualTo(1);

            userService.updateUser(userId, createBaseUserDto(userId).userNm("Fresh Name").version(1).build());
            assertThat(user.getUserNm()).isEqualTo("Fresh Name");
            assertThat(user.getEditVersion()).isEqualTo(2);
        }
    }

    @Test
    @DisplayName("[V2_156] 부서 일괄 이동도 소속 칸을 바꾸므로 편집 버전을 올린다 — 그 사이 열어 둔 수정 폼의 저장은 409 가 된다")
    void departmentMoveBumpsEditVersion() {
        User user = createBaseUser("mover").build();
        assertThat(user.getEditVersion()).isZero();
        user.updateOrgnztId("DEPT_NEW");
        assertThat(user.getEditVersion()).isEqualTo(1);
        assertThat(UserDto.from(user).version()).as("상세 응답이 버전을 싣는다").isEqualTo(1);
    }

    /**
     * 🚨 [2026-08-12 회귀 방어] **보내지 않은 필드가 지워지던 결함.**
     *
     * <p>{@code User.update()} 는 인자를 무조건 대입한다({@code this.emplNo = emplNo}).
     * 그런데 관리자 수정 폼이 전송하는 것은 userId·userNm·emlAddr·mblTelno·ognzId·pswd 뿐이라,
     * 나머지 <b>12개(사번·직함·주소·우편번호·전화 계열·팩스·그룹·기관코드)가 null 로 와서
     * 그대로 덮어써졌다.</b> 이름 한 글자만 고쳐도 그 사용자의 주소·연락처·사번이 통째로 날아갔다.
     *
     * <p>폼이 값을 왕복시켜 방어하는 방법(부서 업무 방식)은 여기서 성립하지 않는다 —
     * 목록 API 의 projection 이 10개 필드만 돌려주어 화면이 areaNo·homeAddr·zip·ognzId 등을
     * <b>애초에 받지 못한다.</b> 왕복시킬 값이 없으므로 서버에서 막아야 한다.
     */
    @Test
    @DisplayName("사용자 정보 수정 - 요청에 없는 필드는 기존 값이 보존된다 (필드 유실 회귀 방어)")
    void updateUser_preservesFieldsAbsentFromRequest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.getCurrentEsntlId()).thenReturn(Optional.of("ADMIN"));

            String userId = "testUser";
            User user = createBaseUser(userId)
                    .userNm("Old Name")
                    .emplNo("EMP-KEEP")
                    .ofcpsNm("팀장")
                    .homeAddr("서울시 어딘가 123")
                    .zip("12345")
                    .officeTelno("02-1234-5678")
                    .build();

            // 관리자 수정 폼이 실제로 보내는 필드 집합 — 나머지는 null 이다.
            UserDto formPayload = UserDto.builder().version(0)
                    .userId(userId)
                    .userNm("New Name")
                    .emlAddr("new@egov.kr")
                    .mblTelno("01011112222")
                    .build();

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            userService.updateUser(userId, formPayload);

            // 보낸 것은 바뀐다.
            assertThat(user.getUserNm()).isEqualTo("New Name");
            assertThat(user.getEmlAddr()).isEqualTo("new@egov.kr");
            assertThat(user.getMblTelno()).isEqualTo("01011112222");

            // 보내지 않은 것은 **살아 있어야 한다** — 종전에는 전부 null 이 됐다.
            assertThat(user.getEmplNo()).as("사번이 지워졌다").isEqualTo("EMP-KEEP");
            assertThat(user.getOfcpsNm()).as("직함이 지워졌다").isEqualTo("팀장");
            assertThat(user.getHomeAddr()).as("주소가 지워졌다").isEqualTo("서울시 어딘가 123");
            assertThat(user.getZip()).as("우편번호가 지워졌다").isEqualTo("12345");
            assertThat(user.getOfficeTelno()).as("사무실 전화가 지워졌다").isEqualTo("02-1234-5678");
        }
    }

    /**
     * 위 보존 규칙이 <b>지우기까지 막아 버리면</b> 그것대로 결함이다.
     * null(보내지 않음)과 ""(비움)의 구분이 실제로 서는지 반대 방향으로 고정한다.
     */
    @Test
    @DisplayName("사용자 정보 수정 - 빈 문자열은 '지움' 의도이므로 반영된다")
    void updateUser_emptyStringClearsField() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.getCurrentEsntlId()).thenReturn(Optional.of("ADMIN"));

            String userId = "testUser";
            User user = createBaseUser(userId).ofcpsNm("팀장").build();

            UserDto clearing = UserDto.builder().version(0)
                    .userId(userId)
                    .userNm("Name")
                    .ofcpsNm("")          // 사용자가 칸을 비웠다
                    .build();

            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            userService.updateUser(userId, clearing);

            assertThat(user.getOfcpsNm()).as("비운 칸이 지워지지 않았다 — 보존 규칙이 과하다").isEmpty();
        }
    }

    @Test
    @DisplayName("사용자 정보 수정 실패 - 존재하지 않는 사용자")
    void updateUser_fail_userNotFound() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.getCurrentEsntlId()).thenReturn(Optional.of("ADMIN"));
            // Given
            String userId = "nonexistent";
            UserDto updateDto = createBaseUserDto(userId).build();
            when(userRepository.findById(userId)).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> userService.updateUser(userId, updateDto))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", UserErrorCode.USER_NOT_FOUND);
        }
    }

    @Test
    @DisplayName("비밀번호 변경 성공")
    void changePassword_success() {
        // Given
        String userId = "testUser";
        String oldPassword = "oldPassword";
        String newPassword = "newPassword";
        String encodedOldPassword = "encodedOldPassword";
        String encodedNewPassword = "encodedNewPassword";

        User user = createBaseUser(userId)
                .pswd(encodedOldPassword)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(oldPassword, encodedOldPassword)).thenReturn(true);
        when(passwordEncoder.encode(newPassword)).thenReturn(encodedNewPassword);

        // When
        userService.changePassword(userId, oldPassword, newPassword);

        // Then
        assertThat(user.getPswd()).isEqualTo(encodedNewPassword);
        verify(passwordEncoder).encode(newPassword);
        // 새 비밀번호와 무관하게 재발급을 계속 받던 기존 refresh token 을 끊는다(esntlId 키).
        verify(refreshTokenRepository).deleteAllByEsntlIdIn(java.util.List.of("ESNTL_" + userId));
    }

    @Test
    @DisplayName("비밀번호 변경 실패 - 기존 비밀번호 불일치")
    void changePassword_fail_invalidOldPassword() {
        // Given
        String userId = "testUser";
        String oldPassword = "wrongPassword";
        String newPassword = "newPassword";
        String encodedOldPassword = "encodedOldPassword";

        User user = createBaseUser(userId)
                .pswd(encodedOldPassword)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(oldPassword, encodedOldPassword)).thenReturn(false);

        // When & Then
        assertThatThrownBy(() -> userService.changePassword(userId, oldPassword, newPassword))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", UserErrorCode.INVALID_PASSWORD);
        // 현재 비밀번호를 모르는 요청이 남의 세션을 끊는 수단이 되면 안 된다.
        verify(refreshTokenRepository, never()).deleteAllByEsntlIdIn(anyList());
    }

    @org.junit.jupiter.api.Nested
    @DisplayName("현재 비밀번호 불일치는 로그인 실패와 별도로 센다")
    class CurrentPasswordFailures {

        @Test
        @DisplayName("한 번 틀리면 행 잠금 아래에서 전용 횟수만 올리고 세션은 끊지 않는다")
        void countsUnderRowLockWithoutRevokingSessions() throws Exception {
            userService.useLoginFailureLimits(5, 15);
            User user = createBaseUser("testUser").pswd("encodedOld").lckCnt(4).build();
            when(userRepository.findById("testUser")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("wrong", "encodedOld")).thenReturn(false);

            assertThatThrownBy(() -> userService.changePassword("testUser", "wrong", "newPassword"))
                    .isInstanceOf(nuri.business.domain.user.exception.CurrentPasswordMismatchException.class)
                    .hasFieldOrPropertyWithValue("errorCode", UserErrorCode.INVALID_PASSWORD);

            assertThat(user.getLckCnt()).isEqualTo(4);
            assertThat(user).hasFieldOrPropertyWithValue("pswdFailNmtm", BigInteger.ONE);
            assertThat(user.isLocked()).isFalse();
            var order = inOrder(userRepository);
            order.verify(userRepository).refreshForUpdate(user);
            order.verify(userRepository).save(user);
            verify(userRepository, never()).advanceSessionCycle(anyList());
            verify(refreshTokenRepository, never()).deleteAllByEsntlIdIn(anyList());
            // 횟수가 예외와 함께 롤백되면 이 기능은 조용히 없어진다 — 로그인의 BadCredentialsException 과 같은 결속.
            org.springframework.transaction.annotation.Transactional tx = UserService.class
                    .getMethod("changePassword", String.class, String.class, String.class)
                    .getAnnotation(org.springframework.transaction.annotation.Transactional.class);
            assertThat(tx.noRollbackFor()).containsExactly(
                    nuri.business.domain.user.exception.CurrentPasswordMismatchException.class);
        }

        @Test
        @DisplayName("전용 횟수가 한도에 닿으면 잠그고 그 전에 발급된 세션 차수를 올린다")
        void locksAndAdvancesSessionCycleAtTheLimit() {
            userService.useLoginFailureLimits(5, 15);
            User user = createBaseUser("testUser").pswd("encodedOld").lckCnt(1).build();
            ReflectionTestUtils.setField(user, "pswdFailNmtm", BigInteger.valueOf(4));
            when(userRepository.findById("testUser")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("wrong", "encodedOld")).thenReturn(false);

            assertThatThrownBy(() -> userService.changePassword("testUser", "wrong", "newPassword"))
                    .isInstanceOf(nuri.business.domain.user.exception.CurrentPasswordMismatchException.class);

            assertThat(user.getLckCnt()).isEqualTo(1);
            assertThat(user).hasFieldOrPropertyWithValue("pswdFailNmtm", null);
            assertThat(user.isLocked()).isTrue();
            assertThat(user.getLckLastPnttm()).isNotNull();
            var order = inOrder(userRepository);
            order.verify(userRepository).save(user);
            order.verify(userRepository).advanceSessionCycle(java.util.List.of("ESNTL_testUser"));
            // 틀린 요청도 새 해시를 한 번 계산한다 — 맞힌 요청만 더 오래 걸리면 잠긴 뒤에도 응답 시간이 정답을 알린다.
            verify(passwordEncoder).encode("newPassword");
        }

        @Test
        @DisplayName("잠긴 동안 '현재=새 비밀번호' 대입은 맞혀도 같은 값 거절(400)이 아니라 비밀번호 불일치로 답한다 — 정답을 알리지 않는다")
        void sameValueGuessWhileLockedDoesNotRevealTheAnswer() {
            User user = createBaseUser("testUser").pswd("encodedOld").lckYn("Y").lckCnt(5)
                    .lckLastPnttm(java.time.LocalDateTime.now().minusMinutes(1)).build();
            when(userRepository.findById("testUser")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("guess", "encodedOld")).thenReturn(true);

            assertThatThrownBy(() -> userService.changePassword("testUser", "guess", "guess"))
                    .hasFieldOrPropertyWithValue("errorCode", UserErrorCode.INVALID_PASSWORD);

            assertThat(user.getPswd()).isEqualTo("encodedOld");
            assertThat(user.getLckCnt()).isEqualTo(5);
        }

        @Test
        @DisplayName("이미 잠긴 동안의 실패는 횟수도 잠금 시각도 바꾸지 않는다(고정창)")
        void doesNotExtendAnActiveLock() {
            java.time.LocalDateTime lockedAt = java.time.LocalDateTime.now().minusMinutes(1);
            User user = createBaseUser("testUser").pswd("encodedOld").lckYn("Y").lckCnt(5).lckLastPnttm(lockedAt).build();
            when(userRepository.findById("testUser")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("wrong", "encodedOld")).thenReturn(false);

            assertThatThrownBy(() -> userService.changePassword("testUser", "wrong", "newPassword"))
                    .isNotInstanceOf(nuri.business.domain.user.exception.CurrentPasswordMismatchException.class)
                    .hasFieldOrPropertyWithValue("errorCode", UserErrorCode.INVALID_PASSWORD);

            assertThat(user.getLckCnt()).isEqualTo(5);
            assertThat(user.getLckLastPnttm()).isEqualTo(lockedAt);
            verify(userRepository, never()).save(any());
            verify(userRepository, never()).advanceSessionCycle(anyList());
        }

        @Test
        @DisplayName("잠긴 동안에는 맞는 현재 비밀번호로도 바꾸지 못한다 — 동시 대입 요청이 잠금 뒤에 맞히는 경로를 막는다")
        void rejectsACorrectPasswordWhileLocked() {
            User user = createBaseUser("testUser").pswd("encodedOld").lckYn("Y").lckCnt(5)
                    .lckLastPnttm(java.time.LocalDateTime.now().minusMinutes(1)).build();
            when(userRepository.findById("testUser")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("oldPassword", "encodedOld")).thenReturn(true);
            when(passwordEncoder.encode("newPassword")).thenReturn("encodedNew");

            assertThatThrownBy(() -> userService.changePassword("testUser", "oldPassword", "newPassword"))
                    .hasFieldOrPropertyWithValue("errorCode", UserErrorCode.INVALID_PASSWORD);

            assertThat(user.getPswd()).isEqualTo("encodedOld");
            verify(refreshTokenRepository, never()).deleteAllByEsntlIdIn(anyList());
        }

        @Test
        @DisplayName("현재 비밀번호를 증명해 바꾸면 연속 실패 횟수를 지운다 — 잠금 시간이 지난 잠금도 풀린다")
        void successClearsTheFailureCount() {
            User user = createBaseUser("testUser").pswd("encodedOld").lckYn("Y").lckCnt(5)
                    .lckLastPnttm(java.time.LocalDateTime.now().minusMinutes(16)).build();
            when(userRepository.findById("testUser")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("oldPassword", "encodedOld")).thenReturn(true);
            when(passwordEncoder.encode("newPassword")).thenReturn("encodedNew");

            userService.changePassword("testUser", "oldPassword", "newPassword");

            assertThat(user.getPswd()).isEqualTo("encodedNew");
            assertThat(user.getLckCnt()).isZero();
            assertThat(user.isLocked()).isFalse();
        }

        @Test
        @DisplayName("기다리는 사이 비밀번호가 바뀌었으면 옛 해시와 대조한 실패라 세지 않는다")
        void doesNotCountAFailureAgainstAReplacedHash() {
            User user = createBaseUser("testUser").pswd("encodedOld").lckCnt(1).build();
            when(userRepository.findById("testUser")).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("wrong", "encodedOld")).thenReturn(false);
            doAnswer(invocation -> {
                org.springframework.test.util.ReflectionTestUtils.setField(user, "pswd", "encodedReset");
                return null;
            }).when(userRepository).refreshForUpdate(user);

            assertThatThrownBy(() -> userService.changePassword("testUser", "wrong", "newPassword"))
                    .isNotInstanceOf(nuri.business.domain.user.exception.CurrentPasswordMismatchException.class)
                    .hasFieldOrPropertyWithValue("errorCode", UserErrorCode.INVALID_PASSWORD);

            assertThat(user.getLckCnt()).isEqualTo(1);
            verify(userRepository, never()).save(any());
        }
    }

    @Test
    @DisplayName("사용자 삭제 성공 - 종속 데이터(권한매핑·토큰) 정리 후 이벤트 발행과 함께 삭제 (V2_12 FK 결속)")
    void deleteUser_success() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            String userId = "testUser";
            User user = createBaseUser(userId).build();
            when(userRepository.findByUserId(userId)).thenReturn(Optional.of(user));

            // When
            userService.deleteUser(userId);

            // Then — FK(NO ACTION)를 통과하려면 종속 정리가 삭제 전에 모두 수행되어야 한다
            verify(authorizationAdministration).removeDeletedUsers(java.util.List.of("ESNTL_" + userId));
            // [P2 키 규약] 단건 삭제도 esntlId IN bulk 계약을 사용하며 loginId/건별 삭제로 우회하지 않는다.
            verify(refreshTokenRepository).deleteAllByEsntlIdIn(java.util.List.of("ESNTL_" + userId));
            // [log-privacy] 사용통계 로그도 사용자 삭제 前 정리(FK 잠복결함 해소)
            verify(userLogRepository).deleteByDmndUserIdIn(java.util.List.of("ESNTL_" + userId));
            // [V2_32 결속] 부서업무는 부서 자산이라 삭제하지 않고 담당자만 공석(NULL)으로 해제한다.
            // 해제를 빠뜨리면 fk_tb_dept_task_info_tb_user_info(NO ACTION) 때문에 사용자 삭제 자체가 실패한다.
            verify(deptJobRepository).releasePicByPicIdIn(java.util.List.of("ESNTL_" + userId));
            var eventCaptor = org.mockito.ArgumentCaptor
                    .forClass(nuri.business.service.user.event.UserDeletionEvent.class);
            verify(eventPublisher).publishEvent(eventCaptor.capture());
            assertThat(eventCaptor.getValue().esntlIds()).containsExactly("ESNTL_" + userId);
            verify(userRepository).deleteAllInBatch(java.util.List.of(user));
            var order = inOrder(authorizationAdministration, userRepository, refreshTokenRepository, userLogRepository);
            order.verify(authorizationAdministration).lockAndAuthorize("USER_DELETE");
            order.verify(userRepository).lockForDeletion("ESNTL_" + userId);
            order.verify(authorizationAdministration).removeDeletedUsers(java.util.List.of("ESNTL_" + userId));
            order.verify(refreshTokenRepository).deleteAllByEsntlIdIn(java.util.List.of("ESNTL_" + userId));
            order.verify(userLogRepository).deleteByDmndUserIdIn(java.util.List.of("ESNTL_" + userId));
            order.verify(userRepository).deleteAllInBatch(java.util.List.of(user));
        }
    }

    @Test
    @DisplayName("사용자 삭제 실패 - 존재하지 않는 사용자")
    void deleteUser_fail_userNotFound() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            // Given
            String userId = "nonexistent";
            // When & Then
            assertThatThrownBy(() -> userService.deleteUser(userId))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", UserErrorCode.USER_NOT_FOUND);
        }
    }

    @Test
    @DisplayName("사용자 삭제 금지 - 시스템 관리자(webmaster)는 콘텐츠 재귀속 종착 계정이므로 삭제 불가")
    void deleteUser_fail_systemAdminProtected() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            User webmaster = User.builder()
                    .userId("webmaster")
                    .esntlId(nuri.foundation.constants.Constants.User.SYSTEM_ADMIN_ESNTL_ID)
                    .userNm("최고관리자")
                    .pswd("password")
                    .build();
            when(userRepository.findByUserId("webmaster")).thenReturn(Optional.of(webmaster));

            assertThatThrownBy(() -> userService.deleteUser("webmaster"))
                    .isInstanceOf(BusinessException.class);
            verify(userRepository, never()).deleteAllInBatch(anyList());
            verifyNoInteractions(authorizationAdministration, eventPublisher, sensitiveAudit,
                    refreshTokenRepository);
        }
    }

    @Test
    @DisplayName("사용자 일괄 삭제 - loginId 목록을 esntlId 로 해석해 실제 삭제 (기존 침묵 no-op 버그 회귀 방지)")
    void deleteUserList_resolvesLoginIdsToEsntlIds() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            User userA = createBaseUser("loginA").build();
            User userB = createBaseUser("loginB").build();
            when(userRepository.findByUserId("loginA")).thenReturn(Optional.of(userA));
            when(userRepository.findByUserId("loginB")).thenReturn(Optional.of(userB));

            // When — FE(UserOrgHubClient)는 loginId 목록을 보낸다
            userService.deleteUserList(java.util.List.of("loginB", "loginA"));

            // Then — PK(esntlId)로 확정된 실제 사용자들이 삭제되어야 한다
            verify(authorizationAdministration).removeDeletedUsers(java.util.List.of("ESNTL_loginB", "ESNTL_loginA"));
            verify(userRepository).deleteAllInBatch(java.util.List.of(userB, userA));
            verify(eventPublisher).publishEvent(any(nuri.business.service.user.event.UserDeletionEvent.class));
            var order = inOrder(authorizationAdministration, userRepository, refreshTokenRepository, userLogRepository);
            order.verify(authorizationAdministration).lockAndAuthorize("USER_DELETE");
            order.verify(userRepository).lockForDeletion("ESNTL_loginA");
            order.verify(userRepository).lockForDeletion("ESNTL_loginB");
            order.verify(authorizationAdministration).removeDeletedUsers(java.util.List.of("ESNTL_loginB", "ESNTL_loginA"));
            order.verify(refreshTokenRepository).deleteAllByEsntlIdIn(java.util.List.of("ESNTL_loginB", "ESNTL_loginA"));
            order.verify(userLogRepository).deleteByDmndUserIdIn(java.util.List.of("ESNTL_loginB", "ESNTL_loginA"));
            order.verify(userRepository).deleteAllInBatch(java.util.List.of(userB, userA));
        }
    }

    @Test
    @DisplayName("사용자 일괄 삭제 - 존재하지 않는 ID 는 멱등 의미론으로 건너뜀")
    void deleteUserList_skipsMissingIds() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            User userA = createBaseUser("loginA").build();
            when(userRepository.findByUserId("loginA")).thenReturn(Optional.of(userA));
            when(userRepository.findByUserId("ghost")).thenReturn(Optional.empty());
            when(userRepository.findById("ghost")).thenReturn(Optional.empty());

            userService.deleteUserList(java.util.List.of("loginA", "ghost"));

            verify(userRepository).deleteAllInBatch(java.util.List.of(userA));
        }
    }
}
