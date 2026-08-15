package nuri.business.service.sms;

import nuri.business.domain.sms.SmsRecptn;
import nuri.business.domain.sms.SmsRecptnId;
import nuri.business.domain.sms.SmsRecptnRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SmsAsyncProcessor 단위 테스트")
class SmsAsyncProcessorTest {

    @InjectMocks
    private SmsAsyncProcessor smsAsyncProcessor;

    @Mock
    private SmsSender smsSender;

    @Mock
    private SmsRecptnRepository smsRecptnRepository;

    @Mock
    private io.micrometer.core.instrument.MeterRegistry meterRegistry;

    @BeforeEach
    void setUp() {
        smsAsyncProcessor.setSelf(smsAsyncProcessor);
        lenient().when(meterRegistry.counter(anyString(), any(String[].class)))
            .thenReturn(mock(io.micrometer.core.instrument.Counter.class));
    }

    @Test
    @DisplayName("비동기 SMS 발송 - 성공 (결과 기록은 키 기반 짧은 트랜잭션 경유)")
    void processSending_Success() {
        SmsRecptn recptn = SmsRecptn.builder().smsTrsmSn(1L).rcptnTelno("0101").build();
        given(smsRecptnRepository.findByIdSmsTrsmSn(1L)).willReturn(List.of(recptn));
        given(smsRecptnRepository.findById(new SmsRecptnId(1L, "0101"))).willReturn(Optional.of(recptn));
        given(smsSender.send(anyString(), anyString(), anyString())).willReturn(true);

        smsAsyncProcessor.processSending(1L, "0102", "Hello");

        assertThat(recptn.getRsltCd()).isEqualTo("S");
    }

    @Test
    @DisplayName("비동기 SMS 발송 - 발송 실패")
    void processSending_SenderFailure() {
        SmsRecptn recptn = SmsRecptn.builder().smsTrsmSn(1L).rcptnTelno("0101").build();
        given(smsRecptnRepository.findByIdSmsTrsmSn(1L)).willReturn(List.of(recptn));
        given(smsRecptnRepository.findById(new SmsRecptnId(1L, "0101"))).willReturn(Optional.of(recptn));
        given(smsSender.send(anyString(), anyString(), anyString())).willReturn(false);

        smsAsyncProcessor.processSending(1L, "0102", "Hello");

        // Unit test에서는 @Recover가 자동 실행되지 않으므로 수동 호출하여 로직 검증
        smsAsyncProcessor.recoverSmsSending(new RuntimeException("Failure"), 1L, "0101", "0102", "Hello");
        assertThat(recptn.getRsltCd()).isEqualTo("F");
        assertThat(recptn.getRsltMsg()).isEqualTo("Gateway delivery failed");
        assertThat(recptn.getRsltMsg()).doesNotContain("Failure");
    }

    @Test
    @DisplayName("비동기 SMS 발송 - 예외 발생")
    void processSending_Exception() {
        SmsRecptn recptn = SmsRecptn.builder().smsTrsmSn(1L).rcptnTelno("0101").build();
        given(smsRecptnRepository.findByIdSmsTrsmSn(1L)).willReturn(List.of(recptn));
        given(smsRecptnRepository.findById(new SmsRecptnId(1L, "0101"))).willReturn(Optional.of(recptn));
        doThrow(new RuntimeException("Error")).when(smsSender).send(anyString(), anyString(), anyString());

        smsAsyncProcessor.processSending(1L, "0102", "Hello");

        // @Recover 수동 호출 검증
        smsAsyncProcessor.recoverSmsSending(new RuntimeException("Error"), 1L, "0101", "0102", "Hello");
        assertThat(recptn.getRsltCd()).isEqualTo("F");
    }

    @Test
    @DisplayName("결과 기록 - 대상 수신자 부재 시 무예외 no-op")
    void updateResult_NoEntity() {
        given(smsRecptnRepository.findById(new SmsRecptnId(9L, "0109"))).willReturn(Optional.empty());

        smsAsyncProcessor.updateResult(9L, "0109", "S", "Success");
        // 예외 없이 종료되어야 한다
    }

    @Test
    @DisplayName("큐 제출 거부는 아직 대기 중인 수신자만 실패로 전환")
    void markBatchRejected_onlyPendingRecipients() {
        SmsRecptn pending = SmsRecptn.builder().smsTrsmSn(1L).rcptnTelno("0101").rsltCd("P").build();
        SmsRecptn delivered = SmsRecptn.builder().smsTrsmSn(1L).rcptnTelno("0102").rsltCd("S").build();
        given(smsRecptnRepository.findByIdSmsTrsmSn(1L)).willReturn(List.of(pending, delivered));

        smsAsyncProcessor.markBatchRejected(1L);

        assertThat(pending.getRsltCd()).isEqualTo("F");
        assertThat(pending.getRsltMsg()).isEqualTo("Dispatch queue saturated");
        assertThat(delivered.getRsltCd()).isEqualTo("S");
    }
}
