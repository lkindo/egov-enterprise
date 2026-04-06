package nuri.business.service.comment.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 댓글 관련 기본 이벤트
 */
@Getter
public abstract class CommentEvent extends ApplicationEvent {
    private final String bbsId;
    private final Long nttId;

    public CommentEvent(Object source, String bbsId, Long nttId) {
        super(source);
        this.bbsId = bbsId;
        this.nttId = nttId;
    }
}
