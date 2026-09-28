package nuri.business.service.notification.listener;

import nuri.business.service.notification.NotificationService;
import nuri.foundation.core.event.NotificationRequestedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.scheduling.annotation.Async;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
    @DisplayName("알림 생성 의도는 업무 트랜잭션에 동기로 참여한다")
    void requiresSynchronousBusinessTransaction() throws NoSuchMethodException {
        var method = NotificationRequestListener.class.getDeclaredMethod("onNotificationRequested", NotificationRequestedEvent.class);
        assertThat(method.getAnnotation(Async.class)).isNull();
        assertThat(method.getAnnotation(org.springframework.transaction.annotation.Transactional.class).propagation())
                .isEqualTo(org.springframework.transaction.annotation.Propagation.MANDATORY);
    }

    @Test
    @DisplayName("요청받은 제목·본문·링크로 수신자에게 알림을 만든다")
    void createsNotificationForReceiver() {
        NotificationService service = mock(NotificationService.class);
        NotificationRequestListener listener = new NotificationRequestListener(service);

        var event = new NotificationRequestedEvent("USRCNFRM_0001", "결재 상태 변경", "결재(ID:7)가 승인 되었습니다.", "/approvals");
        listener.onNotificationRequested(event);
        verify(service).createForEvent(event);
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

        verify(service, never()).createForEvent(any());
    }

    @Test
    @DisplayName("알림 의도 저장 실패는 업무 경로에 전파되어 함께 롤백한다")
    void propagatesPersistenceFailure() {
        NotificationService service = mock(NotificationService.class);
        doThrow(new IllegalStateException("db down"))
                .when(service).createForEvent(any());
        NotificationRequestListener listener = new NotificationRequestListener(service);

        assertThatThrownBy(() -> listener.onNotificationRequested(
                new NotificationRequestedEvent("USRCNFRM_0001", "제목", "본문", null)))
                .isInstanceOf(IllegalStateException.class);
    }
}
