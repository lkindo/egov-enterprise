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

    @BeforeEach
    void setUp() {
        mailAsyncProcessor.setSelf(mailAsyncProcessor);
        lenient().when(meterRegistry.counter(anyString(), any(String[].class)))
            .thenReturn(mock(io.micrometer.core.instrument.Counter.class));
    }

    @Test
    @DisplayName("비동기 메일 발송 - 성공")
    void processSending_Success() throws Exception {
        SentMail mail = SentMail.builder().emlDsptchSn(1L).build();
        given(sentMailRepository.findById(1L)).willReturn(Optional.of(mail));

        mailAsyncProcessor.processSending(1L, "Sub", "Cn", "from", "to");

        verify(emailSender).send(anyString(), anyString(), anyString(), anyString());
        assertThat(mail.getDsptchRsltCd()).isEqualTo("S");
    }

    @Test
    @DisplayName("비동기 메일 발송 - 실패 (예외 발생)")
    void processSending_Failure() throws Exception {
        doThrow(new RuntimeException("Send error")).when(emailSender).send(anyString(), anyString(), anyString(), anyString());

        // Exception is expected to bubble up in unit test
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> 
            mailAsyncProcessor.processSending(1L, "Sub", "Cn", "from", "to")
        ).isInstanceOf(RuntimeException.class);

        // 발송 복구는 실패 결과만 반환한다. F 기록은 실제 프록시 통합 테스트에서 검증한다.
        org.assertj.core.api.Assertions.assertThat(mailAsyncProcessor.recoverSending(
                new RuntimeException("Send error"), 1L, "Sub", "Cn", "from", "to")).isFalse();
        verifyNoInteractions(sentMailRepository);
    }

    @Test
    @DisplayName("비동기 메일 발송 - 엔티티 없음")
    void processSending_NoEntity() throws Exception {
        given(sentMailRepository.findById(1L)).willReturn(Optional.empty());

        mailAsyncProcessor.processSending(1L, "Sub", "Cn", "from", "to");

        verify(emailSender).send(anyString(), anyString(), anyString(), anyString());
        // No exception should occur
    }

    private org.assertj.core.api.AbstractAssert<?, ?> assertThat(Object actual) {
        return org.assertj.core.api.Assertions.assertThat(actual);
    }
}
