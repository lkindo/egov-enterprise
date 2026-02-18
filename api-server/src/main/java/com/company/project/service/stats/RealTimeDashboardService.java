package com.company.project.service.stats;

import com.company.project.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 실시간 대시보드 통계 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RealTimeDashboardService {

    private final SimpMessageSendingOperations messagingTemplate;
    private final UserRepository userRepository;

    // 실시간 접속자 수 (임시 - 실제로는 Redis 등을 활용)
    private final AtomicInteger activeUsers = new AtomicInteger(0);
    private final AtomicInteger visitsPerMinute = new AtomicInteger(0);

    /**
     * 실시간 통계 브로드캐스트 (5 초마다)
     */
    @Scheduled(fixedRate = 5000)
    public void broadcastRealTimeStats() {
        try {
            Map<String, Object> stats = new HashMap<>();
            stats.put("activeUsers", activeUsers.get());
            stats.put("visitsPerMinute", visitsPerMinute.get());
            stats.put("newPosts", getTodayNewPostsCount());
            stats.put("alerts", getPendingAlertsCount());

            messagingTemplate.convertAndSend("/topic/dashboard/stats", stats);
            log.debug("Real-time stats broadcasted: {}", stats);
        } catch (Exception e) {
            log.error("Error broadcasting real-time stats", e);
        }
    }

    /**
     * 접속자 수 증가
     */
    public void incrementActiveUsers() {
        activeUsers.incrementAndGet();
        visitsPerMinute.incrementAndGet();
    }

    /**
     * 접속자 수 감소
     */
    public void decrementActiveUsers() {
        activeUsers.decrementAndGet();
    }

    /**
     * 오늘의 신규 게시글 수 조회
     */
    private int getTodayNewPostsCount() {
        // TODO: 실제 구현 시 오늘 등록 된 게시글 수 조회
        return (int) (Math.random() * 10);
    }

    /**
     * 미결 알림 수 조회
     */
    private int getPendingAlertsCount() {
        // TODO: 실제 구현 시 처리되지 않은 알림 수 조회
        return (int) (Math.random() * 5);
    }

    /**
     * 방문 수 카운터 리셋 (1 분마다)
     */
    @Scheduled(fixedRate = 60000)
    public void resetVisitsCounter() {
        visitsPerMinute.set(0);
    }
}
