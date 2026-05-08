package nuri.business.service.board.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 게시글 작성 완료 시 발생하는 이벤트
 */
@Getter
public class PostCreatedEvent extends ApplicationEvent {
    private final String bbsId;
    private final Long nttId;
    private final String userId;

    public PostCreatedEvent(Object source, String bbsId, Long nttId, String userId) {
        super(source);
        this.bbsId = bbsId;
        this.nttId = nttId;
        this.userId = userId;
    }
}
