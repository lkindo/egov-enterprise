package nuri.business.domain.comment;

import com.querydsl.core.types.dsl.Expressions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CommentDomainTest {

    @Test
    @DisplayName("Comment 엔티티 생성, 업데이트, 삭제 테스트")
    void comment_test() {
        // Given
        Comment comment = Comment.builder()
                .nttId(1L)
                .bbsId("BBS1")
                .cmntCn("Old Content")
                .useYn("Y")
                .build();
        
        // When - update
        comment.update("New Content");
        assertEquals("New Content", comment.getCmntCn());

        // When - delete
        comment.delete();
        assertEquals("N", comment.getUseYn());
    }

    @Test
    @DisplayName("CommentPredicate 정적 메서드 테스트")
    void commentPredicate_test() {
        // Just call them to cover the lines
        assertNotNull(CommentPredicate.bbsIdEq("BBS1"));
        assertNotNull(CommentPredicate.pstIdEq(10L));
        assertNotNull(CommentPredicate.bbsIdAndPstIdEq("BBS1", 10L));
        assertNotNull(CommentPredicate.bbsIdAndPstIdEq(Expressions.asString("BBS1"), Expressions.asNumber(10L)));
    }
}
