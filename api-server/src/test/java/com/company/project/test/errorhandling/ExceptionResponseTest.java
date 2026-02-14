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
import org.springframework.boot.test.mock.mockito.MockBean;
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

        @MockBean
        private UserService userService;

        @Test
        @DisplayName("예외 발생 시 적절한 에러 응답 반환 - 비즈니스 예외")
        void exception_occurs_returnsProperErrorResponse() throws Exception {
                // Given

                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new BusinessException(ErrorCode.DUPLICATE_USER_ID));

                String requestBody = """
                                {
                                    "userId": "duplicateUser",
                                    "password": "password123!",
                                    "userNm": "중복 사용자",
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
        @DisplayName("런타임 예외 발생 시 500 에러 응답 반환")
        void runtimeException_occurs_returns500Error() throws Exception {
                // Given
                when(userService.signup(any(UserSignupRequest.class)))
                                .thenThrow(new RuntimeException("Internal server error"));

                String requestBody = """
                                {
                                    "userId": "testUser",
                                    "password": "password123!",
                                    "userNm": "테스트 사용자",
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
        @DisplayName("입력 검증 예외 발생 시 400 에러 응답 반환")
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
        @DisplayName("존재하지 않는 사용자 조회 시 404 에러 응답 반환")
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
        @DisplayName("인증되지 않은 요청 시 401 에러 응답 반환")
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
        @DisplayName("권한이 없는 요청 시 403 에러 응답 반환")
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
        @DisplayName("서버 내부 오류 발생 시 500 에러 응답 반환")
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
        @DisplayName("잘못된 요청 파라미터 시 400 에러 응답 반환")
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
        @DisplayName("JSON 파싱 오류 발생 시 400 에러 응답 반환")
        void jsonParseError_occurs_returns400Error() throws Exception {
                // Given
                String invalidJson = """
                                {
                                    "userId": "testUser",
                                    "password": "password123!",
                                    "userNm": "테스트 사용자",
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
        @DisplayName("메서드 허용되지 않은 HTTP 메서드 사용 시 405 에러 응답 반환")
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
        @DisplayName("요청 페이로드가 너무 클 경우 413 에러 응답 반환")
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
        @DisplayName("지원되지 않는 미디어 타입 요청 시 415 에러 응답 반환")
        void unsupportedMediaType_occurs_returns415Error() throws Exception {
                // Given
                String requestBody = """
                                {
                                    "userId": "testUser",
                                    "password": "password123!",
                                    "userNm": "테스트 사용자"
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
        @DisplayName("요청 시간 초과 시 408 에러 응답 반환")
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
                                    "userNm": "느린 사용자"
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
        @DisplayName("서버 과부하 시 503 에러 응답 반환")
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
        @DisplayName("에러 응답 구조 일관성 확인")
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
        @DisplayName("다양한 예외 타입에 대한 응답 테스트")
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
        @DisplayName("에러 메시지 로컬라이제이션 테스트")
        void errorMessage_localization_test() throws Exception {
                // Given
                when(userService.getUserById("localizedError"))
                                .thenThrow(new BusinessException(ErrorCode.USER_NOT_FOUND));

                // When & Then - Test with different locales
                mockMvc.perform(get("/api/v1/users/localizedError")
                                .contentType(MediaType.APPLICATION_JSON)
                                .header("Accept-Language", "ko-KR"))
                                .andExpect(status().isNotFound())
                                .andExpect(jsonPath("$.error.message").value("사용자를 찾을 수 없습니다."));

                mockMvc.perform(get("/api/v1/users/localizedError")
                                .contentType(MediaType.APPLICATION_JSON)
                                .header("Accept-Language", "en-US"))
                                .andExpect(status().isNotFound())
                                .andExpect(jsonPath("$.error.message").value("User not found."));
        }

        @Test
        @DisplayName("에러 응답에 상세 정보 포함 여부 테스트")
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
        @DisplayName("에러 응답에 추적 ID 포함 여부 테스트")
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
        @DisplayName("에러 발생 후 정상 요청 처리 가능 여부 테스트")
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
                                .thenReturn(new UserDto("normalUser", "정상 사용자", "USR00001", null, null, null, null));

                // When & Then - Normal request after error should still work
                mockMvc.perform(get("/api/v1/users/normalUser")
                                .contentType(MediaType.APPLICATION_JSON))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.userId").value("normalUser"));
        }
}