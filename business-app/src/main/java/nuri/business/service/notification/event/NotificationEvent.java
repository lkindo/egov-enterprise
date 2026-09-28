package nuri.business.service.notification.event;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class NotificationEvent {
    private final java.util.UUID eventId = java.util.UUID.randomUUID();
    private final String userId;
    private final String message;
    private final String type;
}
