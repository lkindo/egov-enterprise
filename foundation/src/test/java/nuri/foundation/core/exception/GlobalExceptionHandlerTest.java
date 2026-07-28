package nuri.foundation.core.exception;

import nuri.foundation.core.response.ApiResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("GlobalExceptionHandler 테스트")
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @DisplayName("BusinessException 처리 테스트")
    void testHandleBusinessException() {
        BusinessException ex = new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND);
        ResponseEntity<ApiResponse<Void>> response = handler.handleBusinessException(ex);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertEquals("C007", response.getBody().code());
    }

    @Test
    @DisplayName("MethodArgumentNotValidException 처리 테스트")
    void testHandleMethodArgumentNotValidException() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError = new FieldError("objectName", "field", "defaultMessage");
        
        when(ex.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getObjectName()).thenReturn("objectName");
        when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldError));
        
        ResponseEntity<ApiResponse<Object>> response = handler.handleMethodArgumentNotValidException(ex);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertEquals("defaultMessage", response.getBody().message());
    }

    @Test
    @DisplayName("AccessDeniedException 처리 테스트")
    void testHandleAccessDeniedException() {
        AccessDeniedException ex = new AccessDeniedException("Access Denied");
        ResponseEntity<ApiResponse<Void>> response = handler.handleAccessDeniedException(ex);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertFalse(response.getBody().success());
    }

    @Test
    @DisplayName("AuthenticationException 처리 테스트")
    void testHandleAuthenticationException() {
        AuthenticationException ex = new org.springframework.security.authentication.BadCredentialsException("Auth Failed");
        ResponseEntity<ApiResponse<Void>> response = handler.handleAuthenticationException(ex);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertFalse(response.getBody().success());
    }

    @Test
    @DisplayName("OptimisticLockingFailureException 처리 테스트")
    void testHandleOptimisticLockingFailureException() {
        OptimisticLockingFailureException ex = new OptimisticLockingFailureException("Lock Failed");
        ResponseEntity<ApiResponse<Void>> response = handler.handleOptimisticLockingFailureException(ex);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertFalse(response.getBody().success());
    }

    @Test
    @DisplayName("IllegalArgumentException 처리 테스트")
    void testHandleIllegalArgumentException() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid Arg");
        ResponseEntity<ApiResponse<Void>> response = handler.handleIllegalArgumentException(ex);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertEquals("Invalid Arg", response.getBody().message());
    }

    @Test
    @DisplayName("HttpMessageNotReadableException 처리 테스트 (일반)")
    void testHandleHttpMessageNotReadableException_Normal() {
        org.springframework.http.HttpInputMessage inputMessage = mock(org.springframework.http.HttpInputMessage.class);
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException("Not Readable", inputMessage);
        ResponseEntity<ApiResponse<Void>> response = handler.handleHttpMessageNotReadableException(ex);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().success());
    }

    @Test
    @DisplayName("HttpMessageNotReadableException 처리 테스트 (UnrecognizedProperty)")
    void testHandleHttpMessageNotReadableException_Unrecognized() {
        UnrecognizedPropertyException cause = mock(UnrecognizedPropertyException.class);
        when(cause.getPropertyName()).thenReturn("unknownField");
        org.springframework.http.HttpInputMessage inputMessage = mock(org.springframework.http.HttpInputMessage.class);
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException("Not Readable", cause, inputMessage);
        
        ResponseEntity<ApiResponse<Void>> response = handler.handleHttpMessageNotReadableException(ex);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertTrue(response.getBody().message().contains("unknownField"));
    }

    @Test
    @DisplayName("HttpRequestMethodNotSupportedException 처리 테스트")
    void testHandleHttpRequestMethodNotSupportedException() {
        HttpRequestMethodNotSupportedException ex = new HttpRequestMethodNotSupportedException("POST");
        ResponseEntity<ApiResponse<Void>> response = handler.handleHttpRequestMethodNotSupportedException(ex);
        assertEquals(HttpStatus.METHOD_NOT_ALLOWED, response.getStatusCode());
        assertFalse(response.getBody().success());
    }

    @Test
    @DisplayName("HttpMediaTypeNotSupportedException 처리 테스트")
    void testHandleHttpMediaTypeNotSupportedException() {
        HttpMediaTypeNotSupportedException ex = new HttpMediaTypeNotSupportedException("application/json");
        ResponseEntity<ApiResponse<Void>> response = handler.handleHttpMediaTypeNotSupportedException(ex);
        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, response.getStatusCode());
        assertFalse(response.getBody().success());
    }

    @Test
    @DisplayName("일반 Exception 처리 테스트")
    void testHandleException() {
        Exception ex = new Exception("unexpected error");
        ResponseEntity<ApiResponse<Void>> response = handler.handleException(ex);
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("DataIntegrityViolationException 처리 테스트 (409 Conflict, 중복 자원)")
    void testHandleDataIntegrityViolation() {
        org.springframework.dao.DataIntegrityViolationException ex =
                new org.springframework.dao.DataIntegrityViolationException("duplicate key value violates unique constraint \"uk_x\"");
        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(ex);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertEquals("C008", response.getBody().code());
    }

    // ── §2.D 불변식 전파: DB 제약의 **종류**가 API 응답 의미로 이어져야 한다 ──────────────
    // V2_24 로 `_yn` 컬럼 60개에 CHECK 가 생겼는데, 종전에는 모든 무결성 위반이 409 "이미 존재하거나
    // 사용 중인 값" 으로 뭉개졌다. 허용되지 않는 **값**을 보낸 클라이언트에게 "중복" 이라 답하는 것은
    // 의미가 틀리다. SQLState 로 갈라 CHECK/NOT NULL 은 400 으로 돌려준다.

    private static org.springframework.dao.DataIntegrityViolationException dive(String sqlState, String msg) {
        return new org.springframework.dao.DataIntegrityViolationException(
                msg, new java.sql.SQLException(msg, sqlState));
    }

    @Test
    @DisplayName("CHECK 제약 위반(23514)은 409 가 아니라 400 이다 — '중복' 이 아니라 '허용되지 않는 값'")
    void testCheckViolationMapsToBadRequest() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(
                dive("23514", "new row violates check constraint \"ck_tb_x_dlt_yn\""));
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertEquals("C001", response.getBody().code());
    }

    @Test
    @DisplayName("NOT NULL 제약 위반(23502)도 400 이다")
    void testNotNullViolationMapsToBadRequest() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(
                dive("23502", "null value in column \"x\" violates not-null constraint"));
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("C001", response.getBody().code());
    }

    @Test
    @DisplayName("UNIQUE 위반(23505)은 종전대로 409 를 유지한다 — 이 경우엔 '중복' 이 맞는 의미다")
    void testUniqueViolationStaysConflict() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(
                dive("23505", "duplicate key value violates unique constraint \"uk_x\""));
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("C008", response.getBody().code());
    }

    @Test
    @DisplayName("FK 위반(23503)은 409 를 유지한다 — 참조 무결성 충돌은 '충돌' 이 맞다")
    void testForeignKeyViolationStaysConflict() {
        ResponseEntity<ApiResponse<Void>> response = handler.handleDataIntegrityViolation(
                dive("23503", "violates foreign key constraint \"fk_x\""));
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("C008", response.getBody().code());
    }
}