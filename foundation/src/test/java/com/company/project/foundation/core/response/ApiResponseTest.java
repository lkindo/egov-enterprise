package com.company.project.foundation.core.response;

import com.company.project.foundation.core.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ApiResponse 테스트")
class ApiResponseTest {

    @Test
    @DisplayName("성공 응답 생성 확인")
    void testSuccessResponse() {
        String data = "test data";
        ApiResponse<String> response = ApiResponse.success(data);

        assertTrue(response.isSuccess());
        assertEquals(data, response.getData());
        assertNull(response.getError());
    }

    @Test
    @DisplayName("에러 응답 생성 확인")
    void testErrorResponse() {
        ErrorCode errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
        ApiResponse<Object> response = ApiResponse.error(errorCode);

        assertFalse(response.isSuccess());
        assertNull(response.getData());
        assertNotNull(response.getError());
        assertEquals("C004", response.getError().getCode());
        assertEquals("서버 오류입니다.", response.getError().getMessage());
    }
}