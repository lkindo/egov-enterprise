package nuri.business.service.comment.listener;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import nuri.business.domain.comment.CommentRepository;
import nuri.business.service.user.event.UserDeletionEvent;
import nuri.foundation.constants.Constants;

/**
 * 종전 {@code BoardUserDeletionCleanupListenerTest} 가 검증하던 댓글 재귀속을
 * 그대로 이관한다 — board→comment 결합 역전에 따른 커버리지 손실 0 증명.
 */
@ExtendWith(MockitoExtension.class)
class CommentUserDeletionCleanupListenerTest {

    @Mock
    private CommentRepository commentRepository;

    @InjectMocks
    private CommentUserDeletionCleanupListener listener;

    @Test
    void reassignsCommentWriters() {
        List<String> esntlIds = List.of("user-1", "user-2");

        listener.onUserDeletion(new UserDeletionEvent(esntlIds));

        verify(commentRepository).reassignWriterByWrterIdIn(esntlIds, Constants.User.SYSTEM_ADMIN_ESNTL_ID);
    }

    @Test
    void skipsRepositoryWhenTargetIsEmpty() {
        listener.onUserDeletion(new UserDeletionEvent(List.of()));

        verifyNoInteractions(commentRepository);
    }
}
