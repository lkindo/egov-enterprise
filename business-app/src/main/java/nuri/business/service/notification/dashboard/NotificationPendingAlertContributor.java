package nuri.business.service.notification.dashboard;

import lombok.RequiredArgsConstructor;
import nuri.business.domain.notification.NotificationRepository;
import nuri.foundation.core.dashboard.PendingAlertCountContributor;
import org.springframework.stereotype.Component;

/**
 * 실시간 대시보드가 쓰는 "처리 대기 알림 수" 를 알림 도메인이 직접 센다.
 *
 * <p>종전에는 {@code RealTimeDashboardService} 가 {@link NotificationRepository} 를 주입해
 * dashboard→notification 결합을 만들었다(GAP-ARCH-001). 세는 규칙을 숫자의 소유자 쪽으로 옮기면
 * 대시보드는 foundation 포트만 보고, 알림 도메인이 projection 에서 빠지면 이 구현도 함께 사라진다.
 *
 * <p>읽지 않음 판정은 종전과 같은 {@code read_yn='N'} 이다 — 이 변경은 경계만 옮기고 의미를 바꾸지 않는다.
 */
@Component
@RequiredArgsConstructor
public class NotificationPendingAlertContributor implements PendingAlertCountContributor {

    private final NotificationRepository notificationRepository;

    @Override
    public long countPendingAlerts() {
        return notificationRepository.countByReadYn("N");
    }
}
