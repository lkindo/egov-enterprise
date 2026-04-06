package nuri.business.service.notification;

import nuri.business.service.notification.dto.NotificationDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface EgovNotificationService {
    Page<NotificationDto> getNotificationList(String keyword, Pageable pageable);

    NotificationDto getNotification(String ntfcNo);

    String createNotification(String userId, NotificationDto dto);

    void updateNotification(String ntfcNo, String userId, NotificationDto dto);

    void deleteNotification(String ntfcNo);

    /**
     * 페이지네이션 적용된 활성 알림 조회
     */
    Page<NotificationDto> getActiveNotifications(Pageable pageable);

    /**
     * 전체 활성 알림 조회 (메모리 부하 주의 - 배치용)
     */
    List<NotificationDto> getActiveNotificationsAll();

    long getUnreadCount(String userId);

    void markAsRead(String ntfcNo);
}
