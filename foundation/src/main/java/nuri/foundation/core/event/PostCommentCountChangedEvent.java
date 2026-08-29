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
 * <p><b>왜 개수를 이벤트가 나르는가</b> — 댓글 수의 진실은 comment 가 소유한다. 개수를 싣지
 * 않으면 board 가 다시 {@code CommentRepository} 를 조회해야 하고 결합이 되돌아온다.
 *
 * @param bbsId        게시판 ID
 * @param pstSn        게시글 번호
 * @param commentCount 커밋 이후 실측한 사용 중(use_yn='Y') 댓글 수
 */
public record PostCommentCountChangedEvent(
        String bbsId,
        Long pstSn,
        int commentCount
) implements DomainEvent {
}
