package nuri.business.service.notification;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.notification.Notification;
import nuri.business.domain.notification.NotificationRepository;
import nuri.business.service.notification.dto.NotificationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService implements EgovNotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public Page<NotificationDto> getNotificationList(String keyword, Pageable pageable) {
        log.debug("Fetching notification list with keyword: {}", keyword);
        return notificationRepository.searchNotifications(keyword, pageable)
                .map(NotificationDto::from);
    }

    @Override
    public NotificationDto getNotification(String notiSn) {
        log.debug("Fetching notification details for ID: {}", notiSn);
        return notificationRepository.findById(Objects.requireNonNull(notiSn))
                .map(NotificationDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createNotification(String userId, NotificationDto dto) {
        log.info("Creating notification for user: {}", userId);
        String id = "NTFC_" + System.currentTimeMillis();
        Notification entity = Notification.builder()
                .notiSn(id)
                .notiTtlNm(dto.getNotiTtlNm())
                .notiCn(dto.getNotiCn())
                .rcvrId(userId)
                .linkUrl(dto.getLinkUrl())
                .build();

        notificationRepository.save(entity);

        // Notify via WebSocket
        NotificationDto responseDto = NotificationDto.from(entity);
        try {
            messagingTemplate.convertAndSend("/topic/public", responseDto);
            if (userId != null) {
                messagingTemplate.convertAndSendToUser(userId, "/queue/notifications", responseDto);
            }
        } catch (Exception e) {
            log.error("Failed to send WebSocket notification", e);
        }

        return id;
    }

    @Override
    @Transactional
    public void updateNotification(String notiSn, String userId, NotificationDto dto) {
        log.info("Updating notification ID: {} for user: {}", notiSn, userId);
        Notification entity = notificationRepository.findById(notiSn)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getNotiTtlNm(), dto.getNotiCn(), dto.getNotiDt(), dto.getNotiIvlVal());
    }

    @Override
    @Transactional
    public void deleteNotification(String notiSn) {
        log.warn("Deleting notification ID: {}", notiSn);
        notificationRepository.deleteById(notiSn);
    }

    @Override
    public Page<NotificationDto> getActiveNotifications(Pageable pageable) {
        log.debug("Fetching active notifications with pagination");
        return notificationRepository.findAll(pageable)
                .map(NotificationDto::from);
    }

    @Override
    public List<NotificationDto> getActiveNotificationsAll() {
        // [경고] 대량 데이터 조회 - 배치 작업 등 특수한 경우에만 사용
        log.warn("Fetching ALL notifications without pagination - use with caution");
        return notificationRepository.findAll().stream()
                .map(NotificationDto::from)
                .collect(Collectors.toList());
    }

    @Override
    public long getUnreadCount(String userId) {
        return notificationRepository.countByRcvrIdAndReadYn(userId, "N");
    }

    @Override
    @Transactional
    public void markAsRead(String notiSn) {
        log.info("Marking notification ID: {} as read", notiSn);
        notificationRepository.findById(notiSn).ifPresent(noti -> noti.markAsRead());
    }
}
