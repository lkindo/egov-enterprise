package nuri.business.service.board.listener;

import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.service.board.event.PostCreatedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;


import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BoardEventListenerTest {

    @Mock
    private BoardRepository boardRepository;

    @Mock
    private CommentRepository commentRepository;

    @InjectMocks
    private BoardEventListener boardEventListener;

    @Test
    @DisplayName("댓글 수 갱신은 감사 컬럼·version 을 건드리지 않는 벌크 UPDATE 로 나간다")
    void handlePostCreated_syncsViaBulkUpdate() {
        // given
        String bbsId = "BBS_01";
        Long pstSn = 1L;
        PostCreatedEvent event = new PostCreatedEvent(this, bbsId, pstSn, "USER_01");

        given(commentRepository.countByBbsIdAndPstSnAndUseYn(bbsId, pstSn, "Y")).willReturn(5L);
        given(boardRepository.syncCmntCntAtomic(pstSn, 5)).willReturn(1);

        // when
        boardEventListener.handlePostCreated(event);

        // then
        verify(commentRepository, times(1)).countByBbsIdAndPstSnAndUseYn(bbsId, pstSn, "Y");
        verify(boardRepository, times(1)).syncCmntCntAtomic(pstSn, 5);

        // [W1-D5] 이 두 단언이 이 테스트의 본체다. 종전 경로(findById → changeCmntCnt → save)는
        //   @Async 스레드라 SecurityContext 가 없어 last_mdfr_id 를 'SYSTEM' 으로 덮었고,
        //   동시에 version 을 올려 편집 중인 사용자에게 409 위양성을 만들었다.
        //   엔티티를 로드하지도 저장하지도 않아야 그 두 부작용이 원천적으로 없다.
        verify(boardRepository, never()).findById(any());
        verify(boardRepository, never()).save(any(Board.class));
    }

    @Test
    @DisplayName("대상 게시글이 없으면(영향 0행) 실패로 다루지 않고 조용히 넘어간다")
    void handlePostCreated_boardNotFound() {
        // given
        String bbsId = "BBS_01";
        Long pstSn = 1L;
        PostCreatedEvent event = new PostCreatedEvent(this, bbsId, pstSn, "USER_01");

        given(commentRepository.countByBbsIdAndPstSnAndUseYn(bbsId, pstSn, "Y")).willReturn(3L);
        given(boardRepository.syncCmntCntAtomic(pstSn, 3)).willReturn(0);

        // when — 이미 삭제된 글에 달린 댓글 등. 예외를 던지면 비동기 경로가 요란해질 뿐 복구되지 않는다.
        boardEventListener.handlePostCreated(event);

        // then
        verify(commentRepository, times(1)).countByBbsIdAndPstSnAndUseYn(bbsId, pstSn, "Y");
        verify(boardRepository, times(1)).syncCmntCntAtomic(pstSn, 3);
        verify(boardRepository, never()).save(any(Board.class));
    }
}
