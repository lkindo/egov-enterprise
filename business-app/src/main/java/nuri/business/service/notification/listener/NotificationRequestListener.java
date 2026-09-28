package nuri.business.service.notification.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.service.notification.NotificationService;
import nuri.foundation.core.event.NotificationRequestedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 업무 도메인이 요청한 알림을 실제 알림으로 만든다.
 *
 * <p><b>⚠ 이 리스너가 생기기 전까지 알림은 관리자가 손으로 만드는 공지뿐이었다.</b>
 * {@code NotificationService.createNotification} 의 notification 패키지 밖 호출자가 <b>0건</b>이라,
 * 결재가 승인되거나 쪽지가 도착해도 아무 알림도 생기지 않았다. 미읽음 카운트·WebSocket 전달·
 * 종 아이콘·목록 화면은 모두 완성돼 있었으므로 <b>겉보기에는 알림 기능이 있는 제품</b>이었다.
 *
 * <p><b>왜 이벤트로 받는가</b> — 발행 도메인이 {@code NotificationService} 를 직접 주입하면
 * 결재·쪽지·게시판이 저마다 notification 에 결합돼 교차 도메인 결합 census 가 늘어난다
 * (GAP-ARCH-001 이 줄여 온 바로 그 축이다). foundation 이벤트를 거치면 어느 도메인도
 * 상대를 import 하지 않는다.
 *
 * <p>알림 행과 전달 의도는 업무 트랜잭션에 함께 저장한다. 저장 실패는 업무까지 되돌리며,
 * 커밋 뒤 전송 실패는 영속 worker가 재시도한다. 비동기 메모리 큐에 생성 의도를 맡기지 않는다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationRequestListener {

    private final NotificationService notificationService;

    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void onNotificationRequested(NotificationRequestedEvent event) {
        if (!event.hasReceiver()) {
            // 발행 측에서 걸러야 하지만, 수신자 없는 알림 행은 아무도 볼 수 없는 쓰레기가 된다.
            log.warn("수신자 없는 알림 요청을 무시합니다");
            return;
        }
        notificationService.createForEvent(event);
    }
}
