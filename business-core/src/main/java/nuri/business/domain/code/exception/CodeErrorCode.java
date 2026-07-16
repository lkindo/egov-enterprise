package nuri.business.domain.code.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import nuri.foundation.core.exception.ErrorCode;
import org.springframework.http.HttpStatus;

/**
 * Code 도메인 전용 에러코드 정의
 */
@Getter
@RequiredArgsConstructor
public enum CodeErrorCode implements ErrorCode {

    DUPLICATE_CODE(HttpStatus.CONFLICT, "CD01", "Duplicate Code"),
    CODE_NOT_FOUND(HttpStatus.NOT_FOUND, "CD02", "Code Not Found");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
