package com.company.project.business.service.schedule.dto;

import com.company.project.business.domain.schedule.Schedule;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ScheduleDto {
    private String schdulId;
    private String schdulSe;
    private String schdulDeptId;
    private String schdulKindCode;
    private String schdulBgnde;
    private String schdulEndde;
    private String schdulNm;
    private String schdulCn;
    private String schdulPlace;
    private String schdulIpcrCode;
    private String schdulChargerId;
    private String atchFileId;
    private String reptitSeCode;
    private String frstRegisterId;
    private LocalDateTime createdDate;
    private String lastUpdusrId;
    private LocalDateTime modifiedDate;

    public static ScheduleDto from(Schedule entity) {
        return ScheduleDto.builder()
                .schdulId(entity.getSchdulId())
                .schdulSe(entity.getSchdulSe())
                .schdulDeptId(entity.getSchdulDeptId())
                .schdulKindCode(entity.getSchdulKindCode())
                .schdulBgnde(entity.getSchdulBgnde())
                .schdulEndde(entity.getSchdulEndde())
                .schdulNm(entity.getSchdulNm())
                .schdulCn(entity.getSchdulCn())
                .schdulPlace(entity.getSchdulPlace())
                .schdulIpcrCode(entity.getSchdulIpcrCode())
                .schdulChargerId(entity.getSchdulChargerId())
                .atchFileId(entity.getAtchFileId())
                .reptitSeCode(entity.getReptitSeCode())
                .frstRegisterId(entity.getFrstRegisterId())
                .createdDate(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastUpdusrId())
                .modifiedDate(entity.getLastModifiedDate())
                .build();
    }
}
