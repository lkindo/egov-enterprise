package nuri.business.service.board.listener;

import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardRepository;
import nuri.foundation.core.event.PostCommentCountChangedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

/**
 * [2026-08-29] 이 테스트는 종전에 {@code PostCreatedEvent}(게시글 생성)를 구독하는 경로를
 * 검증했다. 그 경로는 <b>새 글에 0 을 쓰는 일만</b> 했고, 댓글이 달리거나 지워질 때는 아예
 * 돌지 않아 화면의 '댓글 N' 이 영원히 0 이었다. 이제 comment 도메인이 개수를 실어 발행하는
 * {@link PostCommentCountChangedEvent} 를 구독한다.
 */
@ExtendWith(MockitoExtension.class)
class BoardEventListenerTest {

    @Mock
    private BoardRepository boardRepository;

    @InjectMocks
    private BoardEventListener boardEventListener;

    @Test
    @DisplayName("댓글 수 갱신은 감사 컬럼·version 을 건드리지 않는 벌크 UPDATE 로 나간다")
    void handleCommentCountChanged_syncsViaBulkUpdate() {
        given(boardRepository.syncCmntCntAtomic(1L, 5)).willReturn(1);

        boardEventListener.handleCommentCountChanged(new PostCommentCountChangedEvent("BBS_01", 1L, 5));

        verify(boardRepository, times(1)).syncCmntCntAtomic(1L, 5);

        // [W1-D5] 이 두 단언이 이 테스트의 본체다. 종전 경로(findById → changeCmntCnt → save)는
        //   @Async 스레드라 SecurityContext 가 없어 last_mdfr_id 를 'SYSTEM' 으로 덮었고,
        //   동시에 version 을 올려 편집 중인 사용자에게 409 위양성을 만들었다.
        //   엔티티를 로드하지도 저장하지도 않아야 그 두 부작용이 원천적으로 없다.
        verify(boardRepository, never()).findById(any());
        verify(boardRepository, never()).save(any(Board.class));
    }

    @Test
    @DisplayName("대상 게시글이 없으면(영향 0행) 실패로 다루지 않고 조용히 넘어간다")
    void handleCommentCountChanged_boardNotFound() {
        given(boardRepository.syncCmntCntAtomic(1L, 3)).willReturn(0);

        // 이미 삭제된 글에 달린 댓글 등. 예외를 던지면 비동기 경로가 요란해질 뿐 복구되지 않는다.
        boardEventListener.handleCommentCountChanged(new PostCommentCountChangedEvent("BBS_01", 1L, 3));

        verify(boardRepository, times(1)).syncCmntCntAtomic(1L, 3);
        verify(boardRepository, never()).save(any(Board.class));
    }

    /**
     * 결합 역전이 유지되는지 <b>구조로</b> 고정한다.
     *
     * <p>개수를 이벤트가 나르지 않고 board 가 다시 comment 를 조회하면 교차 도메인 결합이
     * 되돌아온다. 그때 census 상수도 함께 올려야 하는데, 그 되돌림을 여기서 먼저 잡는다.
     */
    @Test
    @DisplayName("리스너는 comment 도메인 타입을 주입받지 않는다 — 개수는 이벤트가 나른다")
    void listenerDoesNotDependOnCommentDomain() {
        boolean anyCommentField = java.util.Arrays.stream(BoardEventListener.class.getDeclaredFields())
                .anyMatch(f -> f.getType().getName().contains(".domain.comment.")
                        || f.getType().getName().contains(".service.comment."));

        assertThat(anyCommentField)
                .as("board 리스너가 comment 도메인 타입을 다시 주입받고 있다 — 이벤트가 개수를 나르게 하십시오")
                .isFalse();
    }
}
