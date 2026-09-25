package nuri.foundation.core.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 게시글 생성 사실을 도메인 중립적으로 전달하는 공용 이벤트.
 *
 * <p>발행자(게시판)가 삭제 가능한 business-app 도메인이므로 한쪽 패키지에 두지 않는다.
 *
 * <p>[2026-09-25] 저장소 안에는 구독자가 없다. 마지막 구독자였던 실시간 대시보드는 오늘 게시글 수를
 * 이벤트로 세지 않고 DB 에서 읽도록 바뀌었다 — 재시작·다중 인스턴스에서 숫자가 어긋났기 때문이다.
 * 파생 제품이 게시글 생성의 후속 효과를 붙이는 확장 지점으로 남긴다. 커밋 뒤에 발행되므로 구독자는
 * 롤백된 글을 보지 않는다. 숫자를 세는 용도로는 쓰지 않는다(인스턴스마다 따로 받는다).
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
