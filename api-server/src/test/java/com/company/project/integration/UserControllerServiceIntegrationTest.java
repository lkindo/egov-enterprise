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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.transaction.annotation.Transactional
@ActiveProfiles("test")
class UserControllerServiceIntegrationTest {

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
        @DisplayName("POST /api/v1/users/signup - Verify service call")
        void signup_api_callsService() throws Exception {
                // Given
                UserResponse response = new UserResponse(
                                "apiTestUser",
                                "API Test User",
                                null);
                doReturn(response).when(userService).signup(any(UserSignupRequest.class));

                String requestBody = """
                                {
                                  "userId": "apiTestUser",
                                  "password": "password123!",
                                  "userNm": "API Test User",
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
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("apiTestUser"));

                // Verify service method was called
                verify(userService, times(1)).signup(any(UserSignupRequest.class));
        }

        @Test
        @DisplayName("GET /api/v1/users - Verify service call")
        void getUserList_api_callsService() throws Exception {
                // Given
                List<UserDto> userList = Arrays.asList(
                                UserDto.builder().userId("user1").userNm("User 1").esntlId("USR001").build(),
                                UserDto.builder().userId("user2").userNm("User 2").esntlId("USR002").build());
                when(userService.getUserList()).thenReturn(userList);

                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data.length()").value(2));

                // Verify service method was called
                verify(userService, times(1)).getUserList();
        }

        @Test
        @DisplayName("GET /api/v1/users/{id} - Verify service call")
        void getUserById_api_callsService() throws Exception {
                // Given
                UserDto userDto = UserDto.builder().userId("testUser").userNm("Test User").esntlId("USR001").build();
                when(userService.getUserById("testUser")).thenReturn(userDto);

                // When & Then
                mockMvc.perform(get("/api/v1/users/testUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("testUser"))
                                .andExpect(jsonPath("$.data.userNm").value("Test User"));

                // Verify service method was called
                verify(userService, times(1)).getUserById("testUser");
        }

        @Test
        @DisplayName("POST /api/v1/users - Verify service call")
        void registerUser_api_callsService() throws Exception {
                // Given
                when(userService.registerUser(anyString(), anyString(), anyString(), anyString(), anyString(), any()))
                                .thenReturn("newUser");

                String requestBody = """
                                {
                                  "userId": "newUser",
                                  "password": "password123!",
                                  "userNm": "New User",
                                  "passwordHint": "hint",
                                  "passwordCnsr": "answer",
                                  "role": "USER"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").value("newUser"));

                // Verify service method was called
                verify(userService, times(1)).registerUser(anyString(), anyString(), anyString(), anyString(),
                                anyString(), any());
        }

        @Test
        @DisplayName("PUT /api/v1/users/{userId} - Verify service call")
        void updateUser_api_callsService() throws Exception {
                // When & Then
                mockMvc.perform(put("/api/v1/users/updateUser")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                                {
                                                  "userId": "updateUser",
                                                  "userNm": "Updated User",
                                                  "esntlId": "USR001",
                                                  "role": "USER"
                                                }
                                                """))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));

                // Verify service method was called
                verify(userService, times(1)).updateUser(anyString(), any(UserDto.class));
        }

        @Test
        @DisplayName("DELETE /api/v1/users/{userId} - Verify service call")
        void deleteUser_api_callsService() throws Exception {
                // When & Then
                mockMvc.perform(delete("/api/v1/users/deleteUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));

                // Verify service method was called
                verify(userService, times(1)).deleteUser(anyString());
        }

        @Test
        @DisplayName("POST /api/v1/users/signup - Service exception returns error")
        void signup_serviceException_returnsError() throws Exception {
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
                                .andExpect(status().isConflict())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.code").value("DUPLICATE_USER_ID"));

                // Verify service method was called
                verify(userService, times(1)).signup(any(UserSignupRequest.class));
        }

        @Test
        @DisplayName("GET /api/v1/users - Empty result returns empty array")
        void getUserList_emptyServiceResult_returnsEmptyArray() throws Exception {
                // Given
                when(userService.getUserList()).thenReturn(Arrays.asList());

                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data.length()").value(0));

                // Verify service method was called
                verify(userService, times(1)).getUserList();
        }

        @Test
        @DisplayName("GET /api/v1/users/{id} - Not found returns error")
        void getUserById_nonExistentUser_returnsError() throws Exception {
                // Given
                when(userService.getUserById("nonexistent")).thenThrow(
                                new com.company.project.core.exception.BusinessException(
                                                com.company.project.core.exception.ErrorCode.USER_NOT_FOUND));

                // When & Then
                mockMvc.perform(get("/api/v1/users/nonexistent")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isNotFound())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.code").value("USER_NOT_FOUND"));

                // Verify service method was called
                verify(userService, times(1)).getUserById("nonexistent");
        }
}
