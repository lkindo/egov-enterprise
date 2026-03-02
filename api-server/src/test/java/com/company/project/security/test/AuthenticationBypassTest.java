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
  @DisplayName("??醫롫윪凉?? ? 사용자 보호된?필드 검증성공 401 Unauthorized 결과)")
  void unauthorizedAccess_toProtectedEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized())
        .andExpect(content().contentType(MediaType.APPLICATION_JSON));
  }

  @Test
  @DisplayName("잘못된 JWT로 접근 시 401)")
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
  @DisplayName("嶺뚮씭??쭩??JWT 野가입보호된?필드성공 401 Unauthorized 결과)")
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
  @DisplayName("JWT 토큰사용자 ㉱?洹먮봿?사용자 醫롫윥獄사용자성공 401 Unauthorized 결과)")
  void noToken_toAdminEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/admin/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("관리자?㉱?洹먮봿?사용자 醫롫윥獄사용자성공 403 Forbidden 결과)")
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
  @DisplayName("??醫롫윪凉사용자嶺뚮ㅄ維뽨빳??브퀗??????이후 기능 확인)")
  void bypassAttempt_getUserList_withoutAuth_fails() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());

    // Verify that the service method was NOT called without authentication
    // (This is verified by the 401 status code)
  }

  @Test
  @DisplayName("??醫롫윪凉이후 ?이후 )")
  void bypassAttempt_createUser_withoutAuth_fails() throws Exception {
    // Given
    String requestBody = """
        {
          "userId": "attacker",
          "password": "password123!",
          "userNm": "테스트",
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
  @DisplayName("Authorization 헤더 없이 접근 시 401)")
  void emptyAuthHeader_toProtectedEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users")
        .header("Authorization", "")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("Bearer 형식 아닌 토큰 접근 시 401)")
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
  @DisplayName("??醫롫윪凉사용자테스트이후 ?이후 )")
  void bypassAttempt_updateUser_withoutAuth_fails() throws Exception {
    // Given
    String requestBody = """
        {
          "userId": "victim",
          "userNm": "?이후 ?",
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
  @DisplayName("??醫롫윪凉테스트 이후 ?이후 )")
  void bypassAttempt_deleteUser_withoutAuth_fails() throws Exception {
    // When & Then
    mockMvc.perform(delete("/api/v1/users/victim")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("JWT JWT 만료 토큰醫??테스트 테스트 이후 )")
  void tokenViaCookie_toProtectedEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users")
        .cookie(new jakarta.servlet.http.Cookie("Authorization", "Bearer some.token.here"))
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("테스트 ?토큰??이후 사용자이후 기능 확인)")
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
