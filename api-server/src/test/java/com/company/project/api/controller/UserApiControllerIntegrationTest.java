package com.company.project.api.controller;

import com.company.project.foundation.service.user.UserService;
import com.company.project.foundation.service.user.dto.UserDto;
import com.company.project.foundation.service.user.dto.UserResponse;
import com.company.project.foundation.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import com.company.project.foundation.core.exception.GlobalExceptionHandler;
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
    @DisplayName("POST /api/v1/users/signup - ?뚯썝 媛???깃났")
    void signup_success() throws Exception {
        UserResponse response = new UserResponse(
                "newUser",
                "?덈줈?댁궗?⑹옄",
                com.company.project.foundation.domain.user.entity.Role.USER);

        when(userService.signup(any(UserSignupRequest.class))).thenReturn(response);

        String requestBody = """
                {
                  "userId": "newUser",
                  "password": "password123!",
                  "userNm": "?덈줈?댁궗?⑹옄",
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
                .andExpect(jsonPath("$.data.userNm").value("?덈줈?댁궗?⑹옄"));
    }

    @Test
    @DisplayName("GET /api/v1/users - ?ъ슜??紐⑸줉 議고쉶 ?깃났")
    void getUserList_success() throws Exception {
        List<UserDto> userList = Arrays.asList(
                new UserDto("user1", "?ъ슜??", "USR001", null, null, null, null),
                new UserDto("user2", "?ъ슜??", "USR002", null, null, null, null));

        when(userService.getUserList()).thenReturn(userList);

        mockMvc.perform(get("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].userId").value("user1"))
                .andExpect(jsonPath("$.data[0].userNm").value("?ъ슜??"))
                .andExpect(jsonPath("$.data[1].userId").value("user2"))
                .andExpect(jsonPath("$.data[1].userNm").value("?ъ슜??"));
    }

    @Test
    @DisplayName("GET /api/v1/users/paged - ?섏씠吏蹂??ъ슜??紐⑸줉 議고쉶 ?깃났")
    void getPagedUserList_success() throws Exception {
        List<UserDto> userList = Arrays.asList(
                new UserDto("user1", "?ъ슜??", "USR001", null, null, null, null));
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
                .andExpect(jsonPath("$.data.list[0].userNm").value("?ъ슜??"));
    }

    @Test
    @DisplayName("POST /api/v1/users/signup - ?뚯썝 媛???ㅽ뙣 (?좏슚?섏? ?딆? ?곗씠??")
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
