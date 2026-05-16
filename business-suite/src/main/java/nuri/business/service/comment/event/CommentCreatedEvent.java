package nuri.business.service.comment.event;

public class CommentCreatedEvent extends CommentEvent {
    public CommentCreatedEvent(Object source, String bbsId, Long nttId) {
        super(source, bbsId, nttId);
    }
}
