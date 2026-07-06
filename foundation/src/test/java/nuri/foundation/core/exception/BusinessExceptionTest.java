package nuri.foundation.core.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

@DisplayName("BusinessException 테스트")
class BusinessExceptionTest {

    @Test
    @DisplayName("ErrorCode 기반 예외 생성 확인")
    void testBusinessExceptionWithErrorCode() {
        ErrorCode errorCode = ErrorCode.INVALID_INPUT_VALUE;
        BusinessException exception = new BusinessException(errorCode);

        assertEquals(errorCode, exception.getErrorCode());
        assertEquals(errorCode.getMessage(), exception.getMessage());
    }

    @Test
    @DisplayName("커스텀 메시지 포함 예외 생성 확인")
    void testBusinessExceptionWithMessage() {
        String message = "Custom error message";
        ErrorCode errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
        BusinessException exception = new BusinessException(message, errorCode);

        assertEquals(errorCode, exception.getErrorCode());
        assertEquals(message, exception.getMessage());
    }
}