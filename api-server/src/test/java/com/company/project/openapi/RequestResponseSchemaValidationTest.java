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
 * 사용자 스키마?검증사용자
 * API?사용자 테스트 嶺뚮ㅏ援욆땻???亦낅〕彛??고뱺 테스트 紐??곗벟 파라미터테스트  회원
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class RequestResponseSchemaValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("회원가입 스키마 검증)")
    void userSignup_requestSchema_validation() throws Exception {
        // Given
        String validRequest = """
                {
                  "userId": "validUser123",
                  "password": "ValidPass123!",
                  "userNm": "?이후 사용자",
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
                .andExpect(jsonPath("$.data.userNm").value("?이후 사용자"));
    }

    @Test
    @DisplayName("사용자가입회원- 사용자필드 존재 테스트 검증?실패)")
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
    @DisplayName("사용자가입회원- 테스트 필드 ???검증?실패)")
    void userSignup_wrongFieldType_validationError() throws Exception {
        // Given
        String invalidRequest = """
                {
                  "userId": 123, // Should be string
                  "password": 456, // Should be string
                  "userNm": true, // Should be string
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
    @DisplayName("사용자嶺뚮ㅄ維뽨빳??브퀗??테스트 醫?亦낅‥??검증?)")
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
    @DisplayName("단건 조회 응답 스키마 검증)")
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
    @DisplayName("사용자醫묒?筌먲퐢彛사용자嶺뚮ㅄ維뽨빳??브퀗??테스트 醫?亦낅‥??검증?)")
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
    @DisplayName("회원가입 - 중복 ID 검증)")
    void userSignup_invalidIdFormat_validation() throws Exception {
        // Given
        String invalidRequest = """
                {
                  "userId": "invalid@user#id", // Contains invalid characters
                  "password": "ValidPass123!",
                  "userNm": "사용자",
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
    @DisplayName("사용자가입회원- 단건???필드 검증?)")
    void userSignup_tooLongField_validation() throws Exception {
        // Given
        String longUserId = "a".repeat(50); // Exceeds typical length limit
        String invalidRequest = """
                {
                  "userId": "%s",
                  "password": "ValidPass123!",
                  "userNm": "사용자",
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
    @DisplayName("사용자가입회원- 단건嶺뚯쉧猷?? ??비밀번호?검증?)")
    void userSignup_shortPassword_validation() throws Exception {
        // Given
        String invalidRequest = """
                {
                  "userId": "validUser123",
                  "password": "123", // Too short
                  "userNm": "사용자",
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
    @DisplayName("사용자가입회원- 테스트 회원탈퇴검증?)")
    void userSignup_invalidRole_validation() throws Exception {
        // Given
        String invalidRequest = """
                {
                  "userId": "validUser123",
                  "password": "ValidPass123!",
                  "userNm": "사용자",
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
    @DisplayName("사용자 수정 응답 스키마 검증)")
    void userUpdate_requestSchema_validation() throws Exception {
        // Given
        String validRequest = """
                {
                  "userId": "updateUser",
                  "userNm": "사용자",
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
                .andExpect(jsonPath("$.data.userNm").value("사용자"));
    }

    @Test
    @DisplayName("사용자테스트사용자 醫롫윪??- 테스트 필드 검증?)")
    void userUpdate_invalidFieldValue_validation() throws Exception {
        // Given
        String invalidRequest = """
                {
                  "userId": "updateUser",
                  "userNm": "", // Empty name not allowed
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
    @DisplayName("사용자 삭제 응답 스키마 검증)")
    void userDelete_requestSchema_validation() throws Exception {
        // When & Then
        mockMvc.perform(delete("/api/v1/users/deleteUser")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("사용자 검색 응답 스키마 검증)")
    void userSearch_requestSchema_validation() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/users/search?searchType=USER_NM&searchKeyword=사용자")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("사용자검증- 테스트 검색???검증?)")
    void userSearch_invalidSearchType_validation() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/users/search?searchType=INVALID_TYPE&searchKeyword=사용자")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("사용자 검색 - 단건 타입 검증 실패)")
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
    @DisplayName("테스트사용자응답 형식검증?- 사용자DTO 필드 확인)")
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
    @DisplayName("사용자 필드 선택적 스키마 - 전체 선택 필드)")
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
    @DisplayName("사용자 선택적스키마?검증?- 遊붋?????테스트선택적)")
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
    @DisplayName("응답 스키마 - 성공 응답 형식 검증)")
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
    @DisplayName("에러 스키마 - 실패 응답 형식 검증)")
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
    @DisplayName("사용자곌랜梨뜻룇 스키마?검증?- 사용자필드 확인)")
    void requestBodySchema_requiredFields_validation() throws Exception {
        // Given - Valid request with all required fields
        String validRequest = """
                {
                  "userId": "completeUser",
                  "password": "CompletePass123!",
                  "userNm": "사용자",
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
