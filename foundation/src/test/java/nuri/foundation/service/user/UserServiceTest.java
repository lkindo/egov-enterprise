package nuri.foundation.service.user;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.auth.UserAuthority;
import nuri.foundation.domain.auth.UserAuthorityRepository;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.service.user.dto.UserDto;
import nuri.foundation.service.user.dto.UserSignupRequest;
import nuri.foundation.service.user.mapper.UserMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private UserService userService;

    @Test
    @DisplayName("사용자 목록 조회 테스트")
    void getUserListTest() {
        User user = mock(User.class);
        given(user.getEsntlId()).willReturn("USR1");
        
        UserAuthority authority = mock(UserAuthority.class);
        given(authority.getUniqId()).willReturn("USR1");
        
        List<Object[]> list = new ArrayList<>();
        list.add(new Object[]{user, authority});
        
        given(userRepository.findAllWithAuthorities()).willReturn(list);
        lenient().when(userMapper.toDtoWithAuthority(any(), any())).thenReturn(new UserDto());

        List<UserDto> result = userService.getUserList();

        assertNotNull(result);
        verify(userRepository).findAllWithAuthorities();
    }

    @Test
    @DisplayName("사용자 상세 조회 테스트")
    void getUserByIdTest() {
        User user = mock(User.class);
        given(user.getEsntlId()).willReturn("USR1");
        
        given(userRepository.findById("USR1")).willReturn(Optional.of(user));
        given(userAuthorityRepository.findById("USR1")).willReturn(Optional.empty());
        lenient().when(userMapper.toDtoWithAuthority(any(), any())).thenReturn(new UserDto());

        UserDto result = userService.getUserById("USR1");

        assertNotNull(result);
    }

    @Test
    @DisplayName("사용자 등록 테스트 - 성공")
    void registerUserSuccessTest() {
        try (var mockedSecurity = mockStatic(nuri.foundation.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.foundation.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
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
        try (var mockedSecurity = mockStatic(nuri.foundation.security.util.SecurityUtil.class)) {
            mockedSecurity.when(() -> nuri.foundation.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
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
        given(user.getPassword()).willReturn("oldEncoded");
        
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
        given(user.getPassword()).willReturn("oldEncoded");
        
        given(passwordEncoder.matches("wrong", "oldEncoded")).willReturn(false);

        assertThrows(BusinessException.class, () -> userService.changePassword("user1", "wrong", "new"));
    }

    @Test
    @DisplayName("사용자 정보 수정 테스트 - 본인 성공")
    void updateUserSelfSuccessTest() {
        User user = mock(User.class);
        given(userRepository.findById("user1")).willReturn(Optional.of(user));
        
        try (var mockedSecurity = mockStatic(nuri.foundation.security.util.SecurityUtil.class)) {
            mockedSecurity.when(nuri.foundation.security.util.SecurityUtil::getCurrentUserId).thenReturn(Optional.of("user1"));
            mockedSecurity.when(() -> nuri.foundation.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            userService.updateUser("user1", new UserDto());
            verify(user).update(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
        }
    }

    @Test
    @DisplayName("사용자 정보 수정 테스트 - 타인 실패")
    void updateUserOtherFailTest() {
        User user = mock(User.class);
        given(userRepository.findById("user2")).willReturn(Optional.of(user));
        
        try (var mockedSecurity = mockStatic(nuri.foundation.security.util.SecurityUtil.class)) {
            mockedSecurity.when(nuri.foundation.security.util.SecurityUtil::getCurrentUserId).thenReturn(Optional.of("user1"));
            mockedSecurity.when(() -> nuri.foundation.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(false);
            
            assertThrows(BusinessException.class, () -> userService.updateUser("user2", new UserDto()));
        }
    }

    @Test
    @DisplayName("회원가입 테스트")
    void signupTest() {
        UserSignupRequest request = UserSignupRequest.builder()
                .userId("newuser")
                .password("password")
                .userNm("신규유저")
                .build();

        given(userRepository.existsById("newuser")).willReturn(false);
        given(passwordEncoder.encode(anyString())).willReturn("encoded");
        lenient().when(userMapper.toResponse(any())).thenReturn(null);

        userService.signup(request);

        verify(userRepository).save(any());
    }
}
