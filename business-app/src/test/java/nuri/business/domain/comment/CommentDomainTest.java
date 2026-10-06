package nuri.business.domain.comment;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CommentDomainTest {

    @Test
    @DisplayName("Comment 엔티티 생성, 업데이트, 삭제 테스트")
    void comment_test() {
        // Given
        Comment comment = Comment.builder()
                .pstSn(1L)
                .bbsId("BBS1")
                .ansCn("Old Content")
                .useYn("Y")
                .build();
        
        // When - update
        comment.update("New Content");
        assertEquals("New Content", comment.getAnsCn());

        // When - delete
        comment.delete();
        assertEquals("N", comment.getUseYn());
    }

}
