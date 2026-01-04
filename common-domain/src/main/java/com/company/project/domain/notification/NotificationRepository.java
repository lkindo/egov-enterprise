package com.company.project.domain.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 정보알림 Repository
 */
public interface NotificationRepository extends JpaRepository<Notification, String> {

    Page<Notification> findByNtfcSjContaining(String ntfcSj, Pageable pageable);

    Page<Notification> findByUniqId(String uniqId, Pageable pageable);

    @Query("SELECT n FROM Notification n WHERE n.ntfcSj LIKE %:keyword% OR n.ntfcCn LIKE %:keyword%")
    Page<Notification> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT n FROM Notification n WHERE n.ntfcDate >= :today ORDER BY n.ntfcDate, n.ntfcTime")
    List<Notification> findActiveNotifications(@Param("today") String today);
}
