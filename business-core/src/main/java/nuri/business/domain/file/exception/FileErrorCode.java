package nuri.business.domain.file.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import nuri.foundation.core.exception.ErrorCode;
import org.springframework.http.HttpStatus;

/**
 * File 도메인 전용 에러코드 정의
 */
@Getter
@RequiredArgsConstructor
public enum FileErrorCode implements ErrorCode {

    FILE_NOT_FOUND(HttpStatus.NOT_FOUND, "F001", "File Not Found"),
    FILE_UPLOAD_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "F002", "File Upload Failed"),
    FILE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "F003", "File Size Limit Exceeded");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
