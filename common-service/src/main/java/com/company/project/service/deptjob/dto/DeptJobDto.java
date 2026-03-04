package com.company.project.service.deptjob.dto;

import com.company.project.domain.deptjob.DeptJob;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeptJobDto {
    private String deptJobId;
    private String deptJobbxId;
    private String deptJobbxNm;
    private String deptId;
    private String deptNm;
    private String deptJobNm;
    private String deptJobCn;
    private String chargerId;
    private String chargerNm;
    private String priort;
    private String atchFileId;
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    public static DeptJobDto from(DeptJob entity) {
        return DeptJobDto.builder()
                .deptJobId(entity.getDeptJobId())
                .deptJobbxId(entity.getDeptJobbxId())
                .deptJobNm(entity.getDeptJobNm())
                .deptJobCn(entity.getDeptJobCn())
                .chargerId(entity.getChargerId())
                .priort(entity.getPriort())
                .atchFileId(entity.getAtchFileId())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegistPnttm(entity.getFrstRegistPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .build();
    }
}
