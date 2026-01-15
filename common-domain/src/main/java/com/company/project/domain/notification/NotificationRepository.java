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

    // DB에 uniqId 컬럼이 없으므로 제거
    // Page<Notification> findByUniqId(String uniqId, Pageable pageable);

    @Query("SELECT n FROM Notification n WHERE n.ntfcSj LIKE %:keyword% OR n.ntfcCn LIKE %:keyword%")
    Page<Notification> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    // n.ntfcDate -> n.ntfcTime (실제 매핑된 컬럼: NTCN_TM) 사용
    @Query("SELECT n FROM Notification n WHERE n.ntfcTime >= :today ORDER BY n.ntfcTime")
    List<Notification> findActiveNotifications(@Param("today") String today);
}
