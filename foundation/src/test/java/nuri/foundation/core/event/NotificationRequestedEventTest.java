package nuri.foundation.core.event;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("NotificationRequestedEvent 단위 테스트")
class NotificationRequestedEventTest {

    private static NotificationRequestedEvent event(String receiver) {
        return new NotificationRequestedEvent(receiver, "결재 상태 변경", "결재(ID:7)가 승인 되었습니다.", "/approvals");
    }

    @Test
    @DisplayName("알림 요청이 수신자·제목·본문·링크를 손실 없이 보존한다")
    void preservesRequestPayload() {
        NotificationRequestedEvent request = event("USRCNFRM_0001");

        assertThat(request.receiverEsntlId()).isEqualTo("USRCNFRM_0001");
        assertThat(request.title()).isEqualTo("결재 상태 변경");
        assertThat(request.content()).isEqualTo("결재(ID:7)가 승인 되었습니다.");
        assertThat(request.linkUrl()).isEqualTo("/approvals");
    }

    @Test
    @DisplayName("링크가 없는 알림도 유효하다 — 모든 사건이 갈 곳을 갖지는 않는다")
    void allowsMissingLink() {
        NotificationRequestedEvent withoutLink =
                new NotificationRequestedEvent("USRCNFRM_0001", "제목", "본문", null);

        assertThat(withoutLink.linkUrl()).isNull();
        assertThat(withoutLink.hasReceiver()).isTrue();
    }

    /**
     * 수신자 없는 알림 행은 아무도 볼 수 없는 쓰레기가 된다 — 목록에도 미읽음 카운트에도
     * 잡히지 않으면서 테이블만 늘린다. 빈 문자열·공백도 '없음'으로 본다.
     */
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "   ", "\t"})
    @DisplayName("수신자가 없거나 공백이면 알림을 만들 수 없다")
    void rejectsBlankReceiver(String receiver) {
        assertThat(event(receiver).hasReceiver()).isFalse();
    }

    @Test
    @DisplayName("수신자가 있으면 알림을 만들 수 있다")
    void acceptsPresentReceiver() {
        assertThat(event("USRCNFRM_0001").hasReceiver()).isTrue();
    }
}
