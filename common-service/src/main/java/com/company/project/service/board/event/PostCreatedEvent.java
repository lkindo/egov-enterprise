package com.company.project.service.board.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 게시글 ?�성 ?�료 ??발생?�는 ?�벤?? */
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
