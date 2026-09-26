package nuri.business.service.user;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.auth.UserAuthority;
import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.user.dto.UserDto;
import nuri.business.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService 단위 테스트")
class UserServiceTest {
    @org.junit.jupiter.api.AfterEach
    void clearAuthorization() { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }


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

    // [V2_32 결속] UserService 가 사용자 삭제 시 부서업무 담당자 참조를 해제한다.
    // 생성자에 required() 가드가 있어 mock 이 없으면 @InjectMocks 가 null 을 넣어 전 테스트가 즉사한다.
    @Mock
    private nuri.business.domain.deptjob.DeptJobRepository deptJobRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @Mock private nuri.business.domain.user.repository.DeptManageRepository deptManageRepository;
    @Mock private nuri.business.security.authorization.AuthorizationSnapshotService authorizationSnapshots;
    @Mock private nuri.business.service.auth.AuthorizationAdministrationService authorizationAdministration;

    @InjectMocks
    private UserService userService;

    @Test
    @DisplayName("사용자 목록 조회 테스트")
    void getUserListTest() {
        User user = User.builder()
                .userId("user1")
                .userNm("User 1")
                .esntlId("USR1")
                .pswd("password")
                .build();
        
        UserAuthority authority = UserAuthority.builder()
                .scrtyDcsnTrgtId("USR1")
                .authrtId("ROLE_USER")
                .build();
        
        List<Object[]> list = new ArrayList<>();
        list.add(new Object[]{user, authority});
        
        given(userRepository.findAllWithAuthorities()).willReturn(list);
        given(authorizationSnapshots.loadAll(java.util.Set.of("USR1"))).willReturn(java.util.Map.of("USR1",new nuri.business.security.authorization.AuthorizationSnapshotService.Snapshot(List.of("ROLE_USER"),List.of(),"version")));

        List<UserDto> result = userService.getUserList();

        assertNotNull(result);
        verify(userRepository).findAllWithAuthorities();
    }

    @Test
    @DisplayName("사용자 상세 조회 테스트")
    void getUserByIdTest() {
        User user = User.builder()
                .userId("USR1")
                .userNm("User 1")
                .esntlId("USR1")
                .pswd("password")
                .build();
        
        given(userRepository.findById("USR1")).willReturn(Optional.of(user));
        given(authorizationSnapshots.load("USR1")).willReturn(new nuri.business.security.authorization.AuthorizationSnapshotService.Snapshot(List.of(),List.of(),"empty"));

        UserDto result = userService.getUserById("USR1");

        assertNotNull(result);
    }

    @Test
    @DisplayName("사용자 등록 테스트 - 성공")
    void registerUserSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            given(userRepository.findByUserId("testuser")).willReturn(Optional.empty());
            given(passwordEncoder.encode(anyString())).willReturn("encodedPassword");
            
            String userId = userService.registerUser(UserDto.builder().userId("testuser").pswd("password").userNm("홍길동").pswdHint(null).pswdCrans(null).role("USER").build());

