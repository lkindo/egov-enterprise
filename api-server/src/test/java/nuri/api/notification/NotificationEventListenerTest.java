package nuri.api.notification;

import nuri.business.service.notification.NotificationService;
import nuri.business.service.notification.dto.NotificationDto;
import nuri.business.service.notification.event.NotificationEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class NotificationEventListenerTest {

    private final NotificationService notificationService = mock(NotificationService.class);
    private final NotificationEventListener listener = new NotificationEventListener(notificationService);

    @Test
    @DisplayName("알림 이벤트 핸들링 - 성공")
    void handleNotificationEvent_success() {
        // Given
        NotificationEvent event = new NotificationEvent("testUser", "test message", "SYSTEM");

        // When
        listener.handleNotificationEvent(event);

        // Then
        verify(notificationService).createNotification(eq("testUser"), any(NotificationDto.class));
    }
}
