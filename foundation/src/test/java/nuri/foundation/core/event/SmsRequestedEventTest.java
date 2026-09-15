package nuri.foundation.core.event;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SmsRequestedEvent 단위 테스트")
class SmsRequestedEventTest {

    private static SmsRequestedEvent event(String recipient) {
        return new SmsRequestedEvent("SANCTIONER_001", recipient, "결재(번호 7)가 승인되었습니다.");
    }

    /**
     * 발신 번호는 이 이벤트에 없다 — 업무 사실이 아니라 배포 설정({@code nuri.notification.sender.tel})이고
     * sms 도메인이 소유한다. 이 단언은 그 경계가 다시 흐려지지 않게 요청 payload 를 못 박는다.
     */
    @Test
    @DisplayName("문자 요청이 요청자·수신 번호·본문을 손실 없이 보존한다")
    void preservesRequestPayload() {
        SmsRequestedEvent request = event("01011112222");

        assertThat(request.requesterId()).isEqualTo("SANCTIONER_001");
        assertThat(request.recipientTelno()).isEqualTo("01011112222");
        assertThat(request.content()).isEqualTo("결재(번호 7)가 승인되었습니다.");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "   ", "\t"})
    @DisplayName("수신 번호가 없거나 공백이면 문자를 만들 수 없다")
    void rejectsBlankRecipient(String recipient) {
        assertThat(event(recipient).hasRecipient()).isFalse();
    }

    @Test
    @DisplayName("수신 번호가 있으면 문자를 만들 수 있다")
    void acceptsPresentRecipient() {
        assertThat(event("01011112222").hasRecipient()).isTrue();
    }
}
