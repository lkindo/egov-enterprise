package com.company.project.web.user;

import com.company.project.api.controller.UserApiController;
import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.domain.user.entity.Role;
import com.company.project.foundation.service.user.UserService;
import com.company.project.foundation.service.user.dto.UserDto;
import com.company.project.foundation.service.user.dto.UserResponse;
import com.company.project.foundation.service.user.dto.UserSignupRequest;
import com.company.project.foundation.security.service.CustomUserDetails;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import java.util.Collections;
import java.util.Map;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * UserApiController 통합 테스트 (Standalone)
 * 일반 사용자 및 관리자용 사용자 관리 API를 모두 테스트합니다.
 */
class UserApiControllerTest {

    private MockMvc mockMvc;
    private UserService userService;
    private ObjectMapper objectMapper = new ObjectMapper();
    private static final String TEST_USER_ID = "testUser";

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        
        // Mock LoginUser resolver with consistent user identity
        HandlerMethodArgumentResolver loginUserResolver = new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.getParameterType().equals(CustomUserDetails.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                        NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                CustomUserDetails user = mock(CustomUserDetails.class);
                when(user.getUserId()).thenReturn(TEST_USER_ID);
                return user;
            }
        };

        mockMvc = MockMvcBuilders.standaloneSetup(new UserApiController(userService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(loginUserResolver, new PageableHandlerMethodArgumentResolver())
                .build();
    }

    private UserDto createMockUser() {
        return UserDto.builder()
                .userId(TEST_USER_ID)
                .userNm("testNm")
                .password("password123!") // Add password
                .esntlId("esntl-123")
                .role(Role.USER.name())
                .build();
    }

    // --- 일반 사용자 기능 테스트 ---

    @Test
    @DisplayName("내 프로필 조회 - 성공")
    void getMe_success() throws Exception {
        when(userService.getUserById(eq(TEST_USER_ID))).thenReturn(createMockUser());
        
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("내 프로필 수정 - 성공")
    void updateMe_success() throws Exception {
        mockMvc.perform(put("/api/v1/users/me")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createMockUser())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        
        verify(userService).updateUser(eq(TEST_USER_ID), any(UserDto.class));
    }

    @Test
    @DisplayName("사용자 회원가입 - 성공")
    void signup_success() throws Exception {
        UserResponse mockResponse = new UserResponse("newUser", "테스트사용자", Role.USER);
        when(userService.signup(any(UserSignupRequest.class))).thenReturn(mockResponse);

        Map<String, Object> request = Map.of(
                "userId", "newUser",
                "password", "password123!",
                "userNm", "테스트사용자",
                "passwordHint", "hint",
                "passwordCnsr", "answer",
                "role", "USER");

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // --- 관리자 기능 테스트 ---

    @Test
    @DisplayName("관리자: 사용자 목록 조회 - 성공")
    void getUsers_admin_success() throws Exception {
        when(userService.getPagedUserList(any())).thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/v1/admin/system/users")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("관리자: 사용자 상세 조회 - 성공")
    void getUser_admin_success() throws Exception {
        when(userService.getUserById("user01")).thenReturn(createMockUser());

        mockMvc.perform(get("/api/v1/admin/system/users/user01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value(TEST_USER_ID));
    }

    @Test
    @DisplayName("관리자: 사용자 삭제 - 성공")
    void deleteUser_admin_success() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/system/users/{userId}", "user01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        
        verify(userService).deleteUser("user01");
    }

    @Test
    @DisplayName("아이디 중복 확인 - 성공")
    void checkIdDplct_success() throws Exception {
        when(userService.checkIdDplct("user01")).thenReturn(true);

        mockMvc.perform(get("/api/v1/users/check-id")
                .param("userId", "user01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(true));
    }
}
