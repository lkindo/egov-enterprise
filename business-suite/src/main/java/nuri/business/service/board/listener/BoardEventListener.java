package nuri.business.service.board.listener;

import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.service.comment.event.CommentCreatedEvent;
import nuri.business.service.comment.event.CommentDeletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 게시판 관련 이벤트 리스너 (v5 standardized)
 * - 댓글 작성/삭제 시 게시글의 댓글 수 반정규화 필드 업데이트
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BoardEventListener {

    private final BoardRepository boardRepository;
    private final CommentRepository commentRepository;

    @Async("taskExecutor")
    @EventListener
    @Transactional
    public void handleCommentCreated(CommentCreatedEvent event) {
        log.debug(">>> Handling CommentCreatedEvent for pstId: {}", event.getNttId());
        updateCommentCount(event.getNttId(), event.getBbsId());
    }

    @Async("taskExecutor")
    @EventListener
    @Transactional
    public void handleCommentDeleted(CommentDeletedEvent event) {
        log.debug(">>> Handling CommentDeletedEvent for pstId: {}", event.getNttId());
        updateCommentCount(event.getNttId(), event.getBbsId());
    }

    private void updateCommentCount(Long pstId, String bbsId) {
        long count = commentRepository.countByBbsIdAndPstIdAndUseYn(bbsId, pstId, "Y");
        
        boardRepository.findById(pstId).ifPresent(board -> {
            // boardboard.setCommentCnt((int) count); // Removed in v5
            log.info(">>> Comment count updated (pstId={}), but denormalized field removed in v5", pstId);
        });
    }
}
