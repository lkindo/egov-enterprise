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
 *
 * <p>[2026-10-23 ADR-0040 결정 3] 이 이벤트는 <b>생성</b>을 뜻하며 공개를 뜻하지 않는다. 게시 시작일이 미래인 글(예약 글)은
 * 그날까지 작성자와 조회 대행 권한자 외에게 보이지 않는다. 구독자는 가시성(게시 기간·비밀글·게시판 사용 여부·커뮤니티 귀속)을
 * 다시 판정해야 한다. 공개 시점 이벤트는 없다 — 시각 기반 작업이 필요해 범위 밖이다.
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
