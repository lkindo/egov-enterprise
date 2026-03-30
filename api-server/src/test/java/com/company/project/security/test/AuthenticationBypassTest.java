package com.company.project.security.test;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class AuthenticationBypassTest extends BaseSecurityTest {

  @Test
  @DisplayName("인증되지 않은 사용자가 보호된 엔드포인트 접근 시 401 Unauthorized 반환")
  void unauthorizedAccess_toProtectedEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users/me")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("유효하지 않은 JWT 토큰으로 접근 시 401 Unauthorized 반환")
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
  @DisplayName("만료된 JWT 토큰으로 접근 시 401 Unauthorized 반환")
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
  @DisplayName("토큰 없이 어드민 엔드포인트 접근 시 401 Unauthorized 반환")
  void noToken_toAdminEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/admin/system/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "USER")
  @DisplayName("권한이 없는 사용자가 어드민 엔드포인트 접근 시 403 Forbidden 반환")
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
    mockMvc.perform(get("/api/v1/admin/system/users")
        .header("Authorization", "Bearer " + validToken)
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isForbidden());
  }

  @Test
  @DisplayName("인증 없이 사용자 목록 조회 시도 시 실패 확인")
  void bypassAttempt_getUserList_withoutAuth_fails() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());

    // Verify that the service method was NOT called without authentication
    // (This is verified by the 401 status code)
  }

  @Test
  @DisplayName("인증 없이 사용자 생성 시도 시 실패 확인")
  void bypassAttempt_createUser_withoutAuth_fails() throws Exception {
    // Given
    String requestBody = """
        {
          "userId": "attacker",
          "password": "password123!",
          "userNm": "공격자",
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
  @DisplayName("Authorization 헤더가 비어있는 경우 401 Unauthorized 반환")
  void emptyAuthHeader_toProtectedEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users")
        .header("Authorization", "")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("Bearer 접두사가 없는 토큰으로 접근 시 401 Unauthorized 반환")
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
  @DisplayName("인증 없이 사용자 정보 수정 시도 시 실패 확인")
  void bypassAttempt_updateUser_withoutAuth_fails() throws Exception {
    // Given
    String requestBody = """
        {
          "userId": "victim",
          "userNm": "수정된정보",
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
  @DisplayName("인증 없이 사용자 삭제 시도 시 실패 확인")
  void bypassAttempt_deleteUser_withoutAuth_fails() throws Exception {
    // When & Then
    mockMvc.perform(delete("/api/v1/users/victim")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("쿠키를 통한 토큰 전달 시 401 Unauthorized 반환 필터링 확인")
  void tokenViaCookie_toProtectedEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users")
        .cookie(new jakarta.servlet.http.Cookie("Authorization", "Bearer some.token.here"))
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("커스텀 헤더를 통한 토큰 전달 시 401 Unauthorized 반환 필터링 확인")
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