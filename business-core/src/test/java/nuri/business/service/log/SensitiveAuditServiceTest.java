package nuri.business.service.log;

import nuri.business.domain.log.SensitiveAuditLog;
import nuri.business.domain.log.SensitiveAuditLogRepository;
import nuri.foundation.core.audit.SensitiveAuditPort;
import nuri.foundation.core.event.PrivacyAccessEvent;
import nuri.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SensitiveAuditServiceTest {
    private final SensitiveAuditLogRepository repository = mock(SensitiveAuditLogRepository.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final SensitiveAuditService service = new SensitiveAuditService(repository, events, JsonMapper.builder().build());
    private final SensitiveAuditPort.Context context = new SensitiveAuditPort.Context(
            "request-test", "UserApiController#read", "login", "stable", "127.0.0.1", "사용자 조회", null);

    @Test
    void preparationWritesJournalBeforeSynchronousPrivacyProjection() {
        service.prepared(context);
        var order = inOrder(repository, events);
        order.verify(repository).saveAndFlush(any(SensitiveAuditLog.class));
        var event = ArgumentCaptor.forClass(PrivacyAccessEvent.class);
        order.verify(events).publishEvent(event.capture());
        assertThat(event.getValue().inqInfo()).startsWith("[PREPARED]");
    }

    @Test
    void attemptFailureStopsWithoutPublishingPrivacyProjection() {
        when(repository.saveAndFlush(any())).thenThrow(new IllegalStateException("db unavailable"));
        assertThatThrownBy(() -> service.attempted(context)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(events);
    }

    @Test
    void projectionFailurePropagatesToCallerBeforeResponse() {
        doThrow(new IllegalStateException("projection unavailable")).when(events).publishEvent(any(PrivacyAccessEvent.class));
        assertThatThrownBy(() -> service.prepared(context)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void httpCompletionCannotImpersonateCommittedMutation() {
        assertThatThrownBy(() -> service.completed(context, SensitiveAuditPort.Outcome.COMMITTED, 200)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(repository);
    }

    @Test
    void recoveryReferenceRejectsPersonalFreeTextBeforePersistence() {
        assertThatThrownBy(() -> service.recordMfaRecovery("target", "person@example.com")).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(repository);
    }
}
