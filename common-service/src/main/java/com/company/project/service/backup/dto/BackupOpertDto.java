package com.company.project.service.backup.dto;

import com.company.project.domain.backup.BackupOpert;
import com.company.project.domain.backup.BackupSchdulDfk;
import lombok.*;

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

    // Manual getters
    public String getBackupOpertId() {
        return backupOpertId;
    }

    public String getBackupOpertNm() {
        return backupOpertNm;
    }

    public String getBackupOrginlDrctry() {
        return backupOrginlDrctry;
    }

    public String getBackupStreDrctry() {
        return backupStreDrctry;
    }

    public String getCmprsSe() {
        return cmprsSe;
    }

    public String getCmprsSeNm() {
        return cmprsSeNm;
    }

    public String getExecutCycle() {
        return executCycle;
    }

    public String getExecutCycleNm() {
        return executCycleNm;
    }

    public String getExecutSchdulDe() {
        return executSchdulDe;
    }

    public String getExecutSchdulHour() {
        return executSchdulHour;
    }

    public String getExecutSchdulMnt() {
        return executSchdulMnt;
    }

    public String getExecutSchdulSecnd() {
        return executSchdulSecnd;
    }

    public String[] getExecutSchdulDfkSes() {
        return executSchdulDfkSes;
    }

    public String getUseAt() {
        return useAt;
    }

    public String getExecutSchdul() {
        return executSchdul;
    }

    public String getLastUpdusrId() {
        return lastUpdusrId;
    }

    public String getLastUpdtPnttm() {
        return lastUpdtPnttm;
    }

    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    public String getFrstRegistPnttm() {
        return frstRegistPnttm;
    }

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
        cronExpression.append(this.executSchdulSecnd != null ? this.executSchdulSecnd : "0");

        // Minutes
        cronExpression.append(" ").append(this.executSchdulMnt != null ? this.executSchdulMnt : "0");

        // Hours
        cronExpression.append(" ").append(this.executSchdulHour != null ? this.executSchdulHour : "0");

        // Day of Month
        if ("01".equals(this.executCycle)) {
            cronExpression.append(" *");
        } else if ("02".equals(this.executCycle)) {
            cronExpression.append(" ?");
        } else if (this.executSchdulDe != null && this.executSchdulDe.length() >= 8) {
            cronExpression.append(" ").append(this.executSchdulDe.substring(6, 8));
        } else {
            cronExpression.append(" *");
        }

        // Month
        if ("01".equals(this.executCycle) || "02".equals(this.executCycle) || "03".equals(this.executCycle)) {
            cronExpression.append(" *");
        } else if (this.executSchdulDe != null && this.executSchdulDe.length() >= 6) {
            cronExpression.append(" ").append(this.executSchdulDe.substring(4, 6));
        } else {
            cronExpression.append(" *");
        }

        // Day of Week
        if ("02".equals(this.executCycle) && this.executSchdulDfkSes != null) {
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
        if ("05".equals(this.executCycle) && this.executSchdulDe != null && this.executSchdulDe.length() >= 4) {
            cronExpression.append(" ").append(this.executSchdulDe.substring(0, 4));
        }

        return cronExpression.toString();
    }

    // Manual setters for safety
    public void setFrstRegisterId(String frstRegisterId) {
        this.frstRegisterId = frstRegisterId;
    }

    public void setLastUpdusrId(String lastUpdusrId) {
        this.lastUpdusrId = lastUpdusrId;
    }
}