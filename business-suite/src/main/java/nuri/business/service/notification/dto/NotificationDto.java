package nuri.business.service.notification.dto;

import jakarta.validation.constraints.*;
import nuri.business.domain.notification.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import io.swagger.v3.oas.annotations.media.Schema;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "사용자 알림 DTO")
public class NotificationDto {

    @NotBlank
    @Size(max = 20)
    @Schema(description = "알림 일련번호")
    private String ntfcNo;

    @Size(max = 100)
    @Schema(description = "알림 제목")
    private String ntfcSj;

    @Size(max = 4000)
    @Schema(description = "알림 내용")
    private String ntfcCn;

    @Schema(description = "알림 일시")
    private LocalDateTime ntfcTime;

    @Size(max = 100)
    @Schema(description = "알림 주기 설정")
    private String bhNtfcIntrvl;

    @Size(max = 20)
    @Schema(description = "수신자 ID")
    private String receiverId;

    @Size(max = 1)
    @Schema(description = "읽음 여부")
    private String isRead;

    @Size(max = 1000)
    @Schema(description = "링크 URL")
    private String uniqId;

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
                .ntfcTime(entity.getNtfcTime())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
