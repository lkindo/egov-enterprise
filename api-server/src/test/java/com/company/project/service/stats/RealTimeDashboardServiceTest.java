package com.company.project.service.stats;

import com.company.project.foundation.domain.notification.NotificationRepository;
import com.company.project.business.service.board.event.PostCreatedEvent;
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
@DisplayName("RealTimeDashboardService ?뚯뒪??)
class RealTimeDashboardServiceTest {

    @Mock
    private SimpMessageSendingOperations messagingTemplate;

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private RealTimeDashboardService realTimeDashboardService;

    @Test
    @DisplayName("寃뚯떆湲 ?앹꽦 ?대깽??泥섎━")
    void handlePostCreated_IncrementsCount() {
        // PostCreatedEvent(Object source, String bbsId, Long nttId, String userId)
        PostCreatedEvent event = new PostCreatedEvent(this, "BBS_001", 1L, "user01");
        realTimeDashboardService.handlePostCreated(event);
        
        realTimeDashboardService.broadcastRealTimeStats();
        verify(messagingTemplate).convertAndSend(eq("/topic/dashboard/stats"), argThat((Map<String, Object> m) -> (Integer)m.get("newPosts") == 1));
    }

    @Test
    @DisplayName("?ㅼ떆媛??듦퀎 釉뚮줈?쒖틦?ㅽ듃")
    void broadcastRealTimeStats_Success() {
        when(notificationRepository.countByIsRead("N")).thenReturn(5L);
        
        realTimeDashboardService.incrementActiveUsers();
        realTimeDashboardService.broadcastRealTimeStats();

        verify(messagingTemplate).convertAndSend(eq("/topic/dashboard/stats"), anyMap());
        verify(notificationRepository).countByIsRead("N");
    }

    @Test
    @DisplayName("?쒖꽦 ?ъ슜??利앷? 諛?媛먯냼")
    void activeUsers_IncrementAndDecrement() {
        realTimeDashboardService.incrementActiveUsers();
        realTimeDashboardService.decrementActiveUsers();
        realTimeDashboardService.broadcastRealTimeStats();
        
        verify(messagingTemplate).convertAndSend(eq("/topic/dashboard/stats"), argThat((Map<String, Object> m) -> (Integer)m.get("activeUsers") == 0));
    }

    @Test
    @DisplayName("諛⑸Ц????移댁슫??珥덇린??)
    void resetVisitsCounter_Success() {
        realTimeDashboardService.incrementActiveUsers();
        realTimeDashboardService.resetVisitsCounter();
        realTimeDashboardService.broadcastRealTimeStats();

        verify(messagingTemplate).convertAndSend(eq("/topic/dashboard/stats"), argThat((Map<String, Object> m) -> (Integer)m.get("visitsPerMinute") == 0));
    }

    @Test
    @DisplayName("?뚮┝ 移댁슫??議고쉶 以??덉쇅 諛쒖깮 ??0 諛섑솚")
    void getPendingAlertsCount_Exception_ReturnsZero() {
        when(notificationRepository.countByIsRead("N")).thenThrow(new RuntimeException("DB Error"));
        realTimeDashboardService.broadcastRealTimeStats();
        verify(messagingTemplate).convertAndSend(eq("/topic/dashboard/stats"), argThat((Map<String, Object> m) -> (Integer)m.get("alerts") == 0));
    }
}
