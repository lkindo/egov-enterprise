package com.company.project.web.user;

import com.company.project.api.controller.UserController;
import com.company.project.domain.user.Role;
import com.company.project.security.jwt.JwtTokenProvider;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.batch.BatchAutoConfiguration;
import org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 사용자 API 컨트롤러 슬라이스 테스트
 */
@WebMvcTest(controllers = UserController.class, excludeAutoConfiguration = {
                DataSourceAutoConfiguration.class,
                JpaRepositoriesAutoConfiguration.class,
                HibernateJpaAutoConfiguration.class,
                BatchAutoConfiguration.class
})
@ActiveProfiles("test")
class UserApiControllerTest {

        @Autowired
        private MockMvc mockMvc;

        @Autowired
        private ObjectMapper objectMapper;

        @MockBean
        private UserService userService;

        @MockBean
        private PasswordEncoder passwordEncoder;

        @MockBean
        private JwtTokenProvider jwtTokenProvider;

        @MockBean
        private AuthenticationManager authenticationManager;

        @Test
        @DisplayName("사용자 목록 조회 - 관리자")
        void getUserList_admin() throws Exception {
                // Given
                when(jwtTokenProvider.validateToken(any())).thenReturn(true);
                when(userService.getUserList()).thenReturn(Collections.emptyList());

                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .header("Authorization", "Bearer admin-token")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andDo(print())
                                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("회원가입 - 성공")
        void signup_success() throws Exception {
                // Given
                UserResponse mockResponse = new UserResponse("newUser", "새 사용자", Role.USER);
                when(userService.signup(any(UserSignupRequest.class))).thenReturn(mockResponse);

                Map<String, Object> request = Map.of(
                                "userId", "newUser",
                                "password", "password123",
                                "userNm", "새 사용자",
                                "passwordHint", "hint",
                                "passwordCnsr", "answer");

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andDo(print())
                                .andExpect(status().isOk());
        }

        @Test
        @DisplayName("회원가입 - 중복 사용자 ID (400)")
        void signup_duplicateUserId() throws Exception {
                // Given
                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new com.company.project.core.exception.BusinessException(
                                                com.company.project.core.exception.ErrorCode.DUPLICATE_USER_ID));

                Map<String, Object> request = Map.of(
                                "userId", "admin",
                                "password", "password123",
                                "userNm", "중복 사용자");

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(request)))
                                .andDo(print())
                                .andExpect(status().isBadRequest());
        }
}
