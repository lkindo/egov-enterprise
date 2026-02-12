package com.company.project.service.notification.dto;

import com.company.project.domain.notification.Notification;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "정보알림 정보 DTO")
public class NotificationDto {

    @Schema(description = "알림 번호")
    private String ntfcNo;

    @Schema(description = "알림 제목")
    private String ntfcSj;

    @Schema(description = "알림 내용")
    private String ntfcCn;

    @Schema(description = "알림 시간")
    private String ntfcTime;

    @Schema(description = "사전 알림 간격")
    private String bhNtfcIntrvl;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static NotificationDto from(Notification entity) {
        if (entity == null) return null;
        return NotificationDto.builder()
                .ntfcNo(entity.getNtfcNo())
                .ntfcSj(entity.getNtfcSj())
                .ntfcCn(entity.getNtfcCn())
                .ntfcTime(entity.getNtfcTime())
                .bhNtfcIntrvl(entity.getBhNtfcIntrvl())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
