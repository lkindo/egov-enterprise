package nuri.business.service.notification;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.notification.NotificationRepository;
import nuri.business.service.notification.dto.NotificationMapper;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkHandler;
import nuri.foundation.core.notification.NotificationPushPort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

/** A retry delivers the existing notification ID; it never inserts another inbox row. */
@Component
@RequiredArgsConstructor
public class NotificationDeliveryWorkHandler implements DurableWorkHandler {
    public static final String TYPE = "NOTIFICATION_DELIVERY";
    private final NotificationRepository repository;
    private final NotificationMapper notificationMapper;
    /** [Wave 4] 전달은 포트로 한다 — 기본은 이 노드의 STOMP 브로커, 설정으로 외부 Pub/Sub 발행을 덧붙인다. */
    private final NotificationPushPort pushPort;
    private final ObjectMapper mapper;

    @Override public String type() { return TYPE; }

    @Override
    @Transactional(readOnly = true)
    public void execute(DurableWork work) {
        if (!TYPE.equals(work.type())) throw new IllegalArgumentException("Unexpected work type");
        NotificationDeliveryIntent intent = mapper.readValue(work.payload(), NotificationDeliveryIntent.class);
        // User deletion, explicit inbox deletion, and retention are authoritative. Never recreate a
        // removed row. The destination remains private even when the worker has no SecurityContext.
        repository.findByNotiSnAndRcvrId(intent.notificationId(), intent.receiver()).ifPresent(notification ->
                pushPort.pushToUser(intent.receiver(), "/queue/notifications", notificationMapper.toDto(notification)));
    }
}
