package nuri.api.controller;

import nuri.foundation.test.BaseControllerTest;

import nuri.foundation.service.user.UserService;
import nuri.foundation.service.user.dto.UserResponse;
import nuri.foundation.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class UserApiControllerIntegrationTest extends BaseControllerTest {
    private UserService userService;

    @Override
    protected Object getController() {
        userService = mock(UserService.class);
        return new UserApiController(userService);
    }

    @Test
    @DisplayName("POST /api/v1/users/signup - 회원 가입 성공")
    void signup_success() throws Exception {
        UserResponse response = UserResponse.builder()
                .userId("newUser")
                .userNm("새로운사용자")
                .role("USER")

                .build();

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

    @Test
    @DisplayName("POST /api/v1/users/signup - 회원 가입 실패 (필드 이름 불일치)")
    void signup_fail_withMismatchedFields() throws Exception {
        // userId 대신 user_id 사용 -> FAIL_ON_UNKNOWN_PROPERTIES 작동 확인
        String mismatchedRequestBody = """
                {
                  "user_id": "newUser",
                  "password": "password123!",
                  "userNm": "새로운사용자",
                  "role": "USER"
                }
                """;

        // Jackson deserialization failure often returns 400 Bad Request
        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mismatchedRequestBody))
                .andDo(org.springframework.test.web.servlet.result.MockMvcResultHandlers.print())
                .andExpect(status().isBadRequest());
    }
}
