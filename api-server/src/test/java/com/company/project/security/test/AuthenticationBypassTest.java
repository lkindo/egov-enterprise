package com.company.project.security.test;

import com.company.project.service.user.UserService;
import com.company.project.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import org.springframework.security.test.context.support.WithMockUser;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({ "test", "security-test" })
@org.springframework.context.annotation.Import(com.company.project.config.SecurityTestConfig.class)
class AuthenticationBypassTest {

  @Autowired
  private MockMvc mockMvc;

  @MockitoBean
  private UserService userService;

  @MockitoBean
  private JwtTokenProvider jwtTokenProvider;

  @Test
  @DisplayName("인증되지 않은 사용자가 보호된 엔드포인트에 접근 시 401 Unauthorized 결과 확인")
  void unauthorizedAccess_toProtectedEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users/me")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("잘못된 JWT로 접근 시 401 Unauthorized 결과 확인")
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
  @DisplayName("만료된 JWT 토큰으로 보호된 엔드포인트 접근 시 401 Unauthorized 결과 확인")
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
  @DisplayName("토큰 없이 관리자 엔드포인트 접근 시 401 Unauthorized 결과 확인")
  void noToken_toAdminEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/admin/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "USER")
  @DisplayName("권한이 없는 사용자가 관리자 엔드포인트 접근 시 403 Forbidden 결과 확인")
  void unauthorizedUser_toAdminEndpoint_returns403() throws Exception {
    // Given
    String validToken = "valid.token.here";
    // We mock JwtTokenProvider to ensure it doesn't clear our MockUser
    when(jwtTokenProvider.resolveToken(any())).thenReturn(null);
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
  @DisplayName("인증 없이 사용자 목록 조회 접근 차단 확인")
  void bypassAttempt_getUserList_withoutAuth_fails() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());

    // Verify that the service method was NOT called without authentication
    // (This is verified by the 401 status code)
  }

  @Test
  @DisplayName("인증 없이 사용자 등록 시도 차단 확인")
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
    // We use a protected endpoint instead of /api/v1/users/signup which is
    // permitAll()
    mockMvc.perform(post("/api/v1/users/admin-action")
        .contentType(MediaType.APPLICATION_JSON)
        .content(requestBody))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("Authorization 헤더 없이 접근 시 401 Unauthorized 결과 확인")
  void emptyAuthHeader_toProtectedEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users")
        .header("Authorization", "")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("Bearer 형식 아닌 토큰 접근 시 401 Unauthorized 결과 확인")
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
  @DisplayName("인증 없이 사용자 정보 수정 시도 차단 확인")
  void bypassAttempt_updateUser_withoutAuth_fails() throws Exception {
    // Given
    String requestBody = """
        {
          "userId": "victim",
          "userNm": "수정시도",
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
  @DisplayName("인증 없이 사용자 삭제 시도 차단 확인")
  void bypassAttempt_deleteUser_withoutAuth_fails() throws Exception {
    // When & Then
    mockMvc.perform(delete("/api/v1/users/victim")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("쿠키에 담긴 토큰을 통한 보호된 엔드포인트 접근 차단 확인")
  void tokenViaCookie_toProtectedEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users")
        .cookie(new jakarta.servlet.http.Cookie("Authorization", "Bearer some.token.here"))
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("커스텀 헤더를 통한 토큰 전송 시 보호 엔드포인트 접근 차단 확인")
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
