package com.company.project.core.response;

import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class ApiResponse<T> {
    private final boolean success;
    private final T data;
    private final String code;
    private final String message;
    private final LocalDateTime timestamp;

    private ApiResponse(boolean success, T data, String code, String message) {
        this.success = success;
        this.data = data;
        this.code = code;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, "SUCCESS", "Operation successful");
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, data, "SUCCESS", message);
    }

    public static <T> ApiResponse<T> failure(String message) {
        return new ApiResponse<>(false, null, "FAILURE", message);
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(false, null, code, message);
    }

    public static <T> ApiResponse<T> error(String code, String message, T data) {
        return new ApiResponse<>(false, data, code, message);
    }
}
