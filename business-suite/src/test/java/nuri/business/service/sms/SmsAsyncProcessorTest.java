package nuri.business.service.sms;

import nuri.business.domain.sms.SmsRecptn;
import nuri.business.domain.sms.SmsRecptnRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

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
    @DisplayName("비동기 SMS 발송 - 성공")
    void processSending_Success() {
        SmsRecptn recptn = SmsRecptn.builder().smsId("S1").rcptnTelno("0101").build();
        given(smsRecptnRepository.findByIdSmsId("S1")).willReturn(List.of(recptn));
        given(smsSender.send(anyString(), anyString(), anyString())).willReturn(true);

        smsAsyncProcessor.processSending("S1", "0102", "Hello");

        assertThat(recptn.getRsltCd()).isEqualTo("S");
    }

    @Test
    @DisplayName("비동기 SMS 발송 - 발송 실패")
    void processSending_SenderFailure() {
        SmsRecptn recptn = SmsRecptn.builder().smsId("S1").rcptnTelno("0101").build();
        given(smsRecptnRepository.findByIdSmsId("S1")).willReturn(List.of(recptn));
        given(smsSender.send(anyString(), anyString(), anyString())).willReturn(false);

        smsAsyncProcessor.processSending("S1", "0102", "Hello");

        // Unit test에서는 @Recover가 자동 실행되지 않으므로 수동 호출하여 로직 검증
        smsAsyncProcessor.recoverSmsSending(new RuntimeException("Failure"), recptn, "0102", "Hello");
        assertThat(recptn.getRsltCd()).isEqualTo("F");
    }

    @Test
    @DisplayName("비동기 SMS 발송 - 예외 발생")
    void processSending_Exception() {
        SmsRecptn recptn = SmsRecptn.builder().smsId("S1").rcptnTelno("0101").build();
        given(smsRecptnRepository.findByIdSmsId("S1")).willReturn(List.of(recptn));
        doThrow(new RuntimeException("Error")).when(smsSender).send(anyString(), anyString(), anyString());

        smsAsyncProcessor.processSending("S1", "0102", "Hello");

        // @Recover 수동 호출 검증
        smsAsyncProcessor.recoverSmsSending(new RuntimeException("Error"), recptn, "0102", "Hello");
        assertThat(recptn.getRsltCd()).isEqualTo("F");
    }
}
