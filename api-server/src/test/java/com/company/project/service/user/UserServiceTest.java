package com.company.project.service.user;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import com.company.project.service.user.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;

import static org.mockito.Mockito.*;

/**
 * UserService ??????
 */
@ExtendWith(MockitoExtension.class)
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

  private User mockUser;
  private UserSignupRequest signupRequest;

  @BeforeEach
  void setUp() {
    mockUser = User.builder()
        .userId("testUser")
        .userNm("DB 서비스")
        .esntlId("USR_1234567890123456")
        .role(Role.USER)
        .build();

    signupRequest = new UserSignupRequest(
        "newUser",
        "password123",
        "???????",
        Role.USER,
        "hint",
        "answer");
  }

  @Test
  @DisplayName("????嶺뚮ㅄ維뽨빳??브퀗??????)")
  void getUserList_success() {
    // Given
    List<User> userList = Arrays.asList(mockUser);
    when(userRepository.findAll()).thenReturn(userList);

    // When
    List<UserDto> result = userService.getUserList();

    // Then
    assertThat(result).hasSize(1);
    assertThat(result.get(0).getUserId()).isEqualTo("testUser");
    assertThat(result.get(0).getUserNm()).isEqualTo("DB 서비스");
  }

  @Test
  @DisplayName("???醫롫윪壤??????嶺뚮ㅄ維뽨빳??브퀗??????)")
  void getPagedUserList_success() {
    // Given
    List<User> userList = Arrays.asList(mockUser);
    Page<User> userPage = new PageImpl<>(userList);
    PageRequest pageable = PageRequest.of(0, 10);
    when(userRepository.findAll(pageable)).thenReturn(userPage);

    // When
    Page<UserDto> result = userService.getPagedUserList(pageable);

    // Then
    assertThat(result).hasSize(1);
    assertThat(result.getContent().get(0).getUserId()).isEqualTo("testUser");
  }

  @Test
  @DisplayName("????ID?????브퀗??????- userId リ옇?↑?)")
  void getUserById_success_withUserId() {
    // Given
    when(userRepository.findById("testUser")).thenReturn(Optional.of(mockUser));

    // When
    UserDto result = userService.getUserById("testUser");

    // Then
    assertThat(result.getUserId()).isEqualTo("testUser");
    assertThat(result.getUserNm()).isEqualTo("DB 서비스");
  }

  @Test
  @DisplayName("????ID?????브퀗??????- esntlId リ옇?↑?)")
  void getUserById_success_withEsntlId() {
    // Given
    when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());
    when(userRepository.findByEsntlId("USR_1234567890123456")).thenReturn(Optional.of(mockUser));

    // When
    UserDto result = userService.getUserById("USR_1234567890123456");

    // Then
    assertThat(result.getUserId()).isEqualTo("testUser");
    assertThat(result.getEsntlId()).isEqualTo("USR_1234567890123456");
  }

  @Test
  @DisplayName("????ID?????브퀗??????- ??????)")
  void getUserById_fail_userNotFound() {
    // Given
    when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());
    when(userRepository.findByEsntlId("nonexistent")).thenReturn(Optional.empty());

    // When & Then
    assertThatThrownBy(() -> userService.getUserById("nonexistent"))
        .isInstanceOf(BusinessException.class)
        .hasFieldOrPropertyWithValue("errorCode", ErrorCode.USER_NOT_FOUND);
  }

  @Test
  @DisplayName("DB 서비스??)")
  void registerUser_success() {
    // Given
    String userId = "newUser";
    String password = "password123";
    String userNm = "???????";
    String passwordHint = "hint";
    String passwordCnsr = "answer";
    Role role = Role.ADMIN;

    String encodedPassword = "encodedPassword";
    when(passwordEncoder.encode(password)).thenReturn(encodedPassword);
    when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

    // When
    String result = userService.registerUser(userId, password, userNm, passwordHint, passwordCnsr, role);

    // Then
    assertThat(result).isEqualTo(userId);

    ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(userCaptor.capture());

    User savedUser = userCaptor.getValue();
    assertThat(savedUser.getUserId()).isEqualTo(userId);
    assertThat(savedUser.getPassword()).isEqualTo(encodedPassword);
    assertThat(savedUser.getUserNm()).isEqualTo(userNm);
    assertThat(savedUser.getRole()).isEqualTo(role);
    assertThat(savedUser.getEsntlId()).startsWith("USR_");
  }

  @Test
  @DisplayName("???탈퇴???)")
  void signup_success() {
    // Given
    when(userRepository.existsById("newUser")).thenReturn(false);
    String encodedPassword = "encodedPassword";
    when(passwordEncoder.encode("password123")).thenReturn(encodedPassword);
    when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

    // When
    UserResponse result = userService.signup(signupRequest);

    // Then
    assertThat(result.userId()).isEqualTo("newUser");
    assertThat(result.userNm()).isEqualTo("???????");

    ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(userCaptor.capture());

    User savedUser = userCaptor.getValue();
    assertThat(savedUser.getUserId()).isEqualTo("newUser");
    assertThat(savedUser.getPassword()).isEqualTo(encodedPassword);
    assertThat(savedUser.getUserNm()).isEqualTo("???????");
    assertThat(savedUser.getRole()).isEqualTo(Role.USER); // Default role
    assertThat(savedUser.getEsntlId()).startsWith("USR_");
  }

  @Test
  @DisplayName("???탈퇴???- 중복ID")
  void signup_fail_duplicateUserId() {
    // Given
    when(userRepository.existsById("newUser")).thenReturn(true);

    // When & Then
    assertThatThrownBy(() -> userService.signup(signupRequest))
        .isInstanceOf(BusinessException.class)
        .hasFieldOrPropertyWithValue("errorCode", ErrorCode.DUPLICATE_USER_ID);
  }

  @Test
  @DisplayName("비밀번호?검색?)")
  void verifyPassword_success() {
    // Given
    when(passwordEncoder.matches("rawPassword", "encodedPassword")).thenReturn(true);

    // When
    boolean result = userService.verifyPassword("rawPassword", "encodedPassword");

    // Then
    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("비밀번호?검색?)")
  void verifyPassword_fail() {
    // Given
    when(passwordEncoder.matches("wrongPassword", "encodedPassword")).thenReturn(false);

    // When
    boolean result = userService.verifyPassword("wrongPassword", "encodedPassword");

    // Then
    assertThat(result).isFalse();
  }
}
