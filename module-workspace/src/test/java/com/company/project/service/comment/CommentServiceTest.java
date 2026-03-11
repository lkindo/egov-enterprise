package com.company.project.service.comment;

import com.company.project.domain.comment.Comment;
import com.company.project.domain.comment.CommentRepository;
import com.company.project.service.comment.dto.CommentDto;
import com.company.project.service.comment.dto.CommentSaveRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private CommentServiceImpl commentService;

    @Test
    @DisplayName("댓글 목록 조회 테스트")
    void getCommentsTest() {
        // Given
        Long nttId = 1L;
        String bbsId = "BBS_001";
        Pageable pageable = mock(Pageable.class);
        
        when(commentRepository.findByBbsIdAndNttId(bbsId, nttId, pageable))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        // When
        Page<CommentDto> result = commentService.getComments(nttId, bbsId, pageable);

        // Then
        assertThat(result).isNotNull();
        verify(commentRepository).findByBbsIdAndNttId(bbsId, nttId, pageable);
    }

    @Test
    @DisplayName("댓글 등록 테스트")
    void createCommentTest() {
        // Given
        String userId = "user01";
        String userNm = "Tester";
        CommentSaveRequest request = new CommentSaveRequest(1L, "BBS_001", "Comment Content", "password");
        
        Comment savedComment = Comment.builder().id(100L).build();
        when(commentRepository.save(any(Comment.class))).thenReturn(savedComment);

        // When
        Long resultId = commentService.createComment(userId, userNm, request);

        // Then
        assertThat(resultId).isEqualTo(100L);
        verify(commentRepository).save(any(Comment.class));
        verify(eventPublisher).publishEvent(any());
    }

    @Test
    @DisplayName("댓글 수정 테스트")
    void updateCommentTest() {
        // Given
        Long id = 100L;
        CommentSaveRequest request = new CommentSaveRequest(1L, "BBS_001", "Updated Content", "password");
        Comment comment = mock(Comment.class);
        
        when(commentRepository.findById(id)).thenReturn(Optional.of(comment));

        // When
        commentService.updateComment(id, "user01", request);

        // Then
        verify(comment).update("Updated Content");
    }

    @Test
    @DisplayName("댓글 삭제 테스트")
    void deleteCommentTest() {
        // Given
        Long id = 100L;
        Comment comment = mock(Comment.class);
        when(comment.getBbsId()).thenReturn("BBS_001");
        when(comment.getNttId()).thenReturn(1L);
        when(commentRepository.findById(id)).thenReturn(Optional.of(comment));

        // When
        commentService.deleteComment(id, "user01");

        // Then
        verify(comment).delete();
        verify(eventPublisher).publishEvent(any());
    }
}
