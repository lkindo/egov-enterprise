package com.company.project.service.schedule.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LeaderScheduleDto {
    private String scheduleId;
    private String scheduleNm;
    private String scheduleCn;
    private String leaderId;
    private String chargerId;
    private String beginDate;
    private String endDate;
    private String repeatYn;
    private String importanceCode;
    private String scheduleType;
}
