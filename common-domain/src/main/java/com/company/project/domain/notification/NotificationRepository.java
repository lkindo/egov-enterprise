package com.company.project.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 정보알림 Repository
 */
public interface NotificationRepository extends JpaRepository<Notification, String>, NotificationRepositoryCustom {

    @Query("SELECT n FROM Notification n WHERE n.ntfcTime >= :today ORDER BY n.ntfcTime")
    List<Notification> findActiveNotifications(@Param("today") String today);
}
