package nuri.business.service.board.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 게시글 생성 이벤트
 */
@Getter
public class PostCreatedEvent extends ApplicationEvent {

    private final String bbsId;
    private final Long pstSn;
    private final String userId;

    public PostCreatedEvent(Object source, String bbsId, Long pstSn, String userId) {
        super(source);
        this.bbsId = bbsId;
        this.pstSn = pstSn;
        this.userId = userId;
    }
}
