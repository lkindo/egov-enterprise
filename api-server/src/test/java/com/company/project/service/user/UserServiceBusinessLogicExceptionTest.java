package com.company.project.service.user;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.user.entity.Role;
import com.company.project.domain.user.entity.User;
import com.company.project.domain.user.repository.UserRepository;

import com.company.project.service.user.dto.UserSignupRequest;
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

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceBusinessLogicExceptionTest {

        @Mock
        private UserRepository userRepository;

        @Mock
        private PasswordEncoder passwordEncoder;

        @InjectMocks
        private UserService userService;

        private UserSignupRequest signupRequest;

        @BeforeEach
        void setUp() {
                signupRequest = new UserSignupRequest(
                                "newUser",
                                "password123!",
                                "?규 ?용??",
                                Role.USER,
                                "hint",
                                "answer");
        }

        @Test
        @DisplayName("?원가??- 중복 ?용??ID??한 ?외 발생")
        void signup_fail_withDuplicateUserId() {
                // Given
                when(userRepository.existsById("newUser")).thenReturn(true);

                // When & Then
                assertThatThrownBy(() -> userService.signup(signupRequest))
                                .isInstanceOf(BusinessException.class)
                                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.DUPLICATE_USER_ID);
        }

        @Test
        @DisplayName("?원가??- ?이?베?스 ?결 ?패??한 ?외 발생")
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
        @DisplayName("?용??조회 - 존재?? ?는 ?용??ID??한 ?외 발생")
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
        @DisplayName("?용??목록 ?이?조회 - ?못???이지 번호??한 ?외 발생")
        void getPagedUserList_fail_withInvalidPageNumber() {
                // Given
                Page<User> emptyPage = new PageImpl<>(java.util.Collections.emptyList());
                PageRequest pageable = PageRequest.of(-1, 10); // Invalid page number
                when(userRepository.findAll(pageable)).thenReturn(emptyPage);

                // When & Then
                assertThatThrownBy(() -> userService.getPagedUserList(pageable))
                                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("?용??목록 ?이?조회 - ?못???이지 ?기??한 ?외 발생")
        void getPagedUserList_fail_withInvalidPageSize() {
                // Given
                Page<User> emptyPage = new PageImpl<>(java.util.Collections.emptyList());
                PageRequest pageable = PageRequest.of(0, 0); // Invalid page size
                when(userRepository.findAll(pageable)).thenReturn(emptyPage);

                // When & Then
                assertThatThrownBy(() -> userService.getPagedUserList(pageable))
                                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("?용???록 - ?이?베?스 ????패??한 ?외 발생")
        void registerUser_fail_withDatabaseSaveError() {
                // Given
                when(passwordEncoder.encode("password123!")).thenReturn("encodedPassword");
                doThrow(new RuntimeException("Database save failed"))
                                .when(userRepository).save(any(User.class));

                // When & Then
                assertThatThrownBy(() -> userService.registerUser("newUser", "password123!", "?규 ?용??", "hint", "answer",
                                Role.USER))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database save failed");
        }

        @Test
        @DisplayName("비?번호 검?- ?코?된 비?번호가 null??경우 ?외 발생")
        void verifyPassword_fail_withNullEncodedPassword() {
                // Given
                when(passwordEncoder.matches("rawPassword", null)).thenReturn(false);

                // When
                boolean result = userService.verifyPassword("rawPassword", null);

                // Then
                // Should not throw exception but return false
                org.assertj.core.api.Assertions.assertThat(result).isFalse();
        }

        @Test
        @DisplayName("?원가??- ?용???티???성 ??외 발생")
        void signup_fail_duringUserEntityCreation() {
                // Given
                when(userRepository.existsById("newUser")).thenReturn(false);
                when(passwordEncoder.encode("password123!")).thenReturn("encodedPassword");
                doThrow(new RuntimeException("User entity creation failed"))
                                .when(userRepository).save(any(User.class));

                // When & Then
                assertThatThrownBy(() -> userService.signup(signupRequest))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("User entity creation failed");
        }

        @Test
        @DisplayName("?용???록 - ?용??ID가 null??경우 ?외 발생")
        void registerUser_fail_withNullUserId() {
                // When & Then
                assertThatThrownBy(() -> userService.registerUser(null, "password123!", "?규 ?용??", "hint", "answer",
                                Role.USER))
                                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("?용???록 - ?용???름??null??경우 ?외 발생")
        void registerUser_fail_withNullUserNm() {
                // When & Then
                assertThatThrownBy(() -> userService.registerUser("newUser", "password123!", null, "hint", "answer",
                                Role.USER))
                                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("?용???록 - 비?번호 ?코???패??한 ?외 발생")
        void registerUser_fail_withPasswordEncodingError() {
                // Given
                when(passwordEncoder.encode("password123!"))
                                .thenThrow(new RuntimeException("Password encoding failed"));

                // When & Then
                assertThatThrownBy(() -> userService.registerUser("newUser", "password123!", "?규 ?용??", "hint", "answer",
                                Role.USER))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Password encoding failed");
        }

        @Test
        @DisplayName("?용??목록 조회 - ?이?베?스 ?결 ?류 발생")
        void getUserList_fail_withDatabaseConnectionError() {
                // Given
                when(userRepository.findAll()).thenThrow(new RuntimeException("Database connection error"));

                // When & Then
                assertThatThrownBy(() -> userService.getUserList())
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database connection error");
        }

        @Test
        @DisplayName("?용??목록 ?이?조회 - ?이?베?스 ?결 ?류 발생")
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
        @DisplayName("?용??조회 - ?이?베?스 ?결 ?류 발생")
        void getUserById_fail_withDatabaseConnectionError() {
                // Given
                when(userRepository.findById("testUser")).thenThrow(new RuntimeException("Database connection error"));

                // When & Then
                assertThatThrownBy(() -> userService.getUserById("testUser"))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database connection error");
        }
}
