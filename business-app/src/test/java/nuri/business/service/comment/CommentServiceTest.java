package nuri.business.service.comment;

import nuri.business.domain.comment.Comment;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.domain.comment.exception.CommentErrorCode;
import nuri.business.service.comment.dto.CommentDto;
import nuri.foundation.core.event.PostCommentCountChangedEvent;
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

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    private org.mockito.MockedStatic<nuri.business.security.util.SecurityUtil> __secUtilMock;
    @org.junit.jupiter.api.BeforeEach
    void __openSecUtilMock() { __secUtilMock = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class); }
    @org.junit.jupiter.api.AfterEach
    void __closeSecUtilMock() { if (__secUtilMock != null) __secUtilMock.close(); }

    @InjectMocks
    private CommentService commentService;

    @Mock
    private CommentRepository commentRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Test
    @DisplayName("Get comments list")
    void getComments() {
        // given
        Long pstSn = 1L;
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        Comment comment = Comment.builder()
                .ansSn(1L)
                .pstSn(pstSn)
                .bbsId(bbsId)
                .ansCn("Test Comment")
                .useYn("Y")
                .build();
        comment.setCrtDt(LocalDateTime.now());
        Page<Comment> page = new PageImpl<>(Collections.singletonList(comment));

        given(commentRepository.findByBbsIdAndPstSn(bbsId, pstSn, pageable)).willReturn(page);

        // when
        Page<CommentDto> result = commentService.getComments(pstSn, bbsId, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAnsCn()).isEqualTo("Test Comment");
    }

    @Test
    @DisplayName("Create comment")
    void createComment() {
        // given
        CommentDto request = CommentDto.builder()
                .pstSn(1L)
                .bbsId("BBS_01")
                .wrterId("user1")
                .wrterNm("Tester")
                .pswd("1234")
                .ansCn("New Comment")
                .build();
        Comment savedComment = Comment.builder()
                .ansSn(1L)
                .pstSn(request.getPstSn())
                .bbsId(request.getBbsId())
                .wrterId(request.getWrterId())
                .wrterNm(request.getWrterNm())
                .ansCn(request.getAnsCn())
                .build();

        given(commentRepository.save(any(Comment.class))).willReturn(savedComment);

        // when
        Long id = commentService.createComment("USRCNFRM_00000000001", "홍길동", request);

        // then
        assertThat(id).isEqualTo(1L);
    }

    @Test
    @DisplayName("작성자는 인증 주체에서 저장한다 — 요청 본문의 주장은 무시된다")
    void createComment_storesAuthenticatedAuthorOnly() {
        // 종전에는 request 의 wrterId/wrterNm 을 그대로 저장했다. 화면이 그 두 필드를 보내지 않으므로
        // **모든 댓글의 작성자가 null** 이었고, 요청이 값을 실으면 남의 이름으로 다는 것도 가능했다.
        CommentDto request = CommentDto.builder()
                .pstSn(1L)
                .bbsId("BBS_01")
                .wrterId("SPOOFED_ID")
                .wrterNm("남의이름")
                .ansCn("New Comment")
                .build();
        given(commentRepository.save(any(Comment.class)))
                .willReturn(Comment.builder().ansSn(9L).build());

        commentService.createComment("USRCNFRM_00000000001", "홍길동", request);

        org.mockito.ArgumentCaptor<Comment> saved = org.mockito.ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(saved.capture());
        assertThat(saved.getValue().getWrterId()).isEqualTo("USRCNFRM_00000000001");
        assertThat(saved.getValue().getWrterNm()).isEqualTo("홍길동");
    }

    @Test
    @DisplayName("Update comment")
    void updateComment() {
        // given
        Long id = 1L;
        String newContent = "Updated Comment";
        Comment comment = Comment.builder()
                .ansSn(id)
                .ansCn("Old Comment")
                .build();

        given(commentRepository.findById(id)).willReturn(Optional.of(comment));

        // when
        commentService.updateComment(id, newContent);

        // then
        assertThat(comment.getAnsCn()).isEqualTo(newContent);
    }

    @Test
    @DisplayName("Update comment should throw exception when not found")
    void updateComment_NotFound() {
        // given
        Long id = 1L;
        given(commentRepository.findById(id)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> commentService.updateComment(id, "Updated Comment"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommentErrorCode.COMMENT_NOT_FOUND);
    }

    @Test
    @DisplayName("Delete comment")
    void deleteComment() {
        // given
        Long id = 1L;
        Comment comment = Comment.builder()
                .ansSn(id)
                .useYn("Y")
                .build();

        given(commentRepository.findByIdForUpdate(id)).willReturn(Optional.of(comment));

        // when
        commentService.deleteComment(id);

        // then
        assertThat(comment.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("Delete comment should throw exception when not found")
    void deleteComment_NotFound() {
        // given
        Long id = 1L;
        given(commentRepository.findByIdForUpdate(id)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> commentService.deleteComment(id))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommentErrorCode.COMMENT_NOT_FOUND);
    }

    /**
     * [2026-08-29] 댓글 수가 영원히 0 이던 결함의 회귀 방지.
     *
     * <p>종전에는 {@code syncCmntCntAtomic} 호출부가 저장소 전체에서 board 의
     * {@code PostCreatedEvent} 리스너 하나뿐이었다 — <b>게시글이 생성되는 순간</b>에만 돌았고,
     * 그때 댓글 수는 언제나 0 이다. 댓글을 달거나 지울 때 갱신하는 경로가 아예 없었으므로
     * 세 화면의 '댓글 N' 이 전부 0 으로 고정돼 있었다.
     *
     * <p>단건 변화량을 <b>이벤트가 나른다</b>. 그래야 comment 가 커밋 뒤 개수를 다시 세거나
     * board 가 comment 저장소를 조회하지 않아 교차 도메인 결합이 되살아나지 않는다.
     */
    @Test
    @DisplayName("댓글 등록은 같은 트랜잭션에서 +1 증가량을 알린다")
    void createComment_publishesIncrementDelta() {
        CommentDto dto = CommentDto.builder().pstSn(10L).bbsId("BBS_01").ansCn("내용").build();
        given(commentRepository.save(any(Comment.class)))
                .willReturn(Comment.builder().ansSn(1L).pstSn(10L).bbsId("BBS_01").build());

        commentService.createComment("ESNTL_01", "홍길동", dto);

        verify(eventPublisher).publishEvent(new PostCommentCountChangedEvent("BBS_01", 10L, 1));
        verify(commentRepository, org.mockito.Mockito.never())
                .countByBbsIdAndPstSnAndUseYn(any(), any(), any());
    }

    /**
     * 대상이 없으면 알리지 않는다.
     *
     * <p>{@code bbsId}·{@code pstSn} 은 요청 본문에서 오므로 클라이언트가 빠뜨릴 수 있다.
     * 그 상태로 개수를 세면 <b>어느 게시글의 수인지 모르는 값</b>을 발행하게 되고, board 쪽
     * 리스너는 그것을 어디에도 반영할 수 없다. 세지도 알리지도 않는다.
     */
    @Test
    @DisplayName("대상 게시글을 특정할 수 없으면 세지도 알리지도 않는다")
    void createComment_withoutTarget_doesNotPublish() {
        CommentDto dto = CommentDto.builder().ansCn("내용").build();
        given(commentRepository.save(any(Comment.class))).willReturn(Comment.builder().ansSn(1L).build());

        commentService.createComment("ESNTL_01", "홍길동", dto);

        verify(commentRepository, org.mockito.Mockito.never())
                .countByBbsIdAndPstSnAndUseYn(any(), any(), any());
        verify(eventPublisher, org.mockito.Mockito.never()).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("댓글 삭제(논리)는 같은 트랜잭션에서 -1 감소량을 알린다")
    void deleteComment_publishesDecrementDelta() {
        Comment comment = Comment.builder().ansSn(1L).pstSn(10L).bbsId("BBS_01").useYn("Y").build();
        given(commentRepository.findByIdForUpdate(1L)).willReturn(Optional.of(comment));

        commentService.deleteComment(1L);

        verify(eventPublisher).publishEvent(new PostCommentCountChangedEvent("BBS_01", 10L, -1));
        verify(commentRepository, org.mockito.Mockito.never())
                .countByBbsIdAndPstSnAndUseYn(any(), any(), any());
    }

    @Test
    @DisplayName("댓글 수 delta는 원본 댓글 트랜잭션 안에서 즉시 발행한다")
    void createComment_publishesCountDeltaInsideSourceTransaction() {
        CommentDto dto = CommentDto.builder().pstSn(10L).bbsId("BBS_01").ansCn("내용").build();
        given(commentRepository.save(any(Comment.class)))
                .willReturn(Comment.builder().ansSn(1L).pstSn(10L).bbsId("BBS_01").build());
        org.springframework.transaction.support.TransactionSynchronizationManager.initSynchronization();
        try {
            commentService.createComment("ESNTL_01", "홍길동", dto);

            verify(eventPublisher).publishEvent(new PostCommentCountChangedEvent("BBS_01", 10L, 1));
        } finally {
            org.springframework.transaction.support.TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("이미 삭제된 댓글은 다시 감소 이벤트를 발행하지 않는다")
    void deleteComment_alreadyDeleted_doesNotPublishAnotherDelta() {
        Comment comment = Comment.builder().ansSn(1L).pstSn(10L).bbsId("BBS_01").useYn("N").build();
        given(commentRepository.findByIdForUpdate(1L)).willReturn(Optional.of(comment));

        commentService.deleteComment(1L);

        verify(eventPublisher, org.mockito.Mockito.never()).publishEvent(any(Object.class));
    }
}
