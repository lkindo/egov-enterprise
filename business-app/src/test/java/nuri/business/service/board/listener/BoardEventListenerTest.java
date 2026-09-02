package nuri.business.service.board.listener;

import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.board.exception.BoardErrorCode;
import nuri.foundation.core.event.PostCommentCountChangedEvent;
import nuri.foundation.core.event.PostCommentedEvent;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

/**
 * [2026-08-29] 이 테스트는 종전에 {@code PostCreatedEvent}(게시글 생성)를 구독하는 경로를
 * 검증했다. 그 경로는 <b>새 글에 0 을 쓰는 일만</b> 했고, 댓글이 달리거나 지워질 때는 아예
 * 돌지 않아 화면의 '댓글 N' 이 영원히 0 이었다. 이제 comment 도메인이 단건 delta를 발행하는
 * {@link PostCommentCountChangedEvent} 를 구독한다.
 */
@ExtendWith(MockitoExtension.class)
class BoardEventListenerTest {

    @Mock
    private BoardRepository boardRepository;

    /** 알림은 foundation 이벤트로 요청한다 — board→notification 결합을 만들지 않는다. */
    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private BoardEventListener boardEventListener;

    @Test
    @DisplayName("댓글 등록 이벤트의 +1은 board 소유 원자 UPDATE로 전달한다")
    void handleCommentCountChanged_syncsViaBulkUpdate() {
        given(boardRepository.adjustCmntCntAtomic("BBS_01", 1L, 1)).willReturn(1);

        boardEventListener.handleCommentCountChanged(new PostCommentCountChangedEvent("BBS_01", 1L, 1));

        verify(boardRepository, times(1)).adjustCmntCntAtomic("BBS_01", 1L, 1);

        // [W1-D5] 이 두 단언이 이 테스트의 본체다. 종전 경로(findById → changeCmntCnt → save)는
        //   @Async 스레드라 SecurityContext 가 없어 last_mdfr_id 를 'SYSTEM' 으로 덮었고,
        //   동시에 version 을 올려 편집 중인 사용자에게 409 위양성을 만들었다.
        //   엔티티를 로드하지도 저장하지도 않아야 그 두 부작용이 원천적으로 없다.
        verify(boardRepository, never()).findById(any());
        verify(boardRepository, never()).save(any(Board.class));
    }

    @Test
    @DisplayName("댓글 수 handler는 원본 트랜잭션에 참여하도록 동기로 실행한다")
    void commentCountHandlerIsSynchronous() throws NoSuchMethodException {
        java.lang.reflect.Method handler = BoardEventListener.class.getDeclaredMethod(
                "handleCommentCountChanged", PostCommentCountChangedEvent.class);

        assertThat(handler.isAnnotationPresent(org.springframework.scheduling.annotation.Async.class))
                .as("비동기 순서가 뒤집혀 -1이 +1보다 먼저 0 하한에 닿으면 최종 count가 1로 틀어진다")
                .isFalse();
        assertThat(handler.isAnnotationPresent(org.springframework.transaction.annotation.Transactional.class))
                .as("board delta는 댓글 상태 전이와 같은 트랜잭션에 참여해야 한다")
                .isTrue();
    }

    @Test
    @DisplayName("대상 게시글이 없으면(영향 0행) 실패로 다루지 않고 조용히 넘어간다")
    void handleCommentCountChanged_boardNotFound() {
        given(boardRepository.adjustCmntCntAtomic("BBS_01", 1L, -1)).willReturn(0);

        // 이미 삭제된 글에 달린 댓글 등. 예외를 던지면 비동기 경로가 요란해질 뿐 복구되지 않는다.
        boardEventListener.handleCommentCountChanged(new PostCommentCountChangedEvent("BBS_01", 1L, -1));

        verify(boardRepository, times(1)).adjustCmntCntAtomic("BBS_01", 1L, -1);
        verify(boardRepository, never()).save(any(Board.class));
    }

