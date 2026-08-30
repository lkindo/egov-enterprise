package nuri.business.domain.comment.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import nuri.foundation.core.exception.ErrorCode;
import org.springframework.http.HttpStatus;

/** Comment 도메인이 소유하는 오류 계약. */
@Getter
@RequiredArgsConstructor
public enum CommentErrorCode implements ErrorCode {

    /** 기존 외부 오류 코드(B003)를 보존하면서 board 도메인 의존만 제거한다. */
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "B003", "Comment Not Found");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
