package nuri.foundation.core.dashboard;

/**
 * 실시간 대시보드에 "처리 대기 알림 수" 를 알려 주는 포트.
 *
 * <p><b>왜 포트인가</b> — 종전에는 {@code RealTimeDashboardService} 가 {@code NotificationRepository} 를
 * 직접 주입해 dashboard→notification 교차 도메인 결합을 만들었다(GAP-ARCH-001 의 잔여 4건 중 하나).
 * {@code TemplateReferenceContributor} 와 같은 방식으로 세는 규칙의 소유권을 세어지는 쪽에 두면,
 * 대시보드는 이 포트만 보고 알림 도메인이 base projection 에서 빠져도 존재하지 않는 테이블을 조회하지 않는다.
 *
 * <p><b>구현이 없을 때의 의미</b> — 알림 도메인이 없으면 대기 알림도 <b>실제로</b> 0 이다. 이것은 조회에
 * 실패했는데 0 이라고 말하는 것과 다르다 — 후자는 소비 측이 예외를 잡아 따로 로그를 남긴다.
 */
public interface PendingAlertCountContributor {

    /** 아직 읽지 않은(처리 대기) 알림 수. */
    long countPendingAlerts();
}
