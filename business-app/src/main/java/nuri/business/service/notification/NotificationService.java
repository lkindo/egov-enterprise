package nuri.business.service.notification;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.notification.Notification;
import nuri.business.domain.notification.NotificationRepository;
import nuri.business.service.notification.dto.NotificationDto;
import nuri.business.service.notification.dto.NotificationMapper;
import nuri.foundation.core.util.TransactionUtils;
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
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationMapper notificationMapper;

    public Page<NotificationDto> getNotificationList(String userId, String keyword, Pageable pageable) {
        requireUserId(userId);
        log.debug("Fetching notification list for receiver: {} with keyword: {}", userId, keyword);
        return notificationRepository.searchNotificationsByReceiver(userId, keyword, pageable)
                .map(notificationMapper::toDto);
    }

    public NotificationDto getNotification(Long notiSn, String userId) {
        requireUserId(userId);
        log.debug("Fetching notification details for receiver: {}, ID: {}", userId, notiSn);
        return findOwnedNotification(notiSn, userId)
                .map(notificationMapper::toDto)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    @Transactional
    public Long createNotification(String userId, NotificationDto dto) {
        requireUserId(userId);
        log.info("Creating notification for user: {}", userId);
        Notification entity = Notification.builder()
                .notiTtlNm(dto.getNotiTtlNm())
                .notiCn(dto.getNotiCn())
                .rcvrId(userId)
                .linkUrl(dto.getLinkUrl())
                .build();

        Notification saved = notificationRepository.save(entity);

        // [커밋-후 발송] WebSocket 알림은 저장 트랜잭션 커밋 후에 보낸다 — 롤백(제약위반/상위 tx 롤백) 시
        // DB 에 없는 유령 알림이 클라이언트로 전송되는 결함 방지(Sms/Mail/Board/Sanction 과 동일한 runAfterCommit 표준).
        NotificationDto responseDto = notificationMapper.toDto(saved);
        TransactionUtils.runAfterCommit(() -> {
            try {
                // 수신자 식별자는 인증 Principal(esntlId)과 동일하다. 공용 topic 으로 복제하면
                // 다른 사용자의 제목·본문·링크가 전원에게 노출되므로 개인 user destination 만 사용한다.
                messagingTemplate.convertAndSendToUser(userId, "/queue/notifications", responseDto);
            } catch (Exception e) {
                log.error("Failed to send WebSocket notification", e);
            }
        });

        return saved.getNotiSn();
    }

    @Transactional
    public void updateNotification(Long notiSn, String userId, NotificationDto dto) {
        requireUserId(userId);
        log.info("Updating notification ID: {} for user: {}", notiSn, userId);
        Notification entity = findOwnedNotification(notiSn, userId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        entity.update(dto.getNotiTtlNm(), dto.getNotiCn(), dto.getNotiDt(), dto.getNotiIvlVal());
    }

    @Transactional
    public void deleteNotification(Long notiSn, String userId) {
        requireUserId(userId);
        log.warn("Deleting notification ID: {} for receiver: {}", notiSn, userId);
        Notification owned = findOwnedNotification(notiSn, userId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        notificationRepository.delete(owned);
    }

    public Page<NotificationDto> getActiveNotifications(Pageable pageable) {
        log.debug("Fetching active notifications with pagination");
        return notificationRepository.findAll(pageable)
                .map(notificationMapper::toDto);
    }

    public List<NotificationDto> getActiveNotificationsAll() {
        // [경고] 대량 데이터 조회 - 배치 작업 등 특수한 경우에만 사용
        log.warn("Fetching ALL notifications without pagination - use with caution");
        return notificationRepository.findAll().stream()
                .map(notificationMapper::toDto)
                .collect(Collectors.toList());
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByRcvrIdAndReadYn(userId, "N");
    }

    @Transactional
    public void markAsRead(Long notiSn, String userId) {
        requireUserId(userId);
        log.info("Marking notification ID: {} as read for receiver: {}", notiSn, userId);
        Notification owned = findOwnedNotification(notiSn, userId)
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
        owned.markAsRead();
    }

    private java.util.Optional<Notification> findOwnedNotification(Long notiSn, String userId) {
        return notificationRepository.findByNotiSnAndRcvrId(Objects.requireNonNull(notiSn), userId);
    }

    private static void requireUserId(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE);
        }
    }
}
