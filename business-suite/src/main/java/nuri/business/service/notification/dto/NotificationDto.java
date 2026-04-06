package nuri.business.service.notification.dto;

import nuri.business.domain.notification.Notification;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@Builder
public class NotificationDto {
    private String ntfcNo;
    private String ntfcSj;
    private String ntfcCn;
    private String ntfcTime;
    private String bhNtfcIntrvl;
    private String receiverId;
    private String isRead;
    private String uniqId; // For linkUrl mapping
    private LocalDateTime createdDate;

    public static NotificationDto from(Notification entity) {
        return NotificationDto.builder()
                .ntfcNo(entity.getNtfcNo())
                .ntfcSj(entity.getNtfcSj())
                .ntfcCn(entity.getNtfcCn())
                .receiverId(entity.getReceiverId())
                .isRead(entity.getIsRead())
                .uniqId(entity.getLinkUrl())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
