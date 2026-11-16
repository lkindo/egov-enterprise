package nuri.business.domain.user.exception;

import nuri.foundation.core.exception.BusinessException;

/**
 * 비밀번호 변경에서 현재 비밀번호가 맞지 않을 때 던진다. 응답은 종전과 같은 {@link UserErrorCode#INVALID_PASSWORD} 다.
 *
 * <p>[왜 별도 타입인가 — 2026-11-16] 이 실패는 로그인 실패와 같은 횟수에 더해지고 한도에 닿으면 계정을 잠근다. 그 쓰기는 예외와 함께
 * 커밋되어야 하므로 비밀번호 변경 트랜잭션이 이 타입만 롤백에서 뺀다({@code noRollbackFor}). {@code BusinessException} 전체를
 * 빼면 비밀번호를 바꾼 뒤 세션 회수 중의 실패까지 커밋되어, 바뀐 비밀번호와 남은 세션이 함께 남는다.
 */
public class CurrentPasswordMismatchException extends BusinessException {

    private static final long serialVersionUID = 1L;

    public CurrentPasswordMismatchException() {
        super(UserErrorCode.INVALID_PASSWORD);
    }
}
