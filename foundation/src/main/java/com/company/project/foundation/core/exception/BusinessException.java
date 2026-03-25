package com.company.project.foundation.core.exception;

import lombok.Getter;

/**
 * 비즈니스 로직 예외 처리를 위한 공통 예외 클래스
 */
@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    private final java.util.Map<String, Object> errorDetails = new java.util.HashMap<>();

    public BusinessException(String message, ErrorCode errorCode) {
        super(message);
        this.errorCode = errorCode;
    }

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public void addDetail(String key, Object value) {
        this.errorDetails.put(key, value);
    }

    public java.util.Map<String, Object> getErrorDetails() {
        return errorDetails;
    }
}
