package nuri.business.service.comment.event;

public class CommentDeletedEvent extends CommentEvent {
    public CommentDeletedEvent(Object source, String bbsId, Long pstId) {
        super(source, bbsId, pstId);
    }
}
