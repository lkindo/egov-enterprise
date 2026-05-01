package nuri.foundation.service.user;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.auth.UserAuthority;
import nuri.foundation.domain.auth.UserAuthorityRepository;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.service.user.dto.UserDto;
import nuri.foundation.service.user.dto.UserResponse;
import nuri.foundation.service.user.dto.UserSignupRequest;
import nuri.foundation.service.user.mapper.UserMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
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

    private User createTestUser() {
        return User.builder()
                .esntlId("E1")
                .userId("user1")
                .userNm("TestUser")
                .password("Pass1234!")
                .build();
    }

    @Test
    @DisplayName("사용자 목록 조회 - 캐시 무시 성능 개선 버전")
    void getUserList() {
        User user = createTestUser();
        UserAuthority auth = UserAuthority.builder().uniqId("E1").authorCode("ROLE_USER").build();
        Object[] result = new Object[]{user, auth};
        given(userRepository.findAllWithAuthorities()).willReturn(Collections.singletonList(result));
        given(userMapper.toDtoWithAuthority(any(), any())).willReturn(new UserDto());

        List<UserDto> list = userService.getUserList();

        assertThat(list).isNotNull();
        verify(userRepository).findAllWithAuthorities();
    }

    @Test
    @DisplayName("페이징된 사용자 목록 조회")
    void getPagedUserList() {
        UserDto userDto = new UserDto();
        given(userRepository.getPagedUserList(any(), any())).willReturn(new PageImpl<>(List.of(userDto)));

        Page<UserDto> result = userService.getUserPage(PageRequest.of(0, 10));

        assertThat(result).isNotNull();
        verify(userRepository).getPagedUserList(any(), any());
    }

    @Test
    @DisplayName("사용자 상세 조회 - 성공")
    void getUserById_Success() {
        User user = createTestUser();
        given(userRepository.findById("user1")).willReturn(Optional.of(user));
        given(userAuthorityRepository.findById("E1")).willReturn(Optional.empty());
        given(userMapper.toDtoWithAuthority(any(), any())).willReturn(new UserDto());

        UserDto dto = userService.getUserById("user1");

        assertThat(dto).isNotNull();
    }

    @Test
    @DisplayName("사용자 등록")
    void registerUser() {
        given(passwordEncoder.encode(anyString())).willReturn("encoded");
        
        String userId = userService.registerUser("user1", "Pass1234!", "TestUser", "Hint", "Answer", "USER");

        assertThat(userId).isEqualTo("user1");
        verify(userRepository).save(any(User.class));
        verify(userAuthorityRepository).save(any(UserAuthority.class));
    }

    @Test
    @DisplayName("사용자 정보 수정")
    void updateUser() {
        User user = mock(User.class);
        given(userRepository.findById("user1")).willReturn(Optional.of(user));

        userService.updateUser("user1", new UserDto());

        verify(user).update(any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("비밀번호 변경 - 성공")
    void changePassword_Success() {
        User user = createTestUser();
        given(userRepository.findById("user1")).willReturn(Optional.of(user));
        given(passwordEncoder.matches(anyString(), anyString())).willReturn(true);
        given(passwordEncoder.encode(anyString())).willReturn("new_encoded");

        userService.changePassword("user1", "Pass1234!", "NewPass1234!");

        assertThat(user.getPassword()).isEqualTo("new_encoded");
    }

    @Test
    @DisplayName("비밀번호 변경 - 실패 (기존 비밀번호 불일치)")
    void changePassword_Fail() {
        User user = createTestUser();
        given(userRepository.findById("user1")).willReturn(Optional.of(user));
        given(passwordEncoder.matches(anyString(), anyString())).willReturn(false);

        assertThrows(BusinessException.class, () -> userService.changePassword("user1", "wrong", "NewPass1234!"));
    }

    @Test
    @DisplayName("사용자 삭제")
    void deleteUser() {
        given(userRepository.existsById("user1")).willReturn(true);
        
        userService.deleteUser("user1");

        verify(userRepository).deleteById("user1");
    }

    @Test
    @DisplayName("회원가입 - 성공")
    void signup_Success() {
        UserSignupRequest req = UserSignupRequest.builder()
                .userId("user1")
                .password("Pass1234!")
                .userNm("TestUser")
                .role("USER")
                .passwordHint("Hint")
                .passwordCnsr("Ans")
                .build();
        given(userRepository.existsById("user1")).willReturn(false);
        given(passwordEncoder.encode(anyString())).willReturn("enc");
        given(userMapper.toResponse(any())).willReturn(UserResponse.builder().userId("user1").userNm("TestUser").role("USER").build());


        UserResponse resp = userService.signup(req);

        assertThat(resp.getUserId()).isEqualTo("user1");
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("아이디 중복 확인")
    void checkIdDplct() {
        given(userRepository.existsById("user1")).willReturn(true);
        assertThat(userService.checkIdDplct("user1")).isTrue();
    }
}
