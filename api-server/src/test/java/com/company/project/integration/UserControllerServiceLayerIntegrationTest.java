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
        @DisplayName("POST /api/v1/users/signup - API ?îÎìú?¨Ïù∏?∏Ïóê???úÎπÑ??Í≥ÑÏ∏µ?ºÎ°ú ?îÏ≤≠ ?ÑÎã¨ ?åÏä§??)
        void signup_endpoint_callsServiceLayer() throws Exception {
                // Given

                UserResponse response = new UserResponse(
                                "testUser",
                                "?åÏä§???¨Ïö©??,
                                null);

                when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

                String requestBody = """
                                {
                                    "userId": "testUser",
                                    "password": "password123!",
                                    "userNm": "?åÏä§???¨Ïö©??,
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
        @DisplayName("GET /api/v1/users - API ?îÎìú?¨Ïù∏?∏Ïóê???úÎπÑ??Í≥ÑÏ∏µ?ºÎ°ú ?îÏ≤≠ ?ÑÎã¨ ?åÏä§??)
        void getUserList_endpoint_callsServiceLayer() throws Exception {
                // Given
                List<UserDto> userList = Arrays.asList(
                                new UserDto("user1", "?¨Ïö©??", "USR001", null, null, null, null),
                                new UserDto("user2", "?¨Ïö©??", "USR002", null, null, null, null));

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
        @DisplayName("POST /api/v1/users/signup - ?úÎπÑ??Í≥ÑÏ∏µ ?àÏô∏ Î∞úÏÉù ??API ?îÎìú?¨Ïù∏?∏Ïóê???ÅÏ†à???ëÎãµ Î∞òÌôò")
        void signup_endpoint_handlesServiceException() throws Exception {
                // Given

                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new com.company.project.core.exception.BusinessException(
                                                com.company.project.core.exception.ErrorCode.DUPLICATE_USER_ID));

                String requestBody = """
                                {
                                    "userId": "duplicateUser",
                                    "password": "password123!",
                                    "userNm": "Ï§ëÎ≥µ ?¨Ïö©??,
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
        @DisplayName("GET /api/v1/users - ?úÎπÑ??Í≥ÑÏ∏µ?êÏÑú Îπ?Î™©Î°ù Î∞òÌôò ??API ?îÎìú?¨Ïù∏?∏Ïóê??Îπ?Î∞∞Ïó¥ ?ëÎãµ")
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
        @DisplayName("POST /api/v1/users/signup - ?úÎπÑ??Í≥ÑÏ∏µ?êÏÑú null Î∞òÌôò ??API ?îÎìú?¨Ïù∏?∏Ïóê???ÅÏ†à??Ï≤òÎ¶¨")
        void signup_endpoint_handlesNullResponse() throws Exception {
                // Given

                when(userService.signup(any(UserSignupRequest.class))).thenReturn(null);

                String requestBody = """
                                {
                                    "userId": "nullResponseUser",
                                    "password": "password123!",
                                    "userNm": "NULL ?ëÎãµ ?¨Ïö©??,
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "USER"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk());

                // Verify that the service method was called
                verify(userService, times(1)).signup(any(UserSignupRequest.class));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("GET /api/v1/users - ?úÎπÑ??Í≥ÑÏ∏µ?êÏÑú ?àÏô∏ Î∞úÏÉù ??API ?îÎìú?¨Ïù∏?∏Ïóê???ÅÏ†à???ëÎãµ Î∞òÌôò")
        void getUserList_endpoint_handlesServiceException() throws Exception {
                // Given
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Service layer error"));

                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // Verify that the service method was called
                verify(userService, times(1)).getUserList();
        }

        @Test
        @DisplayName("POST /api/v1/users/signup - ?¨Îü¨ Î≤??∏Ï∂ú ???úÎπÑ??Í≥ÑÏ∏µ???¨Îü¨ Î≤??∏Ï∂ú??)
        void signup_endpoint_multipleCalls() throws Exception {
                // Given

                UserResponse response = new UserResponse(
                                "multiCallUser",
                                "?§Ï§ë ?∏Ï∂ú ?¨Ïö©??,
                                null);

                when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

                String requestBody = """
                                {
                                    "userId": "multiCallUser",
                                    "password": "password123!",
                                    "userNm": "?§Ï§ë ?∏Ï∂ú ?¨Ïö©??,
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

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("GET /api/v1/users - ?úÎπÑ??Í≥ÑÏ∏µ ?∏Ï∂ú ???åÎùºÎØ∏ÌÑ∞ ?ÑÎã¨ ?ïÏù∏")
        void getUserList_endpoint_parameterPassing() throws Exception {
                // Given
                List<UserDto> userList = Arrays.asList(
                                new UserDto("user1", "?¨Ïö©??", "USR001", null, null, null, null));

                when(userService.getUserList()).thenReturn(userList);

                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data.length()").value(1));

                // Verify that the service method was called with correct parameters (no
                // parameters in this case)
                verify(userService, times(1)).getUserList();
        }

        @Test
        @DisplayName("POST /api/v1/users/signup - ?úÎπÑ??Í≥ÑÏ∏µ???ïÌôï???îÏ≤≠ Í∞ùÏ≤¥ ?ÑÎã¨ ?ïÏù∏")
        void signup_endpoint_requestObjectPassedCorrectly() throws Exception {
                // Given
                UserSignupRequest request = new UserSignupRequest(
                                "correctParamUser",
                                "password123!",
                                "?ïÌôï???åÎùºÎØ∏ÌÑ∞ ?¨Ïö©??,
                                com.company.project.domain.user.entity.Role.USER,
                                "hint",
                                "answer");

                UserResponse response = new UserResponse(
                                "correctParamUser",
                                "?ïÌôï???åÎùºÎØ∏ÌÑ∞ ?¨Ïö©??,
                                null);

                when(userService.signup(eq(request))).thenReturn(response);

                String requestBody = """
                                {
                                    "userId": "correctParamUser",
                                    "password": "password123!",
                                    "userNm": "?ïÌôï???åÎùºÎØ∏ÌÑ∞ ?¨Ïö©??,
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "USER"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk());

                // Verify that the service method was called with the exact request object
                verify(userService, times(1)).signup(eq(request));
        }
}
