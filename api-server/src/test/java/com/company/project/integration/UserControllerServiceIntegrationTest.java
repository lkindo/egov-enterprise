package com.company.project.integration;

import com.company.project.api.controller.UserController;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * API 엔드포인트와 서비스 계층 간의 통합 테스트
 */
@WebMvcTest(UserController.class)
@ActiveProfiles("test")
class UserControllerServiceIntegrationTest {

        @Autowired
        private MockMvc mockMvc;

        @MockBean
        private UserService userService;

        @Test
        @DisplayName("POST /api/v1/users/signup - API 엔드포인트에서 서비스 호출 확인")
        void signup_api_callsService() throws Exception {
                // Given
                UserResponse response = new UserResponse(
                                "apiTestUser",
                                "API 통합 테스트 사용자",
                                null);
                when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

                String requestBody = """
                                {
                                    "userId": "apiTestUser",
                                    "password": "password123!",
                                    "userNm": "API 통합 테스트 사용자",
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
        @DisplayName("GET /api/v1/users - API 엔드포인트에서 서비스 호출 확인")
        void getUserList_api_callsService() throws Exception {
                // Given
                List<UserDto> userList = Arrays.asList(
                                new UserDto("user1", "사용자1", "USR001", null, null, null, null),
                                new UserDto("user2", "사용자2", "USR002", null, null, null, null));
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
        @DisplayName("GET /api/v1/users/{id} - API 엔드포인트에서 서비스 호출 확인")
        void getUserById_api_callsService() throws Exception {
                // Given
                UserDto userDto = new UserDto("testUser", "테스트 사용자", "USR001", null, null, null, null);
                when(userService.getUserById("testUser")).thenReturn(userDto);

                // When & Then
                mockMvc.perform(get("/api/v1/users/testUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("testUser"))
                                .andExpect(jsonPath("$.data.userNm").value("테스트 사용자"));

                // Verify service method was called
                verify(userService, times(1)).getUserById("testUser");
        }

        @Test
        @DisplayName("POST /api/v1/users - API 엔드포인트에서 서비스 호출 확인")
        void registerUser_api_callsService() throws Exception {
                // Given
                when(userService.registerUser(anyString(), anyString(), anyString(), anyString(), anyString(), any()))
                                .thenReturn("newUser");

                String requestBody = """
                                {
                                    "userId": "newUser",
                                    "password": "password123!",
                                    "userNm": "신규 사용자",
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
        @DisplayName("PUT /api/v1/users/{userId} - API 엔드포인트에서 서비스 호출 확인")
        void updateUser_api_callsService() throws Exception {
                // When & Then
                mockMvc.perform(put("/api/v1/users/updateUser")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                                {
                                                    "userId": "updateUser",
                                                    "userNm": "수정된 사용자",
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
        @DisplayName("DELETE /api/v1/users/{userId} - API 엔드포인트에서 서비스 호출 확인")
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
        @DisplayName("POST /api/v1/users/signup - 서비스 계층 예외 발생 시 API도 예외 반환")
        void signup_serviceException_returnsError() throws Exception {
                // Given
                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new com.company.project.core.exception.BusinessException(
                                                com.company.project.core.exception.ErrorCode.DUPLICATE_USER_ID));

                String requestBody = """
                                {
                                    "userId": "duplicateUser",
                                    "password": "password123!",
                                    "userNm": "중복 사용자",
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "USER"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("DUPLICATE_USER_ID"));

                // Verify service method was called
                verify(userService, times(1)).signup(any(UserSignupRequest.class));
        }

        @Test
        @DisplayName("GET /api/v1/users - 서비스 계층에서 빈 리스트 반환 시 API도 빈 배열 반환")
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
        @DisplayName("GET /api/v1/users/{id} - 존재하지 않는 사용자 조회 시 API에서 적절한 오류 반환")
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
        @DisplayName("API 엔드포인트와 서비스 계층 간의 데이터 전달 정확성 확인")
        void dataTransfer_accuracyBetweenApiAndService() throws Exception {
                // Given
                UserResponse response = new UserResponse(
                                "accuracyTestUser",
                                "정확도 테스트 사용자",
                                null);

                when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

                String requestBody = """
                                {
                                    "userId": "accuracyTestUser",
                                    "password": "password123!",
                                    "userNm": "정확도 테스트 사용자",
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
                                .andExpect(jsonPath("$.data.userNm").value("정확도 테스트 사용자"));

                // Verify that the service received the correct data
                verify(userService, times(1)).signup(argThat(req -> req.userId().equals("accuracyTestUser") &&
                                req.userNm().equals("정확도 테스트 사용자") &&
                                req.role() == com.company.project.domain.user.Role.ADMIN));
        }
}