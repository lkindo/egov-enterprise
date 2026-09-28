package nuri.business.service.notification;

import java.util.Optional;
import java.util.UUID;
import nuri.business.domain.notification.Notification;
import nuri.business.domain.notification.NotificationRepository;
import nuri.business.service.notification.dto.NotificationDto;
import nuri.business.service.notification.dto.NotificationMapperImpl;
import nuri.foundation.core.event.NotificationRequestedEvent;
import nuri.foundation.core.job.DurableWork;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class NotificationDeliveryWorkHandlerTest {
    final NotificationRepository repository = mock(NotificationRepository.class);
    final SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
    final ObjectMapper mapper = new ObjectMapper();
    final NotificationDeliveryWorkHandler handler = new NotificationDeliveryWorkHandler(
            repository, new NotificationMapperImpl(), messaging, mapper);

    private DurableWork work() {
        return new DurableWork(UUID.randomUUID(), handler.type(), mapper.writeValueAsString(
                new NotificationDeliveryIntent(7L, "receiver", "a".repeat(64))));
    }

    @Test void retriesDeliverSamePrivateInboxRowAndTransportErrorsPropagate() {
        when(repository.findByNotiSnAndRcvrId(7L, "receiver")).thenReturn(Optional.of(
                Notification.builder().notiSn(7L).rcvrId("receiver").notiTtlNm("notice").build()));
        doThrow(new IllegalStateException("transport unavailable")).doNothing().when(messaging)
                .convertAndSendToUser(eq("receiver"), eq("/queue/notifications"), any(NotificationDto.class));
        DurableWork work = work();
        assertThatThrownBy(() -> handler.execute(work)).isInstanceOf(IllegalStateException.class);
        handler.execute(work);
        verify(messaging, times(2)).convertAndSendToUser(eq("receiver"), eq("/queue/notifications"),
                argThat((NotificationDto dto) -> dto.getNotiSn().equals(7L)));
        verify(repository, never()).save(any());
        verify(messaging, never()).convertAndSend(eq("/topic/public"), any(Object.class));
    }

    @Test void removedNotificationIsAcknowledgedWithoutRecreationOrTransmission() {
        when(repository.findByNotiSnAndRcvrId(7L, "receiver")).thenReturn(Optional.empty());
        handler.execute(work());
        verifyNoInteractions(messaging);
        verify(repository, never()).save(any());
    }

    @Test void fingerprintSeparatesNullEmptyAndAmbiguousConcatenationsWithoutCopyingContents() {
        UUID id = UUID.randomUUID();
        var first = new NotificationRequestedEvent(id, "receiver", "ab", "c", null);
        var second = new NotificationRequestedEvent(id, "receiver", "a", "bc", null);
        var emptyLink = new NotificationRequestedEvent(id, "receiver", "ab", "c", "");
        assertThat(NotificationDeliveryIntent.fingerprint(first)).hasSize(64)
                .isNotEqualTo(NotificationDeliveryIntent.fingerprint(second))
                .isNotEqualTo(NotificationDeliveryIntent.fingerprint(emptyLink));
        assertThat(NotificationDeliveryIntent.key(first)).isEqualTo(NotificationDeliveryIntent.key(second));
        assertThat(NotificationDeliveryIntent.key(first)).isNotEqualTo(NotificationDeliveryIntent.key(
                new NotificationRequestedEvent(id, "other", "ab", "c", null)));
    }

    @Test void invalidReferenceDoesNotTouchInboxOrTransport() {
        assertThatThrownBy(() -> handler.execute(new DurableWork(UUID.randomUUID(), handler.type(), "{}")))
                .isInstanceOf(RuntimeException.class);
        verifyNoInteractions(repository, messaging);
    }
}
