package nuri.business.service.notification;

import java.time.LocalDateTime;
import java.time.ZoneId;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nuri.business.domain.notification.NotificationRepository;

/**
 * 읽은 알림({@code tb_user_noti}, {@code read_yn='Y'}) 보존·정리 스케줄러.
 *
 * <p>[2026-09-06 DEC-OPS-038] 알림은 사용자 탈퇴 때만 일괄 정리되고({@code NotificationUserDeletionCleanupListener})
 * 읽은 알림도 영구 누적됐다(감사 D09-06). 로그 5종의 {@code LogRetentionScheduler} 와 같은 모양으로 파기 경로를
 * 두되, <b>기본 비활성</b>({@code nuri.notification.retention.enabled=false})이다 — 보존 개월 수치는 인수처가
 * 정하는 결정(PD-NOTE-002)이지 코드가 지어낼 값이 아니다.
 *
 * <p>안전 가드: {@code read-months} 가 {@value #MIN_MONTHS} 미만(미설정 0·음수)이면 켜져 있어도 삭제하지 않고
 * WARN 만 남긴다. 미설정 상태에서 cutoff 가 '지금' 이 되어 읽은 알림이 전량 파기되는 사고를 코드 레벨에서 막는다.
 * 읽지 않은 알림은 대상이 아니다 — 사용자가 아직 보지 못한 통지를 시간만으로 지우지 않는다.
 *
 * <p>정책 문서: {@code docs/04-operations/log-retention-policy.md} 의 '알림 보존' 절.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "nuri.notification.retention.enabled", havingValue = "true")
@RequiredArgsConstructor
public class NotificationRetentionScheduler {
    /** 이 미만의 보존월은 미설정으로 본다 — 삭제하지 않는다. */
    static final int MIN_MONTHS = 1;
    private static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    private final NotificationRepository notificationRepository;

    @Value("${nuri.notification.retention.read-months:0}")
    private int readMonths;

    /**
     * 매일 04:30(Asia/Seoul) — 로그 파기(04:00) 뒤에 돈다. cron 은 {@code nuri.notification.retention.cron} 으로 재정의 가능.
     */
    @Scheduled(cron = "${nuri.notification.retention.cron:0 30 4 * * *}", zone = "Asia/Seoul")
    @Transactional
    public void purgeReadNotifications() {
        if (readMonths < MIN_MONTHS) {
            log.warn("[notification-retention] read-months={} 가 {} 미만 → 읽은 알림 정리를 건너뜀(전량파기 방지)",
                    readMonths, MIN_MONTHS);
            return;
        }
        LocalDateTime cutoff = LocalDateTime.now(ZONE).minusMonths(readMonths);
        int deleted = notificationRepository.deleteReadBefore(cutoff);
        log.info("[notification-retention] {} 이전에 생성된 읽은 알림 {}건 정리 (read-months={})", cutoff, deleted, readMonths);
    }
}
