package com.company.project.api.notification;

import com.company.project.service.notification.NotificationService;
import com.company.project.service.notification.event.NotificationEvent;
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
        notificationService.sendToUser(event.getUserId(), event.getMessage(), event.getType());
    }
}