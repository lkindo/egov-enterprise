package com.company.project.api.controller;

import com.company.project.config.MinimalTestConfig;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = MinimalTestConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class UserControllerIntegrationTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private UserService userService;

        @Test
        @DisplayName("POST /api/v1/users/signup - ?¨Ïö©???åÏõêÍ∞Ä???±Í≥µ")
        void signup_success() throws Exception {
                // Given

                UserResponse response = new UserResponse(
                                "newUser",
                                "?†Í∑ú ?¨Ïö©??,
                                com.company.project.domain.user.entity.Role.USER);

                when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

                String requestBody = """
                                {
                                    "userId": "newUser",
                                    "password": "password123!",
                                    "userNm": "?†Í∑ú ?¨Ïö©??,
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
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("newUser"))
                                .andExpect(jsonPath("$.data.userNm").value("?†Í∑ú ?¨Ïö©??));
        }

        @Test
        @DisplayName("GET /api/v1/users - ?¨Ïö©??Î™©Î°ù Ï°∞Ìöå ?±Í≥µ")
        void getUserList_success() throws Exception {
                // Given
                List<UserDto> userList = Arrays.asList(
                                new UserDto("user1", "?¨Ïö©??", "USR001", null, null, null, null),
                                new UserDto("user2", "?¨Ïö©??", "USR002", null, null, null, null));

                when(userService.getUserList()).thenReturn(userList);

                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data.length()").value(2))
                                .andExpect(jsonPath("$.data[0].userId").value("user1"))
                                .andExpect(jsonPath("$.data[0].userNm").value("?¨Ïö©??"))
                                .andExpect(jsonPath("$.data[1].userId").value("user2"))
                                .andExpect(jsonPath("$.data[1].userNm").value("?¨Ïö©??"));
        }

        @Test
        @DisplayName("GET /api/v1/users/paged - ?òÏù¥ÏßïÎêú ?¨Ïö©??Î™©Î°ù Ï°∞Ìöå ?±Í≥µ")
        void getPagedUserList_success() throws Exception {
                // Given
                List<UserDto> userList = Arrays.asList(
                                new UserDto("user1", "?¨Ïö©??", "USR001", null, null, null, null));
                Page<UserDto> userPage = new PageImpl<>(userList, PageRequest.of(0, 10), 1);

                when(userService.getPagedUserList(any(PageRequest.class))).thenReturn(userPage);

                // When & Then
                mockMvc.perform(get("/api/v1/users/paged?page=0&size=10&sortBy=userId&sortDir=asc")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.content").isArray())
                                .andExpect(jsonPath("$.data.totalElements").value(1))
                                .andExpect(jsonPath("$.data.content[0].userId").value("user1"))
                                .andExpect(jsonPath("$.data.content[0].userNm").value("?¨Ïö©??"));
        }

        @Test
        @DisplayName("GET /api/v1/users/paged - ?òÏù¥Ïß??åÎùºÎØ∏ÌÑ∞ Í∏∞Î≥∏Í∞??¨Ïö©")
        void getPagedUserList_defaultParams() throws Exception {
                // Given
                List<UserDto> userList = Arrays.asList(
                                new UserDto("user1", "?¨Ïö©??", "USR001", null, null, null, null));
                Page<UserDto> userPage = new PageImpl<>(userList, PageRequest.of(0, 10), 1);

                when(userService.getPagedUserList(any(PageRequest.class))).thenReturn(userPage);

                // When & Then
                mockMvc.perform(get("/api/v1/users/paged")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.content").isArray())
                                .andExpect(jsonPath("$.data.totalElements").value(1));
        }

        @Test
        @DisplayName("POST /api/v1/users/signup - ?†Ìö®?òÏ? ?äÏ? ?îÏ≤≠ ?∞Ïù¥?∞Î°ú ?∏Ìïú ?§Ìå®")
        void signup_fail_withInvalidData() throws Exception {
                // Given
                String invalidRequestBody = """
                                {
                                    "userId": "",
                                    "password": "123",
                                    "userNm": ""
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidRequestBody))
                                .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("GET /api/v1/users/paged - ?òÎ™ª???òÏù¥ÏßÄ ?åÎùºÎØ∏ÌÑ∞")
        void getPagedUserList_fail_withInvalidParams() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users/paged?page=-1&size=0")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isBadRequest());
        }
}
