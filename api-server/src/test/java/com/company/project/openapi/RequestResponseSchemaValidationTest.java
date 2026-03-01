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
 * ?�청/?�답 ?�키�?검�??�스??
 * API???�청 �??�답??명세???�키마에 ?�라 ?�바르게 구성?�는지 ?�인
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class RequestResponseSchemaValidationTest {

        @Autowired
        private MockMvc mockMvc;

        @Test
        @DisplayName("?�용???�록 ?�청 ?�키�?검�?)
        void userSignup_requestSchema_validation() throws Exception {
                // Given
                String validRequest = """
                                {
                                    "userId": "validUser123",
                                    "password": "ValidPass123!",
                                    "userNm": "?�효???�용??,
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
                                .andExpect(jsonPath("$.data.userNm").value("?�효???�용??));
        }

        @Test
        @DisplayName("?�용???�록 ?�청 - ?�수 ?�드 ?�락 ??검�??�류")
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
        @DisplayName("?�용???�록 ?�청 - ?�못???�드 ?�????검�??�류")
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
        @DisplayName("?�용??목록 조회 ?�답 ?�키�?검�?)
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
        @DisplayName("?�용???�일 조회 ?�답 ?�키�?검�?)
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
        @DisplayName("?�이징된 ?�용??목록 조회 ?�답 ?�키�?검�?)
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
        @DisplayName("?�용???�록 ?�청 - ?�못??ID ?�식 검�?)
        void userSignup_invalidIdFormat_validation() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                    "userId": "invalid@user#id",  // Contains invalid characters
                                    "password": "ValidPass123!",
                                    "userNm": "?�스???�용??,
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
        @DisplayName("?�용???�록 ?�청 - ?�무 �??�드 �?검�?)
        void userSignup_tooLongField_validation() throws Exception {
                // Given
                String longUserId = "a".repeat(50); // Exceeds typical length limit
                String invalidRequest = """
                                {
                                    "userId": "%s",
                                    "password": "ValidPass123!",
                                    "userNm": "?�스???�용??,
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
        @DisplayName("?�용???�록 ?�청 - ?�무 짧�? 비�?번호 검�?)
        void userSignup_shortPassword_validation() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                    "userId": "validUser123",
                                    "password": "123",  // Too short
                                    "userNm": "?�스???�용??,
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
        @DisplayName("?�용???�록 ?�청 - ?�못????�� �?검�?)
        void userSignup_invalidRole_validation() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                    "userId": "validUser123",
                                    "password": "ValidPass123!",
                                    "userNm": "?�스???�용??,
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
        @DisplayName("?�용???�보 ?�정 ?�청 ?�키�?검�?)
        void userUpdate_requestSchema_validation() throws Exception {
                // Given
                String validRequest = """
                                {
                                    "userId": "updateUser",
                                    "userNm": "?�정???�용??,
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
                                .andExpect(jsonPath("$.data.userNm").value("?�정???�용??));
        }

        @Test
        @DisplayName("?�용???�보 ?�정 ?�청 - ?�못???�드 �?검�?)
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
        @DisplayName("?�용????�� ?�청 ?�키�?검�?)
        void userDelete_requestSchema_validation() throws Exception {
                // When & Then
                mockMvc.perform(delete("/api/v1/users/deleteUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("?�용??검???�청 ?�키�?검�?)
        void userSearch_requestSchema_validation() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users/search?searchType=USER_NM&searchKeyword=?�스??)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("?�용??검???�청 - ?�못??검???�??검�?)
        void userSearch_invalidSearchType_validation() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users/search?searchType=INVALID_TYPE&searchKeyword=?�스??)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isBadRequest())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        @DisplayName("?�용??검???�청 - ?�무 �?검?�어 검�?)
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
        @DisplayName("?�답 ?�이??구조 검�?- ?�용??DTO ?�드 존재 ?�인")
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
        @DisplayName("?�청 ?�라미터 ?�키�?검�?- ?�수 ?�???�라미터")
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
        @DisplayName("?�청 ?�라미터 ?�키�?검�?- 부???�???�라미터")
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
        @DisplayName("?�답 ?�키�?검�?- 공통 ?�답 구조 ?�인")
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
        @DisplayName("?�류 ?�답 ?�키�?검�?- 공통 ?�류 ?�답 구조 ?�인")
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
        @DisplayName("?�청 본문 ?�키�?검�?- ?�수 ?�드 존재 ?�인")
        void requestBodySchema_requiredFields_validation() throws Exception {
                // Given - Valid request with all required fields
                String validRequest = """
                                {
                                    "userId": "completeUser",
                                    "password": "CompletePass123!",
                                    "userNm": "?�전???�용??,
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
