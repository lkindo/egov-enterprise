package com.company.project.foundation.core.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("ErrorCode 테스트")
class ErrorCodeTest {

    @Test
    @DisplayName("ErrorCode 필드 확인")
    void testErrorCodeFields() {
        ErrorCode errorCode = ErrorCode.INVALID_INPUT_VALUE;

        assertEquals(400, errorCode.getStatus());
        assertEquals("C001", errorCode.getCode());
        assertEquals("Invalid Input Value", errorCode.getMessage());
    }
}