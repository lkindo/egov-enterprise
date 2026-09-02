package nuri.business.service.notification.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.service.notification.NotificationService;
import nuri.business.service.notification.dto.NotificationDto;
import nuri.foundation.core.event.NotificationRequestedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

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
 * <p>[비파괴 원칙] 알림 생성 실패가 원 업무(결재 승인·쪽지 발송)를 되돌리면 안 된다.
 * 별도 스레드에서 실행하고 예외를 흡수한다 — 알림은 업무의 부수 효과이지 업무 자체가 아니다.
 *
 * <p>{@code @TransactionalEventListener} 가 아니라 {@code @EventListener} 인 것은 의도다.
 * 발행부가 이미 {@code TransactionUtils.runAfterCommit} 으로 커밋 이후를 보장하며,
 * {@code @Async} 와 {@code @TransactionalEventListener} 의 조합은 하네스 게이트가 금지한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationRequestListener {

    private final NotificationService notificationService;

    @Async("notificationExecutor")
    @EventListener
    public void onNotificationRequested(NotificationRequestedEvent event) {
        if (!event.hasReceiver()) {
            // 발행 측에서 걸러야 하지만, 수신자 없는 알림 행은 아무도 볼 수 없는 쓰레기가 된다.
            log.warn("수신자 없는 알림 요청을 무시합니다");
            return;
        }
        try {
            notificationService.createNotification(
                    event.receiverEsntlId(),
                    NotificationDto.builder()
                            .notiTtlNm(event.title())
                            .notiCn(event.content())
                            .linkUrl(event.linkUrl())
                            .build());
        } catch (Exception e) {
            // 원 업무는 이미 커밋됐다. 알림 실패로 그것을 되돌릴 수 없고 되돌려서도 안 된다.
            log.error("알림 생성 실패(업무 처리에는 영향 없음) — 예외유형={}",
                    e.getClass().getSimpleName());
        }
    }
}
