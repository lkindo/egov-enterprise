package nuri.foundation.core.event;

/**
 * 게시글에 댓글이 <b>새로 달렸다</b>.
 *
 * <p><b>{@link PostCommentCountChangedEvent} 와 무엇이 다른가</b> — 그 이벤트는 개수의 변화라
 * 삭제에도 발행되고 <b>누가 썼는지</b>를 나르지 않는다. 반면 "내 글에 댓글이 달렸다" 는 알림은
 * 생성에만, 그리고 작성자를 알아야 성립한다. 개수 이벤트에 필드를 얹어 두 뜻을 겸하게 하면
 * 삭제 시에도 알림이 나가거나 소비자가 조건을 잘못 읽는다.
 *
 * <p><b>왜 게시글 작성자를 싣지 않는가</b> — comment 도메인은 게시글의 작성자를 모른다.
 * 알아내려면 board 를 조회해야 하고 그 순간 comment→board 결합이 생긴다(GAP-ARCH-001 이
 * 역전시킨 바로 그 방향이다). 대신 <b>게시글을 소유한 board 가</b> 이 이벤트를 받아 작성자를
 * 판정하고 알림을 요청한다.
 *
 * @param bbsId              게시판 ID
 * @param pstSn              게시글 번호
 * @param commenterEsntlId   댓글 작성자 고유 ID. 자기 글에 자기가 단 댓글을 걸러내는 데 쓴다
 * @param commenterName      표시용 댓글 작성자명. 없으면 {@code null}
 */
public record PostCommentedEvent(
        String bbsId,
        Long pstSn,
        String commenterEsntlId,
        String commenterName
) implements DomainEvent {
}
