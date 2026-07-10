package nuri.foundation.core.response;

import nuri.foundation.core.exception.ErrorCode;
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

    /**
     * [정합성 H5] HTTP 전송 상태를 명시적으로 지정하는 에러 팩토리.
     * envelope의 {@code status} 필드가 ResponseEntity의 실제 HTTP status와 어긋나는 것을 방지하기 위해,
     * ErrorCode의 기본 status와 다른 상태로 응답해야 하는 핸들러는 이 팩토리로 권위 상태를 명시한다.
     */
    public static <T> ApiResponse<T> error(org.springframework.http.HttpStatus httpStatus, ErrorCode errorCode, String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .status(httpStatus.value())
                .code(errorCode.getCode())
                .message(message)
                .data(null)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
