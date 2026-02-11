package com.company.project.core.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * 전사 표준 에러 코드
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // Common
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "C001", "Invalid Input Value"),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "C002", "Method Not Allowed"),
    ENTITY_NOT_FOUND(HttpStatus.BAD_REQUEST, "C003", "Entity Not Found"),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C004", "Server Error"),
    INVALID_TYPE_VALUE(HttpStatus.BAD_REQUEST, "C005", " Invalid Type Value"),
    HANDLE_ACCESS_DENIED(HttpStatus.FORBIDDEN, "C006", "Access is Denied"),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "C007", "Resource Not Found"),
    DUPLICATE_RESOURCE(HttpStatus.CONFLICT, "C008", "Duplicate Resource"),
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "C009", "Invalid Input"),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "C010", "Access Denied"),

    // Auth
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "A001", "Unauthorized Access"),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "A002", "Invalid JWT Token"),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "A003", "Expired JWT Token"),
    AUTH_ERROR(HttpStatus.UNAUTHORIZED, "A004", "Authentication Failed"),
    
    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "U001", "User Not Found"),
    DUPLICATE_USER_ID(HttpStatus.CONFLICT, "U002", "Duplicate User ID"),

    // Code
    DUPLICATE_CODE(HttpStatus.CONFLICT, "CD01", "Duplicate Code");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
