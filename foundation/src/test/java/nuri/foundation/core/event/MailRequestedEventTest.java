package nuri.foundation.core.event;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("MailRequestedEvent 단위 테스트")
class MailRequestedEventTest {

    private static MailRequestedEvent event(String recipient) {
        return new MailRequestedEvent(
                "SANCTIONER_001", recipient, "[eGov] 결재 상태 변경 알림", "결재(번호 7)가 승인되었습니다.");
    }

    @Test
    @DisplayName("메일 요청이 요청자·수신 주소·제목·본문을 손실 없이 보존한다")
    void preservesRequestPayload() {
        MailRequestedEvent request = event("hong@egov.com");

        assertThat(request.requesterId()).isEqualTo("SANCTIONER_001");
        assertThat(request.recipientAddress()).isEqualTo("hong@egov.com");
        assertThat(request.subject()).isEqualTo("[eGov] 결재 상태 변경 알림");
        assertThat(request.content()).isEqualTo("결재(번호 7)가 승인되었습니다.");
    }

    /**
     * 수신 주소 없는 발송은 보낼 곳이 없는 이력만 남긴다. 발행 측이 연락처가 없으면 발행하지 않지만,
     * 소비 측도 같은 판정을 한 번 더 한다 — 발행자가 늘어날 때 그 규칙을 각자 다시 구현하지 않게 하기 위해서다.
     */
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "   ", "\t"})
    @DisplayName("수신 주소가 없거나 공백이면 메일을 만들 수 없다")
    void rejectsBlankRecipient(String recipient) {
        assertThat(event(recipient).hasRecipient()).isFalse();
    }

    @Test
    @DisplayName("수신 주소가 있으면 메일을 만들 수 있다")
    void acceptsPresentRecipient() {
        assertThat(event("hong@egov.com").hasRecipient()).isTrue();
    }
}
