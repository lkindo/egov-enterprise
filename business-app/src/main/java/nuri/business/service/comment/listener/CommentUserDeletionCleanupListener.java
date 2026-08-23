package nuri.business.service.comment.listener;

import java.util.List;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.service.user.event.UserDeletionEvent;
import nuri.foundation.constants.Constants;

/**
 * 사용자 삭제 전에 댓글 작성자를 시스템 계정으로 재귀속한다.
 *
 * <p>종전에는 {@code BoardUserDeletionCleanupListener} 가 comment 도메인의
 * {@link CommentRepository} 를 직접 주입해 board→comment 교차 도메인 결합이었다.
 * addressbook·blog·notification 과 같은 도메인별 구독 패턴으로 역전한다
 * (GAP-ARCH-001, {@code CrossDomainCouplingLinterTest} app→app 6→5).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CommentUserDeletionCleanupListener {

    private final CommentRepository commentRepository;

    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void onUserDeletion(UserDeletionEvent event) {
        List<String> esntlIds = event.esntlIds();
        if (esntlIds == null || esntlIds.isEmpty()) {
            return;
        }

        int comments = commentRepository.reassignWriterByWrterIdIn(
                esntlIds, Constants.User.SYSTEM_ADMIN_ESNTL_ID);
        log.info("사용자 삭제 댓글 정리: 대상 {}명 — 댓글 재귀속 {}건", esntlIds.size(), comments);
    }
}
