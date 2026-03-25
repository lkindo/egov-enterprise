package com.company.project.business.service.comment.event;

public class CommentDeletedEvent extends CommentEvent {
    public CommentDeletedEvent(Object source, String bbsId, Long nttId) {
        super(source, bbsId, nttId);
    }
}
