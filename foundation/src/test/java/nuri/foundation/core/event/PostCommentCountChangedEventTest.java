package nuri.foundation.core.event;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PostCommentCountChangedEvent 단위 테스트")
class PostCommentCountChangedEventTest {

    @Test
    @DisplayName("댓글 수 변경 이벤트가 대상 게시글과 실측 개수를 손실 없이 보존한다")
    void preservesTargetAndCount() {
        PostCommentCountChangedEvent event = new PostCommentCountChangedEvent("BBS_01", 42L, 7);

        assertThat(event.bbsId()).isEqualTo("BBS_01");
        assertThat(event.pstSn()).isEqualTo(42L);
        assertThat(event.commentCount()).isEqualTo(7);
    }

    /**
     * 개수 0 은 <b>유효한 값</b>이다 — 마지막 댓글이 지워졌을 때 이 이벤트가 나른다.
     *
     * <p>이 축을 명시하는 이유: 종전 구현은 게시글 생성 시점에만 0 을 써서 "댓글 수 0" 이
     * "아직 아무 일도 없었다" 와 구분되지 않았다. 이제 0 은 <b>세어 본 결과</b>다.
     */
    @Test
    @DisplayName("0 은 부재가 아니라 실측된 개수다")
    void zeroIsAMeasuredCount() {
        PostCommentCountChangedEvent event = new PostCommentCountChangedEvent("BBS_01", 42L, 0);

        assertThat(event.commentCount()).isZero();
        assertThat(event).isInstanceOf(DomainEvent.class);
    }
}
