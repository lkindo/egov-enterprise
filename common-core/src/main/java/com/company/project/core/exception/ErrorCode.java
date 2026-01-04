package com.company.project.core.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // Common
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "C001", "Invalid input value"),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "C002", "Method not allowed"),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C003", "Internal server error"),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "C004", "Resource not found"),
    DUPLICATE_RESOURCE(HttpStatus.CONFLICT, "C005", "Resource already exists"),

    // Auth
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "A001", "Unauthorized"),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "A002", "Access denied"),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "A003", "Invalid token"),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "U001", "User not found"),
    DUPLICATE_USER_ID(HttpStatus.BAD_REQUEST, "U002", "User ID already exists"),

    // Code
    DUPLICATE_CODE(HttpStatus.BAD_REQUEST, "D001", "Common code already exists");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
