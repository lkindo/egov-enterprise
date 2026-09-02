package nuri.foundation.core.event;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

@DisplayName("PostCommentCountChangedEvent 단위 테스트")
class PostCommentCountChangedEventTest {

    @Test
    @DisplayName("댓글 수 변경 이벤트가 대상 게시글과 +1 증가량을 보존한다")
    void preservesTargetAndIncrementDelta() {
        PostCommentCountChangedEvent event = new PostCommentCountChangedEvent("BBS_01", 42L, 1);

        assertThat(event.bbsId()).isEqualTo("BBS_01");
        assertThat(event.pstSn()).isEqualTo(42L);
        assertThat(event.delta()).isEqualTo(1);
    }

    @Test
    @DisplayName("댓글 삭제는 -1 감소량으로 표현한다")
    void preservesDecrementDelta() {
        PostCommentCountChangedEvent event = new PostCommentCountChangedEvent("BBS_01", 42L, -1);

        assertThat(event.delta()).isEqualTo(-1);
        assertThat(event).isInstanceOf(DomainEvent.class);
    }

    @Test
    @DisplayName("단건 댓글 이벤트는 +1/-1 이외의 증가량을 거부한다")
    void rejectsNonUnitDelta() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new PostCommentCountChangedEvent("BBS_01", 42L, 0))
                .withMessageContaining("delta");
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new PostCommentCountChangedEvent("BBS_01", 42L, 2))
                .withMessageContaining("delta");
    }
}
