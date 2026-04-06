package nuri.business.service.notification;

import nuri.business.domain.notification.Notification;
import nuri.business.domain.notification.NotificationRepository;
import nuri.business.service.notification.dto.NotificationDto;
import nuri.business.support.BusinessIntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class NotificationServicePaginationTest extends BusinessIntegrationTestSupport {

    @Autowired
    private NotificationService notificationService;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private jakarta.persistence.EntityManager entityManager;
    @MockitoBean
    private SimpMessagingTemplate messagingTemplate;

    @BeforeEach
    void setUp() {
        for (int i = 1; i <= 25; i++) {
            Notification notification = Notification.builder()
                    .ntfcNo("NTFC_" + i)
                    .ntfcSj("테스트 알림 " + i)
                    .ntfcCn("내용 " + i)
                    .receiverId("testUser")
                    .isRead(i % 5 == 0 ? "Y" : "N")
                    .createdDate(LocalDateTime.now())
                    .build();
            notificationRepository.save(notification);
        }
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("페이지네이션된 활성 알림 조회")
    void getActiveNotifications_WithPagination() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<NotificationDto> result = notificationService.getActiveNotifications(pageable);
        assertThat(result.getTotalElements()).isEqualTo(25);
        assertThat(result.getTotalPages()).isEqualTo(3);
        assertThat(result.getNumber()).isEqualTo(0);
        assertThat(result.getContent()).hasSize(10);
    }

    @Test
    @DisplayName("페이지네이션 - 두 번째 페이지")
    void getActiveNotifications_SecondPage() {
        Pageable pageable = PageRequest.of(1, 10);
        Page<NotificationDto> result = notificationService.getActiveNotifications(pageable);
        assertThat(result.getNumber()).isEqualTo(1);
        assertThat(result.getContent()).hasSize(10);
        assertThat(result.getTotalPages()).isEqualTo(3);
    }

    @Test
    @DisplayName("전체 활성 알림 조회 - 메모리 부하 주의")
    void getActiveNotificationsAll() {
        List<NotificationDto> result = notificationService.getActiveNotificationsAll();
        assertThat(result).hasSize(25);
    }

    @Test
    @DisplayName("읽지 않은 알림 카운트")
    void getUnreadCount() {
        long unreadCount = notificationService.getUnreadCount("testUser");
        assertThat(unreadCount).isEqualTo(20);
    }
}
