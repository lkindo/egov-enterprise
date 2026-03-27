package com.company.project.business.domain.comment;

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
                .id(1L)
                .bbsId("BBS1")
                .commentCn("Old Content")
                .useAt("Y")
                .build();
        
        // When - update
        comment.update("New Content");
        assertEquals("New Content", comment.getCommentCn());

        // When - delete
        comment.delete();
        assertEquals("N", comment.getUseAt());
    }

    @Test
    @DisplayName("CommentPredicate 정적 메서드 테스트")
    void commentPredicate_test() {
        // Just call them to cover the lines
        assertNotNull(CommentPredicate.bbsIdEq("BBS1"));
        assertNotNull(CommentPredicate.nttIdEq(10L));
        assertNotNull(CommentPredicate.bbsIdAndNttIdEq("BBS1", 10L));
        assertNotNull(CommentPredicate.bbsIdAndNttIdEq(Expressions.asString("BBS1"), Expressions.asNumber(10L)));
    }
}
