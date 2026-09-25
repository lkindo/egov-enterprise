package nuri.business.service.dashboard;

import nuri.foundation.core.dashboard.PendingAlertCountContributor;
import nuri.foundation.core.stats.PostStatisticsContributor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 실시간 대시보드 통계 서비스 (비즈니스 수위트 레이어)
 * 백엔드 헌법 제1조 2항 및 제5조에 의거하여 외부 기술 사양(SimpMessageSendingOperations)과
 * 물리적 결합을 완벽하게 끊어내고, Spring ApplicationEventPublisher를 이용해 이벤트를 발행하도록 격리 설계됨.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RealTimeDashboardService {

    /**
     * 대기 알림 수를 세는 포트. 알림 도메인이 구현하며 여기서는 개수만 받는다.
     *
     * <p>종전에는 {@code NotificationRepository} 를 직접 주입해 dashboard→notification 교차 도메인
     * 결합을 만들었다(GAP-ARCH-001). {@code ObjectProvider} 로 받는 것은 알림 도메인이 base projection
     * 에서 빠진 프로필에서도 대시보드가 뜨게 하기 위해서다 — 그때의 0 은 "세지 못했다" 가 아니라
     * "셀 알림이 없다" 는 사실이다.
     */
    private final ObjectProvider<PendingAlertCountContributor> pendingAlertCounts;
    private final ObjectProvider<PostStatisticsContributor> postStatistics;
    private final ApplicationEventPublisher eventPublisher;

    private static final DateTimeFormatter STATS_TIMESTAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private Clock clock = Clock.system(ZoneId.of("Asia/Seoul"));

    // 실시간 통계 데이터 관리(로컬 메모리 활용)
    private final AtomicInteger activeUsers = new AtomicInteger(0);
    private final AtomicInteger visitsPerMinute = new AtomicInteger(0);

    /** 날짜 경계 회귀 테스트에서 운영과 같은 시간대의 시계를 고정한다. */
    void useClock(Clock clock) {
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    /**
     * 실시간 데이터 발행 (5초 주기)
     * 직접 WebSocket으로 쏘는 대신 이벤트를 발행하여 api-server 측 리스너로 책임 격리
     */
    @Scheduled(fixedRate = 5000)
    public void broadcastRealTimeStats() {
        try {
            int currentActiveUsers = activeUsers.get();
            int currentVisits = visitsPerMinute.get();
            CountSnapshot currentPosts = getTodayPostsCount();
            CountSnapshot pendingAlerts = getPendingAlertsCount();

            DashboardStatsUpdatedEvent event = new DashboardStatsUpdatedEvent(
                currentActiveUsers,
                currentVisits,
                currentPosts.value(),
                pendingAlerts.value(),
                currentPosts.available(),
                pendingAlerts.available()
            );

            eventPublisher.publishEvent(event);
            log.debug("Published real-time stats event: {}", event);
        } catch (Exception e) {
            log.error("Error publishing real-time stats event", e);
        }
    }

    /**
     * 활성 사용자 수 증가
     */
    public void incrementActiveUsers() {
        activeUsers.incrementAndGet();
        visitsPerMinute.incrementAndGet();
    }

    /**
     * 활성 사용자 수 감소
     */
    public void decrementActiveUsers() {
        // 0 하한 강제 — 짝 없는 disconnect/재기동 후 disconnect 로 카운터가 음수가 되어 대시보드에 음수 활성자 수가 방송되던 것 방지.
        activeUsers.updateAndGet(v -> Math.max(0, v - 1));
    }

    /**
     * 처리 대기 중인 알림 수 조회.
     *
     * <p>구현이 없으면(알림 도메인이 빠진 프로필) 셀 알림 자체가 없으므로 0 이다. 조회가 실패해서 0 이 되는
     * 경우와 구분되도록 실패는 error 로그와 available=false 를 함께 방송한다.
     */
    private CountSnapshot getPendingAlertsCount() {
        try {
            PendingAlertCountContributor contributor = pendingAlertCounts.getIfAvailable();
            return CountSnapshot.known(contributor == null ? 0 : contributor.countPendingAlerts());
        } catch (Exception e) {
            log.error("Failed to count pending alerts", e);
            return CountSnapshot.unavailable();
        }
    }

    /**
     * 한국 시간 오늘 생성된 활성 게시글을 DB에서 읽는다. 재시작·다중 인스턴스·자정에도
     * 프로세스가 받은 이벤트 수에 의존하지 않으며, 기존 게시판 통계의 use_yn='Y' 의미를 따른다.
     */
    private CountSnapshot getTodayPostsCount() {
        try {
            PostStatisticsContributor contributor = postStatistics.getIfAvailable();
            if (contributor == null) {
                return CountSnapshot.known(0);
            }
            LocalDate today = LocalDate.now(clock);
            String from = today.atStartOfDay().format(STATS_TIMESTAMP);
            String to = today.plusDays(1).atStartOfDay().format(STATS_TIMESTAMP);
            long total = contributor.countPostsByDate(from, to).stream()
                    .mapToLong(row -> ((Number) row[1]).longValue())
                    .reduce(0L, Math::addExact);
            return CountSnapshot.known(total);
        } catch (Exception e) {
            log.error("Failed to count today's posts", e);
            return CountSnapshot.unavailable();
        }
    }

    private record CountSnapshot(int value, boolean available) {
        static CountSnapshot known(long value) {
            if (value < 0) {
                throw new IllegalArgumentException("dashboard count must be nonnegative");
            }
            return new CountSnapshot(Math.toIntExact(value), true);
        }

        static CountSnapshot unavailable() {
            // 숫자 필드는 기존 wire 형태를 유지한다. 소비자는 available=false일 때 숫자를 표시하지 않는다.
            return new CountSnapshot(0, false);
        }
    }

    /**
     * 분당 방문자 수 초기화 (1분 주기)
     */
    @Scheduled(fixedRate = 60000)
    public void resetVisitsCounter() {
        visitsPerMinute.set(0);
    }
}
