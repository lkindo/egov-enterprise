package nuri.business.service.mail;

import nuri.business.domain.mail.SentMail;
import nuri.business.domain.mail.SentMailRepository;
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

    @Test
    @DisplayName("비동기 메일 발송 - 성공")
    void processSending_Success() throws Exception {
        SentMail mail = SentMail.builder().mssageId("M1").build();
        given(sentMailRepository.findById("M1")).willReturn(Optional.of(mail));

        mailAsyncProcessor.processSending("M1", "Sub", "Cn", "from", "to");

        verify(emailSender).send(anyString(), anyString(), anyString(), anyString());
        assertThat(mail.getSndngResultCode()).isEqualTo("S");
    }

    @Test
    @DisplayName("비동기 메일 발송 - 실패 (예외 발생)")
    void processSending_Failure() throws Exception {
        SentMail mail = SentMail.builder().mssageId("M1").build();
        given(sentMailRepository.findById("M1")).willReturn(Optional.of(mail));
        doThrow(new RuntimeException("Send error")).when(emailSender).send(anyString(), anyString(), anyString(), anyString());

        mailAsyncProcessor.processSending("M1", "Sub", "Cn", "from", "to");

        assertThat(mail.getSndngResultCode()).isEqualTo("F");
    }

    @Test
    @DisplayName("비동기 메일 발송 - 엔티티 없음")
    void processSending_NoEntity() throws Exception {
        given(sentMailRepository.findById("M1")).willReturn(Optional.empty());

        mailAsyncProcessor.processSending("M1", "Sub", "Cn", "from", "to");

        verify(emailSender).send(anyString(), anyString(), anyString(), anyString());
        // No exception should occur
    }

    private org.assertj.core.api.AbstractAssert<?, ?> assertThat(Object actual) {
        return org.assertj.core.api.Assertions.assertThat(actual);
    }
}
