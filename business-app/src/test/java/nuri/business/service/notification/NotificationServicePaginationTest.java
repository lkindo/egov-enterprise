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
import java.util.Comparator;
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
                    .notiTtlNm("Test Notification " + i)
                    .notiCn("Content " + i)
                    .rcvrId("testUser")
                    .readYn(i % 5 == 0 ? "Y" : "N")
                    .build();
            notificationRepository.save(notification);
        }
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("Get active notifications with pagination")
    void getActiveNotifications_WithPagination() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<NotificationDto> result = notificationService.getActiveNotifications(pageable);
        assertThat(result.getTotalElements()).isEqualTo(25);
        assertThat(result.getTotalPages()).isEqualTo(3);
        assertThat(result.getNumber()).isEqualTo(0);
        assertThat(result.getContent()).hasSize(10);
    }

    @Test
    @DisplayName("Get active notifications second page")
    void getActiveNotifications_SecondPage() {
        Pageable pageable = PageRequest.of(1, 10);
        Page<NotificationDto> result = notificationService.getActiveNotifications(pageable);
        assertThat(result.getNumber()).isEqualTo(1);
        assertThat(result.getContent()).hasSize(10);
        assertThat(result.getTotalPages()).isEqualTo(3);
    }

    @Test
    @DisplayName("Get all active notifications")
    void getActiveNotificationsAll() {
        List<NotificationDto> result = notificationService.getActiveNotificationsAll();
        assertThat(result).hasSize(25);
    }

    @Test
    @DisplayName("Get unread notifications count")
    void getUnreadCount() {
        long unreadCount = notificationService.getUnreadCount("testUser");
        assertThat(unreadCount).isEqualTo(20);
    }

    @Test
    @DisplayName("알림 목록은 등록일시가 같아도 일련번호 역순으로 결정적으로 정렬한다")
    void getNotificationList_breaksCreatedAtTiesByNewestId() {
        entityManager.createNativeQuery("""
                UPDATE tb_user_noti
                   SET crt_dt = TIMESTAMP '2026-09-03 00:00:00'
                 WHERE rcvr_id = 'testUser'
                """).executeUpdate();
        entityManager.clear();

        List<Long> ids = notificationService
                .getNotificationList("testUser", null, PageRequest.of(0, 25))
                .getContent().stream()
                .map(NotificationDto::getNotiSn)
                .toList();

        assertThat(ids).hasSize(25)
                .isSortedAccordingTo(Comparator.reverseOrder());
    }
}
