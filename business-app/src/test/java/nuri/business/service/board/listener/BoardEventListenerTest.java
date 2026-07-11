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

import java.util.Optional;

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
    @DisplayName("포스트 생성 이벤트 수신 - 정상 처리 및 댓글 수 업데이트")
    void handlePostCreated_success() {
        // given
        String bbsId = "BBS_01";
        String pstId = "PST_01";
        String userId = "USER_01";
        PostCreatedEvent event = new PostCreatedEvent(this, bbsId, pstId, userId);

        Board board = Board.builder()
                .pstId(pstId)
                .bbsId(bbsId)
                .cmntCnt(0)
                .build();

        given(commentRepository.countByBbsIdAndPstIdAndUseYn(bbsId, pstId, "Y")).willReturn(5L);
        given(boardRepository.findById(pstId)).willReturn(Optional.of(board));
        given(boardRepository.save(any(Board.class))).willReturn(board);

        // when
        boardEventListener.handlePostCreated(event);

        // then
        verify(commentRepository, times(1)).countByBbsIdAndPstIdAndUseYn(bbsId, pstId, "Y");
        verify(boardRepository, times(1)).findById(pstId);
        verify(boardRepository, times(1)).save(board);
        org.junit.jupiter.api.Assertions.assertEquals(5, board.getCmntCnt());
    }

    @Test
    @DisplayName("포스트 생성 이벤트 수신 - 게시글이 존재하지 않는 경우 업데이트 안함")
    void handlePostCreated_boardNotFound() {
        // given
        String bbsId = "BBS_01";
        String pstId = "PST_01";
        String userId = "USER_01";
        PostCreatedEvent event = new PostCreatedEvent(this, bbsId, pstId, userId);

        given(commentRepository.countByBbsIdAndPstIdAndUseYn(bbsId, pstId, "Y")).willReturn(3L);
        given(boardRepository.findById(pstId)).willReturn(Optional.empty());

        // when
        boardEventListener.handlePostCreated(event);

        // then
        verify(commentRepository, times(1)).countByBbsIdAndPstIdAndUseYn(bbsId, pstId, "Y");
        verify(boardRepository, times(1)).findById(pstId);
        verify(boardRepository, never()).save(any(Board.class));
    }
}
