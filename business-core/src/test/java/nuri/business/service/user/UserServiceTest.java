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
        given(userAuthorityRepository.findById("USR1")).willReturn(Optional.empty());

        UserDto result = userService.getUserById("USR1");

        assertNotNull(result);
    }

    @Test
    @DisplayName("사용자 등록 테스트 - 성공")
    void registerUserSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            given(userRepository.findByUserId("testuser")).willReturn(Optional.empty());
            given(passwordEncoder.encode(anyString())).willReturn("encodedPassword");
            
            String userId = userService.registerUser(UserDto.builder().userId("testuser").pswd("password").userNm("홍길동").pswdHint(null).pswdCrans(null).role("USER").build());

            assertEquals("testuser", userId);
            verify(userRepository).save(any());
            verify(userAuthorityRepository).save(any());
        }
    }

    /**
     * 🚨 [2026-08-11 회귀 방어] 등록이 입력값을 **버리지 않는지**.
     *
     * <p>종전 registerUser 는 User.builder() 에 7개 필드만 넣었다
     * (userId·pswd·userNm·esntlId·pswdHint·pswdCrans·role). 그래서 관리자가 등록 폼에 채운
     * <b>이메일·연락처·소속 부서가 오류 없이 사라졌다</b> — 성공 토스트까지 뜬 채로.
     *
     * <p>⚠ 위 registerUserSuccessTest 가 이것을 잡지 못한 이유: {@code verify(userRepository).save(any())}
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
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            given(userRepository.findByUserId("newuser")).willReturn(Optional.empty());
            given(passwordEncoder.encode(anyString())).willReturn("encodedPassword");

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
            verify(userRepository).save(saved.capture());

            assertEquals("newuser@egov.kr", saved.getValue().getEmlAddr(), "이메일이 저장되지 않았다");
            assertEquals("01012345678", saved.getValue().getMblTelno(), "연락처가 저장되지 않았다");
            assertEquals("ORGNZT_0000000000001", saved.getValue().getOgnzId(), "소속 부서가 저장되지 않았다");
        }
    }

    @Test
    @DisplayName("사용자 등록 테스트 - 실패 (ID 중복)")
    void registerUserDuplicateIdTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            given(userRepository.findByUserId("testuser")).willReturn(Optional.of(mock(User.class)));
            
            assertThrows(BusinessException.class, () -> 
                userService.registerUser(UserDto.builder().userId("testuser").pswd("password").userNm("홍길동").pswdHint(null).pswdCrans(null).role("USER").build()));
        }
    }

    @Test
    @DisplayName("비밀번호 변경 테스트 - 성공")
    void changePasswordSuccessTest() {
        User user = mock(User.class);
        given(userRepository.findById("user1")).willReturn(Optional.of(user));
        given(user.getPswd()).willReturn("oldEncoded");
        
        given(passwordEncoder.matches("old", "oldEncoded")).willReturn(true);
        given(passwordEncoder.encode("new")).willReturn("newEncoded");

        assertDoesNotThrow(() -> userService.changePassword("user1", "old", "new"));
        verify(user).updatePassword("newEncoded");
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
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
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
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.updateUser("user2", UserDto.builder().build()));
        }
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
        verify(userRepository).save(any());
    }

    @Test
    @DisplayName("사용자 목록 페이지 조회")
    void getPagedUserListTest() {
        @SuppressWarnings("unchecked")
        Page<UserDto> page = mock(Page.class);
        given(userRepository.getPagedUserList(anyString(), any())).willReturn(page);
        
        Page<UserDto> result = userService.getPagedUserList("search", org.springframework.data.domain.PageRequest.of(0, 10));
        assertNotNull(result);
    }

    @Test
    @DisplayName("사용자 목록 페이지 조회 (검색어 없음)")
    void getUserPageTest() {
        @SuppressWarnings("unchecked")
        Page<UserDto> page = mock(Page.class);
        given(userRepository.getPagedUserList(isNull(), any())).willReturn(page);
        
        Page<UserDto> result = userService.getUserPage(org.springframework.data.domain.PageRequest.of(0, 10));
        assertNotNull(result);
    }

    @Test
    @DisplayName("사용자 목록 페이지 조회 (기본 페이징 적용)")
    void searchUserPageTest() {
        @SuppressWarnings("unchecked")
        Page<UserDto> page = mock(Page.class);
        given(userRepository.getPagedUserList(eq("search"), any())).willReturn(page);
        
        Page<UserDto> result = userService.searchUserPage("search");
        assertNotNull(result);
    }

    @Test
    @DisplayName("사용자 삭제 테스트 - 관리자 성공")
    void deleteUserSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User user = mock(User.class);
            given(user.getEsntlId()).willReturn("USR_TEST_ESNTL_0001");
            given(user.getUserId()).willReturn("user1");
            given(userRepository.findByUserId("user1")).willReturn(Optional.of(user));

            userService.deleteUser("user1");
            // [V2_12] 종속 정리(권한매핑) 후 일괄 삭제로 전환됨
            verify(userAuthorityRepository).deleteAllByIdInBatch(List.of("USR_TEST_ESNTL_0001"));
            verify(userRepository).deleteAllInBatch(List.of(user));
        }
    }

    @Test
    @DisplayName("사용자 삭제 테스트 - 관리자 권한 없음")
    void deleteUserNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.deleteUser("user1"));
        }
    }

    @Test
    @DisplayName("사용자 삭제 테스트 - 존재하지 않음")
    void deleteUserNotFoundTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            given(userRepository.findByUserId("user1")).willReturn(Optional.empty());
            given(userRepository.existsById("user1")).willReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.deleteUser("user1"));
        }
    }

    @Test
    @DisplayName("사용자 다중 삭제 - 성공")
    void deleteUserListSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User user1 = mock(User.class);
            User user2 = mock(User.class);
            given(user1.getEsntlId()).willReturn("USR_TEST_ESNTL_0001");
            given(user2.getEsntlId()).willReturn("USR_TEST_ESNTL_0002");
            given(userRepository.findByUserId("user1")).willReturn(Optional.of(user1));
            given(userRepository.findByUserId("user2")).willReturn(Optional.of(user2));

            userService.deleteUserList(List.of("user1", "user2"));
            // [V2_12] loginId → 사용자 확정 후 종속 정리를 거쳐 일괄 삭제 (기존 PK 불일치 no-op 버그 수정)
            verify(userRepository).deleteAllInBatch(List.of(user1, user2));
        }
    }

    @Test
    @DisplayName("사용자 상태 다중 변경 - 성공")
    void updateUsersStatusSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User user = mock(User.class);
            given(userRepository.findByUserIdIn(List.of("user1"))).willReturn(List.of(user));
            
            userService.updateUsersStatus(List.of("user1"), "ACTIVE");
            verify(user).updateStatus("ACTIVE");
            verify(userRepository).saveAll(List.of(user));
            verify(userRepository, never()).findAllById(anyList());
        }
    }

    @Test
    @DisplayName("사용자 상태 다중 변경 - loginId 일부가 없으면 부분 성공하지 않는다")
    void updateUsersStatusRejectsUnknownLoginIdTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
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
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User user = mock(User.class);
            given(userRepository.findByUserIdIn(List.of("user1"))).willReturn(List.of(user));
            
            userService.moveUsersToDept(List.of("user1"), "DEPT1");
            verify(user).updateOrgnztId("DEPT1");
            verify(userRepository).saveAll(List.of(user));
        }
    }

    @Test
    @DisplayName("사용자 역할 다중 변경 - 성공 (기존 권한 있음)")
    void updateUsersRoleSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User user = mock(User.class);
            given(user.getEsntlId()).willReturn("ESNTL1");
            given(userRepository.findByUserIdIn(List.of("user1"))).willReturn(List.of(user));
            UserAuthority auth = mock(UserAuthority.class);
            given(auth.getScrtyDcsnTrgtId()).willReturn("ESNTL1");
            given(userAuthorityRepository.findAllById(anyList())).willReturn(List.of(auth));

            userService.updateUsersRole(List.of("user1"), nuri.business.domain.user.entity.Role.ADMIN);
            verify(user).changeRole(nuri.business.domain.user.entity.Role.ADMIN);
            verify(auth).update(eq("ROLE_ADMIN"), any());
            verify(userRepository).saveAll(anyList());
            verify(userRepository, never()).findAllById(anyList());
        }
    }

    @Test
    @DisplayName("사용자 역할 다중 변경 - 성공 (기존 권한 없음)")
    void updateUsersRoleNoExistingAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User user = mock(User.class);
            given(user.getEsntlId()).willReturn("ESNTL1");
            given(userRepository.findByUserIdIn(List.of("user1"))).willReturn(List.of(user));
            given(userAuthorityRepository.findAllById(anyList())).willReturn(List.of());

            userService.updateUsersRole(List.of("user1"), nuri.business.domain.user.entity.Role.ADMIN);
            verify(user).changeRole(nuri.business.domain.user.entity.Role.ADMIN);
            verify(userAuthorityRepository).saveAll(anyList());
            verify(userRepository).saveAll(anyList());
        }
    }

    @Test
    @DisplayName("관리자 비밀번호 변경 - 성공")
    void updatePasswordByAdminSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User user = mock(User.class);
            given(userRepository.findById("user1")).willReturn(Optional.of(user));
            given(passwordEncoder.encode("newpwd")).willReturn("encoded");
            
            userService.updatePasswordByAdmin("user1", "newpwd");
            verify(user).updatePassword("encoded");
        }
    }

    @Test
    @DisplayName("ID 중복 체크")
    void checkIdDplctTest() {
        given(userRepository.findByUserId("user1")).willReturn(Optional.of(mock(User.class)));
        assertTrue(userService.checkIdDplct("user1"));
    }

    @Test
    @DisplayName("사용자 등록 테스트 - 잘못된 역할 이름으로 폴백")
    void registerUserInvalidRoleTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            given(userRepository.findByUserId("testuser")).willReturn(Optional.empty());
            given(passwordEncoder.encode(anyString())).willReturn("encodedPassword");
            
            String userId = userService.registerUser(UserDto.builder().userId("testuser").pswd("password").userNm("홍길동").pswdHint(null).pswdCrans(null).role("INVALID_ROLE").build());

            assertEquals("testuser", userId);
            verify(userRepository).save(any());
        }
    }

    @Test
    @DisplayName("사용자 등록 테스트 - 관리자 권한 없음")
    void registerUserNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> 
                userService.registerUser(UserDto.builder().userId("testuser").pswd("password").userNm("홍길동").pswdHint(null).pswdCrans(null).role("USER").build()));
        }
    }

    @Test
    @DisplayName("사용자 다중 삭제 - 관리자 권한 없음")
    void deleteUserListNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.deleteUserList(List.of("user1", "user2")));
        }
    }

    @Test
    @DisplayName("관리자 비밀번호 변경 - 관리자 권한 없음")
    void updatePasswordByAdminNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.updatePasswordByAdmin("user1", "newpwd"));
        }
    }

    @Test
    @DisplayName("사용자 상태 다중 변경 - 관리자 권한 없음")
    void updateUsersStatusNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.updateUsersStatus(List.of("user1"), "ACTIVE"));
        }
    }

    @Test
    @DisplayName("사용자 부서 다중 변경 - 관리자 권한 없음")
    void moveUsersToDeptNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.moveUsersToDept(List.of("user1"), "DEPT1"));
        }
    }

    @Test
    @DisplayName("사용자 역할 다중 변경 - 관리자 권한 없음")
    void updateUsersRoleNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class, org.mockito.Mockito.CALLS_REAL_METHODS)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
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
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            given(userRepository.findByUserId("testuser2")).willReturn(Optional.empty());
            given(passwordEncoder.encode(anyString())).willReturn("encodedPassword");
            
            // roleName = ""
            String userId = userService.registerUser(UserDto.builder().userId("testuser2").pswd("password").userNm("홍길동").pswdHint(null).pswdCrans(null).role("").build());

            assertEquals("testuser2", userId);
            verify(userRepository).save(any());
        }
    }
}
