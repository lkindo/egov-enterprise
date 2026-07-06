package nuri.business.service.board.listener;

import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.service.board.event.PostCreatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 게시판 관련 이벤트 리스너
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BoardEventListener {

    private final BoardRepository boardRepository;
    private final CommentRepository commentRepository;

    @Async
    @EventListener
    @Transactional
    public void handlePostCreated(PostCreatedEvent event) {
        log.info(">>> handlePostCreated: bbsId={}, pstId={}, userId={}", 
            event.getBbsId(), event.getPstId(), event.getUserId());
        
        // 추가 작업 (예: 통계 업데이트, 검색 엔진 색인 등)
        updateCommentCount(event.getPstId(), event.getBbsId());
    }

    /**
     * 댓글 수 업데이트
     */
    private void updateCommentCount(String pstId, String bbsId) {
        long count = commentRepository.countByBbsIdAndPstIdAndUseYn(bbsId, pstId, "Y");
        
        boardRepository.findById(pstId).ifPresent(board -> {
            board.changeCmntCnt((int) count);
            boardRepository.save(board);
            log.info(">>> Updated comment count for pstId {}: {}", pstId, count);
        });
    }
}
