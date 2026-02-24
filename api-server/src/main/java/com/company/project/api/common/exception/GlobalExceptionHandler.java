package com.company.project.api.common.exception;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.core.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global Exception Handler
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    protected ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        log.error("handleBusinessException", e);
        ErrorCode errorCode = e.getErrorCode();
        return new ResponseEntity<>(ApiResponse.error(errorCode, e.getMessage()), errorCode.getStatus());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    protected ResponseEntity<ApiResponse<Object>> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException e) {
        log.error("handleMethodArgumentNotValidException", e);
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(ApiResponse.error(ErrorCode.INVALID_INPUT_VALUE, message));
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    protected ResponseEntity<ApiResponse<Void>> handleOptimisticLockingFailureException(
            OptimisticLockingFailureException e) {
        log.error("handleOptimisticLockingFailureException", e);
        return new ResponseEntity<>(
                ApiResponse.error(ErrorCode.INVALID_INPUT_VALUE, "Concurrency conflict: Please try again."),
                HttpStatus.CONFLICT);
    }

    @ExceptionHandler(Exception.class)
    protected ResponseEntity<Map<String, Object>> handleException(Exception e) {
        log.error("handleException: {}", e.getClass().getName(), e);
        
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("message", e.getMessage());
        error.put("exception", e.getClass().getName());
        
        // Add stack trace for debugging
        StringBuilder stackTrace = new StringBuilder();
        for (StackTraceElement element : e.getStackTrace()) {
            stackTrace.append(element.toString()).append("\n");
        }
        error.put("stackTrace", stackTrace.toString());
        
        if (e.getCause() != null) {
            error.put("cause", e.getCause().getMessage());
            error.put("causeException", e.getCause().getClass().getName());
            
            StringBuilder causeStackTrace = new StringBuilder();
            for (StackTraceElement element : e.getCause().getStackTrace()) {
                causeStackTrace.append(element.toString()).append("\n");
            }
            error.put("causeStackTrace", causeStackTrace.toString());
        }
        
        return ResponseEntity.internalServerError().body(error);
    }
}
