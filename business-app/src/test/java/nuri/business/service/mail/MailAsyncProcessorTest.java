package nuri.business.service.mail;

import nuri.business.domain.mail.SentMail;
import nuri.business.domain.mail.SentMailRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MailAsyncProcessor 단위 테스트")
class MailAsyncProcessorTest {

    @InjectMocks
    private MailAsyncProcessor mailAsyncProcessor;

    @Mock
    private EmailSender emailSender;

    @Mock
    private SentMailRepository sentMailRepository;

    @Mock
    private io.micrometer.core.instrument.MeterRegistry meterRegistry;

    @Mock
    private org.springframework.context.ApplicationEventPublisher eventPublisher;

    private static final java.time.LocalDateTime QUEUED = java.time.LocalDateTime.of(2026, 10, 18, 0, 0);

    @BeforeEach
    void setUp() {
        mailAsyncProcessor.setSelf(mailAsyncProcessor);
        lenient().when(sentMailRepository.claimQueued(1L, QUEUED)).thenReturn(1);
        lenient().when(sentMailRepository.recordResult(eq(1L), eq(QUEUED), anyString())).thenReturn(1);
        lenient().when(meterRegistry.counter(anyString(), any(String[].class)))
            .thenReturn(mock(io.micrometer.core.instrument.Counter.class));
    }

    @Test
    @DisplayName("비동기 메일 발송 - 성공")
    void processSending_Success() throws Exception {
        SentMail mail = SentMail.builder().emlDsptchSn(1L).build();
        lenient().when(sentMailRepository.findById(1L)).thenReturn(Optional.of(mail));

        mailAsyncProcessor.dispatchCommitted(1L, QUEUED, "Sub", "Cn", "from", "to", null);

        verify(emailSender).send(anyString(), anyString(), anyString(), anyString());
        verify(sentMailRepository).recordResult(1L, QUEUED, "S");
    }

    @Test
    @DisplayName("비동기 메일 발송 - 실패 (예외 발생)")
    void processSending_Failure() throws Exception {
        doThrow(new RuntimeException("Send error")).when(emailSender).send(anyString(), anyString(), anyString(), anyString());

        // Exception is expected to bubble up in unit test
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> 
            mailAsyncProcessor.dispatchCommitted(1L, QUEUED, "Sub", "Cn", "from", "to", null)
        ).isInstanceOf(RuntimeException.class);

        // 발송 복구는 실패 결과만 반환한다. F 기록은 실제 프록시 통합 테스트에서 검증한다.
        org.assertj.core.api.Assertions.assertThat(mailAsyncProcessor.recoverSending(
                new RuntimeException("Send error"), 1L, "Sub", "Cn", "from", "to")).isFalse();
        verify(sentMailRepository, never()).recordResult(anyLong(), any(), anyString());
    }

    @Test
    @DisplayName("SMTP 미설정은 재발송 없이 실패 상태와 지표를 기록한다")
    void unavailableSenderRecordsFailure() {
        var registry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();
        var processor = new MailAsyncProcessor(new LoggingEmailSender(), sentMailRepository, registry, eventPublisher);
        processor.setSelf(processor);
        SentMail mail = SentMail.builder().emlDsptchSn(1L).build();
        lenient().when(sentMailRepository.findById(1L)).thenReturn(Optional.of(mail));

        processor.dispatchCommitted(1L, QUEUED, "Sub", "Cn", "from", "to", null);

        verify(sentMailRepository).recordResult(1L, QUEUED, "F");
        org.assertj.core.api.Assertions.assertThat(registry.counter("mail.dispatch.total", "result", "failure").count())
                .isEqualTo(1);
        org.assertj.core.api.Assertions.assertThat(registry.find("mail.dispatch.total").tag("result", "success").counter())
                .isNull();
        verify(sentMailRepository, never()).findById(1L);
    }

    @Test
    @DisplayName("실패로 확정되면 발신자에게 제목과 받는 사람을 밝혀 한 번 알린다 — 본문·주소는 싣지 않는다")
    void finalFailureNotifiesSender() {
        var processor = new MailAsyncProcessor(new LoggingEmailSender(), sentMailRepository,
                new io.micrometer.core.instrument.simple.SimpleMeterRegistry(), eventPublisher);
        processor.setSelf(processor);
        SentMail mail = SentMail.create(1L, "주간 보고", "비밀 본문", "sender", "홍길동", "U1", "P", null);
        lenient().when(sentMailRepository.findById(1L)).thenReturn(Optional.of(mail));

        processor.dispatchCommitted(1L, QUEUED, "주간 보고", "비밀 본문", "from", "hong@example.com", "SENDER-1");

        var captor = org.mockito.ArgumentCaptor.forClass(nuri.foundation.core.event.NotificationRequestedEvent.class);
        verify(eventPublisher, times(1)).publishEvent(captor.capture());
        var event = captor.getValue();
        org.assertj.core.api.Assertions.assertThat(event.receiverEsntlId()).isEqualTo("SENDER-1");
        org.assertj.core.api.Assertions.assertThat(event.title()).isEqualTo("메일 발송 실패");
        org.assertj.core.api.Assertions.assertThat(event.content())
                .isEqualTo("「주간 보고」 메일을 홍길동에게 보내지 못했습니다. 발신 이력에서 결과를 확인하고 다시 보낼 수 있습니다.")
                .doesNotContain("비밀 본문").doesNotContain("hong@example.com");
        org.assertj.core.api.Assertions.assertThat(event.linkUrl()).isEqualTo("/admin/collaboration/mail-history");
    }

    @Test
    @DisplayName("성공한 발송과 발신자를 모르는 발송은 알리지 않는다")
    void successOrUnknownSenderDoesNotNotify() throws Exception {
        SentMail mail = SentMail.builder().emlDsptchSn(1L).build();
        lenient().when(sentMailRepository.findById(1L)).thenReturn(Optional.of(mail));
        mailAsyncProcessor.dispatchCommitted(1L, QUEUED, "Sub", "Cn", "from", "to", "SENDER-1");

        var failing = new MailAsyncProcessor(new LoggingEmailSender(), sentMailRepository,
                new io.micrometer.core.instrument.simple.SimpleMeterRegistry(), eventPublisher);
        failing.setSelf(failing);
        failing.dispatchCommitted(1L, QUEUED, "Sub", "Cn", "from", "to", null);

        verifyNoInteractions(eventPublisher);
    }

    @Test
    @DisplayName("비동기 메일 발송 - 엔티티 없음")
    void processSending_NoEntity() throws Exception {
        given(sentMailRepository.claimQueued(1L, QUEUED)).willReturn(0);

        mailAsyncProcessor.dispatchCommitted(1L, QUEUED, "Sub", "Cn", "from", "to", null).join();

        verifyNoInteractions(emailSender);
        // No exception should occur
    }

    @Test
    void staleFailureResultDoesNotNotifyTheNewAttempt() {
        given(sentMailRepository.recordResult(1L, QUEUED, "F")).willReturn(0);
        var processor = new MailAsyncProcessor(new LoggingEmailSender(), sentMailRepository,
                new io.micrometer.core.instrument.simple.SimpleMeterRegistry(), eventPublisher);
        processor.setSelf(processor);
        processor.dispatchCommitted(1L, QUEUED, "Sub", "Cn", "from", "to", "SENDER-1").join();
        verifyNoInteractions(eventPublisher);
    }

    private org.assertj.core.api.AbstractAssert<?, ?> assertThat(Object actual) {
        return org.assertj.core.api.Assertions.assertThat(actual);
    }
}
