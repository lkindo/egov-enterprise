package com.company.project.service.schedule.dto;

import com.company.project.domain.schedule.LeaderSchedule;
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
public class LeaderScheduleDto {

    @Schema(description = "Description")
    private String scheduleId;

    @Schema(description = "Description")
    private String scheduleSe;

    @Schema(description = "Description")
    private String scheduleNm;

    @Schema(description = "Description")
    private String scheduleCn;

    @Schema(description = "Description")
    private String schedulePlace;

    @Schema(description = "Description")
    private String leaderId;

    @Schema(description = "Description")
    private String leaderName;

    @Schema(description = "Description")
    private String reptitSeCode;

    @Schema(description = "Description")
    private String scheduleIpcrCode;

    @Schema(description = "Description")
    private String beginDate;

    @Schema(description = "Description")
    private String endDate;

    @Schema(description = "Description")
    private String chargerId;

    @Schema(description = "Description")
    private String chargerName;

    @Schema(description = "Description")
    private String createdBy;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    // Aliases for legacy compatibility
    public String getRepeatYn() { return reptitSeCode; }
    public String getImportanceCode() { return scheduleIpcrCode; }
    public String getScheduleType() { return scheduleSe; }

    public static LeaderScheduleDto from(LeaderSchedule entity) {
        if (entity == null) return null;
        return LeaderScheduleDto.builder()
                .scheduleId(entity.getScheduleId())
                .scheduleSe(entity.getScheduleSe())
                .scheduleNm(entity.getScheduleNm())
                .scheduleCn(entity.getScheduleCn())
                .schedulePlace(entity.getSchedulePlace())
                .leaderId(entity.getLeaderId())
                .reptitSeCode(entity.getReptitSeCode())
                .scheduleIpcrCode(entity.getScheduleIpcrCode())
                .beginDate(entity.getBeginDate())
                .endDate(entity.getEndDate())
                .chargerId(entity.getChargerId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}