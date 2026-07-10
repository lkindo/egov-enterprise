package nuri.foundation.core.exception;

import lombok.Getter;

/**
 * 비즈니스 로직 예외 처리를 위한 공통 예외 클래스
 */
@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    // [정리] errorDetails/addDetail/getErrorDetails 는 어디서도 사용되지 않고 응답에도 실리지 않던 데드 기능이라 제거.
    //        상세 필드가 필요하면 ApiResponse에 details 필드를 추가하고 핸들러에서 함께 방출하는 방식으로 재도입할 것.

    // ⚠ [설계] 아래 (String, ErrorCode) 와 (ErrorCode, String) 두 생성자는 인자 순서가 뒤바뀐 footgun이다.
    //         신규 코드는 (ErrorCode, String) 시그니처를 사용하고, 향후 (String, ErrorCode) 호출부를 단계적으로 이관 권장.
    public BusinessException(String message, ErrorCode errorCode) {
        super(message);
        this.errorCode = errorCode;
    }

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
