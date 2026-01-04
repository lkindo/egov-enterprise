package com.company.project.service.comment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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

import com.company.project.core.exception.BusinessException;
import com.company.project.domain.comment.Comment;
import com.company.project.domain.comment.CommentRepository;
import com.company.project.domain.user.User;
import com.company.project.domain.user.UserRepository;
import com.company.project.service.comment.dto.CommentDto;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CommentService commentService;

    @Test
    @DisplayName("댓글 생성 성공")
    void createComment_success() {
        // given
        String userId = "USER_01";
        CommentDto dto = CommentDto.builder()
                .bbsId("BBS_01")
                .nttId(1L)
                .commentCn("Test Comment")
                .wrterNm("Tester")
                .build();

        User user = User.builder().esntlId(userId).userNm("Tester").build();
        Comment savedComment = Comment.builder().id(1L).build();

        when(userRepository.findByEsntlId(userId)).thenReturn(Optional.of(user));
        when(commentRepository.findMaxId()).thenReturn(0L);
        when(commentRepository.save(any(Comment.class))).thenReturn(savedComment);

        // when
        Long id = commentService.createComment(userId, dto);

        // then
        assertThat(id).isEqualTo(1L);
        verify(commentRepository).save(any(Comment.class));
    }

    @Test
    @DisplayName("댓글 목록 조회 성공")
    void getCommentList_success() {
        // given
        String bbsId = "BBS_01";
        Long nttId = 1L;
        Pageable pageable = PageRequest.of(0, 10);

        Comment comment = Comment.builder()
                .id(1L)
                .bbsId(bbsId)
                .nttId(nttId)
                .commentCn("Comment")
                .useAt("Y")
                .build();

        Page<Comment> page = new PageImpl<>(List.of(comment));

        when(commentRepository.findByBbsIdAndNttId(bbsId, nttId, pageable)).thenReturn(page);

        // when
        Page<CommentDto> result = commentService.getCommentList(bbsId, nttId, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCommentCn()).isEqualTo("Comment");
    }

    @Test
    @DisplayName("댓글 수정 성공")
    void updateComment_success() {
        // given
        Long commentId = 1L;
        String userId = "USER_01";
        String newContent = "Updated Content";

        Comment comment = Comment.builder()
                .id(commentId)
                .commentCn("Old Content")
                .frstRegisterId(userId)
                .build();

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        // when
        commentService.updateComment(commentId, newContent, userId);

        // then
        assertThat(comment.getCommentCn()).isEqualTo(newContent);
        assertThat(comment.getLastUpdusrId()).isEqualTo(userId);
    }

    @Test
    @DisplayName("존재하지 않는 댓글 수정 시 예외")
    void updateComment_notFound() {
        // given
        Long commentId = 999L;
        when(commentRepository.findById(commentId)).thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> commentService.updateComment(commentId, "content", "user"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("댓글 삭제 성공")
    void deleteComment_success() {
        // given
        Long commentId = 1L;
        String userId = "USER_01";

        Comment comment = Comment.builder()
                .id(commentId)
                .useAt("Y")
                .build();

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        // when
        commentService.deleteComment(commentId, userId);

        // then
        assertThat(comment.getUseAt()).isEqualTo("N");
        assertThat(comment.getLastUpdusrId()).isEqualTo(userId);
    }
}
