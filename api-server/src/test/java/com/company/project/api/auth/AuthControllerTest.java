package com.company.project.api.auth;

import com.company.project.config.MinimalTestConfig;
import com.company.project.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = MinimalTestConfig.class, properties = "spring.main.allow-bean-definition-overriding=true")
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class AuthControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private AuthenticationManager authenticationManager;

        @MockitoBean
        private JwtTokenProvider jwtTokenProvider;

        @Test
        @DisplayName("로그인 성공 테스트 - 토큰 반환 확인")
        void loginSuccessTest() throws Exception {
                // Given
                Authentication auth = new UsernamePasswordAuthenticationToken(
                                "user01", "password", List.of(new SimpleGrantedAuthority("ROLE_USER")));

                when(authenticationManager.authenticate(any())).thenReturn(auth);
                when(jwtTokenProvider.createAccessToken("user01", "ROLE_USER")).thenReturn("mock-access-token");
                when(jwtTokenProvider.createRefreshToken("user01")).thenReturn("mock-refresh-token");

                String requestBody = """
                                {
                                  "id": "user01",
                                  "password": "password"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.accessToken").value("mock-access-token"))
                                .andExpect(jsonPath("$.data.role").value("ROLE_USER"));
        }

        @Test
        @DisplayName("토큰 재발급(Reissue) 테스트")
        void reissueTest() throws Exception {
                // Given
                when(jwtTokenProvider.validateToken("old-refresh-token")).thenReturn(true);
                when(jwtTokenProvider.getUserId("old-refresh-token")).thenReturn("user01");
                when(jwtTokenProvider.createAccessToken("user01", "ROLE_USER")).thenReturn("new-access-token");

                // When & Then
                mockMvc.perform(post("/api/v1/auth/reissue")
                                .cookie(new jakarta.servlet.http.Cookie("refreshToken", "old-refresh-token")))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data.accessToken").value("new-access-token"));
        }
}
