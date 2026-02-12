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
@Schema(description = "간부일정 정보 DTO")
public class LeaderScheduleDto {

    @Schema(description = "일정 ID")
    private String scheduleId;

    @Schema(description = "일정 구분")
    private String scheduleSe;

    @Schema(description = "일정 명")
    private String scheduleNm;

    @Schema(description = "일정 내용")
    private String scheduleCn;

    @Schema(description = "일정 장소")
    private String schedulePlace;

    @Schema(description = "간부 ID")
    private String leaderId;

    @Schema(description = "간부 명")
    private String leaderName;

    @Schema(description = "반복 구분 코드")
    private String reptitSeCode;

    @Schema(description = "시작 일자")
    private String beginDate;

    @Schema(description = "종료 일자")
    private String endDate;

    @Schema(description = "담당자 ID")
    private String chargerId;

    @Schema(description = "담당자 명")
    private String chargerName;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

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
                .beginDate(entity.getBeginDate())
                .endDate(entity.getEndDate())
                .chargerId(entity.getChargerId())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
