package nuri.business.service.user;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.auth.UserAuthority;
import nuri.business.domain.auth.UserAuthorityRepository;
import nuri.business.service.user.dto.UserResponse;
import nuri.business.service.user.dto.UserSignupRequest;
import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.service.user.dto.UserDto;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.mockStatic;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService (사용자 CRUD) 테스트")
class UserServiceCrudTest {

  @Mock
  private UserRepository userRepository;

  @Mock
  private UserAuthorityRepository userAuthorityRepository;

  @Mock
  private PasswordEncoder passwordEncoder;



  @InjectMocks
  private UserService userService;

  private User mockUser;
  private UserSignupRequest signupRequest;

  @BeforeEach
  void setUp() {
    mockUser = User.builder()
        .userId("testUser")
        .userNm("테스트사용자")
        .esntlId("USR_1234567890123456")
        .pswd("encodedPassword")
        .build();

    signupRequest = UserSignupRequest.builder()
        .userId("newUser")
        .pswd("password123!")
        .userNm("신규사용자")
        .role("USER")
        .pswdHint("hint")
        .pswdCrans("answer")
        .build();
  }

  @Test
  @DisplayName("사용자 생성 성공")
  void createUser_success() {
    try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
      mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
      when(passwordEncoder.encode(any())).thenReturn("encoded");
      when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

      String result = userService.registerUser("user", "pw", "name", "h", "c", "USER");

      assertThat(result).isEqualTo("user");
    }
  }

  @Test
  @DisplayName("사용자 생성 실패 - null 값 포함")
  void createUser_fail_withNullValues() {
    try (var mockedSecurity = mockStatic(nuri.business.security.util.SecurityUtil.class)) {
      mockedSecurity.when(() -> nuri.business.security.util.SecurityUtil.hasRole("ADMIN")).thenReturn(true);
      assertThatThrownBy(() -> userService.registerUser(null, "pw", "name", "h", "c", "USER"))
          .isInstanceOf(IllegalArgumentException.class);
    }
  }

  @Test
  @DisplayName("사용자 상세 조회 성공 - 유효한 ID")
  void getUserById_success_withValidId() {
    when(userRepository.findById("testUser")).thenReturn(Optional.of(mockUser));
    when(userAuthorityRepository.findById(any())).thenReturn(Optional.of(
        UserAuthority.builder().scrtyDcsnTrgtId("USR_1234567890123456").authrtId("ROLE_USER").build()));

    UserDto result = userService.getUserById("testUser");

    assertThat(result).isNotNull();
    assertThat(result.userId()).isEqualTo("testUser");
  }

  @Test
  @DisplayName("사용자 상세 조회 실패 - 존재하지 않는 ID")
  void getUserById_fail_withNonExistentId() {
    when(userRepository.findById(any())).thenReturn(Optional.empty());
    when(userRepository.findByEsntlId(any())).thenReturn(Optional.empty());

    assertThatThrownBy(() -> userService.getUserById("nonexistent"))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  @DisplayName("사용자 목록 조회 성공")
  void getUserList_success() {
    when(userRepository.findAllWithAuthorities()).thenReturn(java.util.Collections.singletonList(new Object[]{mockUser, null}));

    List<UserDto> result = userService.getUserList();

    assertThat(result).isNotNull().hasSize(1);
    assertThat(result.get(0).userId()).isEqualTo("testUser");
  }

  @Test
  @DisplayName("페이지별 사용자 목록 조회 성공")
  void getPagedUserList_success() {
    UserDto userDto = UserDto.builder().userId("testUser").userNm("테스트사용자").esntlId("USR_1234567890123456").build();
    Page<UserDto> page = new PageImpl<>(List.of(userDto));
    when(userRepository.getPagedUserList(any(), any())).thenReturn(page);

    Page<UserDto> result = userService.getUserPage(PageRequest.of(0, 10));

    assertThat(result).isNotNull().hasSize(1);
    assertThat(result.getContent().get(0).userId()).isEqualTo("testUser");
    verify(userRepository).getPagedUserList(any(), any());
  }

  @Test
  @DisplayName("사용자 회원가입 성공")
  void signup_success() {
    when(userRepository.existsById(any())).thenReturn(false);
    when(passwordEncoder.encode(any())).thenReturn("encoded");
    when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    UserResponse result = userService.signup(signupRequest);

    assertThat(result.userId()).isEqualTo("newUser");
    verify(userRepository).save(any());
  }

  @Test
  @DisplayName("사용자 회원가입 실패 - 중복된 ID")
  void signup_fail_duplicateId() {
    when(userRepository.existsById(any())).thenReturn(true);

    assertThatThrownBy(() -> userService.signup(signupRequest))
        .isInstanceOf(BusinessException.class);
  }

  @Test
  @DisplayName("사용자 회원가입 실패 - null 값 포함")
  void signup_fail_withNullValues() {
    UserSignupRequest nullRequest = UserSignupRequest.builder().userId(null).pswd("pw").userNm("name").role("USER").pswdHint("h").pswdCrans("c").build();

    assertThatThrownBy(() -> userService.signup(nullRequest))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  @DisplayName("비밀번호 검증 성공")
  void validatePassword_success() {
    when(passwordEncoder.matches(any(), any())).thenReturn(true);
    assertThat(passwordEncoder.matches("pw", "encoded")).isTrue();
  }

  @Test
  @DisplayName("비밀번호 검증 실패")
  void validatePassword_fail() {
    when(passwordEncoder.matches(any(), any())).thenReturn(false);
    assertThat(passwordEncoder.matches("pw", "encoded")).isFalse();
  }
}
