package nuri.business.service.board.dto;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;

/**
 * 게시판 목록의 운영 조건(ADR-0040 결정 3·5). 일반 조회 조건과 달리 서버 기준일로 판정하는 값이라 따로 묶는다 — 위치 인자를
 * 배치마다 늘리지 않기 위해서다.
 *
 * <p>값이 있어도 가시성은 넓어지지 않는다: 일반 사용자에게는 기존 가시성(비밀글·게시 기간·작성자 예외) 안에서만 좁혀진다.
 *
 * @param postingStatus 게시 상태 조건. null 이면 조건 없음이다.
 * @param pinned        상단 고정 조건(B2). null 이면 조건 없음이다.
 */
public record BoardPostListFilter(PostingStatus postingStatus, Boolean pinned) {

    /** 조건 없음. */
    public static final BoardPostListFilter NONE = new BoardPostListFilter(null, null);

    /**
     * 요청 파라미터에서 조건을 만든다. 게시 상태가 어휘 밖이면 400 이다 — 조용히 무시하면 조건이 걸린 척하는 목록이 된다
     * (기간 기준 {@code dateBasis} 와 같은 규칙).
     */
    public static BoardPostListFilter of(String postingStatus, Boolean pinned) {
        return new BoardPostListFilter(parsePostingStatus(postingStatus), pinned);
    }

    /** 비어 있으면 null(조건 없음), SCHEDULED·POSTING·ENDED 밖이면 400 이다. */
    public static PostingStatus parsePostingStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        for (PostingStatus status : PostingStatus.values()) {
            if (status.name().equals(raw)) {
                return status;
            }
        }
        throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE,
                "postingStatus 는 SCHEDULED·POSTING·ENDED 중 하나여야 합니다.");
    }
}
