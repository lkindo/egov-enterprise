package nuri.foundation.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 게시글 생성 사실을 도메인 중립적으로 전달하는 공용 이벤트.
 *
 * <p>발행자와 소비자가 모두 삭제 가능한 business-app 도메인이므로 한쪽 패키지에 두지 않는다.
 */
@Getter
public final class PostCreatedEvent extends ApplicationEvent {

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
