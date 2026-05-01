package nuri.foundation.service.user;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.auth.UserAuthority;
import nuri.foundation.domain.auth.UserAuthorityRepository;
import nuri.foundation.service.user.dto.UserResponse;
import nuri.foundation.service.user.dto.UserSignupRequest;
import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.repository.UserRepository;
import nuri.foundation.service.user.dto.UserDto;
import nuri.foundation.service.user.mapper.UserMapper;
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

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService (사용자 CRUD) 테스트")
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
        .userNm("테스트사용자")
        .esntlId("USR_1234567890123456")
        .password("encodedPassword")
        .build();

    signupRequest = UserSignupRequest.builder()
        .userId("newUser")
        .password("password123!")
        .userNm("신규사용자")
        .role("USER")
        .passwordHint("hint")
        .passwordCnsr("answer")
        .build();
  }

  @Test
  @DisplayName("사용자 생성 성공")
  void createUser_success() {
    when(passwordEncoder.encode(any())).thenReturn("encoded");
    when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));

    String result = userService.registerUser("user", "pw", "name", "h", "c", "USER");

    assertThat(result).isEqualTo("user");
  }

  @Test
  @DisplayName("사용자 생성 실패 - null 값 포함")
  void createUser_fail_withNullValues() {
    assertThatThrownBy(() -> userService.registerUser(null, "pw", "name", "h", "c", "USER"))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  @DisplayName("사용자 상세 조회 성공 - 유효한 ID")
  void getUserById_success_withValidId() {
    when(userRepository.findById("testUser")).thenReturn(Optional.of(mockUser));
    when(userAuthorityRepository.findById(any())).thenReturn(Optional.of(
        UserAuthority.builder().uniqId("USR_1234567890123456").authorCode("ROLE_USER").build()));
    when(userMapper.toDtoWithAuthority(any(), any()))
        .thenReturn(new UserDto("testUser", "테스트사용자", "USR_1234567890123456", null, null, null, null));

    UserDto result = userService.getUserById("testUser");

    assertThat(result).isNotNull();
    assertThat(result.getUserId()).isEqualTo("testUser");
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
    when(userMapper.toDtoWithAuthority(any(), any()))
        .thenReturn(new UserDto("testUser", "테스트사용자", "USR_1234567890123456", null, null, null, null));

    List<UserDto> result = userService.getUserList();

    assertThat(result).isNotNull().hasSize(1);
    assertThat(result.get(0).getUserId()).isEqualTo("testUser");
  }

  @Test
  @DisplayName("페이지별 사용자 목록 조회 성공")
  void getPagedUserList_success() {
    UserDto userDto = new UserDto("testUser", "테스트사용자", "USR_1234567890123456", null, null, null, null);
    Page<UserDto> page = new PageImpl<>(List.of(userDto));
    when(userRepository.getPagedUserList(any(), any())).thenReturn(page);

    Page<UserDto> result = userService.getUserPage(PageRequest.of(0, 10));

    assertThat(result).isNotNull().hasSize(1);
    assertThat(result.getContent().get(0).getUserId()).isEqualTo("testUser");
    verify(userRepository).getPagedUserList(any(), any());
  }

  @Test
  @DisplayName("사용자 회원가입 성공")
  void signup_success() {
    when(userRepository.existsById(any())).thenReturn(false);
    when(passwordEncoder.encode(any())).thenReturn("encoded");
    when(userRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    when(userMapper.toResponse(any())).thenReturn(UserResponse.builder().userId("newUser").userNm("name").role("USER").build());


    UserResponse result = userService.signup(signupRequest);

    assertThat(result.getUserId()).isEqualTo("newUser");
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
    UserSignupRequest nullRequest = UserSignupRequest.builder().userId(null).password("pw").userNm("name").role("USER").passwordHint("h").passwordCnsr("c").build();

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
