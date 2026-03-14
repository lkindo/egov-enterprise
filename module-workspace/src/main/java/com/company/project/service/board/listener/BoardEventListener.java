package com.company.project.service.board.listener;

import com.company.project.domain.board.BoardRepository;
import com.company.project.domain.comment.CommentRepository;
import com.company.project.service.comment.event.CommentCreatedEvent;
import com.company.project.service.comment.event.CommentDeletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 게시판 관련 이벤트 리스너
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
        log.debug(">>> Handling CommentCreatedEvent for nttId: {}", event.getNttId());
        updateCommentCount(event.getNttId(), event.getBbsId());
    }

    @Async("taskExecutor")
    @EventListener
    @Transactional
    public void handleCommentDeleted(CommentDeletedEvent event) {
        log.debug(">>> Handling CommentDeletedEvent for nttId: {}", event.getNttId());
        updateCommentCount(event.getNttId(), event.getBbsId());
    }

    private void updateCommentCount(Long nttId, String bbsId) {
        long count = commentRepository.countByBbsIdAndNttIdAndUseAt(bbsId, nttId, "Y");
        
        boardRepository.findById(nttId).ifPresent(board -> {
            board.updateCommentCount((int) count);
            log.info(">>> Updated Board(nttId={}) comment count to {}", nttId, count);
        });
    }
}
