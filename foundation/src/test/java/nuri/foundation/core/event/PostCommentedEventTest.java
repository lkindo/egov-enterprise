package nuri.foundation.core.event;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link PostCommentedEvent} 단위 테스트.
 *
 * <p>이 이벤트가 {@link PostCommentCountChangedEvent} 와 <b>별개로 존재해야 하는 이유</b>를
 * 함께 고정한다 — 개수 이벤트는 삭제에도 발행되고 작성자를 나르지 않는다. 하나로 겸하면
 * 댓글을 지웠을 때도 "댓글이 달렸다" 알림이 나간다.
 */
@DisplayName("PostCommentedEvent 단위 테스트")
class PostCommentedEventTest {

    @Test
    @DisplayName("댓글 사건이 게시글 좌표와 작성자를 함께 나른다")
    void carriesPostCoordinatesAndCommenter() {
        PostCommentedEvent event = new PostCommentedEvent("BBS_01", 7L, "USRCNFRM_0002", "홍길동");

        assertThat(event.bbsId()).isEqualTo("BBS_01");
        assertThat(event.pstSn()).isEqualTo(7L);
        assertThat(event.commenterEsntlId()).isEqualTo("USRCNFRM_0002");
        assertThat(event.commenterName()).isEqualTo("홍길동");
    }

    /**
     * 작성자명은 표시용이라 없을 수 있다(익명 처리 등). 소비 측이 대체 문구를 쓰므로
     * null 이 계약 위반은 아니다 — 반면 작성자 <b>식별자</b>는 자기 댓글을 걸러내는 데 쓰인다.
     */
    @Test
    @DisplayName("표시용 작성자명은 없을 수 있다")
    void allowsMissingCommenterName() {
        PostCommentedEvent event = new PostCommentedEvent("BBS_01", 7L, "USRCNFRM_0002", null);

        assertThat(event.commenterName()).isNull();
        assertThat(event.commenterEsntlId()).isEqualTo("USRCNFRM_0002");
    }

    @Test
    @DisplayName("같은 좌표·작성자의 사건은 값으로 같다")
    void isValueEqual() {
        assertThat(new PostCommentedEvent("BBS_01", 7L, "U1", "홍길동"))
                .isEqualTo(new PostCommentedEvent("BBS_01", 7L, "U1", "홍길동"));
    }
}
