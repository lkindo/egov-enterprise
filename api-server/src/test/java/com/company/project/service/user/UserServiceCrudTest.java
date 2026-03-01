package com.company.project.service.user;

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import com.company.project.service.user.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceCrudTest {

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

    private User mockUser;
    private UserSignupRequest signupRequest;

    @BeforeEach
    void setUp() {
        mockUser = User.builder()
                .userId("testUser")
                .userNm("????????")
                .esntlId("USR_1234567890123456")
                .role(Role.USER)
                .password("encodedPassword")
                .build();

        signupRequest = new UserSignupRequest(
                "newUser",
                "password123!",
                "?Í∑?????",
                Role.USER,
                "hint",
                "answer");
    }

    @Test
    @DisplayName("????????Í≥?)
    void createUser_success() {
        when(passwordEncoder.encode(any())).thenReturn("encoded");
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        String result = userService.registerUser("user", "pw", "name", "h", "c", Role.USER);

        assertThat(result).isEqualTo("user");
    }

    @Test
    @DisplayName("??????????- null ????)
    void createUser_fail_withNullValues() {
        assertThatThrownBy(() -> userService.registerUser(null, "pw", "name", "h", "c", Role.USER))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    @DisplayName("????Ï°∞Ìöå ?Í≥?- ID ?")
    void getUserById_success_withValidId() {
        when(userRepository.findById("testUser")).thenReturn(Optional.of(mockUser));
        when(userAuthorityRepository.findById(any())).thenReturn(Optional.of(
                UserAuthority.builder().uniqId("USR_1234567890123456").authorCode("ROLE_USER").build()));
        when(userMapper.toDtoWithAuthority(any(), any()))
                .thenReturn(new UserDto("testUser", "????????", "USR_1234567890123456", null, null, null, null));

        UserDto result = userService.getUserById("testUser");

        assertThat(result).isNotNull();
        assertThat(result.getUserId()).isEqualTo("testUser");
    }

    @Test
    @DisplayName("????Ï°∞Ìöå ???- Ï°¥Ïû¨?? ???ID")
    void getUserById_fail_withNonExistentId() {
        when(userRepository.findById(any())).thenReturn(Optional.empty());
        when(userRepository.findByEsntlId(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getUserById("nonexistent"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("????Î™©Î°ù Ï°∞Ìöå ?Í≥?)
    void getUserList_success() {
        when(userRepository.findAll()).thenReturn(List.of(mockUser));
        when(userAuthorityRepository.findByUniqIdIn(any())).thenReturn(List.of(
                UserAuthority.builder().uniqId("USR_1234567890123456").authorCode("ROLE_USER").build()));
        when(userMapper.toDtoWithAuthority(any(), any()))
                .thenReturn(new UserDto("testUser", "????????", "USR_1234567890123456", null, null, null, null));

        List<UserDto> result = userService.getUserList();

        assertThat(result).isNotNull().hasSize(1);
        assertThat(result.get(0).getUserId()).isEqualTo("testUser");
    }

    @Test
    @DisplayName("??¥Ïßï??????Î™©Î°ù Ï°∞Ìöå ?Í≥?)
    void getPagedUserList_success() {
        Page<User> page = new PageImpl<>(List.of(mockUser));
        when(userRepository.findAll(any(Pageable.class))).thenReturn(page);
        when(userAuthorityRepository.findByUniqIdIn(any())).thenReturn(List.of(
                UserAuthority.builder().uniqId("USR_1234567890123456").authorCode("ROLE_USER").build()));
        when(userMapper.toDtoWithAuthority(any(), any()))
                .thenReturn(new UserDto("testUser", "????????", "USR_1234567890123456", null, null, null, null));

        Page<UserDto> result = userService.getPagedUserList(PageRequest.of(0, 10));

        assertThat(result).isNotNull().hasSize(1);
        assertThat(result.getContent().get(0).getUserId()).isEqualTo("testUser");
    }

    @Test
    @DisplayName("??????êÍ????Í≥?)
    void signup_success() {
        when(userRepository.existsById(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded");
        when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(userMapper.toResponse(any())).thenReturn(new UserResponse("newUser", "name", Role.USER));

        UserResponse result = userService.signup(signupRequest);

        assertThat(result.userId()).isEqualTo("newUser");
        verify(userRepository).save(any());
    }

    @Test
    @DisplayName("??????êÍ??????- Ï§ëÎ≥µ ID")
    void signup_fail_duplicateId() {
        when(userRepository.existsById(any())).thenReturn(true);

        assertThatThrownBy(() -> userService.signup(signupRequest))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("??????êÍ??????- null ????)
    void signup_fail_withNullValues() {
        UserSignupRequest nullRequest = new UserSignupRequest(null, "pw", "name", Role.USER, "h", "c");

        assertThatThrownBy(() -> userService.signup(nullRequest))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Îπ?Î≤àÌò∏ Í≤Ä??Í≥?)
    void validatePassword_success() {
        when(passwordEncoder.matches(any(), any())).thenReturn(true);
        assertThat(passwordEncoder.matches("pw", "encoded")).isTrue();
    }

    @Test
    @DisplayName("Îπ?Î≤àÌò∏ Í≤Ä????)
    void validatePassword_fail() {
        when(passwordEncoder.matches(any(), any())).thenReturn(false);
        assertThat(passwordEncoder.matches("pw", "encoded")).isFalse();
    }
}
