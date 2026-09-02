package nuri.foundation.core.event;

/**
 * 게시글의 사용 중 댓글 수가 바뀌었다.
 *
 * <p><b>왜 foundation 에 두는가</b> — comment 도메인이 발행하고 board 도메인이 소비한다.
 * 이벤트를 둘 중 한쪽 패키지에 두면 반대편이 그 패키지를 import 하게 되어, 주입은 사라져도
 * <b>컴파일 의존은 그대로 남는다</b>. 그러면 교차 결합 census 의 숫자만 내려가고 실제로는
 * 어느 도메인도 삭제할 수 없는 상태가 유지된다(AGENTS H2 — 신호 은폐).
 * {@link AuditEvent} 가 발행자(api-server)와 영속 구현(business-core)을 떼어 놓는 것과 같은 자리다.
 *
 * <p><b>절대 개수가 아니라 단건 변화량을 나른다.</b> comment가 현재 개수를 다시 세게 하면
 * 커밋 뒤 추가 조회가 필요하고, board가 세게 하면 comment 저장소에 역의존한다. 등록은 {@code +1},
 * 실제 삭제 전이는 {@code -1}만 발행하고 board는 자기 행에서 원자적으로 누적한다.
 *
 * @param bbsId        게시판 ID
 * @param pstSn        게시글 번호
 * @param delta         단건 댓글 변화량. 등록 {@code +1}, 삭제 {@code -1}
 */
public record PostCommentCountChangedEvent(
        String bbsId,
        Long pstSn,
        int delta
) implements DomainEvent {

    public PostCommentCountChangedEvent {
        if (delta != 1 && delta != -1) {
            throw new IllegalArgumentException("comment count delta must be +1 or -1");
        }
    }
}
