package nuri.business.service.notification;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.notification.NotificationRepository;
import nuri.business.service.notification.dto.NotificationMapper;
import nuri.foundation.core.job.DurableWork;
import nuri.foundation.core.job.DurableWorkHandler;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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
    private final SimpMessagingTemplate messagingTemplate;
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
                messagingTemplate.convertAndSendToUser(intent.receiver(), "/queue/notifications",
                        notificationMapper.toDto(notification)));
    }
}
