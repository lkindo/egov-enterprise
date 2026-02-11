package com.company.project.core.response;

import lombok.Builder;

/**
 * 전사 표준 응답 포맷 (Java 21 Record)
 */
@Builder
public record ApiResponse<T>(
    boolean success,
    int status,
    String message,
    T data
) {
    public static <T> ApiResponse<T> success(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .status(200)
                .message("Success")
                .data(data)
                .build();
    }

    public static <T> ApiResponse<T> error(int status, String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .status(status)
                .message(message)
                .data(null)
                .build();
    }
}
