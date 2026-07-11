package nuri.business.domain.user.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import nuri.foundation.core.exception.ErrorCode;
import org.springframework.http.HttpStatus;

/**
 * User 도메인 전용 에러코드 정의
 */
@Getter
@RequiredArgsConstructor
public enum UserErrorCode implements ErrorCode {

    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "U001", "User Not Found"),
    DUPLICATE_USER_ID(HttpStatus.CONFLICT, "U002", "Duplicate User ID"),
    INVALID_PASSWORD(HttpStatus.UNAUTHORIZED, "U003", "Invalid Password"),
    AUTHENTICATION_ERROR(HttpStatus.UNAUTHORIZED, "U004", "Authentication Error"),
    USER_RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "U005", "Resource Not Found"),
    USER_INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "U006", "Invalid Input Value");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
