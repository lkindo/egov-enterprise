package nuri.api.notification;

import nuri.business.service.notification.NotificationService;
import nuri.business.service.notification.dto.NotificationDto;
import nuri.business.service.notification.event.NotificationEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationService notificationService;

    @Async
    @EventListener
    public void handleNotificationEvent(NotificationEvent event) {
        log.info("Handling notification event for user: {}, message: {}", event.getUserId(), event.getMessage());

        NotificationDto dto = NotificationDto.builder()
                .notiTtlNm("Notification: " + event.getType())
                .notiCn(event.getMessage())
                .build();

        notificationService.createNotification(event.getUserId(), dto);
    }
}
