package com.company.project.service.notification.dto;

import com.company.project.domain.notification.Notification;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 정보알림 DTO
 */
@Getter
@Builder
public class NotificationDto {
    private String ntfcNo;
    private String ntfcSj;
    private String ntfcCn;
    private String ntfcDate;
    private String ntfcTime;
    private String bhNtfcIntrvl;
    private String uniqId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static NotificationDto from(Notification entity) {
        return NotificationDto.builder()
                .ntfcNo(entity.getNtfcNo())
                .ntfcSj(entity.getNtfcSj())
                .ntfcCn(entity.getNtfcCn())
                .ntfcDate(entity.getNtfcDate())
                .ntfcTime(entity.getNtfcTime())
                .bhNtfcIntrvl(entity.getBhNtfcIntrvl())
                .uniqId(entity.getUniqId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getLastUpdusrPnttm())
                .build();
    }
}
