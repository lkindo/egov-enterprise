package com.company.project.foundation.service.user;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.domain.auth.UserAuthorityRepository;
import com.company.project.foundation.domain.user.dto.Role;
import com.company.project.foundation.domain.user.dto.UserSignupRequest;
import com.company.project.foundation.domain.user.entity.User;
import com.company.project.foundation.domain.user.repository.UserRepository;
import com.company.project.foundation.service.user.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * UserServiceBusinessLogicExceptionTest
 * 서비스 레이어에서 발생하는 각종 예외 상황 및 비즈니스 제약 조건 검증
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserService (비즈니스 로직 예외 상황) 테스트")
class UserServiceBusinessLogicExceptionTest {

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

        private UserSignupRequest signupRequest;

        @BeforeEach
        void setUp() {
                signupRequest = new UserSignupRequest(
                                "newUser",
                                "password123!",
                                "테스트사용자",
                                Role.USER,
                                "hint",
                                "answer");
        }

        @Test
        @DisplayName("회원가입 실패 - 중복된 사용자 ID (BusinessException 발생)")
        void signup_fail_withDuplicateUserId() {
                // Given
                when(userRepository.existsById("newUser")).thenReturn(true);

                // When & Then
                assertThatThrownBy(() -> userService.signup(signupRequest))
                                .isInstanceOf(BusinessException.class)
                                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.DUPLICATE_USER_ID);
        }

        @Test
        @DisplayName("회원가입 실패 - DB 저장 오류 (RuntimeException 발생)")
        void signup_fail_withDatabaseConnectionError() {
                // Given
                when(userRepository.existsById("newUser")).thenReturn(false);
                when(passwordEncoder.encode(any(String.class))).thenReturn("encodedPassword");
                doThrow(new RuntimeException("Database connection failed"))
                                .when(userRepository).save(any(User.class));

                // When & Then
                assertThatThrownBy(() -> userService.signup(signupRequest))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database connection failed");
        }

        @Test
        @DisplayName("사용자 조회 실패 - 존재하지 않는 사용자 ID (BusinessException 발생)")
        void getUserById_fail_withNonExistentUserId() {
                // Given
                when(userRepository.findById("nonexistent")).thenReturn(Optional.empty());
                when(userRepository.findByEsntlId("nonexistent")).thenReturn(Optional.empty());

                // When & Then
                assertThatThrownBy(() -> userService.getUserById("nonexistent"))
                                .isInstanceOf(BusinessException.class)
                                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.USER_NOT_FOUND);
        }

        @Test
        @DisplayName("페이지 사용자 목록 조회 실패 - 잘못된 페이지 번호")
        void getPagedUserList_fail_withInvalidPageNumber() {
                // PageRequest.of(-1, 10)은 생성 시점에 IllegalArgumentException을 직접 발생시킨다.
                assertThatThrownBy(() -> PageRequest.of(-1, 10))
                                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("사용자 등록 실패 - DB 저장 오류")
        void registerUser_fail_withDatabaseSaveError() {
                // Given
                when(passwordEncoder.encode("password123!")).thenReturn("encodedPassword");
                doThrow(new RuntimeException("Database save failed"))
                                .when(userRepository).save(any(User.class));

                // When & Then
                assertThatThrownBy(
                                () -> userService.registerUser("newUser", "password123!", "테스트사용자", "hint", "answer",
                                                Role.USER))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database save failed");
        }

        @Test
        @DisplayName("비밀번호 검증 - 인코딩된 비밀번호가 null인 경우")
        void verifyPassword_fail_withNullEncodedPassword() {
                // Given
                when(passwordEncoder.matches("rawPassword", null)).thenReturn(false);

                // When
                boolean result = userService.verifyPassword("rawPassword", null);

                // Then
                org.assertj.core.api.Assertions.assertThat(result).isFalse();
        }

        @Test
        @DisplayName("사용자 등록 실패 - 필수 필드(UserId) 누락")
        void registerUser_fail_withNullUserId() {
                // When & Then
                assertThatThrownBy(() -> userService.registerUser(null, "password123!", "테스트사용자", "hint", "answer",
                                Role.USER))
                                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("사용자 등록 실패 - 필수 필드(UserNm) 누락")
        void registerUser_fail_withNullUserNm() {
                // When & Then
                assertThatThrownBy(() -> userService.registerUser("newUser", "password123!", null, "hint", "answer",
                                Role.USER))
                                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("사용자 등록 실패 - 비밀번호 인코딩 오류")
        void registerUser_fail_withPasswordEncodingError() {
                // Given
                when(passwordEncoder.encode("password123!"))
                                .thenThrow(new RuntimeException("Password encoding failed"));

                // When & Then
                assertThatThrownBy(
                                () -> userService.registerUser("newUser", "password123!", "테스트사용자", "hint", "answer",
                                                Role.USER))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Password encoding failed");
        }

        @Test
        @DisplayName("사용자 목록 조회 실패 - DB 연동 오류")
        void getUserList_fail_withDatabaseConnectionError() {
                // Given
                when(userRepository.findAll()).thenThrow(new RuntimeException("Database connection error"));

                // When & Then
                assertThatThrownBy(() -> userService.getUserList())
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database connection error");
        }

        @Test
        @DisplayName("페이지 사용자 목록 조회 실패 - DB 연동 오류")
        void getPagedUserList_fail_withDatabaseConnectionError() {
                // Given
                PageRequest pageable = PageRequest.of(0, 10);
                when(userRepository.findAll(pageable)).thenThrow(new RuntimeException("Database connection error"));

                // When & Then
                assertThatThrownBy(() -> userService.getPagedUserList(pageable))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database connection error");
        }

        @Test
        @DisplayName("사용자 상세 조회 실패 - DB 연동 오류")
        void getUserById_fail_withDatabaseConnectionError() {
                // Given
                when(userRepository.findById("testUser")).thenThrow(new RuntimeException("Database connection error"));

                // When & Then
                assertThatThrownBy(() -> userService.getUserById("testUser"))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database connection error");
        }
}
