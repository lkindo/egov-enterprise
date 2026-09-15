package nuri.business.service.mail.listener;

import nuri.business.service.mail.MailService;
import nuri.business.service.mail.dto.SentMailDto;
import nuri.foundation.core.event.MailRequestedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MailRequestListener 단위 테스트")
class MailRequestListenerTest {

    @Mock
    private MailService mailService;

    @InjectMocks
    private MailRequestListener listener;

    @Test
    @DisplayName("요청된 제목·본문·수신 주소를 그대로 발송에 싣고 요청자를 보존한다")
    void sendsRequestedMail() {
        listener.onMailRequested(new MailRequestedEvent(
                "SANCTIONER_001", "hong@egov.com", "[eGov] 결재 상태 변경 알림", "결재(번호 1)가 승인되었습니다."));

        ArgumentCaptor<SentMailDto> captor = ArgumentCaptor.forClass(SentMailDto.class);
        verify(mailService).sendMail(eq("SANCTIONER_001"), captor.capture());
        assertThat(captor.getValue().getSj()).isEqualTo("[eGov] 결재 상태 변경 알림");
        assertThat(captor.getValue().getEmailCn()).isEqualTo("결재(번호 1)가 승인되었습니다.");
        assertThat(captor.getValue().getRecptnPerson()).isEqualTo("hong@egov.com");
        // SMTP From 은 MailService 가 설정(nuri.mail.from)에서 정한다 — 리스너가 주소를 지어내지 않는다.
        assertThat(captor.getValue().getDsptchPerson()).isNull();
    }

    @Test
    @DisplayName("수신 주소가 없으면 발송하지 않는다")
    void skipsWhenRecipientIsMissing() {
        listener.onMailRequested(new MailRequestedEvent("SANCTIONER_001", "  ", "제목", "본문"));
        listener.onMailRequested(new MailRequestedEvent("SANCTIONER_001", null, "제목", "본문"));

        verify(mailService, never()).sendMail(anyString(), any());
    }

    @Test
    @DisplayName("발송 실패가 발행 측으로 전파되지 않는다")
    void absorbsSendFailure() {
        doThrow(new IllegalStateException("smtp down"))
                .when(mailService).sendMail(anyString(), any(SentMailDto.class));

        // 원 업무(결재 승인)는 이미 커밋됐다. 메일 실패로 그것을 되돌릴 수 없고 되돌려서도 안 된다.
        assertThatCode(() -> listener.onMailRequested(
                new MailRequestedEvent("SANCTIONER_001", "hong@egov.com", "제목", "본문")))
                .doesNotThrowAnyException();
    }
}
