package com.company.project.integration;

import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Arrays;
import java.util.List;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = UserControllerServiceLayerIntegrationTest.TestConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.transaction.annotation.Transactional
@ActiveProfiles("test")
class UserControllerServiceLayerIntegrationTest {

    @org.springframework.context.annotation.Configuration
    @org.springframework.context.annotation.Import({
            com.company.project.config.MinimalTestConfig.class,
            com.company.project.api.common.exception.GlobalExceptionHandler.class,
            com.company.project.api.controller.UserController.class
    })
    static class TestConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserService userService;

    @Test
    @DisplayName("POST /api/v1/users/signup - Verify service layer call")
    void signup_endpoint_callsServiceLayer() throws Exception {
        // Given
        UserResponse response = new UserResponse(
                "testUser",
                "Test User",
                null);

        when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

        String requestBody = """
                {
                  "userId": "testUser",
                  "password": "password123!",
                  "userNm": "Test User",
                  "passwordHint": "hint",
                  "passwordCnsr": "answer",
                  "role": "USER"
                }
                """;

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));

        // Verify that the service method was called
        verify(userService, times(1)).signup(any(UserSignupRequest.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /api/v1/users - Verify service layer call")
    void getUserList_endpoint_callsServiceLayer() throws Exception {
        // Given
        List<UserDto> userList = Arrays.asList(
                UserDto.builder().userId("user1").userNm("User 1").esntlId("USR001").build(),
                UserDto.builder().userId("user2").userNm("User 2").esntlId("USR002").build());

        when(userService.getUserList()).thenReturn(userList);

        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));

        // Verify that the service method was called
        verify(userService, times(1)).getUserList();
    }

    @Test
    @DisplayName("POST /api/v1/users/signup - Handles service exception")
    void signup_endpoint_handlesServiceException() throws Exception {
        // Given
        when(userService.signup(any(UserSignupRequest.class)))
                .thenThrow(new com.company.project.core.exception.BusinessException(
                        com.company.project.core.exception.ErrorCode.DUPLICATE_USER_ID));

        String requestBody = """
                {
                  "userId": "duplicateUser",
                  "password": "password123!",
                  "userNm": "Duplicate User",
                  "passwordHint": "hint",
                  "passwordCnsr": "answer",
                  "role": "USER"
                }
                """;

        // When & Then
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isConflict());

        // Verify that the service method was called
        verify(userService, times(1)).signup(any(UserSignupRequest.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("GET /api/v1/users - Handles empty list")
    void getUserList_endpoint_handlesEmptyList() throws Exception {
        // Given
        when(userService.getUserList()).thenReturn(Arrays.asList());

        // When & Then
        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(0));

        // Verify that the service method was called
        verify(userService, times(1)).getUserList();
    }

    @Test
    @DisplayName("POST /api/v1/users/signup - Multiple calls")
    void signup_endpoint_multipleCalls() throws Exception {
        // Given
        UserResponse response = new UserResponse(
                "multiCallUser",
                "Multi Call User",
                null);

        when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

        String requestBody = """
                {
                  "userId": "multiCallUser",
                  "password": "password123!",
                  "userNm": "Multi Call User",
                  "passwordHint": "hint",
                  "passwordCnsr": "answer",
                  "role": "USER"
                }
                """;

        // When & Then - Call twice
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk());

        // Verify that the service method was called twice
        verify(userService, times(2)).signup(any(UserSignupRequest.class));
    }
}
