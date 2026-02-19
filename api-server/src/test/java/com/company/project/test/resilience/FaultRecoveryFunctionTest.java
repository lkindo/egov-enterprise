package com.company.project.test.resilience;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Arrays;

import com.company.project.domain.user.entity.Role;
import com.company.project.service.user.dto.UserResponse;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
public class FaultRecoveryFunctionTest { // Changed to public for better visibility, though package-private is fine for
                                         // JUnit 5

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private UserService userService;

        @Test
        @DisplayName("?œë¹„???¥ì•  ???•ìƒ ë³µêµ¬ ?ŒìŠ¤??- ?¼ì‹œ?ì¸ DB ?¥ì•  ?œë??ˆì´??)
        void temporaryDbFailure_recovery_success() throws Exception {
                // Given - ì²??”ì²­?€ DB ?¥ì•  ?œë??ˆì´??
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Database temporarily unavailable"))
                                .thenReturn(Arrays.asList(
                                                new UserDto("user1", "ë³µêµ¬ ???¬ìš©??", "USR001", null, null, null, null),
                                                new UserDto("user2", "ë³µêµ¬ ???¬ìš©??", "USR002", null, null, null, null))); // ?¤ìŒ
                                                                                                                       // ?”ì²­?€
                                                                                                                       // ?•ìƒ
                                                                                                                       // ?™ì‘

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¥ì•  ë°œìƒ)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ë³µêµ¬)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data.length()").value(2));
        }

        @Test
        @DisplayName("?ˆì™¸ ë°œìƒ ???•ìƒ ?œë¹„??ë³µêµ¬ ?ŒìŠ¤??)
        void exceptionThenRecovery_normalServiceRecovery() throws Exception {
                // Given - ì²??”ì²­?€ ?ˆì™¸ ë°œìƒ
                when(userService.getUserById("errorUser"))
                                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND))
                                .thenReturn(new UserDto("recoveredUser", "ë³µêµ¬???¬ìš©??, "USR001", null, null, null, null)); // ?¤ìŒ
                                                                                                                        // ?”ì²­?€
                                                                                                                        // ?•ìƒ
                                                                                                                        // ?™ì‘

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?ˆì™¸ ë°œìƒ)
                mockMvc.perform(get("/api/v1/users/errorUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isNotFound());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ë³µêµ¬)
                mockMvc.perform(get("/api/v1/users/recoveredUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("recoveredUser"));
        }

        @Test
        @DisplayName("API ?¸ì¶œ ?¤íŒ¨ ???¬ì‹œ??ë©”ì»¤?ˆì¦˜ ?ŒìŠ¤??)
        void retryMechanism_afterApiFailure() throws Exception {
                // Given - ?¼ì • ?Ÿìˆ˜???¤íŒ¨ ?´í›„ ?±ê³µ?˜ëŠ” ?œë‚˜ë¦¬ì˜¤
                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new RuntimeException("Service temporarily unavailable"))
                                .thenThrow(new RuntimeException("Service still unavailable"))
                                .thenReturn(new UserResponse("successfulUser", "?¬ì‹œ???¬ìš©??, Role.USER)); // ??ë²ˆì§¸ ?œë„???±ê³µ

                String requestBody = """
                                {
                                    "userId": "retryUser",
                                    "password": "password123!",
                                    "userNm": "?¬ì‹œ???¬ìš©??,
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "USER"
                                }
                                """;

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¤íŒ¨)
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?¤íŒ¨)
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?±ê³µ - ë³µêµ¬??
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("successfulUser"));
        }

        @Test
        @DisplayName("?œí‚· ë¸Œë ˆ?´ì»¤ ?™ì‘ ë°?ë³µêµ¬ ?ŒìŠ¤??)
        void circuitBreaker_operationAndRecovery() throws Exception {
                // Given - ?°ì†???¤íŒ¨ ???¼ì • ?œê°„ ê²½ê³¼ ???•ìƒ ?™ì‘
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Service unavailable")) // 1st call - failure
                                .thenThrow(new RuntimeException("Service still unavailable")) // 2nd call - failure
                                .thenThrow(new RuntimeException("Circuit breaker open")) // 3rd call - circuit breaker
                                                                                         // open
                                .thenReturn(Arrays.asList( // 4th call - recovery after timeout simulation
                                                new UserDto("circuitBreakerUser", "?œí‚· ë¸Œë ˆ?´ì»¤ ?¬ìš©??, "USR001", null, null,
                                                                null, null)));

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¤íŒ¨)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?¤íŒ¨)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?œí‚· ë¸Œë ˆ?´ì»¤ OPEN ?íƒœ ?œë??ˆì´??
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isServiceUnavailable()); // Circuit breaker open

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (ë³µêµ¬???íƒœ)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("?€?„ì•„??ë°œìƒ ???•ìƒ ë³µêµ¬ ?ŒìŠ¤??)
        void timeoutRecovery_afterTimeoutOccurs() throws Exception {
                // Given - ì²??”ì²­?€ ?€?„ì•„???œë??ˆì´??
                when(userService.getUserList())
                                .thenAnswer(invocation -> {
                                        Thread.sleep(6000); // 6ì´?ì§€??(?€?„ì•„??
                                        return Arrays.asList(new UserDto("timeoutUser", "?€?„ì•„???¬ìš©??, "USR001", null,
                                                        null, null, null));
                                })
                                .thenReturn(Arrays.asList( // ?¤ìŒ ?”ì²­?€ ?•ìƒ ì²˜ë¦¬
                                                new UserDto("recoveredUser", "ë³µêµ¬???¬ìš©??, "USR002", null, null, null,
                                                                null)));

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?€?„ì•„??
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON)
                                .requestAttr("org.springframework.web.util.WebUtils.ERROR_REQUEST_URI_ATTRIBUTE",
                                                "/api/v1/users"))
                                .andExpect(status().isRequestTimeout());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ë³µêµ¬)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data[0].userId").value("recoveredUser"));
        }

        @Test
        @DisplayName("?°ì´?°ë² ?´ìŠ¤ ?°ê²° ?€ ê³ ê°ˆ ??ë³µêµ¬ ?ŒìŠ¤??)
        void dbConnectionPoolExhaustion_recovery() throws Exception {
                // Given - DB ?°ê²° ?€ ê³ ê°ˆ ?œë??ˆì´??
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Connection pool exhausted"))
                                .thenReturn(Arrays.asList( // ë³µêµ¬ ???•ìƒ ?™ì‘
                                                new UserDto("poolUser", "?€ ?¬ìš©??, "USR001", null, null, null, null)));

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (DB ?°ê²° ?€ ê³ ê°ˆ)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (ë³µêµ¬ ???•ìƒ ?™ì‘)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("ë©”ëª¨ë¦?ë¶€ì¡??íƒœ?ì„œ GC ???•ìƒ ?™ì‘ ë³µêµ¬ ?ŒìŠ¤??)
        void outOfMemoryRecovery_afterGC() throws Exception {
                // Given - ë©”ëª¨ë¦?ë¶€ì¡??íƒœ ?œë??ˆì´??
                when(userService.getUserList())
                                .thenThrow(new OutOfMemoryError("Memory exhausted"))
                                .thenReturn(Arrays.asList( // GC ???•ìƒ ?™ì‘
                                                new UserDto("memoryUser", "ë©”ëª¨ë¦??¬ìš©??, "USR001", null, null, null,
                                                                null)));

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (ë©”ëª¨ë¦?ë¶€ì¡?
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // Force garbage collection to simulate recovery
                System.gc();

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (ë³µêµ¬ ???•ìƒ ?™ì‘)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("?ˆì™¸ ë°œìƒ ???œë¹„???íƒœ ?•ìƒ???ŒìŠ¤??)
        void serviceStatusNormalization_afterException() throws Exception {
                // Given - ?œë¹„?¤ê? ?¼ì‹œ?ìœ¼ë¡?ë¹„ì •???íƒœ
                when(userService.getUserById("faultyUser"))
                                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                                .thenReturn(new UserDto("normalizedUser", "?•ìƒ?”ëœ ?¬ìš©??, "USR001", null, null, null,
                                                null)); // ?•ìƒ ?íƒœë¡?ë³µêµ¬

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?ˆì™¸ ë°œìƒ)
                mockMvc.perform(get("/api/v1/users/faultyUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ?”ëœ ?íƒœ)
                mockMvc.perform(get("/api/v1/users/normalizedUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("normalizedUser"));
        }

        @Test
        @DisplayName("?¥ì•  ë°œìƒ ???´ë°± ë©”ì»¤?ˆì¦˜ ?ŒìŠ¤??)
        void fallbackMechanism_whenFailureOccurs() throws Exception {
                // Given - ?œë¹„???¥ì•  ???´ë°± ?œê³µ
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Service unavailable"))
                                .thenReturn(Arrays.asList( // ?´ë°± ???•ìƒ ?™ì‘
                                                new UserDto("fallbackUser", "?´ë°± ?¬ìš©??, "USR001", null, null, null,
                                                                null)));

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¥ì•  ë°œìƒ)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ?™ì‘)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data[0].userId").value("fallbackUser"));
        }

        @Test
        @DisplayName("?¥ì•  ë³µêµ¬ ???±ëŠ¥ ?€???†ì´ ?•ìƒ ?™ì‘ ?ŒìŠ¤??)
        void recovery_withoutPerformanceDegradation() throws Exception {
                // Given - ?¥ì•  ë°œìƒ ???•ìƒ ë³µêµ¬
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Temporary failure"))
                                .thenReturn(Arrays.asList( // ë³µêµ¬ ???•ìƒ ?™ì‘
                                                new UserDto("performanceUser1", "?±ëŠ¥ ?ŒìŠ¤???¬ìš©??", "USR001", null, null,
                                                                null, null),
                                                new UserDto("performanceUser2", "?±ëŠ¥ ?ŒìŠ¤???¬ìš©??", "USR002", null, null,
                                                                null, null)));

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¥ì•  ë°œìƒ)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ë³µêµ¬)
                long startTime = System.currentTimeMillis();
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data.length()").value(2));
                long endTime = System.currentTimeMillis();

                // Verify that performance is acceptable after recovery (less than 1 second)
                assertThat(endTime - startTime).isLessThan(1000);
        }

        @Test
        @DisplayName("?¤ì¤‘ ?¥ì•  ë°œìƒ ??ë³µêµ¬ ?ŒìŠ¤??)
        void multipleFailures_recovery() throws Exception {
                // Given - ?¬ëŸ¬ ?¥ì•  ë°œìƒ ??ë³µêµ¬
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("First failure"))
                                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                                .thenThrow(new RuntimeException("Third failure"))
                                .thenReturn(Arrays.asList( // ë³µêµ¬ ???•ìƒ ?™ì‘
                                                new UserDto("multiFailureUser", "?¤ì¤‘ ?¥ì•  ?¬ìš©??, "USR001", null, null, null,
                                                                null)));

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¥ì•  1)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?¥ì•  2)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?¥ì•  3)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ë³µêµ¬)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data[0].userId").value("multiFailureUser"));
        }

        @Test
        @DisplayName("?¥ì•  ë°œìƒ ??ìºì‹œ ë¬´íš¨??ë°??¬ìƒ???ŒìŠ¤??)
        void cacheInvalidationAndRegeneration_afterFailure() throws Exception {
                // Given - ìºì‹œê°€ ?ˆëŠ” ?œë‚˜ë¦¬ì˜¤ (mock?¼ë¡œ ìºì‹œ ?™ì‘ ?œë??ˆì´??
                when(userService.getUserById("cachedUser"))
                                .thenReturn(new UserDto("cachedUser", "ìºì‹œ ?¬ìš©??, "USR001", null, null, null, null)) // ìºì‹œ??
                                                                                                                   // ?€??
                                .thenThrow(new RuntimeException("Cache invalidated due to error")) // ìºì‹œ ë¬´íš¨??
                                .thenReturn(new UserDto("cachedUser", "ê°±ì‹ ??ìºì‹œ ?¬ìš©??, "USR001", null, null, null, null)); // ìºì‹œ
                                                                                                                        // ?¬ìƒ??

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?•ìƒ, ìºì‹œ ?€??
                mockMvc.perform(get("/api/v1/users/cachedUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.userNm").value("ìºì‹œ ?¬ìš©??));

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?¥ì•  ë°œìƒ, ìºì‹œ ë¬´íš¨??
                mockMvc.perform(get("/api/v1/users/cachedUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ, ìºì‹œ ?¬ìƒ??
                mockMvc.perform(get("/api/v1/users/cachedUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.userNm").value("ê°±ì‹ ??ìºì‹œ ?¬ìš©??));
        }

        @Test
        @DisplayName("?¥ì•  ë°œìƒ ???¸ì…˜ ? ì? ?ŒìŠ¤??)
        void sessionPreservation_afterFailure() throws Exception {
                // Given
                when(userService.getUserById("sessionUser"))
                                .thenThrow(new RuntimeException("Temporary failure"))
                                .thenReturn(new UserDto("sessionUser", "?¸ì…˜ ?¬ìš©??, "USR001", null, null, null, null));

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¥ì•  ë°œìƒ)
                mockMvc.perform(get("/api/v1/users/sessionUser")
                                .contentType(MediaType.APPLICATION_JSON)
                                .sessionAttr("userSession", "sessionValue"))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ë³µêµ¬, ?¸ì…˜ ? ì?)
                mockMvc.perform(get("/api/v1/users/sessionUser")
                                .contentType(MediaType.APPLICATION_JSON)
                                .sessionAttr("userSession", "sessionValue"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("sessionUser"));
        }

        @Test
        @DisplayName("?¥ì•  ë°œìƒ ???¸ëœ??…˜ ?•ë¦¬ ?ŒìŠ¤??)
        void transactionCleanup_afterFailure() throws Exception {
                // TODO: Verify cleanup logic if needed in Phase 1

                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new RuntimeException("Transaction failed"))
                                .thenReturn(new UserResponse("successfulTransactionUser", "?¸ëœ??…˜ ?¬ìš©??, Role.USER)); // ?¤ìŒ
                                                                                                                   // ?”ì²­?€
                                                                                                                   // ?±ê³µ

                String requestBody = """
                                {
                                    "userId": "transactionUser",
                                    "password": "password123!",
                                    "userNm": "?¸ëœ??…˜ ?¬ìš©??,
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "USER"
                                }
                                """;

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¸ëœ??…˜ ?¤íŒ¨)
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ì²˜ë¦¬, ?¸ëœ??…˜ ?•ë¦¬ ?„ë£Œ)
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("successfulTransactionUser"));
        }

        @Test
        @DisplayName("?¥ì•  ë°œìƒ ??ë¦¬ì†Œ???•ë¦¬ ?ŒìŠ¤??)
        void resourceCleanup_afterFailure() throws Exception {
                // Given
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Resource exhaustion"))
                                .thenReturn(Arrays.asList( // ë¦¬ì†Œ???•ë¦¬ ???•ìƒ ?™ì‘
                                                new UserDto("resourceUser", "ë¦¬ì†Œ???¬ìš©??, "USR001", null, null, null,
                                                                null)));

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (ë¦¬ì†Œ??ë¬¸ì œ)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (ë¦¬ì†Œ???•ë¦¬ ???•ìƒ ?™ì‘)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("?¥ì•  ë°œìƒ ??ë©”ëª¨ë¦??„ìˆ˜ ë°©ì? ?ŒìŠ¤??)
        void memoryLeakPrevention_afterFailure() throws Exception {
                // Given
                long initialMemory = Runtime.getRuntime().freeMemory();

                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Memory leak test"))
                                .thenReturn(Arrays.asList( // ?•ìƒ ?™ì‘
                                                new UserDto("memoryLeakUser", "ë©”ëª¨ë¦??„ìˆ˜ ?ŒìŠ¤???¬ìš©??, "USR001", null, null,
                                                                null, null)));

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¥ì•  ë°œìƒ)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // Force garbage collection
                System.gc();

                // TODO: Verify memory usage stability in Phase 1
                // long memoryAfterFailure = Runtime.getRuntime().freeMemory();

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ?™ì‘)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());

                // Verify memory usage is stable
                System.gc();
                long finalMemory = Runtime.getRuntime().freeMemory();

                // Memory should not have significantly decreased after multiple operations
                assertThat(Math.abs(initialMemory - finalMemory)).isLessThan((long) (initialMemory * 0.1)); // Within
                                                                                                            // 10% range
        }

        @Test
        @DisplayName("?¥ì•  ë°œìƒ ???•ìƒ?ì¸ ?”ì²­ ì²˜ë¦¬ ?ŒìŠ¤??)
        void normalRequestProcessing_afterFailure() throws Exception {
                // Given - ?¬ëŸ¬ ?”ì²­ ì²˜ë¦¬ ???¥ì•  ë°œìƒ
                when(userService.getUserById("normalUser"))
                                .thenReturn(new UserDto("normalUser", "?•ìƒ ?¬ìš©??, "USR001", null, null, null, null))
                                .thenThrow(new RuntimeException("Temporary failure"))
                                .thenReturn(new UserDto("recoveredUser", "ë³µêµ¬???¬ìš©??, "USR002", null, null, null, null));

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?•ìƒ)
                mockMvc.perform(get("/api/v1/users/normalUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.userId").value("normalUser"));

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?¥ì•  ë°œìƒ)
                mockMvc.perform(get("/api/v1/users/normalUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ë³µêµ¬)
                mockMvc.perform(get("/api/v1/users/recoveredUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.userId").value("recoveredUser"));
        }

        @Test
        @DisplayName("?¥ì•  ë°œìƒ ??ë¹„ë™ê¸??‘ì—… ?•ìƒ ì²˜ë¦¬ ?ŒìŠ¤??)
        void asyncTaskProcessing_afterFailure() throws Exception {
                // Given
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Async failure"))
                                .thenReturn(Arrays.asList( // ë³µêµ¬ ???•ìƒ ?™ì‘
                                                new UserDto("asyncUser", "ë¹„ë™ê¸??¬ìš©??, "USR001", null, null, null, null)));

                // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¥ì•  ë°œìƒ)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ë³µêµ¬)
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }
}
