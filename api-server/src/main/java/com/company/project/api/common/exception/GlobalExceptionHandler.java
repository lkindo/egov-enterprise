package com.company.project.api.common.exception;

import java.util.stream.Collectors;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.validation.FieldError;
import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.core.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 전역 예외 처리기
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 비즈니스 로직 예외 처리
     */
    @ExceptionHandler(BusinessException.class)
    protected ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        log.error("handleBusinessException", e);
        ErrorCode errorCode = e.getErrorCode();
        ApiResponse<Void> response = ApiResponse.error(errorCode.getStatus().value(), e.getMessage());
        return new ResponseEntity<>(response, errorCode.getStatus());
    }

    /**
     * 유효성 검증 예외 처리 (@Valid)
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    protected ResponseEntity<ApiResponse<Object>> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException e) {
        log.error("handleMethodArgumentNotValidException", e);
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));

        ApiResponse<Object> response = ApiResponse.error(400, message);
        return ResponseEntity.badRequest().body(response);
    }

    /**
     * 나머지 예외 처리
     */
    @ExceptionHandler(Exception.class)
    protected ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("handleException", e);
        ApiResponse<Void> response = ApiResponse.error(500, "Internal Server Error: " + e.getMessage());
        return ResponseEntity.internalServerError().body(response);
    }
}
