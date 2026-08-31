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
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime timestamp,
        /**
         * 필드 단위 검증 오류. [W1-14]
         *
         * <p>검증 실패가 아닌 응답에서는 {@code null} 이고, {@code NON_NULL} 이라 직렬화에서 아예 빠진다 —
         * 즉 기존 응답의 JSON 모양은 바뀌지 않는다.
         *
         * <p>{@code message} 는 종전 그대로 남긴다(오류들을 이어 붙인 문장). 그것을 읽던 클라이언트가
         * 깨지지 않게 하기 위해서다. 새 정보는 <b>덧붙이기만</b> 한다.
         */
        @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
        java.util.List<FieldErrorItem> errors) {

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
     * 필드 단위 검증 오류를 함께 싣는 에러 팩토리. [W1-14]
     *
     * <p>기존 3개 팩토리는 {@code errors} 를 채우지 않으므로(=null) 호출부를 하나도 고치지 않는다.
     * 이 오버로드는 검증 실패 핸들러 한 곳에서만 쓴다.
     */
    public static <T> ApiResponse<T> error(ErrorCode errorCode, String message,
            java.util.List<FieldErrorItem> errors) {
        return ApiResponse.<T>builder()
                .success(false)
                .status(errorCode.getStatus().value())
                .code(errorCode.getCode())
                .message(message)
                .data(null)
                .errors(errors)
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
