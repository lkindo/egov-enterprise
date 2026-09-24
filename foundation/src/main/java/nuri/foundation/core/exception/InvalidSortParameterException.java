package nuri.foundation.core.exception;

/**
 * 요청의 {@code sort} 값이 속성 경로 형식이 아니다 — 저장소까지 가기 전에 400 으로 끝낸다.
 *
 * <p>입력값은 메시지에 싣지 않는다(응답에 되비추지 않는다).
 */
public class InvalidSortParameterException extends RuntimeException {

    public InvalidSortParameterException() {
        super("Invalid sort parameter");
    }
}
