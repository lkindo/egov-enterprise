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
@Schema(description = "Description")
public class NotificationDto {

    @Schema(description = "Description")
    private String ntfcNo;

    @Schema(description = "Description")
    private String ntfcSj;

    @Schema(description = "Description")
    private String ntfcCn;

    @Schema(description = "Description")
    private String ntfcDate;

    @Schema(description = "Description")
    private String ntfcTime;

    @Schema(description = "Description")
    private String bhNtfcIntrvl;

    @Schema(description = "Description")
    private String uniqId;

    @Schema(description = "Description")
    private String frstRegisterId;

    @Schema(description = "Description")
    private LocalDateTime frstRegisterPnttm;

    @Schema(description = "Description")
    private String lastUpdusrId;

    @Schema(description = "Description")
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

    // ?꾨씫??硫붿??뱾 ?붽?
    public String getNtfcTime() {
        return this.ntfcTime;
    }

    public String getBhNtfcIntrvl() {
        return this.bhNtfcIntrvl;
    }

    public void setNtfcTime(String ntfcTime) {
        this.ntfcTime = ntfcTime;
    }

    public void setBhNtfcIntrvl(String bhNtfcIntrvl) {
        this.bhNtfcIntrvl = bhNtfcIntrvl;
    }
}
