package nuri.business.service.board.listener;

import java.util.List;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.service.user.event.UserDeletionEvent;
import nuri.foundation.constants.Constants;

/** 사용자 삭제 전에 게시글과 댓글 작성자를 시스템 계정으로 재귀속한다. */
@Slf4j
@Component
@RequiredArgsConstructor
public class BoardUserDeletionCleanupListener {

    private final BoardRepository boardRepository;
    private final CommentRepository commentRepository;

    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void onUserDeletion(UserDeletionEvent event) {
        List<String> esntlIds = event.esntlIds();
        if (esntlIds == null || esntlIds.isEmpty()) {
            return;
        }

        String systemAdmin = Constants.User.SYSTEM_ADMIN_ESNTL_ID;
        int posts = boardRepository.reassignAuthorByUserIdIn(esntlIds, systemAdmin);
        int comments = commentRepository.reassignWriterByWrterIdIn(esntlIds, systemAdmin);
        log.info("사용자 삭제 게시판 정리: 대상 {}명 — 게시글/댓글 재귀속 {}/{}건",
                esntlIds.size(), posts, comments);
    }
}
