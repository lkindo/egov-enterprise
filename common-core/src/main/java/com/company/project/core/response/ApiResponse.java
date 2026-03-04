package com.company.project.core.response;

import com.company.project.core.exception.ErrorCode;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Builder;
import java.time.LocalDateTime;

/**
 * 공통 API 응답 규격 (Java 21 Record)
 */
@Builder
public record ApiResponse<T>(
        boolean success,
        int status,
        String code,
        String message,
        T data,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
        LocalDateTime timestamp) {

    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .status(200)
                .code("COMMON_001")
                .message("Success")
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode) {
        return ApiResponse.<T>builder()
                .success(false)
                .status(errorCode.getStatus().value())
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .data(null)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> error(ErrorCode errorCode, String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .status(errorCode.getStatus().value())
                .code(errorCode.getCode())
                .message(message)
                .data(null)
                .timestamp(LocalDateTime.now())
                .build();
    }
}