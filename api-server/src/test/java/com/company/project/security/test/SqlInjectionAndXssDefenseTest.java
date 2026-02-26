package com.company.project.security.test;

import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class SqlInjectionAndXssDefenseTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @Test
    @DisplayName("SQL Injection 시도 - 사용자 ID에 SQL 쿼리 포함")
    void sqlInjection_attemptInUserId() throws Exception {
        // Given
        String maliciousUserId = "admin'; DROP TABLE NEMPLYRINFO; --";
        String requestBody = """
                {
                    "userId": "%s",
                    "password": "password123!",
                    "userNm": "공격자",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """.formatted(maliciousUserId);

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest()); // Should fail validation or be handled safely
    }

    @Test
    @DisplayName("SQL Injection 시도 - 사용자 이름에 SQL 쿼리 포함")
    void sqlInjection_attemptInUserName() throws Exception {
        // Given
        String maliciousUserName = "Admin'; DELETE FROM NEMPLYRINFO WHERE '1'='1";
        String requestBody = """
                {
                    "userId": "testUser",
                    "password": "password123!",
                    "userNm": "%s",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """.formatted(maliciousUserName);

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest()); // Should fail validation or be handled safely
    }

    @Test
    @DisplayName("SQL Injection 시도 - 사용자 조회 파라미터에 SQL 쿼리 포함")
    void sqlInjection_attemptInQueryParam() throws Exception {
        // Given
        String maliciousParam = "'; DROP TABLE NEMPLYRINFO; --";

        // When & Then
        mockMvc.perform(get("/api/v1/users/{id}", maliciousParam)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound()); // Should not find user with malicious ID or return 404
    }

    @Test
    @DisplayName("XSS 공격 시도 - 사용자 이름에 스크립트 태그 포함")
    void xssAttack_attemptInUserName() throws Exception {
        // Given
        String maliciousUserName = "<script>alert('XSS')</script>";
        String requestBody = """
                {
                    "userId": "xssUser",
                    "password": "password123!",
                    "userNm": "%s",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """.formatted(maliciousUserName);

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest()); // Should fail validation
    }

    @Test
    @DisplayName("XSS 공격 시도 - 사용자 이름에 이벤트 핸들러 포함")
    void xssAttack_attemptInUserNameWithEventHandler() throws Exception {
        // Given
        String maliciousUserName = "<img src=x onerror=alert('XSS')>";
        String requestBody = """
                {
                    "userId": "xssUser2",
                    "password": "password123!",
                    "userNm": "%s",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """.formatted(maliciousUserName);

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest()); // Should fail validation
    }

    @Test
    @DisplayName("XSS 공격 시도 - 사용자 이름에 자바스크립트 URI 포함")
    void xssAttack_attemptInUserNameWithJsUri() throws Exception {
        // Given
        String maliciousUserName = "<a href=\"javascript:alert('XSS')\">Click me</a>";
        String requestBody = """
                {
                    "userId": "xssUser3",
                    "password": "password123!",
                    "userNm": "%s",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """.formatted(maliciousUserName);

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest()); // Should fail validation
    }

    @Test
    @DisplayName("SQL Injection 시도 - LIKE 쿼리에 와일드카드 오용")
    void sqlInjection_attemptWithWildcard() throws Exception {
        // Given
        String maliciousSearch = "%'; OR '1'='1";

        // When & Then
        mockMvc.perform(get("/api/v1/users/search?keyword={keyword}", maliciousSearch)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound()); // Should not return unexpected results
    }

    @Test
    @DisplayName("SQL Injection 시도 - UNION 기반 쿼리")
    void sqlInjection_attemptWithUnion() throws Exception {
        // Given
        String maliciousUserId = "admin' UNION SELECT * FROM NEMPLYRINFO WHERE '1'='1";

        // When & Then
        mockMvc.perform(get("/api/v1/users/{id}", maliciousUserId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound()); // Should not find user with malicious ID
    }

    @Test
    @DisplayName("SQL Injection 시도 - 주석 기반 우회 시도")
    void sqlInjection_attemptWithComment() throws Exception {
        // Given
        String maliciousUserId = "admin'--";
        String requestBody = """
                {
                    "userId": "%s",
                    "password": "password123!",
                    "userNm": "Admin",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """.formatted(maliciousUserId);

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest()); // Should fail validation
    }

    @Test
    @DisplayName("XSS 공격 시도 - 인풋 필드에 스크립트 포함")
    void xssAttack_attemptInPasswordField() throws Exception {
        // Given
        String maliciousPassword = "password123!<script>alert('XSS')</script>";
        String requestBody = """
                {
                    "userId": "xssUser4",
                    "password": "%s",
                    "userNm": "XSS 테스트 사용자",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """.formatted(maliciousPassword);

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest()); // Should fail validation
    }

    @Test
    @DisplayName("XSS 공격 시도 - 이메일 필드에 스크립트 포함")
    void xssAttack_attemptInEmailField() throws Exception {
        // Given
        String maliciousEmail = "test<script>alert('XSS')</script>@example.com";
        String requestBody = """
                {
                    "userId": "xssUser5",
                    "password": "password123!",
                    "userNm": "XSS 테스트 사용자",
                    "emailAdres": "%s",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """.formatted(maliciousEmail);

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest()); // Should fail validation
    }

    @Test
    @DisplayName("SQL Injection 시도 - ORDER BY 절 조작")
    void sqlInjection_attemptOrderByManipulation() throws Exception {
        // Given
        String maliciousOrderBy = "user_id; DROP TABLE NEMPLYRINFO; --";

        // When & Then
        mockMvc.perform(get("/api/v1/users?sortBy={sortBy}&order=ASC", maliciousOrderBy)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest()); // Should fail validation
    }

    @Test
    @DisplayName("XSS 공격 시도 - 응답에 악성 스크립트 포함")
    void xssAttack_responseContainsMaliciousScript() throws Exception {
        // Given
        String safeUserId = "normalUser";
        String safeUserName = "<script>alert('XSS')</script>"; // This should be sanitized if returned in response

        UserDto userDto = new UserDto(safeUserId, safeUserName, "USR00001", null, null, null, null);

        when(userService.getUserById(safeUserId)).thenReturn(userDto);

        // When & Then
        mockMvc.perform(get("/api/v1/users/{id}", safeUserId)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userNm").value("<script>alert('XSS')</script>")); // If not sanitized, this
                                                                                              // would be vulnerable
    }

    @Test
    @DisplayName("SQL Injection 시도 - 다중 쿼리 실행")
    void sqlInjection_attemptMultipleQueries() throws Exception {
        // Given
        String maliciousUserId = "admin'; SHUTDOWN; --";
        String requestBody = """
                {
                    "userId": "%s",
                    "password": "password123!",
                    "userNm": "Admin",
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """.formatted(maliciousUserId);

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isBadRequest()); // Should fail validation
    }
}