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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
    @DisplayName("비동기 메일 발송 - 연결 실패는 재시도 대상 예외로 올린다")
    void processSending_ConnectionFailureIsRetryable() throws Exception {
        doThrow(new org.springframework.mail.MailSendException("Mail server connection failed",
                new java.net.ConnectException("Connection refused")))
                .when(emailSender).send(anyString(), anyString(), anyString(), anyString());

        // 프록시 없는 단위 시험에서는 재시도 대상 예외가 그대로 올라온다(재시도 횟수는 실제 프록시 통합 시험이 본다).
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
            mailAsyncProcessor.dispatchCommitted(1L, QUEUED, "Sub", "Cn", "from", "to", null)
        ).isInstanceOf(MailAsyncProcessor.MailNotTransmittedException.class);

        // 발송 복구는 실패 결과만 반환한다. F 기록은 실제 프록시 통합 테스트에서 검증한다.
        org.assertj.core.api.Assertions.assertThat(mailAsyncProcessor.recoverSending(
                new RuntimeException("Send error"), 1L, "Sub", "Cn", "from", "to")).isFalse();
        verify(sentMailRepository, never()).recordResult(anyLong(), any(), anyString());
    }

    /**
     * [2026-11-19] 결과를 알 수 없는 실패는 다시 보내지 않는다 — 서버가 본문을 받은 뒤 끊겼을 수 있어, 다시 보내면 받는 사람이 같은
     * 메일을 두 번 받는다. 예외를 올리지 않고 실패(F)로 기록한다.
     */
    @Test
    @DisplayName("비동기 메일 발송 - 결과를 알 수 없는 실패는 재시도하지 않고 실패로 기록한다")
    void processSending_UnconfirmedFailureIsRecordedWithoutRetry() throws Exception {
        doThrow(new org.springframework.mail.MailSendException("Failed to close server connection after message sending",
                new jakarta.mail.MessagingException("connection reset")))
                .when(emailSender).send(anyString(), anyString(), anyString(), anyString());
        lenient().when(sentMailRepository.findById(1L)).thenReturn(Optional.of(SentMail.builder().emlDsptchSn(1L).build()));

        mailAsyncProcessor.dispatchCommitted(1L, QUEUED, "Sub", "Cn", "from", "to", null);

        verify(emailSender, times(1)).send(anyString(), anyString(), anyString(), anyString());
        verify(sentMailRepository).recordResult(1L, QUEUED, "F");
    }

    @Test
    @DisplayName("연결 단계 실패만 보내기 전 실패로 본다 — 시간 초과·인증·전송 중 오류는 아니다")
    void failedBeforeTransmissionRecognizesOnlyConnectionPhaseFailures() throws Exception {
        org.assertj.core.api.Assertions.assertThat(MailAsyncProcessor.failedBeforeTransmission(
                new org.springframework.mail.MailSendException("Mail server connection failed",
                        new jakarta.mail.MessagingException("Couldn't connect to host",
                                new java.net.ConnectException("Connection refused"))))).isTrue();
        org.assertj.core.api.Assertions.assertThat(MailAsyncProcessor.failedBeforeTransmission(
                new jakarta.mail.MessagingException("Unknown SMTP host", new java.net.UnknownHostException("smtp")))).isTrue();
        // 연결 시도의 시간 초과는 Angus 가 MailConnectException 으로 감싼다 — 본문 전이라 다시 보낸다(Codex 검토).
        //   실제 런타임 클래스를 만든다 — 판정은 이름으로 보므로, 구현이 이름을 바꾸면 여기서 붉어진다.
        Class<?> socketFailure = Class.forName("org.eclipse.angus.mail.util.SocketConnectException");
        Object socket = socketFailure.getConstructor(String.class, Exception.class, String.class, int.class, int.class)
                .newInstance("connect timed out", new java.net.SocketTimeoutException("connect timed out"), "smtp", 25, 5000);
        Throwable connectFailure = (Throwable) Class.forName(MailAsyncProcessor.ANGUS_MAIL_CONNECT_EXCEPTION)
                .getConstructor(socketFailure).newInstance(socket);
        org.assertj.core.api.Assertions.assertThat(MailAsyncProcessor.failedBeforeTransmission(
                new org.springframework.mail.MailSendException("Mail server connection failed", connectFailure))).isTrue();
        // 연결 단계라는 표지가 없는 시간 초과(읽기 등)는 본문 뒤에도 나므로 다시 보내지 않는다.
        org.assertj.core.api.Assertions.assertThat(MailAsyncProcessor.failedBeforeTransmission(
                new jakarta.mail.MessagingException("read timeout", new java.net.SocketTimeoutException("Read timed out")))).isFalse();
        org.assertj.core.api.Assertions.assertThat(MailAsyncProcessor.failedBeforeTransmission(
                new org.springframework.mail.MailAuthenticationException("bad credentials"))).isFalse();
        org.assertj.core.api.Assertions.assertThat(MailAsyncProcessor.failedBeforeTransmission(
                new IllegalStateException("발신 메일 주소가 비어 있습니다."))).isFalse();
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

    @Test
    void failureEventIdentityUsesTheIntentAttemptIncludingNanoseconds() {
        var intentTime = QUEUED.withNano(123456789);
        SentMail mail = SentMail.builder().emlDsptchSn(1L).emlTtl("subject").rcvrNm("recipient").build();
        mail.queueAt(intentTime.truncatedTo(java.time.temporal.ChronoUnit.MICROS));
        when(sentMailRepository.findById(1L)).thenReturn(Optional.of(mail));
        when(sentMailRepository.recordResult(eq(1L), any(java.time.LocalDateTime.class), eq("F"))).thenReturn(1);

        mailAsyncProcessor.markResult(1L, intentTime, "F", "SENDER-1");
        mailAsyncProcessor.markResult(1L, intentTime, "F", "SENDER-1");
        mailAsyncProcessor.markResult(1L, intentTime.plusNanos(1), "F", "SENDER-1");

        var captor = org.mockito.ArgumentCaptor.forClass(nuri.foundation.core.event.NotificationRequestedEvent.class);
        verify(eventPublisher, times(3)).publishEvent(captor.capture());
        var published = captor.getAllValues();
        assertThat(published.get(0).eventId()).isEqualTo(published.get(1).eventId());
        assertThat(published.get(2).eventId()).isNotEqualTo(published.get(0).eventId());
        verifyNoInteractions(emailSender);
    }

    @Test
    void noticeExceptionEscapesTheResultTransactionForRecordingRecovery() {
        SentMail mail = SentMail.builder().emlDsptchSn(1L).emlTtl("subject").build();
        when(sentMailRepository.findById(1L)).thenReturn(Optional.of(mail));
        var failure = new IllegalStateException("synthetic notification failure");
        doThrow(failure).when(eventPublisher).publishEvent(any(Object.class));

        assertThatThrownBy(() -> mailAsyncProcessor.markResult(1L, QUEUED, "F", "SENDER-1"))
                .isSameAs(failure);
        verifyNoInteractions(emailSender);
    }

    @Test
    void exhaustedFailureRecordingPreservesFailureAndCountsOnlyTheLostNotice() {
        var registry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();
        var processor = new MailAsyncProcessor(emailSender, sentMailRepository, registry, eventPublisher);
        processor.setSelf(processor);

        assertThat(processor.recoverRecording(new IllegalStateException("synthetic notice failure"),
                1L, QUEUED, "F", "SENDER-1")).isTrue();

        verify(sentMailRepository, times(1)).recordResult(1L, QUEUED, "F");
        assertThat(registry.get("mail.dispatch.recording.failures").counter().count()).isEqualTo(1);
        assertThat(registry.get("mail.dispatch.failure.notices.lost").counter().count()).isEqualTo(1);
        verifyNoInteractions(eventPublisher, emailSender);
    }

    @Test
    void fallbackCasZeroDoesNotClaimThatANoticeWasLost() {
        var registry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();
        var processor = new MailAsyncProcessor(emailSender, sentMailRepository, registry, eventPublisher);
        processor.setSelf(processor);
        when(sentMailRepository.recordResult(1L, QUEUED, "F")).thenReturn(0);

        assertThat(processor.recoverRecording(new IllegalStateException("synthetic recording failure"),
                1L, QUEUED, "F", "SENDER-1")).isFalse();

        verify(sentMailRepository, times(1)).recordResult(1L, QUEUED, "F");
        assertThat(registry.get("mail.dispatch.recording.failures").counter().count()).isEqualTo(1);
        assertThat(registry.find("mail.dispatch.failure.notices.lost").counter()).isNull();
        verifyNoInteractions(eventPublisher, emailSender);
    }

    @Test
    void failedResultOnlyFallbackKeepsTheUnknownBoundaryWithoutMoreRetries() {
        var registry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();
        var processor = new MailAsyncProcessor(emailSender, sentMailRepository, registry, eventPublisher);
        processor.setSelf(processor);
        when(sentMailRepository.recordResult(1L, QUEUED, "F"))
                .thenThrow(new org.springframework.dao.TransientDataAccessResourceException("synthetic database outage"));

        assertThat(processor.recoverRecording(new IllegalStateException("synthetic notice failure"),
                1L, QUEUED, "F", "SENDER-1")).isFalse();

        verify(sentMailRepository, times(1)).recordResult(1L, QUEUED, "F");
        assertThat(registry.get("mail.dispatch.recording.failures").counter().count()).isEqualTo(1);
        assertThat(registry.find("mail.dispatch.failure.notices.lost").counter()).isNull();
        verifyNoInteractions(eventPublisher, emailSender);
    }

    @Test
    void exhaustedSuccessRecordingDoesNotUseTheFailureFallback() {
        var registry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();
        var processor = new MailAsyncProcessor(emailSender, sentMailRepository, registry, eventPublisher);
        processor.setSelf(processor);

        assertThat(processor.recoverRecording(new IllegalStateException("synthetic recording failure"),
                1L, QUEUED, "S", "SENDER-1")).isFalse();

        verifyNoInteractions(sentMailRepository, eventPublisher, emailSender);
        assertThat(registry.get("mail.dispatch.recording.failures").counter().count()).isEqualTo(1);
        assertThat(registry.find("mail.dispatch.failure.notices.lost").counter()).isNull();
    }

    @Test
    void unknownOrBlankSenderDoesNotCountAnExpectedNoticeAsLost() {
        var registry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();
        var processor = new MailAsyncProcessor(emailSender, sentMailRepository, registry, eventPublisher);
        processor.setSelf(processor);

        assertThat(processor.recoverRecording(new IllegalStateException("synthetic recording failure"),
                1L, QUEUED, "F", null)).isTrue();
        assertThat(processor.recoverRecording(new IllegalStateException("synthetic recording failure"),
                1L, QUEUED, "F", "  ")).isTrue();

        verify(sentMailRepository, times(2)).recordResult(1L, QUEUED, "F");
        assertThat(registry.get("mail.dispatch.recording.failures").counter().count()).isEqualTo(2);
        assertThat(registry.find("mail.dispatch.failure.notices.lost").counter()).isNull();
        verifyNoInteractions(eventPublisher, emailSender);
    }
}
