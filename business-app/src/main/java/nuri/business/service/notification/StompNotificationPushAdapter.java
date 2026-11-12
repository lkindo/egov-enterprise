package nuri.business.service.notification;

import nuri.foundation.core.notification.NotificationPushPort;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * 기본 알림 전달 어댑터(Wave 4) — 이 노드의 STOMP 브로커로 보낸다. {@code nuri.notification.push.type} 이 비었거나 {@code local}
 * 이면 켜진다. 종전 전달 처리기가 직접 하던 일과 같다.
 */
@Component
@ConditionalOnProperty(prefix = "nuri.notification.push", name = "type", havingValue = "local", matchIfMissing = true)
public class StompNotificationPushAdapter implements NotificationPushPort {

    private final SimpMessagingTemplate messagingTemplate;

    public StompNotificationPushAdapter(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void pushToUser(String receiver, String destination, Object payload) {
        messagingTemplate.convertAndSendToUser(receiver, destination, payload);
    }
}
