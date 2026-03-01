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

/**
 * API ?�드?�인?��? ?�비??계층 간의 ?�합 ?�스?? */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@org.springframework.transaction.annotation.Transactional
@ActiveProfiles("test")
class UserControllerServiceIntegrationTest {

        @org.springframework.context.annotation.Configuration
        @org.springframework.context.annotation.Import({
                        com.company.project.config.MinimalTestConfig.class,
                        com.company.project.api.common.exception.GlobalExceptionHandler.class
        })
        static class TestConfig {
                @org.springframework.context.annotation.Bean
                public com.company.project.api.controller.UserController userController(
                                com.company.project.service.user.UserService userService) {
                        return new com.company.project.api.controller.UserController(userService);
                }
        }

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private UserService userService;

        @Test
        @DisplayName("POST /api/v1/users/signup - API ?�드?�인?�에???�비???�출 ?�인")
        void signup_api_callsService() throws Exception {
                // Given
                UserResponse response = new UserResponse(
                                "apiTestUser",
                                "API ?�합 ?�스???�용??,
                                null);
                doReturn(response).when(userService).signup(any(UserSignupRequest.class));

                String requestBody = """
                                {
                                    "userId": "apiTestUser",
                                    "password": "password123!",
                                    "userNm": "API ?�합 ?�스???�용??,
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
        @DisplayName("GET /api/v1/users - API ?�드?�인?�에???�비???�출 ?�인")
        void getUserList_api_callsService() throws Exception {
                // Given
                List<UserDto> userList = Arrays.asList(
                                new UserDto("user1", "?�용??", "USR001", null, null, null, null),
                                new UserDto("user2", "?�용??", "USR002", null, null, null, null));
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
        @DisplayName("GET /api/v1/users/{id} - API ?�드?�인?�에???�비???�출 ?�인")
        void getUserById_api_callsService() throws Exception {
                // Given
                UserDto userDto = new UserDto("testUser", "?�스???�용??, "USR001", null, null, null, null);
                when(userService.getUserById("testUser")).thenReturn(userDto);

                // When & Then
                mockMvc.perform(get("/api/v1/users/testUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("testUser"))
                                .andExpect(jsonPath("$.data.userNm").value("?�스???�용??));

                // Verify service method was called
                verify(userService, times(1)).getUserById("testUser");
        }

        @Test
        @DisplayName("POST /api/v1/users - API ?�드?�인?�에???�비???�출 ?�인")
        void registerUser_api_callsService() throws Exception {
                // Given
                when(userService.registerUser(anyString(), anyString(), anyString(), anyString(), anyString(), any()))
                                .thenReturn("newUser");

                String requestBody = """
                                {
                                    "userId": "newUser",
                                    "password": "password123!",
                                    "userNm": "?�규 ?�용??,
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
        @DisplayName("PUT /api/v1/users/{userId} - API ?�드?�인?�에???�비???�출 ?�인")
        void updateUser_api_callsService() throws Exception {
                // When & Then
                mockMvc.perform(put("/api/v1/users/updateUser")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                                {
                                                    "userId": "updateUser",
                                                    "userNm": "?�정???�용??,
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
        @DisplayName("DELETE /api/v1/users/{userId} - API ?�드?�인?�에???�비???�출 ?�인")
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
        @DisplayName("POST /api/v1/users/signup - ?�비??계층 ?�외 발생 ??API???�외 반환")
        void signup_serviceException_returnsError() throws Exception {
                // Given
                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new com.company.project.core.exception.BusinessException(
                                                com.company.project.core.exception.ErrorCode.DUPLICATE_USER_ID));

                String requestBody = """
                                {
                                    "userId": "duplicateUser",
                                    "password": "password123!",
                                    "userNm": "중복 ?�용??,
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
                                .andExpect(jsonPath("$.error.code").value("DUPLICATE_USER_ID"));

                // Verify service method was called
                verify(userService, times(1)).signup(any(UserSignupRequest.class));
        }

        @Test
        @DisplayName("GET /api/v1/users - ?�비??계층?�서 �?리스??반환 ??API??�?배열 반환")
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
        @DisplayName("GET /api/v1/users/{id} - 존재?��? ?�는 ?�용??조회 ??API?�서 ?�절???�류 반환")
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
                                .andExpect(jsonPath("$.error.code").value("USER_NOT_FOUND"));

                // Verify service method was called
                verify(userService, times(1)).getUserById("nonexistent");
        }

        @Test
        @DisplayName("API ?�드?�인?��? ?�비??계층 간의 ?�이???�달 ?�확???�인")
        void dataTransfer_accuracyBetweenApiAndService() throws Exception {
                // Given
                UserResponse response = new UserResponse(
                                "accuracyTestUser",
                                "?�확???�스???�용??,
                                null);

                when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

                String requestBody = """
                                {
                                    "userId": "accuracyTestUser",
                                    "password": "password123!",
                                    "userNm": "?�확???�스???�용??,
                                    "passwordHint": "accuracyHint",
                                    "passwordCnsr": "accuracyAnswer",
                                    "role": "ADMIN"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("accuracyTestUser"))
                                .andExpect(jsonPath("$.data.userNm").value("?�확???�스???�용??));

                // Verify that the service received the correct data
                verify(userService, times(1)).signup(argThat(req -> req.userId().equals("accuracyTestUser") &&
                                req.userNm().equals("?�확???�스???�용??) &&
                                req.role() == com.company.project.domain.user.entity.Role.ADMIN));
        }
}
