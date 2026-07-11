package nuri.foundation.core.exception;

import org.springframework.http.HttpStatus;

/**
 * 전역 예외 처리를 위한 에러 코드 인터페이스 (개방-폐쇄 원칙 준수)
 */
public interface ErrorCode {
    HttpStatus getStatus();
    String getCode();
    String getMessage();
}
