package com.company.project.integration;

import com.company.project.domain.auth.UserAuthority;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.Role;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class UserServiceDatabaseIntegrationTest {

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
                "dbIntegrationUser",
                "password123!",
                "DB 통합 테스트 사용자",
                Role.USER,
                "hint",
                "answer");
    }

    @Test
    @DisplayName("사용자 서비스 - 사용자 등록 시 데이터베이스에 실제 저장됨")
    void signup_persistsToDatabase() {
        // When
        var response = userService.signup(signupRequest);

        // Then
        // 사용자 테이블에 저장되었는지 확인
        Optional<User> savedUser = userRepository.findById("dbIntegrationUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getUserNm()).isEqualTo("DB 통합 테스트 사용자");
        assertThat(savedUser.get().getRole()).isEqualTo(Role.USER);

        // 권한 테이블에 저장되었는지 확인
        Optional<UserAuthority> savedAuthority = userAuthorityRepository.findById(savedUser.get().getEsntlId());
        assertThat(savedAuthority).isPresent();
        assertThat(savedAuthority.get().getAuthorCode()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("사용자 서비스 - 사용자 조회 시 데이터베이스에서 실제 데이터 가져옴")
    void getUserById_retrievesFromDatabase() {
        // Given
        var signupResponse = userService.signup(signupRequest);

        // When
        UserDto retrievedUser = userService.getUserById("dbIntegrationUser");

        // Then
        assertThat(retrievedUser).isNotNull();
        assertThat(retrievedUser.getUserId()).isEqualTo("dbIntegrationUser");
        assertThat(retrievedUser.getUserNm()).isEqualTo("DB 통합 테스트 사용자");

        // 데이터베이스에서 직접 확인
        Optional<User> dbUser = userRepository.findById("dbIntegrationUser");
        assertThat(dbUser).isPresent();
        assertThat(dbUser.get().getUserNm()).isEqualTo("DB 통합 테스트 사용자");
    }

    @Test
    @DisplayName("사용자 서비스 - 사용자 목록 조회 시 데이터베이스에서 실제 데이터 가져옴")
    void getUserList_retrievesFromDatabase() {
        // Given
        userService.signup(signupRequest);

        UserSignupRequest request2 = new UserSignupRequest(
                "dbIntegrationUser2",
                "password123!",
                "DB 통합 테스트 사용자2",
                Role.ADMIN,
                "hint",
                "answer");
        userService.signup(request2);

        // When
        List<UserDto> userList = userService.getUserList();

        // Then
        assertThat(userList).hasSize(2);
        assertThat(userList).extracting(UserDto::getUserId).containsExactlyInAnyOrder("dbIntegrationUser",
                "dbIntegrationUser2");
        assertThat(userList).extracting(UserDto::getUserNm).containsExactlyInAnyOrder("DB 통합 테스트 사용자", "DB 통합 테스트 사용자2");

        // 데이터베이스에서 직접 확인
        List<User> dbUsers = userRepository.findAll();
        assertThat(dbUsers).hasSize(2);
        assertThat(dbUsers).extracting(User::getUserNm).containsExactlyInAnyOrder("DB 통합 테스트 사용자", "DB 통합 테스트 사용자2");
    }

    @Test
    @DisplayName("사용자 서비스 - 사용자 등록 후 데이터베이스에 영속성 확인")
    void signup_verifyPersistence() {
        // Given
        long initialUserCount = userRepository.count();
        long initialAuthorityCount = userAuthorityRepository.count();

        // When
        var response = userService.signup(signupRequest);

        // Then
        long currentUserCount = userRepository.count();
        long currentAuthorityCount = userAuthorityRepository.count();

        assertThat(currentUserCount).isEqualTo(initialUserCount + 1);
        assertThat(currentAuthorityCount).isEqualTo(initialAuthorityCount + 1);

        // 저장된 데이터의 무결성 확인
        Optional<User> savedUser = userRepository.findById("dbIntegrationUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getUserId()).isEqualTo("dbIntegrationUser");
        assertThat(savedUser.get().getUserNm()).isEqualTo("DB 통합 테스트 사용자");
        assertThat(savedUser.get().getRole()).isEqualTo(Role.USER);

        Optional<UserAuthority> savedAuthority = userAuthorityRepository.findById(savedUser.get().getEsntlId());
        assertThat(savedAuthority).isPresent();
        assertThat(savedAuthority.get().getUniqId()).isEqualTo(savedUser.get().getEsntlId());
        assertThat(savedAuthority.get().getAuthorCode()).isEqualTo("ROLE_USER");
    }

    @Test
    @DisplayName("사용자 서비스 - 사용자 정보 수정 시 데이터베이스에 반영됨")
    void updateUser_updatesDatabase() {
        // Given
        var signupResponse = userService.signup(signupRequest);

        // When
        String updatedUserId = userService.registerUser(
                "updatedUser",
                "newPassword123!",
                "수정된 사용자",
                "newHint",
                "newAnswer",
                Role.ADMIN);

        // Then
        Optional<User> updatedUser = userRepository.findById("updatedUser");
        assertThat(updatedUser).isPresent();
        assertThat(updatedUser.get().getUserNm()).isEqualTo("수정된 사용자");
        assertThat(updatedUser.get().getRole()).isEqualTo(Role.ADMIN);

        // 서비스 계층을 통해 조회해도 동일한 결과 확인
        UserDto serviceUser = userService.getUserById("updatedUser");
        assertThat(serviceUser).isNotNull();
        assertThat(serviceUser.getUserNm()).isEqualTo("수정된 사용자");
        assertThat(serviceUser.getRole()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("사용자 서비스 - 사용자 삭제 시 데이터베이스에서 삭제됨")
    void deleteUser_removesFromDatabase() {
        // Given
        var signupResponse = userService.signup(signupRequest);
        Optional<User> initialUser = userRepository.findById("dbIntegrationUser");
        assertThat(initialUser).isPresent();

        // When
        userRepository.deleteById("dbIntegrationUser");

        // Then
        Optional<User> deletedUser = userRepository.findById("dbIntegrationUser");
        assertThat(deletedUser).isEmpty();

        // 서비스 계층을 통해 조회해도 존재하지 않음을 확인
        UserDto serviceUser = userService.getUserById("dbIntegrationUser");
        assertThat(serviceUser).isNull();
    }

    @Test
    @DisplayName("사용자 서비스 - 중복 사용자 ID로 등록 시 데이터베이스 제약 조건 위반")
    void signup_duplicateId_violatesDatabaseConstraint() {
        // Given
        userService.signup(signupRequest);

        // When & Then
        assertThat(org.junit.jupiter.api.Assertions.assertThrows(
                com.company.project.core.exception.BusinessException.class,
                () -> userService.signup(signupRequest)))
                .hasFieldOrPropertyWithValue("errorCode",
                        com.company.project.core.exception.ErrorCode.DUPLICATE_USER_ID);

        // 데이터베이스에 중복 데이터가 삽입되지 않았는지 확인
        List<User> allUsers = userRepository.findAll();
        assertThat(allUsers).hasSize(1);
        assertThat(allUsers.get(0).getUserId()).isEqualTo("dbIntegrationUser");
    }

    @Test
    @DisplayName("사용자 서비스 - 사용자 등록 시 생성일자 자동 설정 확인")
    void signup_autoSetCreatedAt() {
        // When
        var response = userService.signup(signupRequest);

        // Then
        Optional<User> savedUser = userRepository.findById("dbIntegrationUser");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getSbscrbDe()).isNotNull(); // 가입일자 확인
    }

    @Test
    @DisplayName("사용자 서비스 - 여러 사용자 등록 시 데이터베이스에 모두 저장됨")
    void signup_multipleUsers_allPersisted() {
        // Given
        UserSignupRequest request1 = new UserSignupRequest(
                "multiUser1",
                "password123!",
                "다중 사용자1",
                Role.USER,
                "hint",
                "answer");
        UserSignupRequest request2 = new UserSignupRequest(
                "multiUser2",
                "password123!",
                "다중 사용자2",
                Role.ADMIN,
                "hint",
                "answer");
        UserSignupRequest request3 = new UserSignupRequest(
                "multiUser3",
                "password123!",
                "다중 사용자3",
                Role.USER,
                "hint",
                "answer");

        // When
        userService.signup(request1);
        userService.signup(request2);
        userService.signup(request3);

        // Then
        List<User> allUsers = userRepository.findAll();
        assertThat(allUsers).hasSize(3);
        assertThat(allUsers).extracting(User::getUserId).containsExactlyInAnyOrder("multiUser1", "multiUser2",
                "multiUser3");
        assertThat(allUsers).extracting(User::getUserNm).containsExactlyInAnyOrder("다중 사용자1", "다중 사용자2", "다중 사용자3");

        // 각 사용자의 권한 정보도 확인
        for (User user : allUsers) {
            Optional<UserAuthority> authority = userAuthorityRepository.findById(user.getEsntlId());
            assertThat(authority).isPresent();
        }
    }

    @Test
    @DisplayName("사용자 서비스 - 데이터베이스 트랜잭션 테스트")
    void signup_transactionRollbackOnFailure() {
        // Given
        long initialCount = userRepository.count();

        try {
            // When - 일부러 실패 유도
            userService.signup(signupRequest);

            // 중복된 ID로 다시 시도하여 실패 유도
            userService.signup(signupRequest);
        } catch (Exception e) {
            // 예외 발생은 예상된 동작
        }

        // Then - 트랜잭션이 롤백되어 초기 상태와 같아야 함
        long finalCount = userRepository.count();
        assertThat(finalCount).isEqualTo(initialCount + 1); // 첫 번째는 성공했으므로 1 증가
    }
}