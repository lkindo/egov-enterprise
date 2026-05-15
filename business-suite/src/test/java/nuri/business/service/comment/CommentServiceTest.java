package nuri.business.service.comment;

import nuri.business.domain.comment.Comment;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.service.comment.dto.CommentSaveRequest;
import nuri.business.service.comment.dto.CommentDto;
import nuri.business.service.comment.event.CommentCreatedEvent;
import nuri.business.service.comment.event.CommentDeletedEvent;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @InjectMocks
    private CommentServiceImpl commentService;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Test
    @DisplayName("댓글 목록 조회")
    void getComments() {
        // given
        Long nttId = 1L;
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        Comment comment = Comment.builder()
                .id(1L)
                .nttId(nttId)
                .bbsId(bbsId)
                .commentCn("Test Comment")
                .useYn("Y")
                .build();
        Page<Comment> page = new PageImpl<>(Collections.singletonList(comment));

        given(commentRepository.findByBbsIdAndNttId(bbsId, nttId, pageable)).willReturn(page);

        // when
        Page<CommentDto> result = commentService.getComments(nttId, bbsId, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getCommentCn()).isEqualTo("Test Comment");
    }

    @Test
    @DisplayName("전체 댓글 목록 조회")
    void getAllComments() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Comment comment = Comment.builder().id(1L).commentCn("Test").build();
        Page<Comment> page = new PageImpl<>(Collections.singletonList(comment));

        given(commentRepository.findAll(pageable)).willReturn(page);

        // when
        Page<CommentDto> result = commentService.getAllComments(pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("댓글 검색")
    void searchComments() {
        // given
        String keyword = "test";
        Pageable pageable = PageRequest.of(0, 10);
        Comment comment = Comment.builder().id(1L).commentCn("Test").build();
        Page<Comment> page = new PageImpl<>(Collections.singletonList(comment));

        given(commentRepository.findByCommentCnContaining(keyword, pageable)).willReturn(page);

        // when
        Page<CommentDto> result = commentService.searchComments(keyword, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("단건 댓글 조회")
    void getComment() {
        // given
        Long id = 1L;
        Comment comment = Comment.builder().id(id).commentCn("Test").build();
        given(commentRepository.findById(id)).willReturn(Optional.of(comment));

        // when
        CommentDto result = commentService.getComment(id);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(id);
    }

    @Test
    @DisplayName("댓글 생성")
    void createComment() {
        // given
        String userId = "user1";
        String userNm = "Tester";
        CommentSaveRequest request = CommentSaveRequest.builder()
                .nttId(1L)
                .bbsId("BBS_01")
                .commentCn("New Comment")
                .password("1234")
                .build();
        Comment savedComment = Comment.builder()
                .id(1L)
                .nttId(request.getNttId())
                .bbsId(request.getBbsId())
                .commentCn(request.getCommentCn())
                .build();

        given(commentRepository.save(any(Comment.class))).willReturn(savedComment);

        // when
        Long id = commentService.createComment(userId, userNm, request);

        // then
        assertThat(id).isEqualTo(1L);
        verify(eventPublisher, times(1)).publishEvent(any(CommentCreatedEvent.class));
    }

    @Test
    @DisplayName("댓글 수정")
    void updateComment() {
        // given
        Long id = 1L;
        String userId = "user1";
        CommentSaveRequest request = CommentSaveRequest.builder()
                .commentCn("Updated Comment")
                .build();
        Comment comment = Comment.builder()
                .id(id)
                .commentCn("Old Comment")
                .build();

        given(commentRepository.findById(id)).willReturn(Optional.of(comment));

        // when
        commentService.updateComment(id, userId, request);

        // then
        assertThat(comment.getCommentCn()).isEqualTo("Updated Comment");
    }

    @Test
    @DisplayName("댓글 삭제")
    void deleteComment() {
        // given
        Long id = 1L;
        String userId = "user1";
        Comment comment = Comment.builder()
                .id(id)
                .bbsId("BBS_01")
                .nttId(1L)
                .useYn("Y")
                .build();

        given(commentRepository.findById(id)).willReturn(Optional.of(comment));

        // when
        commentService.deleteComment(id, userId);

        // then
        assertThat(comment.getUseYn()).isEqualTo("N");
        verify(eventPublisher, times(1)).publishEvent(any(CommentDeletedEvent.class));
    }

    @Test
    @DisplayName("존재하지 않는 댓글 수정 시 예외 발생")
    void updateComment_NotFound() {
        // given
        Long id = 1L;
        given(commentRepository.findById(id)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> commentService.updateComment(id, "user", new CommentSaveRequest()))
                .isInstanceOf(BusinessException.class);
    }
    @Test
    @DisplayName("단건 댓글 조회 - 존재하지 않음")
    void getComment_NotFound() {
        given(commentRepository.findById(any())).willReturn(Optional.empty());
        CommentDto result = commentService.getComment(1L);
        assertThat(result).isNull();
    }

    @Test
    @DisplayName("댓글 삭제 - 존재하지 않음")
    void deleteComment_NotFound() {
        given(commentRepository.findById(any())).willReturn(Optional.empty());
        assertThatThrownBy(() -> commentService.deleteComment(1L, "user"))
                .isInstanceOf(BusinessException.class);
    }
}
