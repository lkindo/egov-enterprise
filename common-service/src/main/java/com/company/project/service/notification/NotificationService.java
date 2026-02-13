package com.company.project.service.notification;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.notification.Notification;
import com.company.project.domain.notification.NotificationRepository;
import com.company.project.service.notification.dto.NotificationDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService implements EgovNotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public Page<NotificationDto> getNotificationList(String keyword, Pageable pageable) {
        return notificationRepository.searchNotifications(keyword, pageable).map(NotificationDto::from);
    }

    @Override
    public NotificationDto getNotification(String ntfcNo) {
        return notificationRepository.findById(ntfcNo)
                .map(NotificationDto::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
    }

    @Override
    @Transactional
    public String createNotification(String userId, NotificationDto dto) {
        String id = "NTFC_" + String.format("%013d", System.currentTimeMillis());
        Notification entity = Notification.builder()
                .ntfcNo(id)
                .ntfcSj(dto.getNtfcSj())
                .ntfcCn(dto.getNtfcCn())
                .ntfcTime(dto.getNtfcTime())
                .bhNtfcIntrvl(dto.getBhNtfcIntrvl())
                .build();
        notificationRepository.save(entity);

        // Send Real-time notification via WebSocket
        messagingTemplate.convertAndSend("/topic/public", NotificationDto.from(entity));
        if (userId != null) {
            messagingTemplate.convertAndSendToUser(userId, "/queue/notifications", NotificationDto.from(entity));
        }

        return id;
    }

    @Override
    @Transactional
    public void updateNotification(String ntfcNo, String userId, NotificationDto dto) {
        Notification entity = notificationRepository.findById(ntfcNo)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getNtfcSj(), dto.getNtfcCn(), dto.getNtfcTime(), dto.getBhNtfcIntrvl());
    }

    @Override
    @Transactional
    public void deleteNotification(String ntfcNo) {
        notificationRepository.deleteById(ntfcNo);
    }

    @Override
    public List<NotificationDto> getActiveNotifications() {
        return notificationRepository.findAll().stream() // Or custom logic
                .map(NotificationDto::from)
                .collect(Collectors.toList());
    }
}
