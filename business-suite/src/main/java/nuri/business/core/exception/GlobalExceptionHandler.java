package nuri.business.core.exception;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;

import nuri.foundation.core.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.stream.Collectors;

/**
 * 전역 예외 처리기 (Global Exception Handler)
 * - 모든 모듈의 예외를 ApiResponse 규격으로 통합 반환
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 비즈니스 로직 예외 처리
     */
    @ExceptionHandler(BusinessException.class)
    protected ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        log.warn(">>> BusinessException: {} - {}", e.getErrorCode().getCode(), e.getMessage());
        ErrorCode errorCode = e.getErrorCode();
        return new ResponseEntity<>(ApiResponse.error(errorCode, e.getMessage()), errorCode.getStatus());
    }

    /**
     * Bean Validation (@Valid) 예외 처리
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    protected ResponseEntity<ApiResponse<Object>> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException e) {
        log.warn(">>> Validation Failed: {}", e.getBindingResult().getObjectName());
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(ApiResponse.error(ErrorCode.INVALID_INPUT_VALUE, message));
    }

    /**
     * 권한 부족 예외 처리 (Spring Security)
     */
    @ExceptionHandler(AccessDeniedException.class)
    protected ResponseEntity<ApiResponse<Void>> handleAccessDeniedException(AccessDeniedException e) {
        log.warn(">>> Access Denied: {}", e.getMessage());
        return new ResponseEntity<>(ApiResponse.error(ErrorCode.ACCESS_DENIED), HttpStatus.FORBIDDEN);
    }

    /**
     * 인증 실패 예외 처리 (Spring Security)
     */
    @ExceptionHandler(AuthenticationException.class)
    protected ResponseEntity<ApiResponse<Void>> handleAuthenticationException(AuthenticationException e) {
        log.warn(">>> Authentication Failed: {}", e.getMessage());
        return new ResponseEntity<>(ApiResponse.error(ErrorCode.UNAUTHORIZED, e.getMessage()), HttpStatus.UNAUTHORIZED);
    }

    /**
     * 낙관적 락 충돌 예외 처리
     */
    @ExceptionHandler(OptimisticLockingFailureException.class)
    protected ResponseEntity<ApiResponse<Void>> handleOptimisticLockingFailureException(
            OptimisticLockingFailureException e) {
        log.error(">>> Concurrency Conflict", e);
        return new ResponseEntity<>(
                ApiResponse.error(ErrorCode.INVALID_INPUT_VALUE, "데이터가 이미 수정되었습니다. 다시 시도해주세요."),
                HttpStatus.CONFLICT);
    }

    /**
     * 부적절한 인자 전달 예외 처리
     */
    @ExceptionHandler(IllegalArgumentException.class)
    protected ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException e) {
        log.warn(">>> Illegal Argument: {}", e.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.error(ErrorCode.INVALID_INPUT_VALUE, e.getMessage()));
    }

    /**
     * JSON 역직렬화 오류 처리 (예: 정의되지 않은 필드 전송 시)
     */
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    protected ResponseEntity<ApiResponse<Void>> handleHttpMessageNotReadableException(
            org.springframework.http.converter.HttpMessageNotReadableException e) {
        log.warn(">>> JSON Deserialization Failed: {}", e.getMessage());
        String detailMessage = "잘못된 데이터 형식이거나 정의되지 않은 필드가 포함되어 있습니다.";
        if (e.getCause() instanceof com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException) {
            com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException cause = 
                (com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException) e.getCause();
            detailMessage = String.format("정의되지 않은 필드 '%s'가 포함되어 있습니다.", cause.getPropertyName());
        }
        return ResponseEntity.badRequest().body(ApiResponse.error(ErrorCode.INVALID_INPUT_VALUE, detailMessage));
    }

    /**
     * 지원하지 않는 HTTP 메서드 호출 예외 처리
     */
    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    protected ResponseEntity<ApiResponse<Void>> handleHttpRequestMethodNotSupportedException(
            org.springframework.web.HttpRequestMethodNotSupportedException e) {
        return new ResponseEntity<>(ApiResponse.error(ErrorCode.METHOD_NOT_ALLOWED), HttpStatus.METHOD_NOT_ALLOWED);
    }

    /**
     * 지원하지 않는 미디어 타입 호출 예외 처리
     */
    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    protected ResponseEntity<ApiResponse<Void>> handleHttpMediaTypeNotSupportedException(
            org.springframework.web.HttpMediaTypeNotSupportedException e) {
        return new ResponseEntity<>(ApiResponse.error(ErrorCode.UNSUPPORTED_MEDIA_TYPE), HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    /**
     * 최상위 공통 예외 처리
     * 백엔드 헌법 제7조 2항 및 정보 노출(Information Disclosure) 취약점 방어를 위해
     * 내부 상세 메시지는 서버 로그(log.error)로만 남기고, 클라이언트 응답은 마스킹하여 반환.
     */
    @ExceptionHandler(Exception.class)
    protected ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error(">>> Internal Server Error: {} - ExceptionType: {}", e.getMessage(), e.getClass().getName(), e);
        return new ResponseEntity<>(
                ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다. 지속될 경우 관리자에게 문의해 주세요."),
                HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
