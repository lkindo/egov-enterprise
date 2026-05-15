package nuri.business.service.comment.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 댓글 관련 기본 이벤트 (v5 standardized)
 */
@Getter
public abstract class CommentEvent extends ApplicationEvent {
    private final String bbsId;
    private final Long pstId;

    public CommentEvent(Object source, String bbsId, Long pstId) {
        super(source);
        this.bbsId = bbsId;
        this.pstId = pstId;
    }
}
