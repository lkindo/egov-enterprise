package nuri.business.domain.board.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import nuri.foundation.core.exception.ErrorCode;
import org.springframework.http.HttpStatus;

/**
 * Board 도메인 전용 에러코드 정의
 */
@Getter
@RequiredArgsConstructor
public enum BoardErrorCode implements ErrorCode {

    BOARD_NOT_FOUND(HttpStatus.NOT_FOUND, "B001", "Board Not Found"),
    ARTICLE_NOT_FOUND(HttpStatus.NOT_FOUND, "B002", "Article Not Found"),
    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "B003", "Comment Not Found"),
    NOT_ARTICLE_OWNER(HttpStatus.FORBIDDEN, "B004", "Not the Owner of the Article"),
    BOARD_HAS_ARTICLES(HttpStatus.BAD_REQUEST, "B005", "Cannot delete board physically. It contains articles."),
    CANNOT_DELETE_ACTIVE_BOARD(HttpStatus.BAD_REQUEST, "B006", "Cannot delete board physically. It must be soft-deleted first.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
