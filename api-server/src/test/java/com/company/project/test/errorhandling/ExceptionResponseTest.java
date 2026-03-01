package com.company.project.test.errorhandling;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.service.user.UserService;
import com.company.project.service.user.dto.UserDto;
import com.company.project.service.user.dto.UserSignupRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
class ExceptionResponseTest {

        @Autowired
        private MockMvc mockMvc;

        @MockitoBean
        private UserService userService;

        @Test
        @DisplayName("?àÏô∏ Î∞úÏÉù ???ÅÏ†à???êÎü¨ ?ëÎãµ Î∞òÌôò - ÎπÑÏ¶à?àÏä§ ?àÏô∏")
        void exception_occurs_returnsProperErrorResponse() throws Exception {
                // Given

                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new BusinessException(ErrorCode.DUPLICATE_USER_ID));

                String requestBody = """
                                {
                                    "userId": "duplicateUser",
                                    "password": "password123!",
                                    "userNm": "Ï§ëÎ≥µ ?¨Ïö©??,
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "USER"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("DUPLICATE_USER_ID"))
                                .andExpect(jsonPath("$.error.message").exists());
        }

        @Test
        @DisplayName("?∞Ì????àÏô∏ Î∞úÏÉù ??500 ?êÎü¨ ?ëÎãµ Î∞òÌôò")
        void runtimeException_occurs_returns500Error() throws Exception {
                // Given
                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new RuntimeException("Internal server error"));

                String requestBody = """
                                {
                                    "userId": "testUser",
                                    "password": "password123!",
                                    "userNm": "?åÏä§???¨Ïö©??,
                                    "passwordHint": "hint",
                                    "passwordCnsr": "answer",
                                    "role": "USER"
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody))
                                .andExpect(status().isInternalServerError())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("INTERNAL_ERROR"))
                                .andExpect(jsonPath("$.error.message").exists());
        }

        @Test
        @DisplayName("?ÖÎ†• Í≤ÄÏ¶??àÏô∏ Î∞úÏÉù ??400 ?êÎü¨ ?ëÎãµ Î∞òÌôò")
        void validationException_occurs_returns400Error() throws Exception {
                // Given
                String invalidRequestBody = """
                                {
                                    "userId": "",
                                    "password": "123",
                                    "userNm": ""
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidRequestBody))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error").exists())
                                .andExpect(jsonPath("$.data").isEmpty());
        }

        @Test
        @DisplayName("Ï°¥Ïû¨?òÏ? ?äÎäî ?¨Ïö©??Ï°∞Ìöå ??404 ?êÎü¨ ?ëÎãµ Î∞òÌôò")
        void userNotFound_occurs_returns404Error() throws Exception {
                // Given
                when(userService.getUserById("nonexistentUser"))
                                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND));

                // When & Then
                mockMvc.perform(get("/api/v1/users/nonexistentUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isNotFound())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("USER_NOT_FOUND"))
                                .andExpect(jsonPath("$.error.message").exists());
        }

        @Test
        @DisplayName("?∏Ï¶ù?òÏ? ?äÏ? ?îÏ≤≠ ??401 ?êÎü¨ ?ëÎãµ Î∞òÌôò")
        void unauthorizedRequest_occurs_returns401Error() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/admin/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isUnauthorized())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
                                .andExpect(jsonPath("$.error.message").value("Authentication required"));
        }

        @Test
        @DisplayName("Í∂åÌïú???ÜÎäî ?îÏ≤≠ ??403 ?êÎü¨ ?ëÎãµ Î∞òÌôò")
        void forbiddenRequest_occurs_returns403Error() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/admin/users")
                                .header("Authorization", "Bearer validTokenButNotAdmin")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isForbidden())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
                                .andExpect(jsonPath("$.error.message").value("Access denied"));
        }

        @Test
        @DisplayName("?úÎ≤Ñ ?¥Î? ?§Î•ò Î∞úÏÉù ??500 ?êÎü¨ ?ëÎãµ Î∞òÌôò")
        void internalServerError_occurs_returns500Error() throws Exception {
                // Given
                when(userService.getUserList())
                                .thenThrow(new RuntimeException("Database connection failed"));

                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("INTERNAL_ERROR"))
                                .andExpect(jsonPath("$.error.message").value("An unexpected error occurred"));
        }

        @Test
        @DisplayName("?òÎ™ª???îÏ≤≠ ?åÎùºÎØ∏ÌÑ∞ ??400 ?êÎü¨ ?ëÎãµ Î∞òÌôò")
        void badRequestParameter_occurs_returns400Error() throws Exception {
                // When & Then
                mockMvc.perform(get("/api/v1/users?page=-1&size=0") // Invalid pagination params
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("INVALID_PARAMETER"))
                                .andExpect(jsonPath("$.error.message").exists());
        }

        @Test
        @DisplayName("JSON ?åÏã± ?§Î•ò Î∞úÏÉù ??400 ?êÎü¨ ?ëÎãµ Î∞òÌôò")
        void jsonParseError_occurs_returns400Error() throws Exception {
                // Given
                String invalidJson = """
                                {
                                    "userId": "testUser",
                                    "password": "password123!",
                                    "userNm": "?åÏä§???¨Ïö©??,
                                    "invalidField": "extraValue"
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidJson))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("INVALID_JSON"))
                                .andExpect(jsonPath("$.error.message").exists());
        }

        @Test
        @DisplayName("Î©îÏÑú???àÏö©?òÏ? ?äÏ? HTTP Î©îÏÑú???¨Ïö© ??405 ?êÎü¨ ?ëÎãµ Î∞òÌôò")
        void methodNotAllowed_occurs_returns405Error() throws Exception {
                // When & Then
                mockMvc.perform(patch("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                                .andExpect(status().isMethodNotAllowed())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("METHOD_NOT_ALLOWED"))
                                .andExpect(jsonPath("$.error.message").exists());
        }

        @Test
        @DisplayName("?îÏ≤≠ ?òÏù¥Î°úÎìúÍ∞Ä ?àÎ¨¥ ??Í≤ΩÏö∞ 413 ?êÎü¨ ?ëÎãµ Î∞òÌôò")
        void payloadTooLarge_occurs_returns413Error() throws Exception {
                // Given
                String largePayload = """
                                {
                                    "userId": "testUser",
                                    "password": "password123!",
                                    "userNm": "%s"
                                }
                                """.formatted("A".repeat(10000)); // Very large string

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(largePayload))
                                .andExpect(status().isPayloadTooLarge())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("PAYLOAD_TOO_LARGE"))
                                .andExpect(jsonPath("$.error.message").exists());
        }

        @Test
        @DisplayName("ÏßÄ?êÎêòÏßÄ ?äÎäî ÎØ∏Îîî???Ä???îÏ≤≠ ??415 ?êÎü¨ ?ëÎãµ Î∞òÌôò")
        void unsupportedMediaType_occurs_returns415Error() throws Exception {
                // Given
                String requestBody = """
                                {
                                    "userId": "testUser",
                                    "password": "password123!",
                                    "userNm": "?åÏä§???¨Ïö©??
                                }
                                """;

                // When & Then
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType("application/xml") // Wrong content type
                                .content(requestBody))
                                .andExpect(status().isUnsupportedMediaType())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("UNSUPPORTED_MEDIA_TYPE"))
                                .andExpect(jsonPath("$.error.message").exists());
        }

        @Test
        @DisplayName("?îÏ≤≠ ?úÍ∞Ñ Ï¥àÍ≥º ??408 ?êÎü¨ ?ëÎãµ Î∞òÌôò")
        void requestTimeout_occurs_returns408Error() throws Exception {
                // Given
                // Simulate slow service response
                when(userService.signup(any(UserSignupRequest.class)))
                                .thenAnswer(invocation -> {
                                        Thread.sleep(10000); // 10 seconds delay
                                        return null;
                                });

                String requestBody = """
                                {
                                    "userId": "slowUser",
                                    "password": "password123!",
                                    "userNm": "?êÎ¶∞ ?¨Ïö©??
                                }
                                """;

                // When & Then
                // Note: This test might require specific timeout configuration in MockMvc
                mockMvc.perform(post("/api/v1/users/signup")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(requestBody)
                                .requestAttr("org.springframework.web.util.WebUtils.ERROR_REQUEST_URI_ATTRIBUTE",
                                                "/api/v1/users/signup"))
                                .andExpect(status().isRequestTimeout())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("REQUEST_TIMEOUT"))
                                .andExpect(jsonPath("$.error.message").exists());
        }

        @Test
        @DisplayName("?úÎ≤Ñ Í≥ºÎ?????503 ?êÎü¨ ?ëÎãµ Î∞òÌôò")
        void serviceUnavailable_occurs_returns503Error() throws Exception {
                // Given
                when(userService.getUserList())
                                .thenThrow(new com.company.project.core.exception.BusinessException(
                                                ErrorCode.SERVER_OVERLOAD));

                // When & Then
                mockMvc.perform(get("/api/v1/users")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isServiceUnavailable())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("SERVER_OVERLOAD"))
                                .andExpect(jsonPath("$.error.message").exists());
        }

        @Test
        @DisplayName("?êÎü¨ ?ëÎãµ Íµ¨Ï°∞ ?ºÍ????ïÏù∏")
        void errorResponse_structure_consistency() throws Exception {
                // Given
                when(userService.getUserById("nonexistent"))
                                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND));

                // When & Then
                mockMvc.perform(get("/api/v1/users/nonexistent")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isNotFound())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error").exists())
                                .andExpect(jsonPath("$.error.code").exists())
                                .andExpect(jsonPath("$.error.message").exists())
                                .andExpect(jsonPath("$.data").isEmpty()) // Error responses should have empty data
                                .andExpect(jsonPath("$.timestamp").exists()); // Should include timestamp
        }

        @Test
        @DisplayName("?§Ïñë???àÏô∏ ?Ä?ÖÏóê ?Ä???ëÎãµ ?åÏä§??)
        void variousExceptionTypes_responseTest() throws Exception {
                // Test for different exception types
                when(userService.getUserById("illegalArg"))
                                .thenThrow(new IllegalArgumentException("Invalid argument"));

                when(userService.getUserById("nullPointer"))
                                .thenThrow(new NullPointerException("Null pointer exception"));

                when(userService.getUserById("illegalState"))
                                .thenThrow(new IllegalStateException("Illegal state"));

                // Test IllegalArgumentException
                mockMvc.perform(get("/api/v1/users/illegalArg")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isBadRequest());

                // Test NullPointerException
                mockMvc.perform(get("/api/v1/users/nullPointer")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());

                // Test IllegalStateException
                mockMvc.perform(get("/api/v1/users/illegalState")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError());
        }

        @Test
        @DisplayName("?êÎü¨ Î©îÏãúÏßÄ Î°úÏª¨?ºÏù¥?úÏù¥???åÏä§??)
        void errorMessage_localization_test() throws Exception {
                // Given
                when(userService.getUserById("localizedError"))
                                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND));

                // When & Then - Test with different locales
                mockMvc.perform(get("/api/v1/users/localizedError")
                                .contentType(MediaType.APPLICATION_JSON)
                                .header("Accept-Language", "ko-KR"))
                                .andExpect(status().isNotFound())
                                .andExpect(jsonPath("$.error.message").value("?¨Ïö©?êÎ? Ï∞æÏùÑ ???ÜÏäµ?àÎã§."));

                mockMvc.perform(get("/api/v1/users/localizedError")
                                .contentType(MediaType.APPLICATION_JSON)
                                .header("Accept-Language", "en-US"))
                                .andExpect(status().isNotFound())
                                .andExpect(jsonPath("$.error.message").value("User not found."));
        }

        @Test
        @DisplayName("?êÎü¨ ?ëÎãµ???ÅÏÑ∏ ?ïÎ≥¥ ?¨Ìï® ?¨Î? ?åÏä§??)
        void errorResponse_withDetails() throws Exception {
                // Given
                BusinessException businessException = new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
                businessException.addDetail("field", "userId");
                businessException.addDetail("rejectedValue", "");
                businessException.addDetail("message", "User ID cannot be empty");

                when(userService.getUserById("detailedError"))
                                .thenThrow(businessException);

                // When & Then
                mockMvc.perform(get("/api/v1/users/detailedError")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT_VALUE"))
                                .andExpect(jsonPath("$.error.message").exists())
                                .andExpect(jsonPath("$.error.details").exists())
                                .andExpect(jsonPath("$.error.details.field").value("userId"))
                                .andExpect(jsonPath("$.error.details.rejectedValue").value(""))
                                .andExpect(jsonPath("$.error.details.message").value("User ID cannot be empty"));
        }

        @Test
        @DisplayName("?êÎü¨ ?ëÎãµ??Ï∂îÏ†Å ID ?¨Ìï® ?¨Î? ?åÏä§??)
        void errorResponse_withTraceId() throws Exception {
                // Given
                when(userService.getUserById("errorWithTrace"))
                                .thenThrow(new BusinessException(ErrorCode.INTERNAL_ERROR));

                // When & Then
                mockMvc.perform(get("/api/v1/users/errorWithTrace")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isInternalServerError())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.error").exists())
                                .andExpect(jsonPath("$.error.traceId").exists()) // Should include trace ID for
                                                                                 // debugging
                                .andExpect(jsonPath("$.error.timestamp").exists());
        }

        @Test
        @DisplayName("?êÎü¨ Î∞úÏÉù ???ïÏÉÅ ?îÏ≤≠ Ï≤òÎ¶¨ Í∞Ä???¨Î? ?åÏä§??)
        void errorThenNormalRequest_handlingCapability() throws Exception {
                // Given - First request causes error
                when(userService.getUserById("errorUser"))
                                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND));

                // When & Then - Error request
                mockMvc.perform(get("/api/v1/users/errorUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isNotFound());

                // Given - Reset mock for normal response
                when(userService.getUserById("normalUser"))
                                .thenReturn(new UserDto("normalUser", "?ïÏÉÅ ?¨Ïö©??, "USR00001", null, null, null, null));

                // When & Then - Normal request after error should still work
                mockMvc.perform(get("/api/v1/users/normalUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("normalUser"));
        }
}
