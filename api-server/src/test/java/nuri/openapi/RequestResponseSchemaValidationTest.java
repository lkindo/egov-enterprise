package nuri.openapi;

import nuri.business.test.BaseControllerTest;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.HandlerInterceptor;
import nuri.api.controller.UserApiController;
import nuri.api.interceptor.OperationalAuditInterceptor;
import nuri.business.service.user.UserService;
import nuri.business.service.user.dto.UserDto;
import nuri.business.service.user.dto.UserResponse;
import nuri.business.service.user.dto.UserSignupRequest;
import java.util.List;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 요청/응답 스키마 검증 테스트 (Standalone)
 */
class RequestResponseSchemaValidationTest extends BaseControllerTest {

    private UserService userService;
    private OperationalAuditInterceptor operationalAuditInterceptor;

    private UserDto testUserDto;
    private UserResponse testUserResponse;

    @Override
    protected Object getController() {
        userService = mock(UserService.class);
        return new UserApiController(userService);
    }

    @Override
    protected HandlerInterceptor[] getInterceptors() {
        operationalAuditInterceptor = mock(OperationalAuditInterceptor.class);
        try {
            when(operationalAuditInterceptor.preHandle(any(), any(), any())).thenReturn(true);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return new HandlerInterceptor[] { operationalAuditInterceptor };
    }

    @Override
    protected HandlerMethodArgumentResolver[] getCustomArgumentResolvers() {
        return new HandlerMethodArgumentResolver[] { new PageableHandlerMethodArgumentResolver() };
    }

    @BeforeEach
    void setUpData() {
        testUserDto = UserDto.builder()
                .userId("testUser")
                .userNm("테스트사용자이름")
                .esntlId("USR_0000000000000001")
                .role("USER")
                .build();

        testUserResponse = new UserResponse("testUser", "테스트사용자이름", "USER");

    }

    @Test
    @DisplayName("스키마 검증 - 사용자 회원가입 요청 스키마 검증")
    void userSignup_requestSchema_validation() throws Exception {
        String validRequest = """
                {
                  "userId": "validUser123",
                  "pswd": "ValidPass123!",
                  "userNm": "테스트사용자이름",
                  "pswdHint": "password hint",
                  "pswdCrans": "password answer",
                  "role": "USER"
                }
                """;

        when(userService.signup(any(UserSignupRequest.class))).thenReturn(testUserResponse);

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.data.userId").value("testUser"));
    }

    @Test
    @DisplayName("스키마 검증 - 필수 필드 누락 검증")
    void userSignup_missingRequiredFields_validationError() throws Exception {
        String invalidRequest = """
                {
                  "userId": "validUser123"
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").exists())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    @DisplayName("스키마 검증 - 필드 타입 오류 검증")
    void userSignup_wrongFieldType_validationError() throws Exception {
        String invalidRequest = """
                {
                  "userId": 123,
                  "pswd": 456,
                  "userNm": true,
                  "pswdHint": "hint",
                  "pswdCrans": "answer",
                  "role": "USER"
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").exists());
    }

    @Test
    @DisplayName("스키마 검증 - 사용자 목록 조회 응답 검증")
    void userGetList_responseSchema_validation() throws Exception {
        Pageable pageRequest = PageRequest.of(0, 10);
        Page<UserDto> page = new PageImpl<>(List.of(testUserDto), pageRequest, 1);
        when(userService.getPagedUserList(any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/users")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.data.list").isArray())
                .andExpect(jsonPath("$.data.list", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.data.list[0].userId").exists())
                .andExpect(jsonPath("$.data.list[0].userNm").exists())
                .andExpect(jsonPath("$.data.list[0].esntlId").exists());
    }

    @Test
    @DisplayName("스키마 검증 - 사용자 상세 조회 응답 검증")
    void userGetById_responseSchema_validation() throws Exception {
        when(userService.getUserById("testUser")).thenReturn(testUserDto);

        mockMvc.perform(get("/api/v1/admin/system/users/testUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.data.userId").exists())
                .andExpect(jsonPath("$.data.userNm").exists())
                .andExpect(jsonPath("$.data.esntlId").exists());
    }

    @Test
    @DisplayName("스키마 검증 - 페이징 사용자 목록 응답 검증")
    void pagedUserList_responseSchema_validation() throws Exception {
        Pageable pageRequest = PageRequest.of(0, 10);
        Page<UserDto> page = new PageImpl<>(List.of(testUserDto), pageRequest, 1);
        when(userService.getPagedUserList(any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/users?page=0&size=10")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.data.list").isArray())
                .andExpect(jsonPath("$.data.total").exists());
    }

    @Test
    @DisplayName("스키마 검증 - 잘못된 사용자 ID 형식 검증")
    void userSignup_invalidIdFormat_validation() throws Exception {
        String invalidRequest = """
                {
                  "userId": "invalid@user#id",
                  "pswd": "ValidPass123!",
                  "userNm": "테스트사용자이름",
                  "pswdHint": "hint",
                  "pswdCrans": "answer",
                  "role": "USER"
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").exists());
    }

    @Test
    @DisplayName("스키마 검증 - 필드 길이 초과 검증")
    void userSignup_tooLongField_validation() throws Exception {
        String longUserId = "a".repeat(50);
        String invalidRequest = """
                {
                  "userId": "%s",
                  "pswd": "ValidPass123!",
                  "userNm": "테스트사용자이름",
                  "pswdHint": "hint",
                  "pswdCrans": "answer",
                  "role": "USER"
                }
                """.formatted(longUserId);

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").exists());
    }

    @Test
    @DisplayName("스키마 검증 - 짧은 비밀번호 검증")
    void userSignup_shortPassword_validation() throws Exception {
        String invalidRequest = """
                {
                  "userId": "validUser123",
                  "pswd": "123",
                  "userNm": "테스트사용자이름",
                  "pswdHint": "hint",
                  "pswdCrans": "answer",
                  "role": "USER"
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").exists());
    }

    @Test
    @DisplayName("스키마 검증 - 사용자 정보 수정 요청 검증")
    void userUpdate_requestSchema_validation() throws Exception {
        String validRequest = """
                {
                  "userId": "updateUser",
                  "userNm": "수정사용자",
                  "esntlId": "USR_0000000000000001",
                  "pswd": "password123!",
                  "pswdHint": "new hint",
                  "pswdCrans": "new answer",
                  "role": "ADMIN"
                }
                """;

        mockMvc.perform(put("/api/v1/admin/system/users/updateUser")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("스키마 검증 - UserDto 필드 존재 확인")
    void responseSchema_userDtoFieldExistence() throws Exception {
        when(userService.getUserById("testUser")).thenReturn(testUserDto);

        mockMvc.perform(get("/api/v1/admin/system/users/testUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.userId").exists())
                .andExpect(jsonPath("$.data.userNm").exists())
                .andExpect(jsonPath("$.data.esntlId").exists());
    }

    @Test
    @DisplayName("스키마 검증 - 응답 공통 구조 검증")
    void responseSchema_commonStructure_validation() throws Exception {
        when(userService.getUserById("testUser")).thenReturn(testUserDto);

        mockMvc.perform(get("/api/v1/admin/system/users/testUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(isA(Boolean.class)))
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    @DisplayName("스키마 검증 - 에러 응답 공통 구조 검증")
    void errorResponseSchema_commonStructure_validation() throws Exception {
        String invalidRequest = """
                {
                  "userId": "",
                  "pswd": "",
                  "userNm": ""
                }
                """;

        mockMvc.perform(post("/api/v1/users/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").exists())
                .andExpect(jsonPath("$.message").exists());
    }
}
