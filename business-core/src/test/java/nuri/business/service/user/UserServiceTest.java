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
    private PasswordEncoder passwordEncoder;

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
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            given(userRepository.findByUserId("testuser")).willReturn(Optional.empty());
            given(passwordEncoder.encode(anyString())).willReturn("encodedPassword");
            
            String userId = userService.registerUser("testuser", "password", "홍길동", null, null, "USER");

            assertEquals("testuser", userId);
            verify(userRepository).save(any());
            verify(userAuthorityRepository).save(any());
        }
    }

    @Test
    @DisplayName("사용자 등록 테스트 - 실패 (ID 중복)")
    void registerUserDuplicateIdTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            given(userRepository.findByUserId("testuser")).willReturn(Optional.of(mock(User.class)));
            
            assertThrows(BusinessException.class, () -> 
                userService.registerUser("testuser", "password", "홍길동", null, null, "USER"));
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
        
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(nuri.business.security.util.SecurityUtil::getCurrentUserId).thenReturn(Optional.of("user1"));
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
        
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(nuri.business.security.util.SecurityUtil::getCurrentUserId).thenReturn(Optional.of("user1"));
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
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User user = mock(User.class);
            given(userRepository.findByUserId("user1")).willReturn(Optional.of(user));
            
            userService.deleteUser("user1");
            verify(userRepository).delete(user);
        }
    }

    @Test
    @DisplayName("사용자 삭제 테스트 - 관리자 권한 없음")
    void deleteUserNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.deleteUser("user1"));
        }
    }

    @Test
    @DisplayName("사용자 삭제 테스트 - 존재하지 않음")
    void deleteUserNotFoundTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            given(userRepository.findByUserId("user1")).willReturn(Optional.empty());
            given(userRepository.existsById("user1")).willReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.deleteUser("user1"));
        }
    }

    @Test
    @DisplayName("사용자 다중 삭제 - 성공")
    void deleteUserListSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            
            userService.deleteUserList(List.of("user1", "user2"));
            verify(userRepository).deleteAllByIdInBatch(anyList());
        }
    }

    @Test
    @DisplayName("사용자 상태 다중 변경 - 성공")
    void updateUsersStatusSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User user = mock(User.class);
            given(userRepository.findAllById(anyList())).willReturn(List.of(user));
            
            userService.updateUsersStatus(List.of("user1"), "ACTIVE");
            verify(user).updateStatus("ACTIVE");
            verify(userRepository).saveAll(anyList());
        }
    }

    @Test
    @DisplayName("사용자 부서 다중 변경 - 성공")
    void moveUsersToDeptSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User user = mock(User.class);
            given(userRepository.findAllById(anyList())).willReturn(List.of(user));
            
            userService.moveUsersToDept(List.of("user1"), "DEPT1");
            verify(user).updateOrgnztId("DEPT1");
            verify(userRepository).saveAll(anyList());
        }
    }

    @Test
    @DisplayName("사용자 역할 다중 변경 - 성공 (기존 권한 있음)")
    void updateUsersRoleSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User user = mock(User.class);
            given(user.getEsntlId()).willReturn("ESNTL1");
            given(userRepository.findAllById(anyList())).willReturn(List.of(user));
            UserAuthority auth = mock(UserAuthority.class);
            given(auth.getScrtyDcsnTrgtId()).willReturn("ESNTL1");
            given(userAuthorityRepository.findAllById(anyList())).willReturn(List.of(auth));

            userService.updateUsersRole(List.of("user1"), nuri.business.domain.user.entity.Role.ADMIN);
            verify(user).changeRole(nuri.business.domain.user.entity.Role.ADMIN);
            verify(auth).update(eq("ROLE_ADMIN"), any());
            verify(userRepository).saveAll(anyList());
        }
    }

    @Test
    @DisplayName("사용자 역할 다중 변경 - 성공 (기존 권한 없음)")
    void updateUsersRoleNoExistingAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            User user = mock(User.class);
            given(user.getEsntlId()).willReturn("ESNTL1");
            given(userRepository.findAllById(anyList())).willReturn(List.of(user));
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
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
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
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            given(userRepository.findByUserId("testuser")).willReturn(Optional.empty());
            given(passwordEncoder.encode(anyString())).willReturn("encodedPassword");
            
            String userId = userService.registerUser("testuser", "password", "홍길동", null, null, "INVALID_ROLE");

            assertEquals("testuser", userId);
            verify(userRepository).save(any());
        }
    }

    @Test
    @DisplayName("사용자 등록 테스트 - 관리자 권한 없음")
    void registerUserNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> 
                userService.registerUser("testuser", "password", "홍길동", null, null, "USER"));
        }
    }

    @Test
    @DisplayName("사용자 다중 삭제 - 관리자 권한 없음")
    void deleteUserListNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.deleteUserList(List.of("user1", "user2")));
        }
    }

    @Test
    @DisplayName("관리자 비밀번호 변경 - 관리자 권한 없음")
    void updatePasswordByAdminNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.updatePasswordByAdmin("user1", "newpwd"));
        }
    }

    @Test
    @DisplayName("사용자 상태 다중 변경 - 관리자 권한 없음")
    void updateUsersStatusNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.updateUsersStatus(List.of("user1"), "ACTIVE"));
        }
    }

    @Test
    @DisplayName("사용자 부서 다중 변경 - 관리자 권한 없음")
    void moveUsersToDeptNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.moveUsersToDept(List.of("user1"), "DEPT1"));
        }
    }

    @Test
    @DisplayName("사용자 역할 다중 변경 - 관리자 권한 없음")
    void updateUsersRoleNoAuthTest() {
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
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
        try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
            given(userRepository.findByUserId("testuser2")).willReturn(Optional.empty());
            given(passwordEncoder.encode(anyString())).willReturn("encodedPassword");
            
            // roleName = ""
            String userId = userService.registerUser("testuser2", "password", "홍길동", null, null, "");

            assertEquals("testuser2", userId);
            verify(userRepository).save(any());
        }
    }
}
