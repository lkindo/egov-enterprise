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
 * ?îÏ≤≠/?ëÎãµ ?§ÌÇ§Îß?Í≤ÄÏ¶??åÏä§??
 * API???îÏ≤≠ Î∞??ëÎãµ??Î™ÖÏÑ∏???§ÌÇ§ÎßàÏóê ?∞Îùº ?¨Î∞îÎ•¥Í≤å Íµ¨ÏÑ±?òÎäîÏßÄ ?ïÏù∏
 */
@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class RequestResponseSchemaValidationTest {

        @Autowired
        private MockMvc mockMvc;

        @Test
        @DisplayName("?¨Ïö©???±Î°ù ?îÏ≤≠ ?§ÌÇ§Îß?Í≤ÄÏ¶?)
        void userSignup_requestSchema_validation() throws Exception {
                // Given
                String validRequest = """
                                {
                                    "userId": "validUser123",
                                    "password": "ValidPass123!",
                                    "userNm": "?†Ìö®???¨Ïö©??,
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
                                .andExpect(jsonPath("$.data.userNm").value("?†Ìö®???¨Ïö©??));
        }

        @Test
        @DisplayName("?¨Ïö©???±Î°ù ?îÏ≤≠ - ?ÑÏàò ?ÑÎìú ?ÑÎùΩ ??Í≤ÄÏ¶??§Î•ò")
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
        @DisplayName("?¨Ïö©???±Î°ù ?îÏ≤≠ - ?òÎ™ª???ÑÎìú ?Ä????Í≤ÄÏ¶??§Î•ò")
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
        @DisplayName("?¨Ïö©??Î™©Î°ù Ï°∞Ìöå ?ëÎãµ ?§ÌÇ§Îß?Í≤ÄÏ¶?)
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
        @DisplayName("?¨Ïö©???®Ïùº Ï°∞Ìöå ?ëÎãµ ?§ÌÇ§Îß?Í≤ÄÏ¶?)
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
        @DisplayName("?òÏù¥ÏßïÎêú ?¨Ïö©??Î™©Î°ù Ï°∞Ìöå ?ëÎãµ ?§ÌÇ§Îß?Í≤ÄÏ¶?)
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
        @DisplayName("?¨Ïö©???±Î°ù ?îÏ≤≠ - ?òÎ™ª??ID ?ïÏãù Í≤ÄÏ¶?)
        void userSignup_invalidIdFormat_validation() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                    "userId": "invalid@user#id",  // Contains invalid characters
                                    "password": "ValidPass123!",
                                    "userNm": "?åÏä§???¨Ïö©??,
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
        @DisplayName("?¨Ïö©???±Î°ù ?îÏ≤≠ - ?àÎ¨¥ Í∏??ÑÎìú Í∞?Í≤ÄÏ¶?)
        void userSignup_tooLongField_validation() throws Exception {
                // Given
                String longUserId = "a".repeat(50); // Exceeds typical length limit
                String invalidRequest = """
                                {
                                    "userId": "%s",
                                    "password": "ValidPass123!",
                                    "userNm": "?åÏä§???¨Ïö©??,
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
        @DisplayName("?¨Ïö©???±Î°ù ?îÏ≤≠ - ?àÎ¨¥ ÏßßÏ? ÎπÑÎ?Î≤àÌò∏ Í≤ÄÏ¶?)
        void userSignup_shortPassword_validation() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                    "userId": "validUser123",
                                    "password": "123",  // Too short
                                    "userNm": "?åÏä§???¨Ïö©??,
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
        @DisplayName("?¨Ïö©???±Î°ù ?îÏ≤≠ - ?òÎ™ª????ï† Í∞?Í≤ÄÏ¶?)
        void userSignup_invalidRole_validation() throws Exception {
                // Given
                String invalidRequest = """
                                {
                                    "userId": "validUser123",
                                    "password": "ValidPass123!",
                                    "userNm": "?åÏä§???¨Ïö©??,
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
        @DisplayName("?¨Ïö©???ïÎ≥¥ ?òÏ†ï ?îÏ≤≠ ?§ÌÇ§Îß?Í≤ÄÏ¶?)
        void userUpdate_requestSchema_validation() throws Exception {
                // Given
                String validRequest = """
                                {
                                    "userId": "updateUser",
                                    "userNm": "?òÏ†ï???¨Ïö©??,
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
                                .andExpect(jsonPath("$.data.userNm").value("?òÏ†ï???¨Ïö©??));
        }

        @Test
        @DisplayName("?¨Ïö©???ïÎ≥¥ ?òÏ†ï ?îÏ≤≠ - ?òÎ™ª???ÑÎìú Í∞?Í≤ÄÏ¶?)
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
        @DisplayName("?¨Ïö©????†ú ?îÏ≤≠ ?§ÌÇ§Îß?Í≤ÄÏ¶?)
        void userDelete_requestSchema_validation() throws Exception {
                // When & Then
                mockMvc.perform(delete("/api/v1/users/deleteUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("?¨Ïö©??Í≤Ä???îÏ≤≠ ?§ÌÇ§Îß?Í≤ÄÏ¶?)
        void userSearch_requestSchema_validation() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users/search?searchType=USER_NM&searchKeyword=?åÏä§??)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("?¨Ïö©??Í≤Ä???îÏ≤≠ - ?òÎ™ª??Í≤Ä???Ä??Í≤ÄÏ¶?)
        void userSearch_invalidSearchType_validation() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users/search?searchType=INVALID_TYPE&searchKeyword=?åÏä§??)
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isBadRequest())
                                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                                .andExpect(jsonPath("$.success").value(false));
        }

        @Test
        @DisplayName("?¨Ïö©??Í≤Ä???îÏ≤≠ - ?àÎ¨¥ Í∏?Í≤Ä?âÏñ¥ Í≤ÄÏ¶?)
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
        @DisplayName("?ëÎãµ ?∞Ïù¥??Íµ¨Ï°∞ Í≤ÄÏ¶?- ?¨Ïö©??DTO ?ÑÎìú Ï°¥Ïû¨ ?ïÏù∏")
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
        @DisplayName("?îÏ≤≠ ?åÎùºÎØ∏ÌÑ∞ ?§ÌÇ§Îß?Í≤ÄÏ¶?- ?ïÏàò ?Ä???åÎùºÎØ∏ÌÑ∞")
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
        @DisplayName("?îÏ≤≠ ?åÎùºÎØ∏ÌÑ∞ ?§ÌÇ§Îß?Í≤ÄÏ¶?- Î∂Ä???Ä???åÎùºÎØ∏ÌÑ∞")
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
        @DisplayName("?ëÎãµ ?§ÌÇ§Îß?Í≤ÄÏ¶?- Í≥µÌÜµ ?ëÎãµ Íµ¨Ï°∞ ?ïÏù∏")
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
        @DisplayName("?§Î•ò ?ëÎãµ ?§ÌÇ§Îß?Í≤ÄÏ¶?- Í≥µÌÜµ ?§Î•ò ?ëÎãµ Íµ¨Ï°∞ ?ïÏù∏")
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
        @DisplayName("?îÏ≤≠ Î≥∏Î¨∏ ?§ÌÇ§Îß?Í≤ÄÏ¶?- ?ÑÏàò ?ÑÎìú Ï°¥Ïû¨ ?ïÏù∏")
        void requestBodySchema_requiredFields_validation() throws Exception {
                // Given - Valid request with all required fields
                String validRequest = """
                                {
                                    "userId": "completeUser",
                                    "password": "CompletePass123!",
                                    "userNm": "?ÑÏ†Ñ???¨Ïö©??,
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
