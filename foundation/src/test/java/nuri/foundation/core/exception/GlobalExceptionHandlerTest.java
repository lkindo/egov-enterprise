package nuri.foundation.core.exception;

import nuri.foundation.core.response.ApiResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("GlobalExceptionHandler 테스트")
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("BusinessException 처리 테스트")
    void testHandleBusinessException() {
        // Given
        BusinessException ex = new BusinessException(ErrorCode.USER_NOT_FOUND);

        // When
        ResponseEntity<ApiResponse<Void>> response = handler.handleBusinessException(ex);

        // Then
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().success());
        assertEquals("U001", response.getBody().code());
    }

    @Test
    @DisplayName("일반 Exception 처리 테스트")
    void testHandleException() {
        // Given
        Exception ex = new Exception("unexpected error");

        // When
        ResponseEntity<ApiResponse<Void>> response = handler.handleException(ex);

        // Then
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
    }
}