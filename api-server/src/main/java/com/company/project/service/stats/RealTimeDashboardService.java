package com.company.project.service.stats;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

import org.springframework.messaging.simp.SimpMessageSendingOperations;

import org.springframework.scheduling.annotation.Scheduled;

import org.springframework.stereotype.Service;

import java.util.HashMap;

import java.util.Map;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * 
 * ?? ????? ????? ??? ??
 * 
 */

@Slf4j

@Service

@RequiredArgsConstructor

public class RealTimeDashboardService {

    private final SimpMessageSendingOperations messagingTemplate;

    // 실시간 통계 데이터 관리 (로컬 메모리 활용)

    private final AtomicInteger activeUsers = new AtomicInteger(0);

    private final AtomicInteger visitsPerMinute = new AtomicInteger(0);

    /**
     * 
     * ?? ???? ?? ?? ?? (5 ? ??
     * 
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
     * 
     * ? ???? ?
     * 
     */

    public void incrementActiveUsers() {

        activeUsers.incrementAndGet();

        visitsPerMinute.incrementAndGet();

    }

    /**
     * 
     * ? ???? ??
     * 
     */

    public void decrementActiveUsers() {

        activeUsers.decrementAndGet();

    }

    /**
     * 
     * ?? ??? ? ? ?? ??
     * 
     */

    private int getTodayNewPostsCount() {

        // TODO: 실제 데이터베이스에서 오늘의 게시물 수를 조회하는 로직 구현

        return (int) (Math.random() * 10);

    }

    /**
     * 
     * pending alerts count
     * 
     */

    private int getPendingAlertsCount() {

        // TODO: 실제 데이터베이스에서 미처리 알림 수를 조회하는 로직 구현

        return (int) (Math.random() * 5);

    }

    /**
     * 
     * ?? ???? ?(1 ? ??
     * 
     */

    @Scheduled(fixedRate = 60000)

    public void resetVisitsCounter() {

        visitsPerMinute.set(0);

    }

}
