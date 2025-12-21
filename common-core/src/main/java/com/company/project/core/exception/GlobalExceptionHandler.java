package com.company.project.core.exception;

import com.company.project.core.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler {

    private final MessageSource messageSource;

    @ExceptionHandler(BusinessException.class)
    protected ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException e) {
        log.error("BusinessException: {}", e.getErrorCode().getMessage());
        ErrorCode errorCode = e.getErrorCode();
        return ResponseEntity.status((org.springframework.http.HttpStatusCode) errorCode.getStatus())
                .body(ApiResponse.<Void>error(errorCode.getCode(), errorCode.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    protected ResponseEntity<ApiResponse<List<String>>> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException e) {
        log.error("handleMethodArgumentNotValidException", e);
        BindingResult bindingResult = e.getBindingResult();
        List<String> errors = bindingResult.getFieldErrors().stream()
                .map(error -> {
                    try {
                        return messageSource.getMessage(error, LocaleContextHolder.getLocale());
                    } catch (Exception ex) {
                        return error.getDefaultMessage();
                    }
                })
                .collect(Collectors.toList());

        return ResponseEntity.status(org.springframework.http.HttpStatus.BAD_REQUEST)
                .body(ApiResponse.<List<String>>error(ErrorCode.INVALID_INPUT.getCode(), "Invalid Input Values",
                        errors));
    }

    @ExceptionHandler(Exception.class)
    protected ResponseEntity<ApiResponse<Void>> handleException(Exception e) {
        log.error("Exception", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR.getCode(), e.getMessage()));
    }
}