    @Test
    @DisplayName("댓글 등록 대상 게시글이 없으면 원본 트랜잭션을 되돌리도록 실패한다")
    void handleCommentCountChanged_createTargetNotFound() {
        given(boardRepository.adjustCmntCntAtomic("BBS_01", 1L, 1)).willReturn(0);

        assertThatThrownBy(() -> boardEventListener.handleCommentCountChanged(
                new PostCommentCountChangedEvent("BBS_01", 1L, 1)))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);
    }

    /**
     * 결합 역전이 유지되는지 <b>구조로</b> 고정한다.
     *
     * <p>board가 Java comment 타입을 직접 주입하면 교차 도메인 결합이 되돌아온다.
     * delta 누적은 board 소유 네이티브 쿼리 안에서만 수행한다.
     */
    @Test
    @DisplayName("리스너는 comment 도메인 타입을 주입받지 않는다")
    void listenerDoesNotDependOnCommentDomain() {
        boolean anyCommentField = java.util.Arrays.stream(BoardEventListener.class.getDeclaredFields())
                .anyMatch(f -> f.getType().getName().contains(".domain.comment.")
                        || f.getType().getName().contains(".service.comment."));

        assertThat(anyCommentField)
                .as("board 리스너가 comment 도메인 타입을 다시 주입받고 있다 — 이벤트 delta를 사용하십시오")
                .isFalse();
    }

    // ------------------------------------------------------------------
    // 내 글에 댓글이 달리면 글쓴이에게 알린다.
    //
    // 게시글의 작성자는 board 가 소유한 사실이라 board 가 판정한다 — comment 가 알아내려면
    // board 를 조회해야 하고, 그 순간 2026-08-29 에 역전시킨 comment→board 결합이 되살아난다.
    // ------------------------------------------------------------------

    @Test
    @DisplayName("댓글이 달리면 게시글 작성자에게 알림을 요청한다")
    void handlePostCommented_requestsNotificationForAuthor() {
        given(boardRepository.findById(1L)).willReturn(java.util.Optional.of(
                Board.builder().pstSn(1L).bbsId("BBS_01").pstTtl("연차 신청 안내")
                        .userId("USRCNFRM_AUTHOR").build()));

        boardEventListener.handlePostCommented(
                new PostCommentedEvent("BBS_01", 1L, "USRCNFRM_OTHER", "홍길동"));

        org.mockito.ArgumentCaptor<nuri.foundation.core.event.NotificationRequestedEvent> captor =
                org.mockito.ArgumentCaptor.forClass(nuri.foundation.core.event.NotificationRequestedEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().receiverEsntlId()).isEqualTo("USRCNFRM_AUTHOR");
        assertThat(captor.getValue().content()).contains("홍길동").contains("연차 신청 안내");
        assertThat(captor.getValue().linkUrl()).contains("BBS_01").contains("1");
    }

    /**
     * 자기 행동을 자기에게 통지하면 알림함이 자기 발자국으로 채워져 남이 남긴 반응이 묻힌다.
     */
    @Test
    @DisplayName("자기 글에 자기가 단 댓글은 알리지 않는다")
    void handlePostCommented_skipsSelfComment() {
        given(boardRepository.findById(1L)).willReturn(java.util.Optional.of(
                Board.builder().pstSn(1L).bbsId("BBS_01").pstTtl("제목").userId("USRCNFRM_AUTHOR").build()));

        boardEventListener.handlePostCommented(
                new PostCommentedEvent("BBS_01", 1L, "USRCNFRM_AUTHOR", "본인"));

        verify(eventPublisher, never()).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("작성자를 알 수 없는 글에는 알림을 요청하지 않는다")
    void handlePostCommented_skipsWhenAuthorUnknown() {
        given(boardRepository.findById(1L)).willReturn(java.util.Optional.of(
                Board.builder().pstSn(1L).bbsId("BBS_01").pstTtl("제목").build()));

        boardEventListener.handlePostCommented(
                new PostCommentedEvent("BBS_01", 1L, "USRCNFRM_OTHER", "홍길동"));

        verify(eventPublisher, never()).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("이미 삭제된 글의 댓글 알림은 조용히 건너뛴다")
    void handlePostCommented_skipsWhenPostGone() {
        given(boardRepository.findById(1L)).willReturn(java.util.Optional.empty());

        boardEventListener.handlePostCommented(
                new PostCommentedEvent("BBS_01", 1L, "USRCNFRM_OTHER", "홍길동"));

        verify(eventPublisher, never()).publishEvent(any(Object.class));
    }
}
