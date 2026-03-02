package com.company.project.domain.comment;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CommentEntityTest {

    @Test
    @DisplayName("Comment 엔티티 생성 및 필드 매핑 테스트")
    void commentTest() {
        Comment comment = Comment.builder()
                .id(100L)
                .nttId(1L)
                .wrterNm("Tester")
                .commentCn("Nice post!")
                .build();

        assertThat(comment.getId()).isEqualTo(100L);
        assertThat(comment.getWrterNm()).isEqualTo("Tester");
        assertThat(comment.getCommentCn()).isEqualTo("Nice post!");
    }
}
