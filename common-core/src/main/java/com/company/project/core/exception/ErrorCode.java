package com.company.project.core.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * 전역 예외 처리를 위한 에러 코드 열거형
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
    LOGIN_FAILED(HttpStatus.UNAUTHORIZED, "A005", "Login Failed"),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "U001", "User Not Found"),
    DUPLICATE_USER_ID(HttpStatus.CONFLICT, "U002", "Duplicate User ID"),
    INVALID_PASSWORD(HttpStatus.UNAUTHORIZED, "U003", "Invalid Password"),
    AUTHENTICATION_ERROR(HttpStatus.UNAUTHORIZED, "U004", "Authentication Error"),
    USER_RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "U005", "Resource Not Found"),
    USER_INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "U006", "Invalid Input Value"),

    // Code
    DUPLICATE_CODE(HttpStatus.CONFLICT, "CD01", "Duplicate Code"),

    // Server
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "S001", "Internal Server Error"),
    SERVER_OVERLOAD(HttpStatus.SERVICE_UNAVAILABLE, "S002", "Server Overload");

    private final HttpStatus status;
    private final String code;
    private final String message;
}