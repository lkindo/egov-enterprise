package com.company.project.service.cmt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.company.project.domain.comment.Comment;
import com.company.project.domain.comment.CommentRepository;
import com.company.project.service.cmt.dto.CommentDto;
import com.company.project.service.cmt.dto.CommentSaveRequest;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @InjectMocks
    private CommentServiceImpl commentService;

    @Test
    @DisplayName("Create comment success")
    void createComment_success() {
        // given
        String userId = "USER_01";
        String userNm = "Tester";
        CommentSaveRequest request = new CommentSaveRequest();
        request.setBbsId("BBS_01");
        request.setNttId(1L);
        request.setCommentCn("Test Comment");

        Comment savedComment = mock(Comment.class);
        when(savedComment.getId()).thenReturn(1L);

        when(commentRepository.save(java.util.Objects.requireNonNull(any(Comment.class))))
                .thenReturn(java.util.Objects.requireNonNull(savedComment));

        // when
        Long id = commentService.createComment(userId, userNm, request);

        // then
        assertThat(id).isEqualTo(1L);
        verify(commentRepository).save(java.util.Objects.requireNonNull(any(Comment.class)));
    }

    @Test
    @DisplayName("Get comments success")
    void getComments_success() {
        // given
        String bbsId = "BBS_01";
        Long nttId = 1L;
        Pageable pageable = PageRequest.of(0, 10);

        Comment comment = Comment.builder()
                .bbsId(bbsId)
                .nttId(nttId)
                .commentCn("Comment")
                .useAt("Y")
                .build();

        Page<Comment> page = new PageImpl<>(java.util.Objects.requireNonNull(List.of(comment)));

        when(commentRepository.findByBbsIdAndNttId(bbsId, nttId, pageable)).thenReturn(page);

        // when
        Page<CommentDto> result = commentService.getComments(nttId, bbsId, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCommentCn()).isEqualTo("Comment");
    }

    @Test
    @DisplayName("Update comment success")
    void updateComment_success() {
        // given
        Long commentId = 1L;
        String userId = "USER_01";
        CommentSaveRequest request = new CommentSaveRequest();
        request.setCommentCn("Updated Content");

        Comment comment = mock(Comment.class);
        when(comment.getFrstRegisterId()).thenReturn(userId);

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        // when
        commentService.updateComment(commentId, userId, request);

        // then
        verify(comment).update("Updated Content");
    }

    @Test
    @DisplayName("Delete comment success")
    void deleteComment_success() {
        // given
        Long commentId = 1L;
        String userId = "USER_01";

        Comment comment = mock(Comment.class);
        when(comment.getFrstRegisterId()).thenReturn(userId);

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        // when
        commentService.deleteComment(commentId, userId);

        // then
        verify(comment).delete();
    }
}
