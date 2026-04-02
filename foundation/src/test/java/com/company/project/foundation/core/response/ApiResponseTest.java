package com.company.project.foundation.core.response;

import com.company.project.foundation.core.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ApiResponse 테스트")
class ApiResponseTest {

    @Test
    @DisplayName("성공 응답 생성 테스트")
    void testSuccessResponse() {
        // Given
        String data = "test data";

        // When
        ApiResponse<String> response = ApiResponse.success(data);

        // Then
        assertTrue(response.success());
        assertEquals(200, response.status());
        assertEquals("Success", response.message());
        assertEquals(data, response.data());
        assertNotNull(response.timestamp());
    }

    @Test
    @DisplayName("에러 응답 생성 테스트")
    void testErrorResponse() {
        // Given
        ErrorCode errorCode = ErrorCode.INTERNAL_SERVER_ERROR;

        // When
        ApiResponse<Void> response = ApiResponse.error(errorCode);

        // Then
        assertFalse(response.success());
        assertEquals(500, response.status());
        assertEquals(errorCode.getCode(), response.code());
    }
}