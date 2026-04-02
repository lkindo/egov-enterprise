package com.company.project.foundation.service.user;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.foundation.domain.user.entity.Role;
import com.company.project.foundation.domain.user.entity.User;
import com.company.project.foundation.domain.user.repository.UserRepository;
import com.company.project.foundation.service.user.dto.UserSignupRequest;
import com.company.project.foundation.service.user.mapper.UserMapper;
import com.company.project.foundation.domain.auth.UserAuthorityRepository;
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
 * UserService ë¹„ì¦ˆ?ˆìŠ¤ ë¡œì§ ?ˆì™¸ ?í™© ?ŒìŠ¤??
 * ?œë¹„???ˆì´?´ì—??ë°œìƒ?˜ëŠ” ê°ì¢… ?ˆì™¸ ?í™© ë°?ë¹„ì¦ˆ?ˆìŠ¤ ?œì•½ ì¡°ê±´ ê²€ì¦?
 */
@ExtendWith(MockitoExtension.class)
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
                                "?ŒìŠ¤?¸ì‚¬?©ìž",
                                Role.USER,
                                "hint",
                                "answer");
        }

        @Test
        @DisplayName("?Œì›ê°€???¤íŒ¨ - ì¤‘ë³µ???¬ìš©??ID (BusinessException ë°œìƒ)")
        void signup_fail_withDuplicateUserId() {
                // Given
                when(userRepository.existsById("newUser")).thenReturn(true);

                // When & Then
                assertThatThrownBy(() -> userService.signup(signupRequest))
                                .isInstanceOf(BusinessException.class)
                                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.DUPLICATE_USER_ID);
        }

        @Test
        @DisplayName("?Œì›ê°€???¤íŒ¨ - DB ?€???¤ë¥˜ (RuntimeException ë°œìƒ)")
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
        @DisplayName("?¬ìš©??ì¡°íšŒ ?¤íŒ¨ - ì¡´ìž¬?˜ì? ?ŠëŠ” ?¬ìš©??ID (BusinessException ë°œìƒ)")
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
        @DisplayName("?˜ì´ì§??¬ìš©??ëª©ë¡ ì¡°íšŒ ?¤íŒ¨ - ?˜ëª»???˜ì´ì§€ ë²ˆí˜¸")
        void getPagedUserList_fail_withInvalidPageNumber() {
                // PageRequest.of(-1, 10)?€ ?ì„± ?œì ??IllegalArgumentException??ì§ì ‘ ë°œìƒ?œí‚¨??
                assertThatThrownBy(() -> PageRequest.of(-1, 10))
                                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("?¬ìš©???±ë¡ ?¤íŒ¨ - DB ?€???¤ë¥˜")
        void registerUser_fail_withDatabaseSaveError() {
                // Given
                when(passwordEncoder.encode("password123!")).thenReturn("encodedPassword");
                doThrow(new RuntimeException("Database save failed"))
                                .when(userRepository).save(any(User.class));

                // When & Then
                assertThatThrownBy(
                                () -> userService.registerUser("newUser", "password123!", "?ŒìŠ¤?¸ì‚¬?©ìž", "hint", "answer",
                                                Role.USER))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database save failed");
        }

        @Test
        @DisplayName("ë¹„ë?ë²ˆí˜¸ ê²€ì¦?- ?¸ì½”?©ëœ ë¹„ë?ë²ˆí˜¸ê°€ null??ê²½ìš°")
        void verifyPassword_fail_withNullEncodedPassword() {
                // Given
                when(passwordEncoder.matches("rawPassword", null)).thenReturn(false);

                // When
                boolean result = userService.verifyPassword("rawPassword", null);

                // Then
                org.assertj.core.api.Assertions.assertThat(result).isFalse();
        }

        @Test
        @DisplayName("?¬ìš©???±ë¡ ?¤íŒ¨ - ?„ìˆ˜ ?„ë“œ(UserId) ?„ë½")
        void registerUser_fail_withNullUserId() {
                // When & Then
                assertThatThrownBy(() -> userService.registerUser(null, "password123!", "?ŒìŠ¤?¸ì‚¬?©ìž", "hint", "answer",
                                Role.USER))
                                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("?¬ìš©???±ë¡ ?¤íŒ¨ - ?„ìˆ˜ ?„ë“œ(UserNm) ?„ë½")
        void registerUser_fail_withNullUserNm() {
                // When & Then
                assertThatThrownBy(() -> userService.registerUser("newUser", "password123!", null, "hint", "answer",
                                Role.USER))
                                .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        @DisplayName("?¬ìš©???±ë¡ ?¤íŒ¨ - ë¹„ë?ë²ˆí˜¸ ?¸ì½”???¤ë¥˜")
        void registerUser_fail_withPasswordEncodingError() {
                // Given
                when(passwordEncoder.encode("password123!"))
                                .thenThrow(new RuntimeException("Password encoding failed"));

                // When & Then
                assertThatThrownBy(
                                () -> userService.registerUser("newUser", "password123!", "?ŒìŠ¤?¸ì‚¬?©ìž", "hint", "answer",
                                                Role.USER))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Password encoding failed");
        }

        @Test
        @DisplayName("?¬ìš©??ëª©ë¡ ì¡°íšŒ ?¤íŒ¨ - DB ?°ë™ ?¤ë¥˜")
        void getUserList_fail_withDatabaseConnectionError() {
                // Given
                when(userRepository.findAll()).thenThrow(new RuntimeException("Database connection error"));

                // When & Then
                assertThatThrownBy(() -> userService.getUserList())
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database connection error");
        }

        @Test
        @DisplayName("?˜ì´ì§??¬ìš©??ëª©ë¡ ì¡°íšŒ ?¤íŒ¨ - DB ?°ë™ ?¤ë¥˜")
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
        @DisplayName("?¬ìš©???ì„¸ ì¡°íšŒ ?¤íŒ¨ - DB ?°ë™ ?¤ë¥˜")
        void getUserById_fail_withDatabaseConnectionError() {
                // Given
                when(userRepository.findById("testUser")).thenThrow(new RuntimeException("Database connection error"));

                // When & Then
                assertThatThrownBy(() -> userService.getUserById("testUser"))
                                .isInstanceOf(RuntimeException.class)
                                .hasMessage("Database connection error");
        }
}
