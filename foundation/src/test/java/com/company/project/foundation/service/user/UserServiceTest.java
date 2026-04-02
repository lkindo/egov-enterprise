package com.company.project.foundation.service.user;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.domain.user.entity.Role;
import com.company.project.foundation.domain.user.entity.User;
import com.company.project.foundation.domain.user.repository.UserRepository;
import com.company.project.foundation.domain.auth.UserAuthorityRepository;
import com.company.project.foundation.service.user.dto.UserDto;
import com.company.project.foundation.service.user.dto.UserResponse;
import com.company.project.foundation.service.user.dto.UserSignupRequest;
import com.company.project.foundation.service.user.mapper.UserMapper;
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
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * UserService Í∏∞Îä• ?åÏä§??
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
        .userNm("?åÏä§?∏ÏÇ¨?©Ïûê")
        .esntlId("USR_1234567890123456")
        .role(Role.USER)
        .password("encodedPassword")
        .build();

    signupRequest = new UserSignupRequest(
        "newUser",
        "password123!",
        "?†Í∑ú?¨Ïö©??,
        Role.USER,
        "hint",
        "answer");
  }

  @Test
  @DisplayName("?ÑÏ≤¥ ?¨Ïö©??Î™©Î°ù Ï°∞Ìöå ?åÏä§??)
  void getUserList_success() {
    // Given
    List<User> userList = Arrays.asList(mockUser);
    when(userRepository.findAll()).thenReturn(userList);
    lenient().when(userAuthorityRepository.findByUniqIdIn(anyList())).thenReturn(List.of());
    lenient().when(userMapper.toDtoWithAuthority(any(User.class), any())).thenReturn(UserDto.builder()
        .userId("testUser")
        .userNm("?åÏä§?∏ÏÇ¨?©Ïûê")
        .esntlId("USR_1234567890123456")
        .build());

    // When
    List<UserDto> result = userService.getUserList();

    // Then
    assertThat(result).hasSize(1);
    assertThat(result.get(0).getUserId()).isEqualTo("testUser");
    assertThat(result.get(0).getUserNm()).isEqualTo("?åÏä§?∏ÏÇ¨?©Ïûê");
  }

  @Test
  @DisplayName("?òÏù¥ÏßïÎêú ?¨Ïö©??Î™©Î°ù Ï°∞Ìöå ?åÏä§??)
  void getPagedUserList_success() {
    // Given
    List<User> userList = Arrays.asList(mockUser);
    PageRequest pageable = PageRequest.of(0, 10);
    Page<User> userPage = new PageImpl<>(userList, pageable, userList.size());
    when(userRepository.findAll(pageable)).thenReturn(userPage);
    lenient().when(userAuthorityRepository.findByUniqIdIn(anyList())).thenReturn(List.of());
    lenient().when(userMapper.toDtoWithAuthority(any(User.class), any())).thenReturn(UserDto.builder()
        .userId("testUser")
        .userNm("?åÏä§?∏ÏÇ¨?©Ïûê")
        .esntlId("USR_1234567890123456")
        .build());

    // When
    Page<UserDto> result = userService.getPagedUserList(pageable);

    // Then
    assertThat(result).hasSize(1);
    assertThat(result.getContent().get(0).getUserId()).isEqualTo("testUser");
  }

  @Test
  @DisplayName("?¨Ïö©???®Í±¥ Ï°∞Ìöå ?åÏä§??- userId Í∏∞Ï?")
  void getUserById_success_withUserId() {
    // Given
    when(userRepository.findById("testUser")).thenReturn(Optional.of(mockUser));
    lenient().when(userAuthorityRepository.findById(anyString())).thenReturn(Optional.empty());
    lenient().when(userMapper.toDtoWithAuthority(any(User.class), any())).thenReturn(UserDto.builder()
        .userId("testUser")
        .userNm("?åÏä§?∏ÏÇ¨?©Ïûê")
        .esntlId("USR_1234567890123456")
        .build());

    // When
    UserDto result = userService.getUserById("testUser");

    // Then
    assertThat(result.getUserId()).isEqualTo("testUser");
    assertThat(result.getUserNm()).isEqualTo("?åÏä§?∏ÏÇ¨?©Ïûê");
  }

  @Test
  @DisplayName("?¨Ïö©???®Í±¥ Ï°∞Ìöå ?åÏä§??- esntlId Í∏∞Ï?")
  void getUserById_success_withEsntlId() {
    // Given
    when(userRepository.findById("USR_1234567890123456")).thenReturn(Optional.empty());
    when(userRepository.findByEsntlId("USR_1234567890123456")).thenReturn(Optional.of(mockUser));
    lenient().when(userAuthorityRepository.findById(anyString())).thenReturn(Optional.empty());
    lenient().when(userMapper.toDtoWithAuthority(any(User.class), any())).thenReturn(UserDto.builder()
        .userId("testUser")
        .userNm("?åÏä§?∏ÏÇ¨?©Ïûê")
        .esntlId("USR_1234567890123456")
        .build());

    // When
    UserDto result = userService.getUserById("USR_1234567890123456");

    // Then
    assertThat(result.getUserId()).isEqualTo("testUser");
    assertThat(result.getEsntlId()).isEqualTo("USR_1234567890123456");
  }

  @Test
  @DisplayName("?¨Ïö©???®Í±¥ Ï°∞Ìöå ?§Ìå® - Ï°¥Ïû¨?òÏ? ?äÎäî ?¨Ïö©??)
  void getUserById_fail_userNotFound() {
    // Given
    when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());
    lenient().when(userRepository.findByEsntlId("nonexistent")).thenReturn(Optional.empty());

    // When & Then
    assertThatThrownBy(() -> userService.getUserById("nonexistent"))
        .isInstanceOf(BusinessException.class)
        .hasFieldOrPropertyWithValue("errorCode", ErrorCode.USER_NOT_FOUND);
  }

  @Test
  @DisplayName("?†Í∑ú ?¨Ïö©???±Î°ù ?åÏä§??)
  void registerUser_success() {
    // Given
    String userId = "newUser";
    String password = "password123!";
    String userNm = "?†Í∑ú?±Î°ù?¨Ïö©??;
    String passwordHint = "hint";
    String passwordCnsr = "answer";
    Role role = Role.ADMIN;

    String encodedPassword = "encodedPassword";
    when(passwordEncoder.encode(password)).thenReturn(encodedPassword);
    lenient().when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
    lenient().when(userAuthorityRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    // When
    String result = userService.registerUser(userId, password, userNm, passwordHint, passwordCnsr, role);

    // Then
    assertThat(result).isEqualTo(userId);

    ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(userCaptor.capture());

    User savedUser = userCaptor.getValue();
    assertThat(savedUser.getUserId()).isEqualTo(userId);
    assertThat(savedUser.getPassword()).isEqualTo(encodedPassword);
    assertThat(savedUser.getUserNm()).isEqualTo("?†Í∑ú?±Î°ù?¨Ïö©??);
    assertThat(savedUser.getRole()).isEqualTo(role);
    assertThat(savedUser.getEsntlId()).startsWith("USR_");
  }

  @Test
  @DisplayName("?åÏõêÍ∞Ä???îÏ≤≠ Ï≤òÎ¶¨ ?åÏä§??)
  void signup_success() {
    // Given
    when(userRepository.existsById("newUser")).thenReturn(false);
    String encodedPassword = "encodedPassword";
    when(passwordEncoder.encode("password123!")).thenReturn(encodedPassword);
    lenient().when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
    lenient().when(userAuthorityRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    when(userMapper.toResponse(any())).thenReturn(new UserResponse("newUser", "?†Í∑ú?¨Ïö©??, Role.USER));

    // When
    UserResponse result = userService.signup(signupRequest);

    // Then
    assertThat(result.userId()).isEqualTo("newUser");
    assertThat(result.userNm()).isEqualTo("?†Í∑ú?¨Ïö©??);

    ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(userCaptor.capture());

    User savedUser = userCaptor.getValue();
    assertThat(savedUser.getUserId()).isEqualTo("newUser");
    assertThat(savedUser.getPassword()).isEqualTo(encodedPassword);
    assertThat(savedUser.getUserNm()).isEqualTo("?†Í∑ú?¨Ïö©??);
    assertThat(savedUser.getRole()).isEqualTo(Role.USER);
    assertThat(savedUser.getEsntlId()).startsWith("USR_");
  }

  @Test
  @DisplayName("?åÏõêÍ∞Ä???§Ìå® - ?¥Î? Ï°¥Ïû¨?òÎäî ?ÑÏù¥??)
  void signup_fail_duplicateUserId() {
    // Given
    when(userRepository.existsById("newUser")).thenReturn(true);

    // When & Then
    assertThatThrownBy(() -> userService.signup(signupRequest))
        .isInstanceOf(BusinessException.class)
        .hasFieldOrPropertyWithValue("errorCode", ErrorCode.DUPLICATE_USER_ID);
  }

  @Test
  @DisplayName("ÎπÑÎ?Î≤àÌò∏ ?ºÏπò ?¨Î? Í≤ÄÏ¶??åÏä§??- ?±Í≥µ")
  void verifyPassword_success() {
    // Given
    when(passwordEncoder.matches("rawPassword", "encodedPassword")).thenReturn(true);

    // When
    boolean result = userService.verifyPassword("rawPassword", "encodedPassword");

    // Then
    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("ÎπÑÎ?Î≤àÌò∏ ?ºÏπò ?¨Î? Í≤ÄÏ¶??åÏä§??- ?§Ìå®")
  void verifyPassword_fail() {
    // Given
    when(passwordEncoder.matches("wrongPassword", "encodedPassword")).thenReturn(false);

    // When
    boolean result = userService.verifyPassword("wrongPassword", "encodedPassword");

    // Then
    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("?¨Ïö©???ïÎ≥¥ ?òÏ†ï ?åÏä§??)
  void updateUser_success() {
    // Given
    String userId = "testUser";
    UserDto userDto = UserDto.builder()
        .userId(userId)
        .userNm("?òÏ†ï?úÏù¥Î¶?)
        .esntlId("USR_12345")
        .emplNo("EMP001")
        .ofcpsNm("Í≥ºÏû•")
        .build();
    
    when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));

    // When
    userService.updateUser(userId, userDto);

    // Then
    assertThat(mockUser.getUserNm()).isEqualTo("?òÏ†ï?úÏù¥Î¶?);
    assertThat(mockUser.getEmplNo()).isEqualTo("EMP001");
    assertThat(mockUser.getOfcpsNm()).isEqualTo("Í≥ºÏû•");
  }

  @Test
  @DisplayName("ÎπÑÎ?Î≤àÌò∏ Î≥ÄÍ≤??åÏä§??)
  void changePassword_success() {
    // Given
    String userId = "testUser";
    String oldPassword = "oldPassword";
    String newPassword = "newPassword";
    String encodedNewPassword = "encodedNewPassword";

    when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
    when(passwordEncoder.matches(oldPassword, mockUser.getPassword())).thenReturn(true);
    when(passwordEncoder.encode(newPassword)).thenReturn(encodedNewPassword);

    // When
    userService.changePassword(userId, oldPassword, newPassword);

    // Then
    assertThat(mockUser.getPassword()).isEqualTo(encodedNewPassword);
  }

  @Test
  @DisplayName("ÎπÑÎ?Î≤àÌò∏ Î≥ÄÍ≤??§Ìå® - Í∏∞Ï°¥ ÎπÑÎ?Î≤àÌò∏ Î∂àÏùºÏπ?)
  void changePassword_fail_invalidOldPassword() {
    // Given
    String userId = "testUser";
    String oldPassword = "wrongPassword";
    String newPassword = "newPassword";

    when(userRepository.findById(userId)).thenReturn(Optional.of(mockUser));
    when(passwordEncoder.matches(oldPassword, mockUser.getPassword())).thenReturn(false);

    // When & Then
    assertThatThrownBy(() -> userService.changePassword(userId, oldPassword, newPassword))
        .isInstanceOf(BusinessException.class)
        .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_PASSWORD);
  }

  @Test
  @DisplayName("?¨Ïö©????†ú ?åÏä§??)
  void deleteUser_success() {
    // Given
    String userId = "testUser";
    when(userRepository.existsById(userId)).thenReturn(true);

    // When
    userService.deleteUser(userId);

    // Then
    verify(userRepository).deleteById(userId);
  }

  @Test
  @DisplayName("?¨Ïö©????†ú ?§Ìå® - Ï°¥Ïû¨?òÏ? ?äÎäî ?¨Ïö©??)
  void deleteUser_fail_userNotFound() {
    // Given
    String userId = "nonexistent";
    when(userRepository.existsById(userId)).thenReturn(false);

    // When & Then
    assertThatThrownBy(() -> userService.deleteUser(userId))
        .isInstanceOf(BusinessException.class)
        .hasFieldOrPropertyWithValue("errorCode", ErrorCode.USER_NOT_FOUND);
  }
}
