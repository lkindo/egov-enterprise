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
        @DisplayName("POST /api/v1/users/signup - 사용자 회원가입 성공")
        void signup_success() throws Exception {
                // Given

                UserResponse response = new UserResponse(
                                "newUser",
                                "신규 사용자",
                                com.company.project.domain.user.entity.Role.USER);

                when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

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
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("newUser"))
                                .andExpect(jsonPath("$.data.userNm").value("신규 사용자"));
        }

        @Test
        @DisplayName("GET /api/v1/users - 사용자 목록 조회 성공")
        void getUserList_success() throws Exception {
                // Given
                List<UserDto> userList = Arrays.asList(
                                new UserDto("user1", "사용자1", "USR001", null, null, null, null),
                                new UserDto("user2", "사용자2", "USR002", null, null, null, null));

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
                                .andExpect(jsonPath("$.data[0].userNm").value("사용자1"))
                                .andExpect(jsonPath("$.data[1].userId").value("user2"))
                                .andExpect(jsonPath("$.data[1].userNm").value("사용자2"));
        }

        @Test
        @DisplayName("GET /api/v1/users/paged - 페이징된 사용자 목록 조회 성공")
        void getPagedUserList_success() throws Exception {
                // Given
                List<UserDto> userList = Arrays.asList(
                                new UserDto("user1", "사용자1", "USR001", null, null, null, null));
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
                                .andExpect(jsonPath("$.data.content[0].userNm").value("사용자1"));
        }

        @Test
        @DisplayName("GET /api/v1/users/paged - 페이징 파라미터 기본값 사용")
        void getPagedUserList_defaultParams() throws Exception {
                // Given
                List<UserDto> userList = Arrays.asList(
                                new UserDto("user1", "사용자1", "USR001", null, null, null, null));
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
        @DisplayName("POST /api/v1/users/signup - 유효하지 않은 요청 데이터로 인한 실패")
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
        @DisplayName("GET /api/v1/users/paged - 잘못된 페이지 파라미터")
        void getPagedUserList_fail_withInvalidParams() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users/paged?page=-1&size=0")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isBadRequest());
        }
}