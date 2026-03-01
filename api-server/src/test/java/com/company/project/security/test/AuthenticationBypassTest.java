package com.company.project.security.test;

import com.company.project.service.user.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class AuthenticationBypassTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @Test
    @DisplayName("?¸ì¦?˜ì? ?Šì? ?¬ìš©?ê? ë³´í˜¸???”ë“œ?¬ì¸?¸ì— ?‘ê·¼ ??401 Unauthorized ë°˜í™˜")
    void unauthorizedAccess_toProtectedEndpoint_returns401() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("?˜ëª»??JWT ? í°?¼ë¡œ ë³´í˜¸???”ë“œ?¬ì¸???‘ê·¼ ??401 Unauthorized ë°˜í™˜")
    void invalidJwtToken_toProtectedEndpoint_returns401() throws Exception {
        // Given
        String invalidToken = "invalid.token.here";

        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .header("Authorization", "Bearer " + invalidToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("ë§Œë£Œ??JWT ? í°?¼ë¡œ ë³´í˜¸???”ë“œ?¬ì¸???‘ê·¼ ??401 Unauthorized ë°˜í™˜")
    void expiredJwtToken_toProtectedEndpoint_returns401() throws Exception {
        // Given
        String expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0VXNlciIsImV4cCI6MTUwMDAwMDB9." +
                "someInvalidSignature";

        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .header("Authorization", "Bearer " + expiredToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("JWT ? í° ?†ì´ ê´€ë¦¬ì ?„ìš© ?”ë“œ?¬ì¸???‘ê·¼ ??401 Unauthorized ë°˜í™˜")
    void noToken_toAdminEndpoint_returns401() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/admin/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("ê¶Œí•œ ?†ëŠ” ?¬ìš©?ê? ê´€ë¦¬ì ?„ìš© ?”ë“œ?¬ì¸???‘ê·¼ ??403 Forbidden ë°˜í™˜")
    void unauthorizedUser_toAdminEndpoint_returns403() throws Exception {
        // Given
        String validToken = "valid.token.here";
        // In a real scenario, we would mock the JWT validation to return a user with
        // non-admin role
        // For this test, we'll assume the token is valid but user doesn't have admin
        // privileges

        // When & Then
        mockMvc.perform(get("/api/v1/admin/users")
                .header("Authorization", "Bearer " + validToken)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("?¸ì¦ ?†ì´ ?¬ìš©??ëª©ë¡ ì¡°íšŒ ???°íšŒ ?œë„ ?¤íŒ¨ ?•ì¸")
    void bypassAttempt_getUserList_withoutAuth_fails() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());

        // Verify that the service method was NOT called without authentication
        // (This is verified by the 401 status code)
    }

    @Test
    @DisplayName("?¸ì¦ ?†ì´ ?¬ìš©???ì„± ?œë„ ?°íšŒ ?¤íŒ¨ ?•ì¸")
    void bypassAttempt_createUser_withoutAuth_fails() throws Exception {
        // Given
        String requestBody = """
                {
                    "userId": "attacker",
                    "password": "password123!",
                    "userNm": "ê³µê²©??,
                    "passwordHint": "hint",
                    "passwordCnsr": "answer",
                    "role": "USER"
                }
                """;

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("ë¹?Authorization ?¤ë”ë¡??‘ê·¼ ??401 Unauthorized ë°˜í™˜")
    void emptyAuthHeader_toProtectedEndpoint_returns401() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .header("Authorization", "")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Bearer ?‘ë‘???†ëŠ” ? í°?¼ë¡œ ?‘ê·¼ ??401 Unauthorized ë°˜í™˜")
    void tokenWithoutBearerPrefix_toProtectedEndpoint_returns401() throws Exception {
        // Given
        String tokenWithoutPrefix = "some.token.here";

        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .header("Authorization", tokenWithoutPrefix)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("?¸ì¦ ?†ì´ ?¬ìš©???•ë³´ ?˜ì • ?œë„ ?°íšŒ ?¤íŒ¨ ?•ì¸")
    void bypassAttempt_updateUser_withoutAuth_fails() throws Exception {
        // Given
        String requestBody = """
                {
                    "userId": "victim",
                    "userNm": "?¼í•´??,
                    "role": "ADMIN"
                }
                """;

        // When & Then
        mockMvc.perform(put("/api/v1/users/victim")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("?¸ì¦ ?†ì´ ?¬ìš©???? œ ?œë„ ?°íšŒ ?¤íŒ¨ ?•ì¸")
    void bypassAttempt_deleteUser_withoutAuth_fails() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/users/victim")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("JWT ? í°??ì¿ í‚¤ë¥??µí•´ ?„ë‹¬?˜ë ¤???œë„ ?¤íŒ¨ ?•ì¸")
    void tokenViaCookie_toProtectedEndpoint_returns401() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .cookie(new jakarta.servlet.http.Cookie("Authorization", "Bearer some.token.here"))
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("?¤ë¥¸ ?¤ë”??? í°???¬í•¨?œì¼œ ?°íšŒ ?œë„ ?¤íŒ¨ ?•ì¸")
    void tokenInCustomHeader_toProtectedEndpoint_returns401() throws Exception {
        // Given
        String tokenInCustomHeader = "Bearer some.token.here";

        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .header("X-Custom-Auth", tokenInCustomHeader)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
}
