package nuri.business.service.sms.listener;

import nuri.business.service.sms.SmsService;
import nuri.business.service.sms.dto.SmsDto;
import nuri.foundation.core.event.SmsRequestedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SmsRequestListener 단위 테스트")
class SmsRequestListenerTest {

    private static final String SENDER_TEL = "0212340000";

    @Mock
    private SmsService smsService;

    @Test
    @DisplayName("설정된 발신 번호로 요청된 본문을 보내고 요청자를 보존한다")
    void sendsRequestedSms() {
        SmsRequestListener listener = new SmsRequestListener(smsService, SENDER_TEL);

        listener.onSmsRequested(new SmsRequestedEvent(
                "SANCTIONER_001", "01011112222", "결재(번호 1)가 승인되었습니다."));

        ArgumentCaptor<SmsDto> captor = ArgumentCaptor.forClass(SmsDto.class);
        verify(smsService).sendSms(eq("SANCTIONER_001"), captor.capture());
        // 발신 번호는 설정값이다 — 코드에 박힌 대표번호가 아니다.
        assertThat(captor.getValue().getSndngTelno()).isEqualTo(SENDER_TEL);
        assertThat(captor.getValue().getSndngCn()).isEqualTo("결재(번호 1)가 승인되었습니다.");
        assertThat(captor.getValue().getRecipients()).singleElement()
                .extracting(recipient -> recipient.getRcptnTelno())
                .isEqualTo("01011112222");
    }

    /**
     * 종전에는 이 판정이 {@code SanctionEventListener} 안에 있어 결재에서 나가는 문자에만 걸렸다.
     * sms 도메인으로 옮긴 뒤에는 모든 문자 요청이 같은 규칙을 따른다.
     */
    @Test
    @DisplayName("발신 번호가 설정되지 않으면 문자를 건너뛴다")
    void skipsWhenSenderTelIsNotConfigured() {
        new SmsRequestListener(smsService, " ")
                .onSmsRequested(new SmsRequestedEvent("SANCTIONER_001", "01011112222", "본문"));
        new SmsRequestListener(smsService, null)
                .onSmsRequested(new SmsRequestedEvent("SANCTIONER_001", "01011112222", "본문"));

        verify(smsService, never()).sendSms(anyString(), any());
    }

    @Test
    @DisplayName("수신 번호가 없으면 발송하지 않는다")
    void skipsWhenRecipientIsMissing() {
        SmsRequestListener listener = new SmsRequestListener(smsService, SENDER_TEL);

        listener.onSmsRequested(new SmsRequestedEvent("SANCTIONER_001", "  ", "본문"));
        listener.onSmsRequested(new SmsRequestedEvent("SANCTIONER_001", null, "본문"));

        verify(smsService, never()).sendSms(anyString(), any());
    }

    @Test
    @DisplayName("발송 실패가 발행 측으로 전파되지 않는다")
    void absorbsSendFailure() {
        SmsRequestListener listener = new SmsRequestListener(smsService, SENDER_TEL);
        doThrow(new IllegalStateException("gateway down"))
                .when(smsService).sendSms(anyString(), any(SmsDto.class));

        assertThatCode(() -> listener.onSmsRequested(
                new SmsRequestedEvent("SANCTIONER_001", "01011112222", "본문")))
                .doesNotThrowAnyException();
    }
}
