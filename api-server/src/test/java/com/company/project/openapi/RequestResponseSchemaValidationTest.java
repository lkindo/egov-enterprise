package com.company.project.openapi;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 요청/응답 스키마 검증 테스트
 * API의 요청 및 응답이 명세된 스키마에 따라 올바르게 구성되는지 확인
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class RequestResponseSchemaValidationTest {

        @Autowired
        private MockMvc mockMvc;

        @Test
        @DisplayName("사용자 등록 요청 스키마 검증")
        void userSignup_requestSchema_validation() throws Exception {
                // Given
                String validRequest = """
                                {
                                    "userId": "validUser123",
                                    "password": "ValidPass123!",
                                    "userNm": "유효한 사용자",
                                    "passwordHint": "password hint",
                                    "passwordCnsr": "password answer",
                                    "role": "USER"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(validRequest))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").exists())
                                .andExpect(jsonPath("$.data.userId").value("validUser123"))
                                .andExpect(jsonPath("$.data.userNm").value("유효한 사용자"));
        }

        @Test
        @DisplayName("사용자 등록 요청 - 필수 필드 누락 시 검증 오류")
        void userSignup_missingRequiredFields_validationError() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                    "userId": "validUser123"
                                    // Missing required fields: password, userNm
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidRequest))
                                .andExpect(status().isBadRequest())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error").exists());
        }

        @Test
        @DisplayName("사용자 등록 요청 - 잘못된 필드 타입 시 검증 오류")
        void userSignup_wrongFieldType_validationError() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                    "userId": 123,  // Should be string
                                    "password": 456,  // Should be string
                                    "userNm": true,  // Should be string
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
                                .andExpect(jsonPath("$.error").exists());
        }

        @Test
        @DisplayName("사용자 목록 조회 응답 스키마 검증")
        void userGetList_responseSchema_validation() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray())
                                .andExpect(jsonPath("$.data").value(hasSize(greaterThan(0))))
                                .andExpect(jsonPath("$.data[0].userId").exists())
                                .andExpect(jsonPath("$.data[0].userNm").exists())
                                .andExpect(jsonPath("$.data[0].esntlId").exists());
        }

        @Test
        @DisplayName("사용자 단일 조회 응답 스키마 검증")
        void userGetById_responseSchema_validation() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users/testUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").exists())
                                .andExpect(jsonPath("$.data").isMap())
                                .andExpect(jsonPath("$.data.userId").exists())
                                .andExpect(jsonPath("$.data.userId").value(not(emptyString())))
                                .andExpect(jsonPath("$.data.userNm").exists())
                                .andExpect(jsonPath("$.data.userNm").value(not(emptyString())))
                                .andExpect(jsonPath("$.data.esntlId").exists())
                                .andExpect(jsonPath("$.data.esntlId").value(not(emptyString())));
        }

        @Test
        @DisplayName("페이징된 사용자 목록 조회 응답 스키마 검증")
        void pagedUserList_responseSchema_validation() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users/paged?page=0&size=10")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").exists())
                                .andExpect(jsonPath("$.data").isMap())
                                .andExpect(jsonPath("$.data.content").isArray())
                                .andExpect(jsonPath("$.data.totalElements").exists())
                                .andExpect(jsonPath("$.data.totalElements").value(isA(Number.class)))
                                .andExpect(jsonPath("$.data.pageable").exists())
                                .andExpect(jsonPath("$.data.last").exists())
                                .andExpect(jsonPath("$.data.numberOfElements").exists())
                                .andExpect(jsonPath("$.data.first").exists())
                                .andExpect(jsonPath("$.data.size").exists())
                                .andExpect(jsonPath("$.data.number").exists())
                                .andExpect(jsonPath("$.data.sort").exists());
        }

        @Test
        @DisplayName("사용자 등록 요청 - 잘못된 ID 형식 검증")
        void userSignup_invalidIdFormat_validation() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                    "userId": "invalid@user#id",  // Contains invalid characters
                                    "password": "ValidPass123!",
                                    "userNm": "테스트 사용자",
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
                                .andExpect(jsonPath("$.error").exists());
        }

        @Test
        @DisplayName("사용자 등록 요청 - 너무 긴 필드 값 검증")
        void userSignup_tooLongField_validation() throws Exception {
                // Given
                String longUserId = "a".repeat(50); // Exceeds typical length limit
                String invalidRequest = """
                                {
                                    "userId": "%s",
                                    "password": "ValidPass123!",
                                    "userNm": "테스트 사용자",
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
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error").exists());
        }

        @Test
        @DisplayName("사용자 등록 요청 - 너무 짧은 비밀번호 검증")
        void userSignup_shortPassword_validation() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                    "userId": "validUser123",
                                    "password": "123",  // Too short
                                    "userNm": "테스트 사용자",
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
                                .andExpect(jsonPath("$.error").exists());
        }

        @Test
        @DisplayName("사용자 등록 요청 - 잘못된 역할 값 검증")
        void userSignup_invalidRole_validation() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                    "userId": "validUser123",
                                    "password": "ValidPass123!",
                                    "userNm": "테스트 사용자",
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "INVALID_ROLE"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidRequest))
                                .andExpect(status().isBadRequest())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error").exists());
        }

        @Test
        @DisplayName("사용자 정보 수정 요청 스키마 검증")
        void userUpdate_requestSchema_validation() throws Exception {
                // Given
                String validRequest = """
                                {
                                    "userId": "updateUser",
                                    "userNm": "수정된 사용자",
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
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").exists())
                                .andExpect(jsonPath("$.data.userId").value("updateUser"))
                                .andExpect(jsonPath("$.data.userNm").value("수정된 사용자"));
        }

        @Test
        @DisplayName("사용자 정보 수정 요청 - 잘못된 필드 값 검증")
        void userUpdate_invalidFieldValue_validation() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                    "userId": "updateUser",
                                    "userNm": "",  // Empty name not allowed
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "USER"
                                }
                                """;

                // When & Then
                mockMvc.perform(put("/api/v1/users/updateUser")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidRequest))
                                .andExpect(status().isBadRequest())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error").exists());
        }

        @Test
        @DisplayName("사용자 삭제 요청 스키마 검증")
        void userDelete_requestSchema_validation() throws Exception {
                // When & Then
                mockMvc.perform(delete("/api/v1/users/deleteUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("사용자 검색 요청 스키마 검증")
        void userSearch_requestSchema_validation() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users/search?searchType=USER_NM&searchKeyword=테스트")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("사용자 검색 요청 - 잘못된 검색 타입 검증")
        void userSearch_invalidSearchType_validation() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users/search?searchType=INVALID_TYPE&searchKeyword=테스트")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isBadRequest())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        @DisplayName("사용자 검색 요청 - 너무 긴 검색어 검증")
        void userSearch_tooLongSearchKeyword_validation() throws Exception {
                // Given
                String longKeyword = "a".repeat(1001); // Exceeds typical limit

                // When & Then
                mockMvc.perform(get("/api/v1/users/search?searchType=USER_NM&searchKeyword=" + longKeyword)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isBadRequest())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        @DisplayName("응답 데이터 구조 검증 - 사용자 DTO 필드 존재 확인")
        void responseSchema_userDtoFieldExistence() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users/testUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").exists())
                                // Verify all expected fields exist in UserDto
                                .andExpect(jsonPath("$.data.userId").exists())
                                .andExpect(jsonPath("$.data.userNm").exists())
                                .andExpect(jsonPath("$.data.emailAdres").exists())
                                .andExpect(jsonPath("$.data.orgnztId").exists())
                                .andExpect(jsonPath("$.data.grpId").exists())
                                .andExpect(jsonPath("$.data.ihidnum").exists())
                                .andExpect(jsonPath("$.data.sexdstnCode").exists())
                                .andExpect(jsonPath("$.data.brth").exists())
                                .andExpect(jsonPath("$.data.areaNo").exists())
                                .andExpect(jsonPath("$.data.homemiddleTelno").exists())
                                .andExpect(jsonPath("$.data.homeendTelno").exists())
                                .andExpect(jsonPath("$.data.moblphonNo").exists())
                                .andExpect(jsonPath("$.data.zip").exists())
                                .andExpect(jsonPath("$.data.homeadres").exists())
                                .andExpect(jsonPath("$.data.detailAdres").exists())
                                .andExpect(jsonPath("$.data.ofcpsNm").exists())
                                .andExpect(jsonPath("$.data.esntlId").exists())
                                .andExpect(jsonPath("$.data.role").exists())
                                .andExpect(jsonPath("$.data.sbscrbDe").exists())
                                .andExpect(jsonPath("$.data.subDn").exists());
        }

        @Test
        @DisplayName("요청 파라미터 스키마 검증 - 정수 타입 파라미터")
        void requestParameter_schema_validation_integer() throws Exception {
                // When & Then - Valid integer parameters
                mockMvc.perform(get("/api/v1/users?page=0&size=10")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true));

                // When & Then - Invalid integer parameter
                mockMvc.perform(get("/api/v1/users?page=invalid&size=10")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("요청 파라미터 스키마 검증 - 부울 타입 파라미터")
        void requestParameter_schema_validation_boolean() throws Exception {
                // When & Then - Valid boolean parameter
                mockMvc.perform(get("/api/v1/users?active=true")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk());

                // When & Then - Invalid boolean parameter
                mockMvc.perform(get("/api/v1/users?active=maybe")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("응답 스키마 검증 - 공통 응답 구조 확인")
        void responseSchema_commonStructure_validation() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users/testUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                // Verify common response structure
                                .andExpect(jsonPath("$.success").exists())
                                .andExpect(jsonPath("$.success").value(isA(Boolean.class)))
                                .andExpect(jsonPath("$.data").exists())
                                .andExpect(jsonPath("$.timestamp").exists())
                                .andExpect(jsonPath("$.timestamp").value(not(emptyString())));
        }

        @Test
        @DisplayName("오류 응답 스키마 검증 - 공통 오류 응답 구조 확인")
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
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                // Verify common error response structure
                                .andExpect(jsonPath("$.success").exists())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.data").exists())
                                .andExpect(jsonPath("$.data").value(nullValue()))
                                .andExpect(jsonPath("$.error").exists())
                                .andExpect(jsonPath("$.error.code").exists())
                                .andExpect(jsonPath("$.error.message").exists())
                                .andExpect(jsonPath("$.timestamp").exists());
        }

        @Test
        @DisplayName("요청 본문 스키마 검증 - 필수 필드 존재 확인")
        void requestBodySchema_requiredFields_validation() throws Exception {
                // Given - Valid request with all required fields
                String validRequest = """
                                {
                                    "userId": "completeUser",
                                    "password": "CompletePass123!",
                                    "userNm": "완전한 사용자",
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "USER"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(validRequest))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true));
        }
}