package com.company.project.business.service.notification;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.business.domain.notification.Notification;
import com.company.project.business.domain.notification.NotificationRepository;
import com.company.project.business.service.notification.dto.NotificationDto;
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
    public NotificationDto getNotification(String ntfcNo) {
        log.debug("Fetching notification details for ID: {}", ntfcNo);
        return notificationRepository.findById(Objects.requireNonNull(ntfcNo))
                .map(NotificationDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createNotification(String userId, NotificationDto dto) {
        log.info("Creating notification for user: {}", userId);
        String id = "NTFC_" + System.currentTimeMillis();
        Notification entity = Notification.builder()
                .ntfcNo(id)
                .ntfcSj(dto.getNtfcSj())
                .ntfcCn(dto.getNtfcCn())
                .receiverId(userId)
                .linkUrl(dto.getUniqId())
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
    public void updateNotification(String ntfcNo, String userId, NotificationDto dto) {
        log.info("Updating notification ID: {} for user: {}", ntfcNo, userId);
        Notification entity = notificationRepository.findById(ntfcNo)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getNtfcSj(), dto.getNtfcCn(), dto.getNtfcTime(), dto.getBhNtfcIntrvl());
    }

    @Override
    @Transactional
    public void deleteNotification(String ntfcNo) {
        log.warn("Deleting notification ID: {}", ntfcNo);
        notificationRepository.deleteById(ntfcNo);
    }

    @Override
    public List<NotificationDto> getActiveNotifications() {
        return notificationRepository.findAll().stream()
                .map(NotificationDto::from)
                .collect(Collectors.toList());
    }

    @Override
    public long getUnreadCount(String userId) {
        return notificationRepository.countByReceiverIdAndIsRead(userId, "N");
    }

    @Override
    @Transactional
    public void markAsRead(String ntfcNo) {
        log.info("Marking notification ID: {} as read", ntfcNo);
        notificationRepository.findById(ntfcNo).ifPresent(Notification::markAsRead);
    }
}
