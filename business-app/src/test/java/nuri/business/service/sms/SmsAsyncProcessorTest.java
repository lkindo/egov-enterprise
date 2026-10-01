package nuri.business.service.sms;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import nuri.business.domain.sms.SmsRecptn;
import nuri.business.domain.sms.SmsRecptnId;
import nuri.business.domain.sms.SmsRecptnRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SmsAsyncProcessorTest {
    @Mock SmsSender sender;
    @Mock SmsRecptnRepository recipients;
    @Mock ApplicationEventPublisher events;
    private final SimpleMeterRegistry meters = new SimpleMeterRegistry();
    private SmsAsyncProcessor processor;
    private static final String PHONE = "01012345678";
    private static final long NOW = 1_800_000_000_000L;

    @BeforeEach void prepare() {
        processor = new SmsAsyncProcessor(sender, recipients, meters, events);
        processor.setSelf(processor);
        processor.setClock(Clock.fixed(Instant.ofEpochMilli(NOW), ZoneOffset.UTC));
    }

    private SmsRecptn row(long id, String phone, String result, String message) {
        SmsRecptn row = SmsRecptn.builder().smsTrsmSn(id).rcptnTelno(phone).rsltCd(result).rsltMsg(message).build();
        when(recipients.findByIdForUpdate(new SmsRecptnId(id, phone))).thenReturn(Optional.of(row));
        return row;
    }

    @Test void providerAcceptanceRemainsPendingUntilCompletedReceipt() {
        SmsRecptn row = row(1L, PHONE, "P", null);
        when(sender.send(PHONE, "private body", "0212345678")).thenReturn(SmsGatewayResult.accepted("request-1"));
        assertThat(processor.sendToRecipient(1L, PHONE, "0212345678", "private body"))
                .isEqualTo(SmsGatewayResult.State.PENDING);
        assertThat(row.getRsltCd()).isEqualTo("P");
        assertThat(SmsReceiptState.parse(row.getRsltMsg()).orElseThrow().requestId()).isEqualTo("request-1");
        verify(sender, never()).query(any(), any(), any());
        when(sender.query("request-1", null, PHONE)).thenReturn(SmsGatewayResult.delivered("request-1", "message-1"));
        String claim = processor.prepareReconciliation(1L, PHONE).orElseThrow();
        processor.reconcileRecipient(1L, PHONE, claim);
        assertThat(row.getRsltCd()).isEqualTo("S");
        verify(sender, times(1)).send(any(), any(), any());
        assertThat(meters.get("sms.dispatch.total").tag("result", "pending").counter().count()).isEqualTo(1);
    }

    @Test void claimIsWrittenBeforePostAndDuplicateWorkerCannotSendAgain() {
        SmsRecptn row = row(1L, PHONE, "P", null);
        when(sender.send(any(), any(), any())).thenAnswer(call -> {
            assertThat(SmsReceiptState.parse(row.getRsltMsg()).orElseThrow().stage()).isEqualTo(SmsReceiptState.Stage.CLAIMED);
            assertThat(processor.sendToRecipient(1L, PHONE, "0212345678", "body"))
                    .isEqualTo(SmsGatewayResult.State.PENDING);
            return SmsGatewayResult.accepted("request-1");
        });
        processor.sendToRecipient(1L, PHONE, "0212345678", "body");
        processor.sendToRecipient(1L, PHONE, "0212345678", "body");
        verify(sender, times(1)).send(any(), any(), any());
        assertThat(row.getRsltCd()).isEqualTo("P");
    }

    @Test void ambiguousPostExceptionRemainsUnknownAndIsNeverRetriedOrPolled() {
        SmsRecptn row = row(1L, PHONE, "P", null);
        when(sender.send(any(), any(), any())).thenThrow(new IllegalStateException("private body " + PHONE));
        processor.sendToRecipient(1L, PHONE, "0212345678", "body");
        processor.sendToRecipient(1L, PHONE, "0212345678", "body");
        assertThat(row.getRsltCd()).isEqualTo("P");
        assertThat(SmsReceiptState.parse(row.getRsltMsg()).orElseThrow().stage()).isEqualTo(SmsReceiptState.Stage.UNKNOWN);
        assertThat(processor.prepareReconciliation(1L, PHONE)).isEmpty();
        assertThat(row.getRsltMsg()).doesNotContain(PHONE, "private body");
        verify(sender, times(1)).send(any(), any(), any());
        verify(sender, never()).query(any(), any(), any());
    }

    @Test void postCannotReportDeliveryWithoutAReadReceipt() {
        SmsRecptn row = row(1L, PHONE, "P", null);
        when(sender.send(any(), any(), any())).thenReturn(SmsGatewayResult.delivered("request-1", "message-1"));
        processor.sendToRecipient(1L, PHONE, "0212345678", "body");
        assertThat(row.getRsltCd()).isEqualTo("P");
        assertThat(SmsReceiptState.parse(row.getRsltMsg()).orElseThrow().stage()).isEqualTo(SmsReceiptState.Stage.UNKNOWN);
    }

    @Test void definitiveRejectionRecordsFailureWithoutPostRetry() {
        SmsRecptn row = row(1L, PHONE, "P", null);
        when(sender.send(any(), any(), any())).thenReturn(SmsGatewayResult.rejected(SmsGatewayResult.Reason.PROVIDER_REJECTED));
        assertThat(processor.sendToRecipient(1L, PHONE, "0212345678", "body")).isEqualTo(SmsGatewayResult.State.REJECTED);
        assertThat(row.getRsltCd()).isEqualTo("F");
        processor.sendToRecipient(1L, PHONE, "0212345678", "body");
        verify(sender, times(1)).send(any(), any(), any());
    }

    @Test void lookupFailureKeepsReceiptAndOnlyGetCanBeRepeated() {
        SmsReceiptState initial = SmsReceiptState.claim(NOW).submitted(SmsGatewayResult.accepted("request-1"), NOW);
        SmsRecptn row = row(1L, PHONE, "P", initial.encode());
        when(sender.query("request-1", null, PHONE)).thenThrow(new IllegalStateException("provider raw secret"));
        processor.reconcileRecipient(1L, PHONE, processor.prepareReconciliation(1L, PHONE).orElseThrow());
        assertThat(row.getRsltCd()).isEqualTo("P");
        assertThat(SmsReceiptState.parse(row.getRsltMsg()).orElseThrow().requestId()).isEqualTo("request-1");
        assertThat(processor.prepareReconciliation(1L, PHONE)).isEmpty();
        processor.setClock(Clock.fixed(Instant.ofEpochMilli(NOW + 60_000), ZoneOffset.UTC));
        assertThat(processor.prepareReconciliation(1L, PHONE)).isEmpty();
        processor.setClock(Clock.fixed(Instant.ofEpochMilli(NOW + 90_000), ZoneOffset.UTC));
        doReturn(SmsGatewayResult.delivered("request-1", "message-1")).when(sender).query("request-1", null, PHONE);
        processor.reconcileRecipient(1L, PHONE, processor.prepareReconciliation(1L, PHONE).orElseThrow());
        assertThat(row.getRsltCd()).isEqualTo("S");
        verify(sender, times(2)).query("request-1", null, PHONE);
        verify(sender, never()).send(any(), any(), any());
    }

    @Test void oneDatabaseRowFailureDoesNotStopHealthyReceiptReconciliation() {
        SmsRecptn broken = SmsRecptn.builder().smsTrsmSn(1L).rcptnTelno(PHONE).rsltCd("P").build();
        SmsReceiptState state = SmsReceiptState.claim(NOW).submitted(SmsGatewayResult.accepted("request-2"), NOW);
        SmsRecptn healthy = row(2L, PHONE, "P", state.encode());
        when(recipients.findPendingDeliveryReceipts(anyString(), anyString(), any()))
                .thenReturn(List.of(broken, healthy));
        var spy = spy(processor);
        spy.setSelf(spy);
        doThrow(new org.springframework.dao.TransientDataAccessResourceException("private failure"))
                .when(spy).prepareReconciliation(1L, PHONE);
        when(sender.query("request-2", null, PHONE)).thenReturn(SmsGatewayResult.delivered("request-2", "message-2"));
        spy.reconcilePending().join();
        assertThat(healthy.getRsltCd()).isEqualTo("S");
        assertThat(broken.getRsltCd()).isEqualTo("P");
        verify(sender, never()).send(any(), any(), any());
    }

    @Test void mismatchedReceiptNeverPromotesAnotherRequestIntoSuccess() {
        SmsReceiptState initial = SmsReceiptState.claim(NOW).submitted(SmsGatewayResult.accepted("request-1"), NOW);
        SmsRecptn row = row(1L, PHONE, "P", initial.encode());
        when(sender.query("request-1", null, PHONE)).thenReturn(SmsGatewayResult.delivered("different-request", "message-1"));
        processor.reconcileRecipient(1L, PHONE, processor.prepareReconciliation(1L, PHONE).orElseThrow());
        assertThat(row.getRsltCd()).isEqualTo("P");
        assertThat(SmsReceiptState.parse(row.getRsltMsg()).orElseThrow().reason()).isEqualTo(SmsGatewayResult.Reason.LOOKUP_FAILED);
    }

    @Test void crashedClaimAndExpiredReceiptRequireManualReconciliation() {
        SmsRecptn crashed = row(1L, PHONE, "P", SmsReceiptState.claim(NOW - 120_000).encode());
        assertThat(processor.prepareReconciliation(1L, PHONE)).isEmpty();
        assertThat(SmsReceiptState.parse(crashed.getRsltMsg()).orElseThrow().stage()).isEqualTo(SmsReceiptState.Stage.UNKNOWN);
        SmsReceiptState accepted = SmsReceiptState.claim(NOW - 86_400_000)
                .submitted(SmsGatewayResult.accepted("request-1"), NOW);
        SmsRecptn expired = row(2L, PHONE, "P", accepted.encode());
        assertThat(processor.prepareReconciliation(2L, PHONE)).isEmpty();
        assertThat(expired.getRsltCd()).isEqualTo("P");
        assertThat(SmsReceiptState.display("P", expired.getRsltMsg())).contains("자동으로 다시 보내지 않습니다");
        verifyNoInteractions(sender);
    }

    @Test void exhaustedReadBudgetCannotResendOrClaimAnotherPoll() {
        SmsReceiptState state = new SmsReceiptState(SmsReceiptState.Stage.ACCEPTED, java.util.UUID.randomUUID().toString(),
                "request-1", "message-1", NOW, NOW, 48, SmsGatewayResult.Reason.LOOKUP_PENDING);
        SmsRecptn row = row(1L, PHONE, "P", state.encode());
        assertThat(processor.prepareReconciliation(1L, PHONE)).isEmpty();
        assertThat(SmsReceiptState.parse(row.getRsltMsg()).orElseThrow().reason()).isEqualTo(SmsGatewayResult.Reason.EXPIRED);
        verifyNoInteractions(sender);
    }

    @Test void lastAllowedGetLeaseSurvivesAnotherWorkerAndItsDeliveryResultIsRecorded() {
        SmsReceiptState state = new SmsReceiptState(SmsReceiptState.Stage.ACCEPTED, java.util.UUID.randomUUID().toString(),
                "request-1", "message-1", NOW, NOW, 47, SmsGatewayResult.Reason.LOOKUP_PENDING);
        SmsRecptn row = row(1L, PHONE, "P", state.encode());
        String lease = processor.prepareReconciliation(1L, PHONE).orElseThrow();
        assertThat(SmsReceiptState.parse(lease).orElseThrow().polls()).isEqualTo(48);

        assertThat(processor.prepareReconciliation(1L, PHONE)).isEmpty();
        assertThat(SmsReceiptState.parse(row.getRsltMsg()).orElseThrow().stage()).isEqualTo(SmsReceiptState.Stage.ACCEPTED);
        assertThat(row.getRsltMsg()).isEqualTo(lease);
        when(sender.query("request-1", "message-1", PHONE))
                .thenReturn(SmsGatewayResult.delivered("request-1", "message-1"));
        processor.reconcileRecipient(1L, PHONE, lease);

        assertThat(row.getRsltCd()).isEqualTo("S");
        assertThat(SmsReceiptState.parse(row.getRsltMsg()).orElseThrow().stage()).isEqualTo(SmsReceiptState.Stage.DELIVERED);
        verify(sender, times(1)).query("request-1", "message-1", PHONE);
        verify(sender, never()).send(any(), any(), any());
    }

    @Test void lastAllowedGetLeaseExpiresWithoutStartingA49thPollOrResending() {
        SmsReceiptState state = new SmsReceiptState(SmsReceiptState.Stage.ACCEPTED, java.util.UUID.randomUUID().toString(),
                "request-1", "message-1", NOW, NOW, 47, SmsGatewayResult.Reason.LOOKUP_PENDING);
        SmsRecptn row = row(1L, PHONE, "P", state.encode());
        String lease = processor.prepareReconciliation(1L, PHONE).orElseThrow();

        processor.setClock(Clock.fixed(Instant.ofEpochMilli(NOW + 299_999), ZoneOffset.UTC));
        assertThat(processor.prepareReconciliation(1L, PHONE)).isEmpty();
        assertThat(SmsReceiptState.parse(row.getRsltMsg()).orElseThrow().stage()).isEqualTo(SmsReceiptState.Stage.ACCEPTED);
        assertThat(row.getRsltMsg()).isEqualTo(lease);

        processor.setClock(Clock.fixed(Instant.ofEpochMilli(NOW + 300_000), ZoneOffset.UTC));
        assertThat(processor.prepareReconciliation(1L, PHONE)).isEmpty();
        SmsReceiptState expired = SmsReceiptState.parse(row.getRsltMsg()).orElseThrow();
        assertThat(row.getRsltCd()).isEqualTo("P");
        assertThat(expired.stage()).isEqualTo(SmsReceiptState.Stage.UNKNOWN);
        assertThat(expired.reason()).isEqualTo(SmsGatewayResult.Reason.EXPIRED);
        assertThat(expired.polls()).isEqualTo(48);
        verifyNoInteractions(sender);
    }

    @Test void receiptAgeDeadlineCannotReplaceAnInFlightGetLease() {
        SmsReceiptState state = SmsReceiptState.claim(NOW - 86_400_000 + 1)
                .submitted(SmsGatewayResult.accepted("request-1"), NOW);
        SmsRecptn row = row(1L, PHONE, "P", state.encode());
        String lease = processor.prepareReconciliation(1L, PHONE).orElseThrow();

        processor.setClock(Clock.fixed(Instant.ofEpochMilli(NOW + 1000), ZoneOffset.UTC));
        assertThat(processor.prepareReconciliation(1L, PHONE)).isEmpty();
        assertThat(SmsReceiptState.parse(row.getRsltMsg()).orElseThrow().stage()).isEqualTo(SmsReceiptState.Stage.ACCEPTED);
        assertThat(row.getRsltMsg()).isEqualTo(lease);
        when(sender.query("request-1", null, PHONE)).thenReturn(SmsGatewayResult.delivered("request-1", "message-1"));
        processor.reconcileRecipient(1L, PHONE, lease);

        assertThat(row.getRsltCd()).isEqualTo("S");
        verify(sender, times(1)).query("request-1", null, PHONE);
        verify(sender, never()).send(any(), any(), any());
    }

    @Test void resultCasPreservesTerminalAndNewAttemptAndDeletedRows() {
        SmsRecptn delivered = row(1L, PHONE, "S", "completed");
        processor.updateResult(1L, PHONE, "old-claim", "F", "late-failure");
        assertThat(delivered.getRsltCd()).isEqualTo("S");
        SmsRecptn replaced = row(2L, PHONE, "P", "new-claim");
        processor.updateResult(2L, PHONE, "old-claim", "S", "late-success");
        assertThat(replaced.getRsltMsg()).isEqualTo("new-claim");
        when(recipients.findByIdForUpdate(new SmsRecptnId(3L, PHONE))).thenReturn(Optional.empty());
        processor.updateResult(3L, PHONE, "old-claim", "S", "late-success");
        verify(recipients, never()).save(any());
        verifyNoInteractions(sender);
    }

    @Test void legacyCallbackStillFindsCanonicalAndLegacyStoredKeysUnderLock() {
        SmsRecptn canonical = row(1L, PHONE, "P", "expected");
        processor.updateResult(1L, "010-1234-5678", "expected", "S", "ok");
        assertThat(canonical.getRsltCd()).isEqualTo("S");
        verify(recipients, never()).findByIdForUpdate(new SmsRecptnId(1L, "010-1234-5678"));
        when(recipients.findByIdForUpdate(new SmsRecptnId(2L, PHONE))).thenReturn(Optional.empty());
        SmsRecptn legacy = row(2L, "010-1234-5678", "P", "expected");
        processor.updateResult(2L, "010-1234-5678", "expected", "S", "ok");
        assertThat(legacy.getRsltCd()).isEqualTo("S");
    }

    @Test void queueRejectionDoesNotFailAlreadyClaimedOrAcceptedRecipients() {
        SmsRecptn pending = row(1L, PHONE, "P", null);
        SmsRecptn accepted = row(1L, "01000000002", "P", SmsReceiptState.claim(NOW)
                .submitted(SmsGatewayResult.accepted("request-2"), NOW).encode());
        SmsRecptn claimed = row(1L, "01000000003", "P", SmsReceiptState.claim(NOW).encode());
        SmsRecptn delivered = row(1L, "01000000004", "S", "done");
        when(recipients.findRecipientNumbers(1L)).thenReturn(List.of(PHONE, "01000000002", "01000000003", "01000000004"));
        processor.markBatchRejected(1L);
        assertThat(pending.getRsltCd()).isEqualTo("F");
        assertThat(pending.getRsltMsg()).isEqualTo("Dispatch queue saturated");
        assertThat(List.of(accepted, claimed, delivered)).extracting(SmsRecptn::getRsltCd).containsExactly("P", "P", "S");
    }

    @Test void malformedAndImpossibleFutureReceiptsAreQuarantinedAndCannotStarveOtherRows() {
        SmsRecptn malformed = row(1L, PHONE, "P", SmsReceiptState.PREFIX + "ACCEPTED|private-corruption");
        assertThat(processor.prepareReconciliation(1L, PHONE)).isEmpty();
        assertThat(SmsReceiptState.parse(malformed.getRsltMsg()).orElseThrow().stage()).isEqualTo(SmsReceiptState.Stage.UNKNOWN);
        assertThat(malformed.getRsltMsg()).doesNotContain("private-corruption");
        SmsReceiptState future = SmsReceiptState.claim(NOW + 86_400_000)
                .submitted(SmsGatewayResult.accepted("request-future"), NOW + 86_400_000);
        SmsRecptn row = row(2L, PHONE, "P", future.encode());
        assertThat(processor.prepareReconciliation(2L, PHONE)).isEmpty();
        assertThat(SmsReceiptState.parse(row.getRsltMsg()).orElseThrow().stage()).isEqualTo(SmsReceiptState.Stage.UNKNOWN);
        verifyNoInteractions(sender);
    }

    @Test void onlyDefiniteFailureNotifiesSenderOnceWithoutPhoneOrBody() {
        SmsRecptn accepted = row(1L, PHONE, "P", null);
        SmsRecptn rejected = row(1L, "01000000002", "P", null);
        when(recipients.findByIdSmsTrsmSn(1L)).thenReturn(List.of(accepted, rejected));
        when(sender.send(eq(PHONE), any(), any())).thenReturn(SmsGatewayResult.accepted("request-1"));
        when(sender.send(eq("01000000002"), any(), any())).thenReturn(SmsGatewayResult.rejected(SmsGatewayResult.Reason.PROVIDER_REJECTED));
        processor.processSending(1L, "0212345678", "private body", "SENDER-1");
        var captor = org.mockito.ArgumentCaptor.forClass(nuri.foundation.core.event.NotificationRequestedEvent.class);
        verify(events).publishEvent(captor.capture());
        assertThat(captor.getValue().content()).contains("2건 중 1건").doesNotContain(PHONE, "01000000002", "private body");
        assertThat(captor.getValue().linkUrl()).isEqualTo(SmsAsyncProcessor.SMS_ADMIN_PATH);
    }

    @Test void pendingUnknownAndUnknownSenderDoNotProduceFalseFailureNotices() {
        SmsRecptn row = row(1L, PHONE, "P", null);
        when(recipients.findByIdSmsTrsmSn(1L)).thenReturn(List.of(row));
        when(sender.send(any(), any(), any())).thenReturn(SmsGatewayResult.accepted("request-1"));
        processor.processSending(1L, "0212345678", "body", "SENDER-1");
        row.updateResult("P", null);
        when(sender.send(any(), any(), any())).thenReturn(SmsGatewayResult.unknown(SmsGatewayResult.Reason.UNCONFIRMED));
        processor.processSending(1L, "0212345678", "body", "SENDER-1");
        row.updateResult("P", null);
        when(sender.send(any(), any(), any())).thenReturn(SmsGatewayResult.rejected(SmsGatewayResult.Reason.PROVIDER_REJECTED));
        processor.processSending(1L, "0212345678", "body");
        verifyNoInteractions(events);
    }
}
