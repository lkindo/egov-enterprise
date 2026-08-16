package nuri.business.service.board.listener;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.service.user.event.UserDeletionEvent;
import nuri.foundation.constants.Constants;

@ExtendWith(MockitoExtension.class)
class BoardUserDeletionCleanupListenerTest {

    @Mock
    private BoardRepository boardRepository;

    @Mock
    private CommentRepository commentRepository;

    @InjectMocks
    private BoardUserDeletionCleanupListener listener;

    @Test
    void reassignsBoardAndCommentOwners() {
        List<String> esntlIds = List.of("user-1", "user-2");

        listener.onUserDeletion(new UserDeletionEvent(esntlIds));

        verify(boardRepository).reassignAuthorByUserIdIn(esntlIds, Constants.User.SYSTEM_ADMIN_ESNTL_ID);
        verify(commentRepository).reassignWriterByWrterIdIn(esntlIds, Constants.User.SYSTEM_ADMIN_ESNTL_ID);
    }

    @Test
    void skipsRepositoriesWhenTargetIsEmpty() {
        listener.onUserDeletion(new UserDeletionEvent(List.of()));

        verifyNoInteractions(boardRepository, commentRepository);
    }
}
