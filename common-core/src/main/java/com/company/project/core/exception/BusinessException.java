package com.company.project.core.exception;

import lombok.Getter;

/**
 * ??쑴已??됰뮞 嚥≪뮇彛???됱뇚 ?????
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
