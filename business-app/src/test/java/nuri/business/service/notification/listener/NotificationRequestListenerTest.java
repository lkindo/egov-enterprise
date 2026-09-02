package nuri.business.service.notification.listener;

import nuri.business.service.notification.NotificationService;
import nuri.business.service.notification.dto.NotificationDto;
import nuri.foundation.core.event.NotificationRequestedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.scheduling.annotation.Async;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * 🔔 업무 사건 → 알림 생성 경로 검증 — {@link NotificationRequestListener}.
 *
 * <p>[왜 이 테스트가 필요한가] 이 리스너가 생기기 전까지 {@code createNotification} 의
 * notification 패키지 밖 호출자는 <b>0건</b>이었다. 미읽음 카운트·WebSocket 전달·종 아이콘·
 * 목록 화면은 전부 완성돼 있었는데 <b>알릴 사건이 들어오지 않아</b> 알림은 관리자가 손으로
 * 만드는 공지뿐이었다. 이 테스트는 그 연결이 살아 있음을 고정한다.
 */
@DisplayName("NotificationRequestListener — 업무 사건을 알림으로 만든다")
class NotificationRequestListenerTest {

    @Test
    @DisplayName("알림 리스너는 부모 logExecutor와 분리된 전용 executor를 사용한다")
    void usesDedicatedNotificationExecutor() throws NoSuchMethodException {
        Async async = NotificationRequestListener.class
                .getDeclaredMethod("onNotificationRequested", NotificationRequestedEvent.class)
                .getAnnotation(Async.class);

        assertThat(async).isNotNull();
        assertThat(async.value()).isEqualTo("notificationExecutor");
    }

    @Test
    @DisplayName("요청받은 제목·본문·링크로 수신자에게 알림을 만든다")
    void createsNotificationForReceiver() {
        NotificationService service = mock(NotificationService.class);
        NotificationRequestListener listener = new NotificationRequestListener(service);

        listener.onNotificationRequested(new NotificationRequestedEvent(
                "USRCNFRM_0001", "결재 상태 변경", "결재(ID:7)가 승인 되었습니다.", "/approvals"));

        ArgumentCaptor<NotificationDto> captor = ArgumentCaptor.forClass(NotificationDto.class);
        verify(service).createNotification(org.mockito.ArgumentMatchers.eq("USRCNFRM_0001"), captor.capture());
        assertThat(captor.getValue().getNotiTtlNm()).isEqualTo("결재 상태 변경");
        assertThat(captor.getValue().getNotiCn()).isEqualTo("결재(ID:7)가 승인 되었습니다.");
        assertThat(captor.getValue().getLinkUrl()).isEqualTo("/approvals");
    }

    /**
     * 수신자 없는 알림 행은 아무도 볼 수 없는 쓰레기가 된다 — 목록에도, 미읽음 카운트에도
     * 잡히지 않으면서 테이블만 늘린다.
     */
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    @DisplayName("수신자가 없으면 알림을 만들지 않는다")
    void skipsWhenReceiverMissing(String receiver) {
        NotificationService service = mock(NotificationService.class);
        NotificationRequestListener listener = new NotificationRequestListener(service);

        listener.onNotificationRequested(new NotificationRequestedEvent(receiver, "제목", "본문", null));

        verify(service, never()).createNotification(anyString(), any());
    }

    /**
     * 원 업무(결재 승인·쪽지 발송)는 이미 커밋됐다. 알림 실패로 그것을 되돌릴 수 없고
     * 되돌려서도 안 된다 — 알림은 업무의 부수 효과이지 업무 자체가 아니다.
     */
    @Test
    @DisplayName("알림 생성 실패가 업무 경로로 전파되지 않는다")
    void swallowsFailureSoBusinessPathIsUnaffected() {
        NotificationService service = mock(NotificationService.class);
        doThrow(new IllegalStateException("db down"))
                .when(service).createNotification(anyString(), any());
        NotificationRequestListener listener = new NotificationRequestListener(service);

        assertThatCode(() -> listener.onNotificationRequested(
                new NotificationRequestedEvent("USRCNFRM_0001", "제목", "본문", null)))
                .doesNotThrowAnyException();
    }
}
