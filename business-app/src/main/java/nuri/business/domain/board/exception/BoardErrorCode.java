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
    NOT_ARTICLE_OWNER(HttpStatus.FORBIDDEN, "B004", "Not the Owner of the Article"),
    BOARD_HAS_ARTICLES(HttpStatus.BAD_REQUEST, "B005", "Cannot delete board physically. It contains articles."),
    CANNOT_DELETE_ACTIVE_BOARD(HttpStatus.BAD_REQUEST, "B006", "Cannot delete board physically. It must be soft-deleted first."),
    /**
     * [2026-10-26 ADR-0043 결정 4] 설정({@code nuri.boards.*})이 지정 용도로 쓰는 게시판은 영구 삭제하지 않는다. 지우면 업무 홈
     * 카드·공개 FAQ·도움말 1:1 문의·지식 허브 탭이 게시판을 잃는다. 사용 안 함 전환은 받는다.
     */
    DESIGNATED_BOARD_NOT_PURGEABLE(HttpStatus.CONFLICT, "B007", "Cannot delete a designated board permanently.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
