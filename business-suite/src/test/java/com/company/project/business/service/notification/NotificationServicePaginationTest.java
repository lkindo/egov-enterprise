package com.company.project.business.service.notification;

import com.company.project.business.domain.notification.Notification;
import com.company.project.business.domain.notification.NotificationRepository;
import com.company.project.business.service.notification.dto.NotificationDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.context.annotation.Import;
import com.company.project.business.config.TestQueryDslConfig;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * NotificationService 페이지네이션 테스트
 * - getActiveNotifications(Pageable) 테스트
 * - getActiveNotificationsAll() 테스트
 */
@DataJpaTest
@ActiveProfiles("test")
@Import({NotificationService.class, TestQueryDslConfig.class})
class NotificationServicePaginationTest {

    @Autowired
    private NotificationService notificationService;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private TestEntityManager entityManager;
    @MockitoBean
    private SimpMessagingTemplate messagingTemplate;

    @BeforeEach
    void setUp() {
        // 테스트 데이터 설정
        for (int i = 1; i <= 25; i++) {
            Notification notification = Notification.builder()
                    .ntfcNo("NTFC_" + i)
                    .ntfcSj("테스트 알림 " + i)
                    .ntfcCn("내용 " + i)
                    .receiverId("testUser")
                    .isRead(i % 5 == 0 ? "Y" : "N") // 5 의 배수만 읽음
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
        // Given: 25 개의 알림 (읽음 5 개, 안읽음 20 개)
        Pageable pageable = PageRequest.of(0, 10);

        // When: 첫 번째 페이지 조회 (10 개)
        Page<NotificationDto> result = notificationService.getActiveNotifications(pageable);

        // Then: 페이지네이션 정상 동작
        assertThat(result.getTotalElements()).isEqualTo(25);
        assertThat(result.getTotalPages()).isEqualTo(3);
        assertThat(result.getNumber()).isEqualTo(0);
        assertThat(result.getContent()).hasSize(10);
    }

    @Test
    @DisplayName("페이지네이션 - 두 번째 페이지")
    void getActiveNotifications_SecondPage() {
        // Given: 25 개의 알림
        Pageable pageable = PageRequest.of(1, 10);

        // When: 두 번째 페이지 조회
        Page<NotificationDto> result = notificationService.getActiveNotifications(pageable);

        // Then: 두 번째 페이지 데이터 확인
        assertThat(result.getNumber()).isEqualTo(1);
        assertThat(result.getContent()).hasSize(10);
        assertThat(result.getTotalPages()).isEqualTo(3);
    }

    @Test
    @DisplayName("전체 활성 알림 조회 - 메모리 부하 주의")
    void getActiveNotificationsAll() {
        // When: 전체 알림 조회
        List<NotificationDto> result = notificationService.getActiveNotificationsAll();

        // Then: 모든 알림 조회됨
        assertThat(result).hasSize(25);
    }

    @Test
    @DisplayName("읽지 않은 알림 카운트")
    void getUnreadCount() {
        // When: 읽지 않은 알림 카운트
        long unreadCount = notificationService.getUnreadCount("testUser");

        // Then: 20 개 (25 개 중 5 개는 읽음)
        assertThat(unreadCount).isEqualTo(20);
    }
}
