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

    // 발행 자체가 커밋 후 이뤄지도록 발행부(BoardService.createPost/replyPost)에서 runAfterCommit 로 감싼다.
    // (@TransactionalEventListener + @Async 조합은 AsyncTransactionalListenerArchTest 게이트로 금지된다 — 커밋-전-async 방지.)
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
     * 댓글 수 업데이트.
     *
     * <p>[W1-D5] 종전에는 {@code findById → changeCmntCnt → save} 더티체킹 저장이었다.
     * 이 메서드는 {@code @Async} 스레드에서 도는데 그 스레드에는 SecurityContext 가 없어
     * 감사 컬럼 {@code last_mdfr_id} 가 실제 수정자를 지우고 {@code SYSTEM} 으로 덮였고,
     * 동시에 {@code version} 이 올라 글을 편집 중이던 사용자가 409 를 맞았다.
     * 감사 컬럼·version 을 건드리지 않는 벌크 UPDATE 로 전환한다.
     */
    private void updateCommentCount(String pstId, String bbsId) {
        long count = commentRepository.countByBbsIdAndPstIdAndUseYn(bbsId, pstId, "Y");

        int affected = boardRepository.syncCmntCntAtomic(pstId, (int) count);
        if (affected == 0) {
            // 이미 삭제된 글에 달린 댓글 등 — 정상 경로이므로 실패로 다루지 않는다.
            log.debug(">>> comment count sync skipped (post not found): pstId={}", pstId);
            return;
        }
        log.info(">>> Updated comment count for pstId {}: {}", pstId, count);
    }
}
