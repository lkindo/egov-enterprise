package nuri.business.service.blog.listener;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import nuri.business.domain.blog.BlogUserRepository;
import nuri.business.service.user.event.UserDeletionEvent;

@ExtendWith(MockitoExtension.class)
class BlogUserDeletionCleanupListenerTest {

    @Mock
    private BlogUserRepository blogUserRepository;

    @InjectMocks
    private BlogUserDeletionCleanupListener listener;

    @Test
    void deletesBlogMemberships() {
        List<String> esntlIds = List.of("user-1", "user-2");

        listener.onUserDeletion(new UserDeletionEvent(esntlIds));

        verify(blogUserRepository).deleteByUserIdIn(esntlIds);
    }

    @Test
    void skipsRepositoryWhenTargetIsEmpty() {
        listener.onUserDeletion(new UserDeletionEvent(List.of()));

        verifyNoInteractions(blogUserRepository);
    }
}
