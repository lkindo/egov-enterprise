package nuri.business.service.notification.dto;

import nuri.business.domain.notification.Notification;
import lombok.Builder;
import lombok.Getter;
import java.time.LocalDateTime;
import io.swagger.v3.oas.annotations.media.Schema;

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
    @Schema(description = "등록 일시")
    private LocalDateTime createdDate;

    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getNtfcId() { return ntfcNo; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public LocalDateTime getNtfcPnttm() { return createdDate; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getReadYn() { return isRead; }

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
