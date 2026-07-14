package nuri.foundation.core.exception;
import nuri.business.domain.user.exception.UserErrorCode;

import nuri.foundation.core.exception.GlobalExceptionHandler;
import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
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
        BusinessException ex = new BusinessException(UserErrorCode.USER_NOT_FOUND);
        ResponseEntity<ApiResponse<Void>> response = handler.handleBusinessException(ex);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertFalse(response.getBody().success());
        assertEquals("U001", response.getBody().code());
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
}