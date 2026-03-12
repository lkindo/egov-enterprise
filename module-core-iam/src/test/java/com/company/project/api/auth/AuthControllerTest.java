package com.company.project.api.auth;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.auth.UserAuthorityRepository;
import com.company.project.domain.user.repository.UserRepository;
import com.company.project.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("AuthController 테스트")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthenticationManager authenticationManager;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @MockitoBean
    private UserRepository userRepository;

    @MockitoBean
    private UserAuthorityRepository userAuthorityRepository;

    @Test
    @DisplayName("로그인 성공")
    void login_Success() throws Exception {
        // Given
        Authentication auth = mock(Authentication.class);
        given(auth.getAuthorities()).willAnswer(i -> List.of(new SimpleGrantedAuthority("ROLE_USER")));
        given(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).willReturn(auth);
        given(jwtTokenProvider.createAccessToken(anyString(), anyString())).willReturn("access-token");
        given(jwtTokenProvider.createRefreshToken(anyString())).willReturn("refresh-token");

        // When & Then
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"id\":\"test\", \"password\":\"pass\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("access-token"));
    }

    @Test
    @DisplayName("로그아웃 성공")
    void logout_Success() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
