package com.company.project.web.user;

import com.company.project.api.controller.UserApiController;
import com.company.project.foundation.core.exception.GlobalExceptionHandler;
import com.company.project.foundation.domain.user.entity.Role;
import com.company.project.foundation.service.user.UserService;
import com.company.project.foundation.service.user.dto.UserResponse;
import com.company.project.foundation.service.user.dto.UserSignupRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.Collections;
import java.util.Map;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * UserApiController ?뚯뒪??(Standalone)
 */
class UserApiControllerTest {

    private MockMvc mockMvc;
    private UserService userService;
    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new UserApiController(userService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("?ъ슜??紐⑸줉 議고쉶 - ?깃났")
    void getUserList_success() throws Exception {
        // Given
        when(userService.getUserList()).thenReturn(Collections.emptyList());

        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("?ъ슜???뚯썝媛??- ?깃났")
    void signup_success() throws Exception {
        // Given
        UserResponse mockResponse = new UserResponse("newUser", "?뚯뒪???ъ슜??, Role.USER);
        when(userService.signup(any(UserSignupRequest.class))).thenReturn(mockResponse);

        Map<String, Object> request = Map.of(
                "userId", "newUser",
                "password", "password123!",
                "userNm", "?뚯뒪???ъ슜??,
                "passwordHint", "hint",
                "passwordCnsr", "answer",
                "role", "USER");

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("?ъ슜???뚯썝媛??- 以묐났 ?ъ슜??ID (409)")
    void signup_duplicateUserId() throws Exception {
        // Given
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new com.company.project.foundation.core.exception.BusinessException(
                        com.company.project.foundation.core.exception.ErrorCode.DUPLICATE_USER_ID));

        Map<String, Object> request = Map.of(
                "userId", "admin",
                "password", "password123!",
                "userNm", "以묐났 ?ъ슜??,
                "passwordHint", "hint",
                "passwordCnsr", "answer",
                "role", "USER");

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }
}
