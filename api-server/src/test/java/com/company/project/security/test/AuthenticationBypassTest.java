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
  @DisplayName("?紐꾩쵄??? ??? ????癒? 癰귣똾????遺얜굡????紐꾨퓠 ?臾롫젏 ??401 Unauthorized 野껉퀗???類ㅼ뵥")
  void unauthorizedAccess_toProtectedEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users/me")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("??롢걵??JWT嚥??臾롫젏 ??401 Unauthorized 野껉퀗???類ㅼ뵥")
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
  @DisplayName("筌띾슢利??JWT ?醫뤾쿃??곗쨮 癰귣똾????遺얜굡??????臾롫젏 ??401 Unauthorized 野껉퀗???類ㅼ뵥")
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
  @DisplayName("?醫뤾쿃 ??곸뵠 ?온?귐딆쁽 ?遺얜굡??????臾롫젏 ??401 Unauthorized 野껉퀗???類ㅼ뵥")
  void noToken_toAdminEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/admin/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "USER")
  @DisplayName("亦낅슦釉????용뮉 ????癒? ?온?귐딆쁽 ?遺얜굡??????臾롫젏 ??403 Forbidden 野껉퀗???類ㅼ뵥")
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
  @DisplayName("?紐꾩쵄 ??곸뵠 ?????筌뤴뫖以?鈺곌퀬???臾롫젏 筌△뫀???類ㅼ뵥")
  void bypassAttempt_getUserList_withoutAuth_fails() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());

    // Verify that the service method was NOT called without authentication
    // (This is verified by the 401 status code)
  }

  @Test
  @DisplayName("?紐꾩쵄 ??곸뵠 ??????源낆쨯 ??뺣즲 筌△뫀???類ㅼ뵥")
  void bypassAttempt_createUser_withoutAuth_fails() throws Exception {
    // Given
    String requestBody = """
        {
          "userId": "attacker",
          "password": "password123!",
          "userNm": "???뮞??,
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
  @DisplayName("Authorization ??삳쐭 ??곸뵠 ?臾롫젏 ??401 Unauthorized 野껉퀗???類ㅼ뵥")
  void emptyAuthHeader_toProtectedEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users")
        .header("Authorization", "")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("Bearer ?類ㅻ뻼 ?袁⑤빒 ?醫뤾쿃 ?臾롫젏 ??401 Unauthorized 野껉퀗???類ㅼ뵥")
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
  @DisplayName("?紐꾩쵄 ??곸뵠 ??????類ｋ궖 ??륁젟 ??뺣즲 筌△뫀???類ㅼ뵥")
  void bypassAttempt_updateUser_withoutAuth_fails() throws Exception {
    // Given
    String requestBody = """
        {
          "userId": "victim",
          "userNm": "??륁젟??뺣즲",
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
  @DisplayName("?紐꾩쵄 ??곸뵠 ???????????뺣즲 筌△뫀???類ㅼ뵥")
  void bypassAttempt_deleteUser_withoutAuth_fails() throws Exception {
    // When & Then
    mockMvc.perform(delete("/api/v1/users/victim")
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("?묒쥚沅????용┸ ?醫뤾쿃?????립 癰귣똾????遺얜굡??????臾롫젏 筌△뫀???類ㅼ뵥")
  void tokenViaCookie_toProtectedEndpoint_returns401() throws Exception {
    // When & Then
    mockMvc.perform(get("/api/v1/users")
        .cookie(new jakarta.servlet.http.Cookie("Authorization", "Bearer some.token.here"))
        .contentType(MediaType.APPLICATION_JSON))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("?뚣끉??? ??삳쐭?????립 ?醫뤾쿃 ?袁⑸꽊 ??癰귣똾???遺얜굡??????臾롫젏 筌△뫀???類ㅼ뵥")
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
