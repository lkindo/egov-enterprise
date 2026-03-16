package com.company.project.api.controller;

import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.company.project.core.exception.GlobalExceptionHandler;
import java.util.Arrays;
import java.util.List;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class UserApiControllerIntegrationTest {

    private MockMvc mockMvc;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new UserApiController(userService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/users/signup - 회원 가입 성공")
    void signup_success() throws Exception {
        UserResponse response = new UserResponse(
                "newUser",
                "새로운사용자",
                com.company.project.domain.user.entity.Role.USER);

        when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

        String requestBody = """
                {
                  "userId": "newUser",
                  "password": "password123!",
                  "userNm": "새로운사용자",
                  "passwordHint": "hint",
                  "passwordCnsr": "answer",
                  "role": "USER"
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").value("newUser"))
                .andExpect(jsonPath("$.data.userNm").value("새로운사용자"));
    }

    @Test
    @DisplayName("GET /api/v1/users - 사용자 목록 조회 성공")
    void getUserList_success() throws Exception {
        List<UserDto> userList = Arrays.asList(
                new UserDto("user1", "사용자1", "USR001", null, null, null, null),
                new UserDto("user2", "사용자2", "USR002", null, null, null, null));

        when(userService.getUserList()).thenReturn(userList);

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
    @DisplayName("GET /api/v1/users/paged - 페이지별 사용자 목록 조회 성공")
    void getPagedUserList_success() throws Exception {
        List<UserDto> userList = Arrays.asList(
                new UserDto("user1", "사용자1", "USR001", null, null, null, null));
        Page<UserDto> userPage = new PageImpl<>(userList, PageRequest.of(0, 10), 1);

        when(userService.getPagedUserList(any(org.springframework.data.domain.Pageable.class))).thenReturn(userPage);

        mockMvc.perform(get("/api/v1/users/paged?page=0&size=10&sortBy=userId&sortDir=asc")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list").isArray())
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.list[0].userId").value("user1"))
                .andExpect(jsonPath("$.data.list[0].userNm").value("사용자1"));
    }

    @Test
    @DisplayName("POST /api/v1/users/signup - 회원 가입 실패 (유효하지 않은 데이터)")
    void signup_fail_withInvalidData() throws Exception {
        String invalidRequestBody = """
                {
                  "userId": "",
                  "password": "123",
                  "userNm": ""
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequestBody))
                .andExpect(status().isBadRequest());
    }
}
