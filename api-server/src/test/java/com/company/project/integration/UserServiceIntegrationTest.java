package com.company.project.integration;

import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.Role;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(classes = com.company.project.config.MinimalTestConfig.class)
@Transactional
@ActiveProfiles("test")
class UserServiceIntegrationTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserAuthorityRepository userAuthorityRepository;

    private UserSignupRequest signupRequest;

    @BeforeEach
    void setUp() {
        signupRequest = new UserSignupRequest(
                "integrationTestUser",
                "password123!",
                "통합 테스트 사용자",
                Role.USER,
                "hint",
                "answer");
    }

    @Test
    @DisplayName("사용자 서비스 - 사용자 등록 시 사용자 정보와 권한 정보가 함께 저장됨")
    void signup_createsUserAndAuthority() {
        // When
        userService.signup(signupRequest);

        // Then
        // 사용자 정보가 저장되었는지 확인
        Optional<User> savedUser = userRepository.findById("integrationTestUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getUserNm()).isEqualTo("통합 테스트 사용자");
        assertThat(savedUser.get().getRole()).isEqualTo(Role.USER);

        // 권한 정보가 저장되었는지 확인
        Optional<UserAuthority> savedAuthority = userAuthorityRepository.findById(savedUser.get().getEsntlId());
        assertThat(savedAuthority).isPresent();
        assertThat(savedAuthority.get().getAuthorCode()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("사용자 서비스 - 사용자 목록 조회 시 권한 정보도 함께 조회됨")
    void getUserList_retrievesUsersWithAuthority() {
        // Given
        userService.signup(signupRequest);

        // When
        List<UserDto> userList = userService.getUserList();

        // Then
        assertThat(userList).isNotEmpty();
        UserDto user = userList.get(0);
        assertThat(user.getUserId()).isEqualTo("integrationTestUser");
        assertThat(user.getUserNm()).isEqualTo("통합 테스트 사용자");
        // 권한 정보가 포함되어 있는지 확인 (권한 코드가 UserAuthority에서 가져온 것인지 확인)
    }

    @Test
    @DisplayName("사용자 서비스 - 사용자 등록 후 바로 조회 가능")
    void signup_thenGetUserById_success() {
        // Given
        UserResponse signupResponse = userService.signup(signupRequest);

        // When
        UserDto retrievedUser = userService.getUserById(signupResponse.userId());

        // Then
        assertThat(retrievedUser).isNotNull();
        assertThat(retrievedUser.getUserId()).isEqualTo("integrationTestUser");
        assertThat(retrievedUser.getUserNm()).isEqualTo("통합 테스트 사용자");
    }

    @Test
    @DisplayName("사용자 서비스 - 여러 사용자 등록 후 목록 조회")
    void multipleUsers_signup_thenGetList_success() {
        // Given
        UserSignupRequest request1 = new UserSignupRequest(
                "user1",
                "password123!",
                "사용자1",
                Role.USER,
                "hint",
                "answer");
        UserSignupRequest request2 = new UserSignupRequest(
                "user2",
                "password123!",
                "사용자2",
                Role.ADMIN,
                "hint",
                "answer");

        // When
        userService.signup(request1);
        userService.signup(request2);
        List<UserDto> userList = userService.getUserList();

        // Then
        assertThat(userList).hasSize(2);
        assertThat(userList).extracting(UserDto::getUserId).containsExactlyInAnyOrder("user1", "user2");
        assertThat(userList).extracting(UserDto::getUserNm).containsExactlyInAnyOrder("사용자1", "사용자2");
    }

    @Test
    @DisplayName("사용자 서비스 - 사용자 등록 시 데이터베이스에 실제 저장됨")
    void signup_persistsToDatabase() {
        // Given
        long initialUserCount = userRepository.count();
        long initialAuthorityCount = userAuthorityRepository.count();

        // When
        userService.signup(signupRequest);

        // Then
        long currentUserCount = userRepository.count();
        long currentAuthorityCount = userAuthorityRepository.count();

        assertThat(currentUserCount).isEqualTo(initialUserCount + 1);
        assertThat(currentAuthorityCount).isEqualTo(initialAuthorityCount + 1);

        // 저장된 사용자 확인
        Optional<User> savedUser = userRepository.findById("integrationTestUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getUserId()).isEqualTo("integrationTestUser");
        assertThat(savedUser.get().getUserNm()).isEqualTo("통합 테스트 사용자");
        assertThat(savedUser.get().getRole()).isEqualTo(Role.USER);
    }

    @Test
    @DisplayName("사용자 서비스 - 사용자 ID로 상세 조회 성공")
    void getUserById_success_withValidId() {
        // Given
        userService.signup(signupRequest);

        // When
        UserDto result = userService.getUserById("integrationTestUser");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getUserId()).isEqualTo("integrationTestUser");
        assertThat(result.getUserNm()).isEqualTo("통합 테스트 사용자");
    }

    @Test
    @DisplayName("사용자 서비스 - 존재하지 않는 사용자 ID로 조회 시 예외 발생")
    void getUserById_fail_withNonExistentId() {
        // When & Then
        assertThatThrownBy(() -> userService.getUserById("nonexistent"))
                .isInstanceOf(com.company.project.core.exception.BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", com.company.project.core.exception.ErrorCode.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("사용자 서비스 - 사용자 등록 시 중복 ID로 인한 예외 발생")
    void signup_fail_withDuplicateId() {
        // Given
        userService.signup(signupRequest);

        // When & Then
        assertThatThrownBy(() -> userService.signup(signupRequest))
                .isInstanceOf(com.company.project.core.exception.BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode",
                        com.company.project.core.exception.ErrorCode.DUPLICATE_USER_ID);
    }

    @Test
    @DisplayName("사용자 서비스 - 사용자 정보 수정 성공")
    void updateUser_success() {
        // Given
        userService.signup(signupRequest);
        UserDto updatedUserDto = new UserDto("integrationTestUser", "수정된 사용자", "USR_TEST", "ADMIN", null, null, null);

        // When
        userService.updateUser("integrationTestUser", updatedUserDto);

        // Then
        UserDto result = userService.getUserById("integrationTestUser");
        assertThat(result.getUserNm()).isEqualTo("수정된 사용자");
    }

    @Test
    @DisplayName("사용자 서비스 - 비밀번호 변경 성공")
    void changePassword_success() {
        // Given
        userService.signup(signupRequest);

        // When & Then
        // 비밀번호 변경이 성공적으로 수행되는지 확인
        assertThatNoException()
                .isThrownBy(() -> userService.changePassword("integrationTestUser", "password123!", "newPassword123!"));
    }

    @Test
    @DisplayName("사용자 서비스 - 잘못된 이전 비밀번호로 변경 시 예외 발생")
    void changePassword_fail_withWrongOldPassword() {
        // Given
        userService.signup(signupRequest);

        // When & Then
        assertThatThrownBy(() -> userService.changePassword("integrationTestUser", "wrongPassword", "newPassword123!"))
                .isInstanceOf(com.company.project.core.exception.BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode",
                        com.company.project.core.exception.ErrorCode.INVALID_PASSWORD);
    }

    @Test
    @DisplayName("사용자 서비스 - 페이징된 사용자 목록 조회 성공")
    void getPagedUserList_success() {
        // Given
        for (int i = 0; i < 15; i++) {
            UserSignupRequest request = new UserSignupRequest(
                    "pagedUser" + i,
                    "password123!",
                    "페이징 테스트 사용자" + i,
                    Role.USER,
                    "hint",
                    "answer");
            userService.signup(request);
        }

        // When
        Pageable pageable = PageRequest.of(0, 10);
        Page<UserDto> result = userService.getPagedUserList(pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(10);
        assertThat(result.getTotalElements()).isEqualTo(15);
        assertThat(result.getNumber()).isEqualTo(0);
        assertThat(result.isFirst()).isTrue();
    }
}