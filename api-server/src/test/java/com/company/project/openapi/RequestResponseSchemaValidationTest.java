package com.company.project.openapi;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserResponse;
import com.company.project.service.user.dto.UserSignupRequest;
import com.company.project.domain.user.entity.Role;
import java.util.List;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.company.project.api.interceptor.OperationalAuditInterceptor;
import com.company.project.api.controller.UserController;
import com.company.project.core.exception.GlobalExceptionHandler;
import org.springframework.context.annotation.Import;

/**
 * 요청/응답 스키마 검증 테스트
 * API의 입출력 데이터 구조 및 제약 조건 검증
 */
@WebMvcTest(controllers = UserController.class)
@Import(GlobalExceptionHandler.class)
@ActiveProfiles("test")
class RequestResponseSchemaValidationTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private UserService userService;

        @MockitoBean
        private OperationalAuditInterceptor operationalAuditInterceptor;

        private UserDto testUserDto;
        private UserResponse testUserResponse;

        @BeforeEach
        void setUp() {
                testUserDto = UserDto.builder()
                                .userId("testUser")
                                .userNm("테스트사용자")
                                .esntlId("USR_0000000000000001")
                                .role("USER")
                                .build();
                
                testUserResponse = new UserResponse("testUser", "테스트사용자", Role.USER);
        }

        @Test
        @DisplayName("스키마 검증 - 회원가입 요청 본문 구조 확인")
        void userSignup_requestSchema_validation() throws Exception {
                // Given
                String validRequest = """
                                {
                                  "userId": "validUser123",
                                  "password": "ValidPass123!",
                                  "userNm": "테스트사용자",
                                  "passwordHint": "password hint",
                                  "passwordCnsr": "password answer",
                                  "role": "USER"
                                }
                                """;
                
                when(userService.signup(any(UserSignupRequest.class))).thenReturn(testUserResponse);

                // When & Then
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
        @DisplayName("스키마 검증 - 필수 필드 누락 시 에러 응답 확인")
        void userSignup_missingRequiredFields_validationError() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                  "userId": "validUser123"
                                }
                                """;

                // When & Then
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
        @DisplayName("스키마 검증 - 필드 타입 불일치 시 에러 응답 확인")
        void userSignup_wrongFieldType_validationError() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                  "userId": 123,
                                  "password": 456,
                                  "userNm": true,
                                  "passwordHint": "hint",
                                  "passwordCnsr": "answer",
                                  "role": "USER"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidRequest))
                                .andExpect(status().isBadRequest())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.code").exists());
        }

        @Test
        @DisplayName("스키마 검증 - 사용자 목록 조회 응답 구조 확인")
        void userGetList_responseSchema_validation() throws Exception {
                // Given
                when(userService.getUserList()).thenReturn(List.of(testUserDto));

                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data", hasSize(greaterThan(0))))
                                .andExpect(jsonPath("$.data[0].userId").exists())
                                .andExpect(jsonPath("$.data[0].userNm").exists())
                                .andExpect(jsonPath("$.data[0].esntlId").exists());
        }

        @Test
        @DisplayName("스키마 검증 - 사용자 상세 조회 응답 구조 확인")
        void userGetById_responseSchema_validation() throws Exception {
                // Given
                when(userService.getUserById("testUser")).thenReturn(testUserDto);

                // When & Then
                mockMvc.perform(get("/api/v1/users/testUser")
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
        @DisplayName("스키마 검증 - 페이징된 사용자 목록 응답 구조 확인")
        void pagedUserList_responseSchema_validation() throws Exception {
                // Given
                org.springframework.data.domain.Pageable pageRequest = org.springframework.data.domain.PageRequest.of(0, 10);
                org.springframework.data.domain.Page<UserDto> page = new org.springframework.data.domain.PageImpl<>(List.of(testUserDto), pageRequest, 1);
                when(userService.getPagedUserList(any())).thenReturn(page);

                // When & Then
                mockMvc.perform(get("/api/v1/users/paged?page=0&size=10")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").exists())
                                .andExpect(jsonPath("$.data.content").isArray())
                                .andExpect(jsonPath("$.data.totalElements").exists());
        }

        @Test
        @DisplayName("스키마 검증 - 아이디 형식 위반 시 에러 응답 확인")
        void userSignup_invalidIdFormat_validation() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                  "userId": "invalid@user#id",
                                  "password": "ValidPass123!",
                                  "userNm": "테스트사용자",
                                  "passwordHint": "hint",
                                  "passwordCnsr": "answer",
                                  "role": "USER"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidRequest))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.code").exists());
        }

        @Test
        @DisplayName("스키마 검증 - 필드 길이 초과 시 에러 응답 확인")
        void userSignup_tooLongField_validation() throws Exception {
                // Given
                String longUserId = "a".repeat(50);
                String invalidRequest = """
                                {
                                  "userId": "%s",
                                  "password": "ValidPass123!",
                                  "userNm": "테스트사용자",
                                  "passwordHint": "hint",
                                  "passwordCnsr": "answer",
                                  "role": "USER"
                                }
                                """.formatted(longUserId);

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidRequest))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.code").exists());
        }

        @Test
        @DisplayName("스키마 검증 - 비밀번호 복잡도 미달 시 에러 응답 확인")
        void userSignup_shortPassword_validation() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                  "userId": "validUser123",
                                  "password": "123",
                                  "userNm": "테스트사용자",
                                  "passwordHint": "hint",
                                  "passwordCnsr": "answer",
                                  "role": "USER"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidRequest))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.code").exists());
        }

        @Test
        @DisplayName("스키마 검증 - 사용자 정보 수정 요청 구조 확인")
        void userUpdate_requestSchema_validation() throws Exception {
                // Given
                String validRequest = """
                                {
                                  "userId": "updateUser",
                                  "userNm": "수정사용자",
                                  "esntlId": "USR_0000000000000001",
                                  "passwordHint": "new hint",
                                  "passwordCnsr": "new answer",
                                  "role": "ADMIN"
                                }
                                """;

                // When & Then
                mockMvc.perform(put("/api/v1/users/updateUser")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(validRequest))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("스키마 검증 - UserDto 전체 필드 존재 확인")
        void responseSchema_userDtoFieldExistence() throws Exception {
                // Given
                when(userService.getUserById("testUser")).thenReturn(testUserDto);

                // When & Then
                mockMvc.perform(get("/api/v1/users/testUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").exists())
                                .andExpect(jsonPath("$.data.userNm").exists())
                                .andExpect(jsonPath("$.data.esntlId").exists());
        }

        @Test
        @DisplayName("스키마 검증 - 공통 응답 성공 구조 확인")
        void responseSchema_commonStructure_validation() throws Exception {
                // Given
                when(userService.getUserById("testUser")).thenReturn(testUserDto);

                // When & Then
                mockMvc.perform(get("/api/v1/users/testUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(isA(Boolean.class)))
                                .andExpect(jsonPath("$.data").exists())
                                .andExpect(jsonPath("$.timestamp").exists());
        }

        @Test
        @DisplayName("스키마 검증 - 공통 에러 응답 구조 확인")
        void errorResponseSchema_commonStructure_validation() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                  "userId": "",
                                  "password": "",
                                  "userNm": ""
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidRequest))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.code").exists())
                                .andExpect(jsonPath("$.message").exists());
        }
}
