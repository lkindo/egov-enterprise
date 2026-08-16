package nuri.business.service.notification.listener;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import nuri.business.domain.notification.NotificationRepository;
import nuri.business.service.user.event.UserDeletionEvent;

@ExtendWith(MockitoExtension.class)
class NotificationUserDeletionCleanupListenerTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationUserDeletionCleanupListener listener;

    @Test
    void deletesReceivedNotifications() {
        List<String> esntlIds = List.of("user-1", "user-2");

        listener.onUserDeletion(new UserDeletionEvent(esntlIds));

        verify(notificationRepository).deleteByRcvrIdIn(esntlIds);
    }

    @Test
    void skipsRepositoryWhenTargetIsEmpty() {
        listener.onUserDeletion(new UserDeletionEvent(List.of()));

        verifyNoInteractions(notificationRepository);
    }
}
