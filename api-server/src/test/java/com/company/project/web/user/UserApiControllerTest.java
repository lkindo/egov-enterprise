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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import java.util.List;
import java.util.Map;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * UserApiController 테스트 (Standalone)
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
                .setCustomArgumentResolvers(loginUserResolver)
                .build();
    }

    private UserDto createMockUser() {
        return UserDto.builder()
                .userId(TEST_USER_ID)
                .userNm("testNm")
                .esntlId("esntl-123")
                .role(Role.USER.name())
                .build();
    }

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
    @DisplayName("비밀번호 변경 - 성공")
    void changePassword_success() throws Exception {
        Map<String, String> request = Map.of("oldPassword", "old", "newPassword", "new");
        
        mockMvc.perform(put("/api/v1/users/me/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        
        verify(userService).changePassword(eq(TEST_USER_ID), eq("old"), eq("new"));
    }

    @Test
    @DisplayName("사용자 목록 조회 - 성공")
    void getUserList_success() throws Exception {
        when(userService.getUserList()).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("사용자 목록 조회 (페이징) - 성공")
    void getPagedUserList_success() throws Exception {
        when(userService.getPagedUserList(any())).thenReturn(org.springframework.data.domain.Page.empty());

        mockMvc.perform(get("/api/v1/users/paged")
                .param("page", "0")
                .param("size", "10")
                .param("sortDir", "desc"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("사용자 상세 조회 - 성공")
    void getUserById_success() throws Exception {
        when(userService.getUserById("testId")).thenReturn(createMockUser());

        mockMvc.perform(get("/api/v1/users/{id}", "testId"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("사용자 정보 수정 - 성공")
    void updateUser_success() throws Exception {
        mockMvc.perform(put("/api/v1/users/{id}", "testId")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createMockUser())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        
        verify(userService).updateUser(eq("testId"), any(UserDto.class));
    }

    @Test
    @DisplayName("사용자 삭제 - 성공")
    void deleteUser_success() throws Exception {
        mockMvc.perform(delete("/api/v1/users/{id}", "testId"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        
        verify(userService).deleteUser("testId");
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

    @Test
    @DisplayName("사용자 회원가입 - 중복 사용자 ID (409)")
    void signup_duplicateUserId() throws Exception {
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new com.company.project.foundation.core.exception.BusinessException(
                        com.company.project.foundation.core.exception.ErrorCode.DUPLICATE_USER_ID));

        Map<String, Object> request = Map.of(
                "userId", "admin",
                "password", "password123!",
                "userNm", "중복사용자",
                "passwordHint", "hint",
                "passwordCnsr", "answer",
                "role", "USER");

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }
}
