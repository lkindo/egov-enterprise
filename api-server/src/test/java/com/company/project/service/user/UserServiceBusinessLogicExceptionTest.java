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
                                "? ê·œ ?¬ìš©??,
                                Role.USER,
                                "hint",
                                "answer");
        }

        @Test
        @DisplayName("?Œì›ê°€??- ì¤‘ë³µ ?¬ìš©??IDë¡??¸í•œ ?ˆì™¸ ë°œìƒ")
        void signup_fail_withDuplicateUserId() {
                // Given
                when(userRepository.existsById("newUser")).thenReturn(true);

                // When & Then
                assertThatThrownBy(() -> userService.signup(signupRequest))
                                .isInstanceOf(BusinessException.class)
                                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.DUPLICATE_USER_ID);
        }

        @Test
        @DisplayName("?Œì›ê°€??- ?°ì´?°ë² ?´ìŠ¤ ?°ê²° ?¤íŒ¨ë¡??¸í•œ ?ˆì™¸ ë°œìƒ")
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
        @DisplayName("?¬ìš©??ì¡°íšŒ - ì¡´ì¬?˜ì? ?ŠëŠ” ?¬ìš©??IDë¡??¸í•œ ?ˆì™¸ ë°œìƒ")
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
        @DisplayName("?¬ìš©??ëª©ë¡ ?˜ì´ì§?ì¡°íšŒ - ?˜ëª»???˜ì´ì§€ ë²ˆí˜¸ë¡??¸í•œ ?ˆì™¸ ë°œìƒ")
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
        @DisplayName("?¬ìš©??ëª©ë¡ ?˜ì´ì§?ì¡°íšŒ - ?˜ëª»???˜ì´ì§€ ?¬ê¸°ë¡??¸í•œ ?ˆì™¸ ë°œìƒ")
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
        @DisplayName("?¬ìš©???±ë¡ - ?°ì´?°ë² ?´ìŠ¤ ?€???¤íŒ¨ë¡??¸í•œ ?ˆì™¸ ë°œìƒ")
        void registerUser_fail_withDatabaseSaveError() {
                // Given
                when(passwordEncoder.encode("password123!")).thenReturn("encodedPassword");
                doThrow(new RuntimeException("Database save failed"))
                                .when(userRepository).save(any(User.class));

                // When & Then
                assertThatThrownBy(() -> userService.registerUser("newUser", "password123!", "? ê·œ ?¬ìš©??, "hint", "answer",
                                Role.USER))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database save failed");
        }

        @Test
        @DisplayName("ë¹„ë?ë²ˆí˜¸ ê²€ì¦?- ?¸ì½”?©ëœ ë¹„ë?ë²ˆí˜¸ê°€ null??ê²½ìš° ?ˆì™¸ ë°œìƒ")
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
        @DisplayName("?Œì›ê°€??- ?¬ìš©???”í‹°???ì„± ì¤??ˆì™¸ ë°œìƒ")
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
        @DisplayName("?¬ìš©???±ë¡ - ?¬ìš©??IDê°€ null??ê²½ìš° ?ˆì™¸ ë°œìƒ")
        void registerUser_fail_withNullUserId() {
                // When & Then
                assertThatThrownBy(() -> userService.registerUser(null, "password123!", "? ê·œ ?¬ìš©??, "hint", "answer",
                                Role.USER))
                                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("?¬ìš©???±ë¡ - ?¬ìš©???´ë¦„??null??ê²½ìš° ?ˆì™¸ ë°œìƒ")
        void registerUser_fail_withNullUserNm() {
                // When & Then
                assertThatThrownBy(() -> userService.registerUser("newUser", "password123!", null, "hint", "answer",
                                Role.USER))
                                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("?¬ìš©???±ë¡ - ë¹„ë?ë²ˆí˜¸ ?¸ì½”???¤íŒ¨ë¡??¸í•œ ?ˆì™¸ ë°œìƒ")
        void registerUser_fail_withPasswordEncodingError() {
                // Given
                when(passwordEncoder.encode("password123!"))
                                .thenThrow(new RuntimeException("Password encoding failed"));

                // When & Then
                assertThatThrownBy(() -> userService.registerUser("newUser", "password123!", "? ê·œ ?¬ìš©??, "hint", "answer",
                                Role.USER))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Password encoding failed");
        }

        @Test
        @DisplayName("?¬ìš©??ëª©ë¡ ì¡°íšŒ - ?°ì´?°ë² ?´ìŠ¤ ?°ê²° ?¤ë¥˜ ë°œìƒ")
        void getUserList_fail_withDatabaseConnectionError() {
                // Given
                when(userRepository.findAll()).thenThrow(new RuntimeException("Database connection error"));

                // When & Then
                assertThatThrownBy(() -> userService.getUserList())
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database connection error");
        }

        @Test
        @DisplayName("?¬ìš©??ëª©ë¡ ?˜ì´ì§?ì¡°íšŒ - ?°ì´?°ë² ?´ìŠ¤ ?°ê²° ?¤ë¥˜ ë°œìƒ")
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
        @DisplayName("?¬ìš©??ì¡°íšŒ - ?°ì´?°ë² ?´ìŠ¤ ?°ê²° ?¤ë¥˜ ë°œìƒ")
        void getUserById_fail_withDatabaseConnectionError() {
                // Given
                when(userRepository.findById("testUser")).thenThrow(new RuntimeException("Database connection error"));

                // When & Then
                assertThatThrownBy(() -> userService.getUserById("testUser"))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database connection error");
        }
}
