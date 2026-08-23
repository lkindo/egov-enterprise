package nuri.business.service.board.listener;

import java.util.List;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.board.BoardRepository;
import nuri.business.service.user.event.UserDeletionEvent;
import nuri.foundation.constants.Constants;

/**
 * 사용자 삭제 전에 게시글 작성자를 시스템 계정으로 재귀속한다.
 *
 * <p>댓글 재귀속은 {@code CommentUserDeletionCleanupListener}(comment 도메인 자체 구독)가
 * 담당한다 — board→comment 교차 도메인 결합 역전(GAP-ARCH-001).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BoardUserDeletionCleanupListener {

    private final BoardRepository boardRepository;

    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void onUserDeletion(UserDeletionEvent event) {
        List<String> esntlIds = event.esntlIds();
        if (esntlIds == null || esntlIds.isEmpty()) {
            return;
        }

        int posts = boardRepository.reassignAuthorByUserIdIn(
                esntlIds, Constants.User.SYSTEM_ADMIN_ESNTL_ID);
        log.info("사용자 삭제 게시판 정리: 대상 {}명 — 게시글 재귀속 {}건", esntlIds.size(), posts);
    }
}
