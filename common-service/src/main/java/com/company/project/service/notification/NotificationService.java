package com.company.project.service.notification;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.notification.Notification;
import com.company.project.domain.notification.NotificationRepository;
import com.company.project.service.notification.dto.NotificationDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 정보알림 서비스 구현체
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService implements EgovNotificationService {

    private final NotificationRepository notificationRepository;

    @Override
    public Page<NotificationDto> getNotificationList(String keyword, Pageable pageable) {
        if (keyword == null || keyword.isEmpty()) {
            return notificationRepository.findAll(pageable).map(NotificationDto::from);
        }
        return notificationRepository.searchByKeyword(keyword, pageable).map(NotificationDto::from);
    }

    @Override
    public NotificationDto getNotification(String ntfcNo) {
        Notification notification = notificationRepository.findById(ntfcNo)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        return NotificationDto.from(notification);
    }

    @Override
    @Transactional
    public String createNotification(String userId, NotificationDto dto) {
        String ntfcNo = "NTFC_" + String.format("%013d", System.currentTimeMillis());

        Notification notification = Notification.builder()
                .ntfcNo(ntfcNo)
                .ntfcSj(dto.getNtfcSj())
                .ntfcCn(dto.getNtfcCn())
                .ntfcDate(dto.getNtfcDate())
                .ntfcTime(dto.getNtfcTime())
                .bhNtfcIntrvl(dto.getBhNtfcIntrvl())
                .uniqId(dto.getUniqId())
                .frstRegisterId(userId)
                .build();

        notificationRepository.save(notification);
        return ntfcNo;
    }

    @Override
    @Transactional
    public void updateNotification(String ntfcNo, String userId, NotificationDto dto) {
        Notification notification = notificationRepository.findById(ntfcNo)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        notification.update(dto.getNtfcSj(), dto.getNtfcCn(), dto.getNtfcDate(),
                dto.getNtfcTime(), dto.getBhNtfcIntrvl(), userId);
    }

    @Override
    @Transactional
    public void deleteNotification(String ntfcNo) {
        Notification notification = notificationRepository.findById(ntfcNo)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));
        notificationRepository.delete(notification);
    }

    @Override
    public List<NotificationDto> getActiveNotifications() {
        String today = LocalDate.now().toString().replace("-", "");
        return notificationRepository.findActiveNotifications(today).stream()
                .map(NotificationDto::from)
                .collect(Collectors.toList());
    }
}
