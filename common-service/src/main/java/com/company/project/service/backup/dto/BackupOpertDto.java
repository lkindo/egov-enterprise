package com.company.project.service.backup.dto;

import com.company.project.domain.backup.BackupOpert;
import com.company.project.domain.backup.BackupSchdulDfk;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BackupOpertDto {
    private String backupOpertId;
    private String backupOpertNm;
    private String backupOrginlDrctry;
    private String backupStreDrctry;
    private String cmprsSe;
    private String cmprsSeNm;
    private String executCycle;
    private String executCycleNm;
    private String executSchdulDe;
    private String executSchdulHour;
    private String executSchdulMnt;
    private String executSchdulSecnd;
    private String[] executSchdulDfkSes;
    private String useAt;
    private String executSchdul;
    private String lastUpdusrId;
    private String lastUpdtPnttm;
    private String frstRegisterId;
    private String frstRegistPnttm;

    public static BackupOpertDto from(BackupOpert entity) {
        return from(entity, true);
    }

    public static BackupOpertDto from(BackupOpert entity, boolean includeChildren) {
        String[] dfkSes = null;
        if (includeChildren) {
            dfkSes = entity.getExecutSchdulDfkSes().stream()
                    .map(BackupSchdulDfk::getExecutSchdulDfkSe)
                    .toArray(String[]::new);
        }

        return BackupOpertDto.builder()
                .backupOpertId(entity.getBackupOpertId())
                .backupOpertNm(entity.getBackupOpertNm())
                .backupOrginlDrctry(entity.getBackupOrginlDrctry())
                .backupStreDrctry(entity.getBackupStreDrctry())
                .cmprsSe(entity.getCmprsSe())
                .executCycle(entity.getExecutCycle())
                .executSchdulDe(entity.getExecutSchdulDe())
                .executSchdulHour(entity.getExecutSchdulHour())
                .executSchdulMnt(entity.getExecutSchdulMnt())
                .executSchdulSecnd(entity.getExecutSchdulSecnd())
                .executSchdulDfkSes(dfkSes)
                .useAt(entity.getUseAt())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegistPnttm(entity.getFrstRegistPnttm())
                .build();
    }

    public String toCronExpression() {
        StringBuilder cronExpression = new StringBuilder();

        // Seconds
        cronExpression.append(this.executSchdulSecnd);

        // Minutes
        cronExpression.append(" ").append(this.executSchdulMnt);

        // Hours
        cronExpression.append(" ").append(this.executSchdulHour);

        // Day of Month
        if ("01".equals(this.executCycle)) {
            cronExpression.append(" *");
        } else if ("02".equals(this.executCycle)) {
            cronExpression.append(" ?");
        } else {
            cronExpression.append(" ").append(this.executSchdulDe.substring(6, 8));
        }

        // Month
        if ("01".equals(this.executCycle) || "02".equals(this.executCycle) || "03".equals(this.executCycle)) {
            cronExpression.append(" *");
        } else {
            cronExpression.append(" ").append(this.executSchdulDe.substring(4, 6));
        }

        // Day of Week
        if ("02".equals(this.executCycle)) {
            StringBuilder dayOfWeek = new StringBuilder();
            for (int i = 0; i < this.executSchdulDfkSes.length; i++) {
                if (i != 0) {
                    dayOfWeek.append(",");
                }
                dayOfWeek.append(this.executSchdulDfkSes[i]);
            }
            cronExpression.append(" ").append(dayOfWeek);
        } else {
            cronExpression.append(" ?");
        }

        // Year
        if ("05".equals(this.executCycle)) {
            cronExpression.append(" ").append(this.executSchdulDe.substring(0, 4));
        }

        return cronExpression.toString();
    }
    
    // 누락된 메서드들 추가
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }
    
    public String getFrstRegisterId() {
        return this.frstRegisterId;
    }
    
    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }
    
    public String getLastUpdusrId() {
        return this.lastUpdusrId;
    }
}