            assertEquals("testuser", userId);
            verify(userRepository).saveAndFlush(any());
            verify(authorizationAdministration).lockAndAuthorize("USER_CREATE");
            verify(authorizationAdministration).assignNewUser(anyString());
        }
    }

    @Test
    @DisplayName("등록 권한이 잠금 대기 중 회수되면 계정과 기본 그룹을 저장하지 않는다")
    void registerUserRejectsRevocationAfterAdministrationLock() {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
        assertTrue(nuri.business.security.util.SecurityUtil.hasPermission("USER_CREATE"));
        var revoked = new BusinessException(nuri.foundation.core.exception.CommonErrorCode.ACCESS_DENIED);
        doThrow(revoked).when(authorizationAdministration).lockAndAuthorize("USER_CREATE");

        var actual = assertThrows(BusinessException.class, () -> userService.registerUser(
                UserDto.builder().userId("newuser").pswd("ValidPass123!").userNm("New user").role("USER").build()));

        assertSame(revoked, actual);
        verify(authorizationAdministration).lockAndAuthorize("USER_CREATE");
        verifyNoMoreInteractions(authorizationAdministration);
        verifyNoInteractions(userRepository, userAuthorityRepository, passwordEncoder, eventPublisher);
    }

    /**
     * 🚨 [2026-08-11 회귀 방어] 등록이 입력값을 **버리지 않는지**.
     *
     * <p>종전 registerUser 는 User.builder() 에 7개 필드만 넣었다
     * (userId·pswd·userNm·esntlId·pswdHint·pswdCrans·role). 그래서 관리자가 등록 폼에 채운
     * <b>이메일·연락처·소속 부서가 오류 없이 사라졌다</b> — 성공 토스트까지 뜬 채로.
     *
     * <p>⚠ 위 registerUserSuccessTest 가 이것을 잡지 못한 이유: {@code verify(userRepository).saveAndFlush(any())}
     * 는 "저장이 호출됐다"만 본다. <b>무엇을 저장했는지는 보지 않는다.</b> 그래서 필드를 통째로
     * 버려도 그린이었다. 여기서는 ArgumentCaptor 로 <b>저장된 엔티티의 값</b>을 직접 확인한다.
     *
     * <p>이 공백이 실제로 낳은 2차 피해: 갓 만든 사용자는 항상 이메일이 없었고, 그것이
     * {@code UserDto.emlAddr} 의 @Pattern 이 빈 문자열을 거부하던 문제와 겹쳐
     * "등록은 되는데 수정은 영원히 400" 이라는 증상을 만들었다(E2E 로 확인, 2026-08-11).
     */
    @Test
    @DisplayName("사용자 등록 - 폼이 보낸 이메일·연락처·소속 부서가 실제로 저장된다 (입력값 유실 회귀 방어)")
    void registerUser_persistsOptionalProfileFields() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            given(userRepository.findByUserId("newuser")).willReturn(Optional.empty());
            given(passwordEncoder.encode(anyString())).willReturn("encodedPassword");
            // 소속 부서는 실재해야 저장된다(2026-09-17) — tb_user_info.ognz_id 에 물리 FK 가 없어
            //   종전에는 존재하지 않는 부서도 그대로 저장됐다.
            given(deptManageRepository.existsById("ORGNZT_0000000000001")).willReturn(true);

            // 등록 폼(UserManageForm, create 모드)이 실제로 보내는 필드 집합이다.
            userService.registerUser(UserDto.builder()
                    .userId("newuser")
                    .pswd("ValidPass123!")
                    .userNm("홍길동")
                    .emlAddr("newuser@egov.kr")
                    .mblTelno("01012345678")
                    .ognzId("ORGNZT_0000000000001")
                    .role("USER")
                    .build());

            org.mockito.ArgumentCaptor<User> saved = org.mockito.ArgumentCaptor.forClass(User.class);
            verify(userRepository).saveAndFlush(saved.capture());

            assertEquals("newuser@egov.kr", saved.getValue().getEmlAddr(), "이메일이 저장되지 않았다");
            assertEquals("01012345678", saved.getValue().getMblTelno(), "연락처가 저장되지 않았다");
            assertEquals("ORGNZT_0000000000001", saved.getValue().getOgnzId(), "소속 부서가 저장되지 않았다");
        }
    }

    /**
     * [2026-09-17] "소속 없음" 은 빈 문자열이 아니라 NULL 로 저장돼야 한다.
     *
     * <p>등록 폼의 {@code <option value="">소속 없음 / GLOBAL</option>} 은 빈 문자열을 보내고,
     * E2E 가 캡처한 실제 요청 본문도 {@code "ognzId":""} 다. 빈 문자열은 NULL 이 아니므로
     * V2_102 가 추가한 {@code fk_tb_user_info_tb_ognz_info} 가 그것을 <b>거부한다</b> —
     * 정규화가 빠지면 소속 없는 사용자를 아예 등록할 수 없게 된다.
     */
    @Test
    @DisplayName("사용자 등록 - 소속 없음(빈 문자열)은 NULL 로 저장한다")
    void registerUser_storesBlankDepartmentAsNull() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            given(userRepository.findByUserId("nodept")).willReturn(Optional.empty());
            given(passwordEncoder.encode(anyString())).willReturn("encodedPassword");

            userService.registerUser(UserDto.builder()
                    .userId("nodept")
                    .pswd("ValidPass123!")
                    .userNm("무소속")
                    .ognzId("")
                    .role("USER")
                    .build());

            org.mockito.ArgumentCaptor<User> saved = org.mockito.ArgumentCaptor.forClass(User.class);
            verify(userRepository).saveAndFlush(saved.capture());
            assertNull(saved.getValue().getOgnzId(), "빈 문자열 소속이 그대로 저장되면 FK 가 등록을 거부한다");
        }
    }

    @Test
    @DisplayName("사용자 등록 테스트 - 실패 (ID 중복)")
    void registerUserDuplicateIdTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            given(userRepository.findByUserId("testuser")).willReturn(Optional.of(mock(User.class)));
            
            assertThrows(BusinessException.class, () ->
                userService.registerUser(UserDto.builder().userId("testuser").pswd("password").userNm("홍길동").pswdHint(null).pswdCrans(null).role("USER").build()));
        }
    }

    /**
     * [2026-09-14] access token subject 는 esntlId 이고 인증 어댑터는 그 값을 로그인 ID 로 먼저 찾는다.
     * 기존 사용자의 esntlId 와 같은 로그인 ID 를 만들 수 있으면 그 사용자의 토큰이 새 계정으로 해석된다.
     * 초기 관리자 식별자는 관리자 등록 ID 규칙(영문·숫자·밑줄 4~20자)을 그대로 통과한다.
     */
    @Test
    @DisplayName("사용자 등록 - 기존 사용자의 내부 식별자와 같은 로그인 ID 는 중복으로 거부한다")
    void registerUserRejectsLoginIdEqualToExistingEsntlId() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            String adminEsntlId = nuri.foundation.constants.Constants.User.SYSTEM_ADMIN_ESNTL_ID;
            given(userRepository.findByUserId(adminEsntlId)).willReturn(Optional.empty());
            given(userRepository.existsById(adminEsntlId)).willReturn(true);

            var error = assertThrows(BusinessException.class, () -> userService.registerUser(
                    UserDto.builder().userId(adminEsntlId).pswd("password").userNm("홍길동").role("USER").build()));

            assertEquals(nuri.business.domain.user.exception.UserErrorCode.DUPLICATE_USER_ID, error.getErrorCode());
            verify(userRepository, never()).saveAndFlush(any());
        }
    }

    @Test
    @DisplayName("비밀번호 변경 테스트 - 성공")
    void changePasswordSuccessTest() {
        User user = mock(User.class);
        given(user.getEsntlId()).willReturn("USR_ESNTL_1");
        given(userRepository.findById("user1")).willReturn(Optional.of(user));
        given(user.getPswd()).willReturn("oldEncoded");

        given(passwordEncoder.matches("old", "oldEncoded")).willReturn(true);
        given(passwordEncoder.encode("new")).willReturn("newEncoded");

        assertDoesNotThrow(() -> userService.changePassword("user1", "old", "new"));
        verify(user).updatePassword("newEncoded");
        verify(refreshTokenRepository).deleteAllByEsntlIdIn(List.of("USR_ESNTL_1"));
    }

    @Test
    @DisplayName("비밀번호 변경 테스트 - 실패 (비밀번호 불일치)")
    void changePasswordFailTest() {
        User user = mock(User.class);
        given(userRepository.findById("user1")).willReturn(Optional.of(user));
        given(user.getPswd()).willReturn("oldEncoded");
        
        given(passwordEncoder.matches("wrong", "oldEncoded")).willReturn(false);

        assertThrows(BusinessException.class, () -> userService.changePassword("user1", "wrong", "new"));
    }

    @Test
    @DisplayName("사용자 정보 수정 테스트 - 본인 성공")
    void updateUserSelfSuccessTest() {
        User user = mock(User.class);
        given(userRepository.findById("user1")).willReturn(Optional.of(user));
        // 소유권 가드는 esntlId 축으로 비교한다. 대상 사용자의 esntlId 를 세워야 '본인' 이 성립한다.
        given(user.getEsntlId()).willReturn("user1");

        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("user1"));
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_USER"));
            
            userService.updateUser("user1", UserDto.builder().build());
            verify(user).update(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
        }
    }

    @Test
    @DisplayName("사용자 정보 수정 테스트 - 타인 실패")
    void updateUserOtherFailTest() {
        User user = mock(User.class);
        given(userRepository.findById("user2")).willReturn(Optional.of(user));
        
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(nuri.business.security.util.SecurityUtil::getCurrentEsntlId).thenReturn(Optional.of("user1"));
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_USER"));
            
            assertThrows(BusinessException.class, () -> userService.updateUser("user2", UserDto.builder().build()));
        }
    }

    @Test
    @DisplayName("등록: 가입일자를 Asia/Seoul 오늘(yyyyMMdd)로 기록한다")
    void registerUserStampsSignupDate() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            given(userRepository.findByUserId("dated")).willReturn(Optional.empty());
            given(passwordEncoder.encode(anyString())).willReturn("encodedPassword");
            // 고정 시계는 CI 실행 시각과 무관하게 같은 값을 준다(e2e 날짜 폭탄과 같은 함정 방지).
            userService.useSignupClock(java.time.Clock.fixed(java.time.Instant.parse("2026-09-23T00:30:00Z"), java.time.ZoneId.of("Asia/Seoul")));

            userService.registerUser(UserDto.builder().userId("dated").pswd("password").userNm("홍길동").role("USER").build());

            var saved = org.mockito.ArgumentCaptor.forClass(User.class);
            verify(userRepository).saveAndFlush(saved.capture());
            assertEquals("20260923", saved.getValue().getSbscrbYmd());
        }
    }

    @Test
    @DisplayName("가입: 가입일자는 시계의 시간대(Asia/Seoul) 기준 날짜다 — UTC 로 세면 하루 어긋나는 경계")
    void signupStampsSignupDateInSeoul() {
        UserSignupRequest request = UserSignupRequest.builder().userId("dated2").pswd("password").userNm("신규유저").build();
        given(userRepository.findByUserId("dated2")).willReturn(Optional.empty());
        given(passwordEncoder.encode(anyString())).willReturn("encoded");
        // UTC 2026-09-22 20:00 = KST 2026-09-23 05:00 — 시간대를 무시하면 22일로 기록된다.
        userService.useSignupClock(java.time.Clock.fixed(java.time.Instant.parse("2026-09-22T20:00:00Z"), java.time.ZoneId.of("Asia/Seoul")));

        userService.signup(request);

        var saved = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(saved.capture());
        assertEquals("20260923", saved.getValue().getSbscrbYmd());
    }

    @Test
    @DisplayName("회원가입 테스트")
    void signupTest() {
        UserSignupRequest request = UserSignupRequest.builder()
                .userId("newuser")
                .pswd("password")
                .userNm("신규유저")
                .build();

        given(userRepository.findByUserId("newuser")).willReturn(Optional.empty());
        given(passwordEncoder.encode(anyString())).willReturn("encoded");

        userService.signup(request);
        verify(userRepository).saveAndFlush(any());
    }

    @Test
    @DisplayName("사용자 목록 페이지 조회")
    void getPagedUserListTest() {
        Page<UserDto> page = Page.empty();
        given(userRepository.getPagedUserList(anyString(), any())).willReturn(page);
        
        Page<UserDto> result = userService.getPagedUserList("search", org.springframework.data.domain.PageRequest.of(0, 10));
        assertNotNull(result);
    }

    @Test
    @DisplayName("사용자 목록 페이지 조회 (검색어 없음)")
    void getUserPageTest() {
        Page<UserDto> page = Page.empty();
        given(userRepository.getPagedUserList(isNull(), any())).willReturn(page);
        
        Page<UserDto> result = userService.getUserPage(org.springframework.data.domain.PageRequest.of(0, 10));
        assertNotNull(result);
    }

    @Test
    @DisplayName("사용자 목록 페이지 조회 (기본 페이징 적용)")
    void searchUserPageTest() {
        Page<UserDto> page = Page.empty();
        given(userRepository.getPagedUserList(eq("search"), any())).willReturn(page);
        
        Page<UserDto> result = userService.searchUserPage("search");
        assertNotNull(result);
    }

    @Test
    @DisplayName("사용자 삭제 테스트 - 관리자 성공")
    void deleteUserSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            User user = mock(User.class);
            given(user.getEsntlId()).willReturn("USR_TEST_ESNTL_0001");
            given(user.getUserId()).willReturn("user1");
            given(userRepository.findByUserId("user1")).willReturn(Optional.of(user));

            userService.deleteUser("user1");
            // [V2_12] 종속 정리(권한매핑) 후 일괄 삭제로 전환됨
            verify(authorizationAdministration).removeDeletedUsers(List.of("USR_TEST_ESNTL_0001"));
            verify(userRepository).deleteAllInBatch(List.of(user));
        }
    }

    @Test
    @DisplayName("사용자 삭제 테스트 - 관리자 권한 없음")
    void deleteUserNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_USER"));
            
            assertThrows(BusinessException.class, () -> userService.deleteUser("user1"));
        }
    }

    @Test
    @DisplayName("사용자 삭제 테스트 - 존재하지 않음")
    void deleteUserNotFoundTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            given(userRepository.findByUserId("user1")).willReturn(Optional.empty());
            given(userRepository.existsById("user1")).willReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.deleteUser("user1"));
        }
    }

    @Test
    @DisplayName("사용자 다중 삭제 - 성공")
    void deleteUserListSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            User user1 = mock(User.class);
            User user2 = mock(User.class);
            given(user1.getEsntlId()).willReturn("USR_TEST_ESNTL_0001");
            given(user2.getEsntlId()).willReturn("USR_TEST_ESNTL_0002");
            given(userRepository.findByUserId("user1")).willReturn(Optional.of(user1));
            given(userRepository.findByUserId("user2")).willReturn(Optional.of(user2));

            userService.deleteUserList(List.of("user1", "user2"));
            // [V2_12] loginId → 사용자 확정 후 종속 정리를 거쳐 일괄 삭제 (기존 PK 불일치 no-op 버그 수정)
            verify(refreshTokenRepository).deleteAllByEsntlIdIn(
                    List.of("USR_TEST_ESNTL_0001", "USR_TEST_ESNTL_0002"));
            verify(refreshTokenRepository, never()).deleteByUserId(anyString());
            verify(userRepository).deleteAllInBatch(List.of(user1, user2));
        }
    }

    @Test
    @DisplayName("사용자 상태 다중 변경 - 성공")
    void updateUsersStatusSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            User user = mock(User.class);
            given(userRepository.findByUserIdIn(List.of("user1"))).willReturn(List.of(user));
            
            userService.updateUsersStatus(List.of("user1"), "ACTIVE");
            verify(user).updateStatus("ACTIVE");
            verify(userRepository).saveAllAndFlush(List.of(user));
            verify(userRepository, never()).findAllById(anyList());
        }
    }

    @Test
    @DisplayName("사용자 상태 다중 변경 - loginId 일부가 없으면 부분 성공하지 않는다")
    void updateUsersStatusRejectsUnknownLoginIdTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            User existing = mock(User.class);
            given(userRepository.findByUserIdIn(List.of("user1", "missing"))).willReturn(List.of(existing));

            BusinessException error = assertThrows(BusinessException.class,
                    () -> userService.updateUsersStatus(List.of("user1", "missing"), "ACTIVE"));

            assertSame(nuri.business.domain.user.exception.UserErrorCode.USER_NOT_FOUND, error.getErrorCode());
            verify(existing, never()).updateStatus(anyString());
            verify(userRepository, never()).saveAll(anyList());
        }
    }

    @Test
    @DisplayName("사용자 부서 다중 변경 - 성공")
    void moveUsersToDeptSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            User user = mock(User.class);
            given(userRepository.findByUserIdIn(List.of("user1"))).willReturn(List.of(user));
            given(deptManageRepository.existsById("DEPT1")).willReturn(true);

            userService.moveUsersToDept(List.of("user1"), "DEPT1");
            verify(authorizationAdministration).lockAndAuthorize("USER_DEPT");
            verify(user).updateOrgnztId("DEPT1");
            verify(userRepository).saveAll(List.of(user));
        }
    }

    @Test
    @DisplayName("부서 이동 권한이 잠금 대기 중 회수되면 사용자 조회와 변경을 시작하지 않는다")
    void moveUsersToDeptRejectsRevocationAfterAdministrationLock() {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
        assertTrue(nuri.business.security.util.SecurityUtil.hasPermission("USER_DEPT"));
        var revoked = new BusinessException(nuri.foundation.core.exception.CommonErrorCode.ACCESS_DENIED);
        doThrow(revoked).when(authorizationAdministration).lockAndAuthorize("USER_DEPT");

        var actual = assertThrows(BusinessException.class,
                () -> userService.moveUsersToDept(List.of("user1"), "DEPT1"));

        assertSame(revoked, actual);
        verify(authorizationAdministration).lockAndAuthorize("USER_DEPT");
        verifyNoMoreInteractions(authorizationAdministration);
        verifyNoInteractions(userRepository, userAuthorityRepository, eventPublisher);
    }

    @Test
    @DisplayName("퇴역 단일 역할 변경 API는 배정 데이터에 쓰지 않는다")
    void legacyRoleMutationIsRejectedWithoutWrites() {
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
            nuri.business.support.AuthorizationTestPrincipal.authentication("fixture","FIXTURE_ESNTL","ROLE_ADMIN"));
        for (var role:nuri.business.domain.user.entity.Role.values()) {
            var error=assertThrows(BusinessException.class,() -> userService.updateUsersRole(List.of("user1"),role));
            assertEquals(nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE,error.getErrorCode());
        }
        verifyNoInteractions(userRepository,userAuthorityRepository,authorizationAdministration);
    }

    @Test
    @DisplayName("관리자 비밀번호 변경 - 성공")
    void updatePasswordByAdminSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            User user = mock(User.class);
            given(user.getEsntlId()).willReturn("USR_ESNTL_1");
            given(userRepository.findById("user1")).willReturn(Optional.of(user));
            given(passwordEncoder.encode("newpwd")).willReturn("encoded");

            userService.updatePasswordByAdmin("user1", "newpwd");
            verify(user).updatePassword("encoded");
            // [DIP B4 P7, D5] 초기화는 잠금도 푼다 — 잠긴 채면 새 비밀번호로도 잠금 시간이 지날 때까지 못 들어온다.
            verify(user).unlockAccount();
            // 관리자 초기화도 이전 자격으로 발급된 refresh token 을 남기지 않는다.
            verify(refreshTokenRepository).deleteAllByEsntlIdIn(List.of("USR_ESNTL_1"));
        }
    }

    @Test
    @DisplayName("[DIP B4 P7] 계정 잠금 해제는 USER_STATUS 권한자만 하고 비밀번호·세션은 건드리지 않는다")
    void unlockUserTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            User user = User.builder().userId("user1").esntlId("USR_ESNTL_1").userNm("잠긴 사용자").pswd("{bcrypt}x")
                    .lckYn("Y").lckCnt(5).build();
            given(userRepository.findByUserId("user1")).willReturn(Optional.of(user));

            userService.unlockUser("user1");

            assertFalse(user.isLocked());
            assertEquals(0, user.getLckCnt());
            verify(refreshTokenRepository, never()).deleteAllByEsntlIdIn(any());

            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_USER"));
            assertThrows(BusinessException.class, () -> userService.unlockUser("user1"));
        }
    }

    @Test
    @DisplayName("ID 중복 체크")
    void checkIdDplctTest() {
        given(userRepository.findByUserId("user1")).willReturn(Optional.of(mock(User.class)));
        assertTrue(userService.checkIdDplct("user1"));
    }

    @Test
    @DisplayName("사용자 등록은 알 수 없는 역할 요청을 거부한다")
    void registerUserInvalidRoleTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            given(userRepository.findByUserId("testuser")).willReturn(Optional.empty());
            given(passwordEncoder.encode(anyString())).willReturn("encodedPassword");
            
            var error=assertThrows(BusinessException.class,() -> userService.registerUser(UserDto.builder().userId("testuser").pswd("password").userNm("홍길동").role("INVALID_ROLE").build()));
            assertEquals(nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE,error.getErrorCode());
            verify(userRepository,never()).saveAndFlush(any());
            verify(authorizationAdministration,never()).assignNewUser(anyString());
        }
    }

    @Test
    @DisplayName("사용자 등록 테스트 - 관리자 권한 없음")
    void registerUserNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_USER"));
            
            assertThrows(BusinessException.class, () -> 
                userService.registerUser(UserDto.builder().userId("testuser").pswd("password").userNm("홍길동").pswdHint(null).pswdCrans(null).role("USER").build()));
        }
    }

    @Test
    @DisplayName("사용자 다중 삭제 - 관리자 권한 없음")
    void deleteUserListNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_USER"));
            
            assertThrows(BusinessException.class, () -> userService.deleteUserList(List.of("user1", "user2")));
        }
    }

    @Test
    @DisplayName("관리자 비밀번호 변경 - 관리자 권한 없음")
    void updatePasswordByAdminNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_USER"));
            
            assertThrows(BusinessException.class, () -> userService.updatePasswordByAdmin("user1", "newpwd"));
            verify(refreshTokenRepository, never()).deleteAllByEsntlIdIn(anyList());
        }
    }

    @Test
    @DisplayName("사용자 상태 다중 변경 - 관리자 권한 없음")
    void updateUsersStatusNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_USER"));
            
            assertThrows(BusinessException.class, () -> userService.updateUsersStatus(List.of("user1"), "ACTIVE"));
        }
    }

    @Test
    @DisplayName("사용자 부서 다중 변경 - 관리자 권한 없음")
    void moveUsersToDeptNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_USER"));
            
            assertThrows(BusinessException.class, () -> userService.moveUsersToDept(List.of("user1"), "DEPT1"));
        }
    }

    @Test
    @DisplayName("사용자 역할 다중 변경 - 관리자 권한 없음")
    void updateUsersRoleNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_USER"));
            
            assertThrows(BusinessException.class, () -> userService.updateUsersRole(List.of("user1"), nuri.business.domain.user.entity.Role.ADMIN));
        }
    }

    @Test
    @DisplayName("사용자 정보 조회 - 존재하지 않는 사용자 ID")
    void getUserByIdNotFoundTest() {
        given(userRepository.findByUserId("unknown")).willReturn(Optional.empty());
        given(userRepository.findById("unknown")).willReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> userService.getUserById("unknown"));
    }

    @Test
    @DisplayName("사용자 등록 테스트 - 롤 파라미터가 null/empty인 경우")
    void registerUserEmptyRoleTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            given(userRepository.findByUserId("testuser2")).willReturn(Optional.empty());
            given(passwordEncoder.encode(anyString())).willReturn("encodedPassword");
            
            // roleName = ""
            String userId = userService.registerUser(UserDto.builder().userId("testuser2").pswd("password").userNm("홍길동").pswdHint(null).pswdCrans(null).role("").build());

            assertEquals("testuser2", userId);
            verify(userRepository).saveAndFlush(any());
        }
    }
    /**
     * 소속 부서 참조 무결성. [2026-09-17]
     *
     * <p>{@code tb_user_info.ognz_id} 에는 물리 FK 가 없다. 삭제 방향은 부서 삭제 가드가 닫고 있지만
     * 쓰기 방향은 열려 있어 존재하지 않는 부서를 그대로 저장할 수 있었다.
     *
     * <p>⚠ 검사 대상은 <b>요청이 실제로 보낸 값</b>이고, 그것도 <b>기존과 다를 때만</b>이다.
     * 해석된 결과값을 검사하면 이미 고아 소속을 가진 사용자가 이름·연락처조차 고치지 못한다 —
     * {@code /users/me} 경계는 소속을 역직렬화하지 않아 본인에게는 빠져나올 수단이 아예 없다.
     */
    @Test
    @DisplayName("존재하지 않는 부서로는 등록·일괄 이동이 거부되고, 기존 소속을 그대로 둔 수정은 통과한다")
    void departmentReferenceIsValidatedOnlyForChangedRequestValues() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    nuri.business.support.AuthorizationTestPrincipal.authentication("fixture", "FIXTURE_ESNTL", "ROLE_ADMIN"));
            given(userRepository.findByUserId("newuser")).willReturn(Optional.empty());
            given(passwordEncoder.encode(anyString())).willReturn("encodedPassword");
            given(deptManageRepository.existsById("GHOST_DEPT")).willReturn(false);

            // (가) 등록 — 없는 부서는 거부한다.
            var register = UserDto.builder().userId("newuser").pswd("ValidPass123!").userNm("홍길동")
                    .ognzId("GHOST_DEPT").role("USER").build();
            BusinessException rejected = assertThrows(BusinessException.class,
                    () -> userService.registerUser(register));
            assertEquals(nuri.foundation.core.exception.CommonErrorCode.RESOURCE_NOT_FOUND, rejected.getErrorCode());
            verify(userRepository, never()).saveAndFlush(org.mockito.ArgumentMatchers.any());

            // (나) 일괄 이동 — 사용자 조회조차 시작하지 않는다.
            assertThrows(BusinessException.class,
                    () -> userService.moveUsersToDept(List.of("user1"), "GHOST_DEPT"));
            verify(userRepository, never()).saveAll(org.mockito.ArgumentMatchers.anyList());

            // (다) 대조군 — 기존 고아 소속을 그대로 왕복시키는 수정은 막지 않는다.
            //     이 단언이 깨지면 고아 소속 사용자가 이름조차 고치지 못하게 된 것이다.
            User existing = User.builder().userId("orphan").userNm("기존").esntlId("ESNTL_ORPHAN")
                    .ognzId("GHOST_DEPT").role(nuri.business.domain.user.entity.Role.USER).build();
            given(userRepository.findByUserId("orphan")).willReturn(Optional.of(existing));
            userService.updateUser("orphan", UserDto.builder().userNm("바뀐 이름")
                    .ognzId("GHOST_DEPT").build());
            assertEquals("바뀐 이름", existing.getUserNm(), "고아 소속 때문에 이름 수정이 막혔다");
        }
    }
}
