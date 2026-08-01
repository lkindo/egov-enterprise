package nuri.api.controller;

import nuri.business.test.BaseControllerTest;

import nuri.business.service.user.UserService;
import nuri.business.service.user.dto.UserResponse;
import nuri.business.service.user.dto.UserSignupRequest;
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
                  "pswd": "password123!",
                  "userNm": "새로운사용자",
                  "pswdHint": "hint",
                  "pswdCrans": "answer"
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

    /**
     * [W0-01 회귀 게이트] 공개 signup 으로의 권한 상승 차단.
     *
     * <p>과거 UserSignupRequest 에 role 필드가 있어 미인증 요청 1건으로 ROLE_ADMIN 자가 발급이
     * 가능했다. 필드를 삭제했으므로 role 을 실은 요청은 알 수 없는 속성으로 거부되어야 한다.
     * 이 단언은 운영 설정과 정합한다 — application.yml 의
     * {@code spring.jackson.deserialization.fail-on-unknown-properties: true} 와
     * BaseControllerTest 의 failOnUnknownProperties(true) 가 동일 값이다.
     */
    @Test
    @DisplayName("POST /api/v1/users/signup - role 주입 시도는 거부된다 (권한 상승 차단)")
    void signup_rejectsRoleInjection() throws Exception {
        String attack = """
                {
                  "userId": "attacker",
                  "pswd": "password123!",
                  "userNm": "공격자",
                  "pswdHint": "hint",
                  "pswdCrans": "answer",
                  "role": "ADMIN"
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(attack))
                .andExpect(status().isBadRequest());

        // 서비스까지 도달하지 않아야 한다 — 역직렬화 단계에서 잘려야 권한 상승 경로가 없다.
        verify(userService, never()).signup(any(UserSignupRequest.class));
    }

    @Test
    @DisplayName("POST /api/v1/users/signup - 회원 가입 실패 (유효하지 않은 데이터)")
    void signup_fail_withInvalidData() throws Exception {
        String invalidRequestBody = """
                {
                  "userId": "",
                  "pswd": "123",
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
                  "pswd": "password123!",
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
