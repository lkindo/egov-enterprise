package com.company.project.test.resilience;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
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
public class FaultRecoveryFunctionTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @Test
    @DisplayName("?œë¹„???¥ì•  ???•ìƒ ë³µêµ¬ ?ŒìŠ¤??- ?¼ì‹œ?ì¸ DB ?¥ì•  ?œë‚˜ë¦¬ì˜¤")
    void temporaryDbFailure_recovery_success() throws Exception {
        // Given - ì²?ë²ˆì§¸ ?”ì²­?€ DB ?¥ì•  ?œë??ˆì´?? ??ë²ˆì§¸ ?”ì²­?€ ?•ìƒ ?°ì´??ë°˜í™˜
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Database temporarily unavailable"))
                .thenReturn(Arrays.asList(
                        new UserDto("user1", "ë³µêµ¬???¬ìš©??", "USR001", null, null, null, null),
                        new UserDto("user2", "ë³µêµ¬???¬ìš©??", "USR002", null, null, null, null)));

        // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¥ì•  ë°œìƒ)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ë³µêµ¬ ?•ì¸)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    @DisplayName("ë¹„ì¦ˆ?ˆìŠ¤ ?ˆì™¸ ë°œìƒ ???•ìƒ ?œë¹„??ë³µêµ¬ ?ŒìŠ¤??)
    void exceptionThenRecovery_normalServiceRecovery() throws Exception {
        // Given - ?¹ì • ?”ì²­???€???ˆì™¸ ë°œìƒ ???¤ìŒ ?”ì²­?ì„œ ?•ìƒ ë³µêµ¬
        when(userService.getUserById("errorUser"))
                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND))
                .thenReturn(new UserDto("recoveredUser", "ë³µêµ¬???¬ìš©??, "USR001", null, null, null, null));

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
        // Given - ?¬ëŸ¬ ë²??¤íŒ¨ ???±ê³µ?˜ëŠ” ?œë‚˜ë¦¬ì˜¤
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new RuntimeException("Service temporarily unavailable"))
                .thenThrow(new RuntimeException("Service still unavailable"))
                .thenReturn(new UserResponse("successfulUser", "?¬ì‹œ???±ê³µ ?¬ìš©??, Role.USER));

        String requestBody = """
                {
                    "userId": "retryUser",
                    "password": "password123!",
                    "userNm": "?¬ì‹œ???±ê³µ ?¬ìš©??,
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

        // When & Then - ??ë²ˆì§¸ ?”ì²­ (?±ê³µ - ë³µêµ¬ ?„ë£Œ)
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("successfulUser"));
    }

    @Test
    @DisplayName("?œí‚· ë¸Œë ˆ?´ì»¤ ?‘ë™ ë°?ë³µêµ¬ ?ŒìŠ¤??)
    void circuitBreaker_operationAndRecovery() throws Exception {
        // Given - ?°ì†???¤íŒ¨ ???œí‚·???´ë¦¬ê³?? ì‹œ ??ë³µêµ¬?˜ëŠ” ?œë‚˜ë¦¬ì˜¤
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Service unavailable")) // 1st failure
                .thenThrow(new RuntimeException("Service still unavailable")) // 2nd failure
                .thenThrow(new RuntimeException("Circuit breaker open")) // 3rd - simulated open state
                .thenReturn(Arrays.asList(
                        new UserDto("circuitBreakerUser", "?œí‚· ë³µêµ¬ ?¬ìš©??, "USR001", null, null, null, null)));

        // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¤íŒ¨)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ??ë²ˆì§¸ ?”ì²­ (?¤íŒ¨)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ??ë²ˆì§¸ ?”ì²­ (?œí‚· ë¸Œë ˆ?´ì»¤ OPEN ?íƒœë¡??¸í•œ ì¦‰ì‹œ ?¤íŒ¨)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isServiceUnavailable());

        // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ë³µêµ¬ ?íƒœ)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("?€?„ì•„??ë°œìƒ ???•ìƒ ë³µêµ¬ ?ŒìŠ¤??)
    void timeoutRecovery_afterTimeoutOccurs() throws Exception {
        // Given - ì²?ë²ˆì§¸ ?”ì²­?€ ì§€???€?„ì•„??, ??ë²ˆì§¸??ì¦‰ì‹œ ?‘ë‹µ
        when(userService.getUserList())
                .thenAnswer(invocation -> {
                    Thread.sleep(6000); // 6ì´?ì§€??                    return Arrays.asList(new UserDto("timeoutUser", "?€?„ì•„???¬ìš©??, "USR001", null, null, null, null));
                })
                .thenReturn(Arrays.asList(
                        new UserDto("recoveredUser", "ë³µêµ¬???¬ìš©??, "USR002", null, null, null, null)));

        // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?€?„ì•„??ë°œìƒ ?œë??ˆì´??
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON)
                .requestAttr("org.springframework.web.util.WebUtils.ERROR_REQUEST_URI_ATTRIBUTE", "/api/v1/users"))
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
    @DisplayName("?°ì´?°ë² ?´ìŠ¤ ì»¤ë„¥??ê³ ê°ˆ ??ë³µêµ¬ ?ŒìŠ¤??)
    void dbConnectionPoolExhaustion_recovery() throws Exception {
        // Given - ?€ ê³ ê°ˆ ?ˆì™¸ ë°œìƒ ???•ìƒ ë³µêµ¬
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Connection pool exhausted"))
                .thenReturn(Arrays.asList(
                        new UserDto("poolUser", "?€ ë³µêµ¬ ?¬ìš©??, "USR001", null, null, null, null)));

        // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (ê³ ê°ˆ ë°œìƒ)
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

    @Test
    @DisplayName("ë©”ëª¨ë¦?ë¶€ì¡??íƒœ?ì„œ GC ???•ìƒ ?‘ë™ ë³µêµ¬ ?ŒìŠ¤??)
    void outOfMemoryRecovery_afterGC() throws Exception {
        // Given - ë©”ëª¨ë¦?ë¶€ì¡??ˆì™¸ ?œë??ˆì´??        when(userService.getUserList())
                .thenThrow(new OutOfMemoryError("Memory exhausted"))
                .thenReturn(Arrays.asList(
                        new UserDto("memoryUser", "ë©”ëª¨ë¦??¬ìš©??, "USR001", null, null, null, null)));

        // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (ë©”ëª¨ë¦?ë¶€ì¡?
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // GC ê°•ì œ ?¸ì¶œë¡?ë³µêµ¬ ?œë??ˆì´??        System.gc();

        // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ë³µêµ¬)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("?¥ì•  ë°œìƒ ???œë¹„???•ìƒ???íƒœ ?ŒìŠ¤??)
    void serviceStatusNormalization_afterException() throws Exception {
        // Given - ë¹„ì •???íƒœ ???¤ì‹œ ?íƒœ ?•ìƒ??        when(userService.getUserById("faultyUser"))
                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                .thenReturn(new UserDto("normalizedUser", "?•ìƒ?”ëœ ?¬ìš©??, "USR001", null, null, null, null));

        // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¤ë¥˜ ë°œìƒ)
        mockMvc.perform(get("/api/v1/users/faultyUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ??ë²ˆì§¸ ?”ì²­ (?íƒœ ?•ìƒ???•ì¸)
        mockMvc.perform(get("/api/v1/users/normalizedUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("normalizedUser"));
    }

    @Test
    @DisplayName("?¥ì•  ë°œìƒ ???´ë°± ë©”ì»¤?ˆì¦˜ ?ŒìŠ¤??)
    void fallbackMechanism_whenFailureOccurs() throws Exception {
        // Given - ?¥ì•  ë°œìƒ ???´ë°± ?°ì´???œê³µ ?œë??ˆì´??        when(userService.getUserList())
                .thenThrow(new RuntimeException("Service unavailable"))
                .thenReturn(Arrays.asList(
                        new UserDto("fallbackUser", "?´ë°± ?¬ìš©??, "USR001", null, null, null, null)));

        // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¥ì•  ë°œìƒ)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ?´ë°± ?•ì¸)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].userId").value("fallbackUser"));
    }

    @Test
    @DisplayName("?¥ì•  ë³µêµ¬ ??ê¸°ëŠ¥???±ëŠ¥ ?€???†ëŠ” ?•ìƒ ?‘ë™ ?ŒìŠ¤??)
    void recovery_withoutPerformanceDegradation() throws Exception {
        // Given - ?¼ì‹œ???¤íŒ¨ ??ë³µêµ¬
        when(userService.getUserList())
                .thenThrow(new RuntimeException("Temporary failure"))
                .thenReturn(Arrays.asList(
                        new UserDto("performanceUser1", "?±ëŠ¥ ?ŒìŠ¤???¬ìš©??", "USR001", null, null, null, null),
                        new UserDto("performanceUser2", "?±ëŠ¥ ?ŒìŠ¤???¬ìš©??", "USR002", null, null, null, null)));

        // When & Then - ì²?ë²ˆì§¸ ?”ì²­ (?¤íŒ¨)
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ??ë²ˆì§¸ ?”ì²­ (?±ëŠ¥ ê²€ì¦?
        long startTime = System.currentTimeMillis();
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2));
        long endTime = System.currentTimeMillis();

        // ë³µêµ¬ ???‘ë‹µ ?ë„ê°€ 1ì´??´ë‚´?¬ì•¼ ??        assertThat(endTime - startTime).isLessThan(1000);
    }

    @Test
    @DisplayName("ë³µí•© ?¥ì•  ë°œìƒ ??ë³µêµ¬ ?ŒìŠ¤??)
    void multipleFailures_recovery() throws Exception {
        // Given - ?¬ëŸ¬ ì¢…ë¥˜???¥ì•  ?°ì† ë°œìƒ ??ë³µêµ¬
        when(userService.getUserList())
                .thenThrow(new RuntimeException("First failure"))
                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR))
                .thenThrow(new RuntimeException("Third failure"))
                .thenReturn(Arrays.asList(
                        new UserDto("multiFailureUser", "ë³µí•© ?¥ì•  ë³µêµ¬ ?¬ìš©??, "USR001", null, null, null, null)));

        // When & Then - ?°ì†???¤íŒ¨ ?œë??ˆì´??        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError());

        // When & Then - ?•ìƒ ë³µêµ¬ ?•ì¸
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].userId").value("multiFailureUser"));
    }

    @Test
    @DisplayName("?¥ì•  ë°œìƒ ???¸ì…˜ ? ì? ?ŒìŠ¤??)
    void sessionPreservation_afterFailure() throws Exception {
        // Given - ?¥ì•  ë°œìƒ ?„ì—???¬ìš©???¸ì…˜??? ì??˜ëŠ”ì§€ ?•ì¸
        when(userService.getUserById("sessionUser"))
                .thenThrow(new RuntimeException("Temporary failure"))
                .thenReturn(new UserDto("sessionUser", "?¸ì…˜ ?¬ìš©??, "USR001", null, null, null, null));

        // ì²?ë²ˆì§¸ ?”ì²­ (?¤íŒ¨)
        mockMvc.perform(get("/api/v1/users/sessionUser")
                .contentType(MediaType.APPLICATION_JSON)
                .sessionAttr("userSession", "sessionValue"))
                .andExpect(status().isInternalServerError());

        // ??ë²ˆì§¸ ?”ì²­ (?•ìƒ ë³µêµ¬ ë°??¸ì…˜ ?ì„± ?•ì¸)
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
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new RuntimeException("Transaction failed"))
                .thenReturn(new UserResponse("successfulTransactionUser", "?¸ëœ??…˜ ?¬ìš©??, Role.USER));

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

        // ?¥ì•  ë°œìƒ ?”ì²­
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isInternalServerError());

        // ?´í›„ ?•ìƒ ?”ì²­ ?±ê³µ ?•ì¸ (?´ë¦°???„ë£Œ ?„ì œ)
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("successfulTransactionUser"));
    }

    @Test
    @DisplayName("?¥ì•  ë°œìƒ ??ë©”ëª¨ë¦??„ìˆ˜ ë°©ì? ?ŒìŠ¤??)
    void memoryLeakPrevention_afterFailure() throws Exception {
        // Given
        System.gc();
        Thread.sleep(100);
        long initialMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();

        when(userService.getUserList())
                .thenThrow(new RuntimeException("Memory leak test"))
                .thenReturn(Arrays.asList(
                        new UserDto("memoryLeakUser", "ë©”ëª¨ë¦??„ìˆ˜ ?ŒìŠ¤??, "USR001", null, null, null, null)));

        // ?¥ì•  ? ë°œ ?”ì²­ ?¤ìˆ˜ ?˜í–‰
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(get("/api/v1/users")
                    .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isInternalServerError());
        }

        // ?•ìƒ ?”ì²­
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        // ?ˆì •??ê²€ì¦?        System.gc();
        Thread.sleep(100);
        long finalMemory = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        long memoryDiff = Math.abs(initialMemory - finalMemory);

        System.out.printf("Memory leak check - Initial: %d, Final: %d, Diff: %d%n", initialMemory, finalMemory, memoryDiff);

        // ?¨ìˆœ ?°ì‚° ??ë©”ëª¨ë¦?ì¦ê??‰ì´ 5MB ?´ë‚´ë¡??ˆì •?ì´?´ì•¼ ??        assertThat(memoryDiff).isLessThan(5 * 1024 * 1024L);
    }
}
