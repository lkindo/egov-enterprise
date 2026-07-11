package nuri.foundation.core.exception;
import nuri.foundation.core.exception.CommonErrorCode;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("ErrorCode 테스트")
class ErrorCodeTest {

    @Test
    @DisplayName("ErrorCode 필드 확인")
    void testErrorCodeFields() {
        ErrorCode errorCode = CommonErrorCode.INVALID_INPUT_VALUE;

        assertEquals(400, errorCode.getStatus().value());
        assertEquals("C001", errorCode.getCode());
        assertEquals("Invalid Input Value", errorCode.getMessage());
    }
}