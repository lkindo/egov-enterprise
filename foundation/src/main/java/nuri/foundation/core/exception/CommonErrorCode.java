package nuri.foundation.core.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * 프레임워크 공통 에러코드 정의
 */
@Getter
@RequiredArgsConstructor
public enum CommonErrorCode implements ErrorCode {

    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "C001", "Invalid Input Value"),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "C002", "Method Not Allowed"),
    ENTITY_NOT_FOUND(HttpStatus.NOT_FOUND, "C003", "Entity Not Found"),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C004", "Server Error"),
    INVALID_TYPE_VALUE(HttpStatus.BAD_REQUEST, "C005", "Invalid Type Value"),
    HANDLE_ACCESS_DENIED(HttpStatus.FORBIDDEN, "C006", "Access is Denied"),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "C007", "Resource Not Found"),
    DUPLICATE_RESOURCE(HttpStatus.CONFLICT, "C008", "Duplicate Resource"),
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "C009", "Invalid Input"),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "C010", "Access Denied"),
    UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "C011", "Unsupported Media Type"),
    INVALID_STATE(HttpStatus.BAD_REQUEST, "C012", "Invalid State Transition"),
    CONCURRENT_MODIFICATION(HttpStatus.CONFLICT, "C013", "Concurrent Modification Conflict"),

    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "A001", "Unauthorized Access"),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "A002", "Invalid JWT Token"),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "A003", "Expired JWT Token"),
    AUTH_ERROR(HttpStatus.UNAUTHORIZED, "A004", "Authentication Failed"),
    LOGIN_FAILED(HttpStatus.UNAUTHORIZED, "A005", "Login Failed"),
    LOGIN_POLICY_LIMITED(HttpStatus.FORBIDDEN, "A006", "Login Policy Restricted (Account Blocked)"),
    LOGIN_POLICY_IP_MISMATCH(HttpStatus.FORBIDDEN, "A007", "Login Policy Restricted (IP Mismatch)"),
    LOGIN_POLICY_TIME_RESTRICTED(HttpStatus.FORBIDDEN, "A008", "Login Policy Restricted (Time Out of Range)"),

    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "S001", "Internal Server Error"),
    SERVER_OVERLOAD(HttpStatus.SERVICE_UNAVAILABLE, "S002", "Server Overload");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
