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

    @Schema(description = "알림 일자")
    private String ntfcDate;

    @Schema(description = "알림 시간")
    private String ntfcTime;

    @Schema(description = "사전 알림 간격")
    private String bhNtfcIntrvl;

    @Schema(description = "고유 ID")
    private String uniqId;

    @Schema(description = "최초등록자 ID")
    private String frstRegisterId;

    @Schema(description = "최초등록시점")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "최종수정자 ID")
    private String lastUpdusrId;

    @Schema(description = "최종수정시점")
    private LocalDateTime lastUpdusrPnttm;

    public static NotificationDto from(Notification entity) {
        if (entity == null) return null;
        return NotificationDto.builder()
                .ntfcNo(entity.getNtfcNo())
                .ntfcSj(entity.getNtfcSj())
                .ntfcCn(entity.getNtfcCn())
                .ntfcTime(entity.getNtfcTime())
                .bhNtfcIntrvl(entity.getBhNtfcIntrvl())
                .frstRegisterId(entity.getCreatedBy())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastModifiedBy())
                .lastUpdusrPnttm(entity.getLastModifiedDate())
                .build();
    }
}
