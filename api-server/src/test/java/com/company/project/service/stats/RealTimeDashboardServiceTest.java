package com.company.project.service.stats;

import com.company.project.domain.notification.NotificationRepository;
import com.company.project.service.board.event.PostCreatedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessageSendingOperations;

import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RealTimeDashboardService 테스트")
class RealTimeDashboardServiceTest {

    @Mock
    private SimpMessageSendingOperations messagingTemplate;

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private RealTimeDashboardService realTimeDashboardService;

    @Test
    @DisplayName("게시글 생성 이벤트 처리")
    void handlePostCreated_IncrementsCount() {
        // PostCreatedEvent(Object source, String bbsId, Long nttId, String userId)
        PostCreatedEvent event = new PostCreatedEvent(this, "BBS_001", 1L, "user01");
        realTimeDashboardService.handlePostCreated(event);
        
        realTimeDashboardService.broadcastRealTimeStats();
        verify(messagingTemplate).convertAndSend(eq("/topic/dashboard/stats"), argThat((Map<String, Object> m) -> (Integer)m.get("newPosts") == 1));
    }

    @Test
    @DisplayName("실시간 통계 브로드캐스트")
    void broadcastRealTimeStats_Success() {
        when(notificationRepository.countByIsRead("N")).thenReturn(5L);
        
        realTimeDashboardService.incrementActiveUsers();
        realTimeDashboardService.broadcastRealTimeStats();

        verify(messagingTemplate).convertAndSend(eq("/topic/dashboard/stats"), anyMap());
        verify(notificationRepository).countByIsRead("N");
    }

    @Test
    @DisplayName("활성 사용자 증가 및 감소")
    void activeUsers_IncrementAndDecrement() {
        realTimeDashboardService.incrementActiveUsers();
        realTimeDashboardService.decrementActiveUsers();
        realTimeDashboardService.broadcastRealTimeStats();
        
        verify(messagingTemplate).convertAndSend(eq("/topic/dashboard/stats"), argThat((Map<String, Object> m) -> (Integer)m.get("activeUsers") == 0));
    }

    @Test
    @DisplayName("방문자 수 카운터 초기화")
    void resetVisitsCounter_Success() {
        realTimeDashboardService.incrementActiveUsers();
        realTimeDashboardService.resetVisitsCounter();
        realTimeDashboardService.broadcastRealTimeStats();

        verify(messagingTemplate).convertAndSend(eq("/topic/dashboard/stats"), argThat((Map<String, Object> m) -> (Integer)m.get("visitsPerMinute") == 0));
    }

    @Test
    @DisplayName("알림 카운트 조회 중 예외 발생 시 0 반환")
    void getPendingAlertsCount_Exception_ReturnsZero() {
        when(notificationRepository.countByIsRead("N")).thenThrow(new RuntimeException("DB Error"));
        realTimeDashboardService.broadcastRealTimeStats();
        verify(messagingTemplate).convertAndSend(eq("/topic/dashboard/stats"), argThat((Map<String, Object> m) -> (Integer)m.get("alerts") == 0));
    }
}
