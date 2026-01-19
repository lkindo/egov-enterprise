package com.company.project.service.memoreport.dto;

import com.company.project.domain.memoreport.MemoReport;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 메모보고 DTO
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemoReportDto {

    private String reprtId;
    private String reprtSj;
    private String reportDe;
    private String wrterId;
    private String reportrId;
    private String reportCn;
    private String atchFileId;
    private String drctMatter;
    private String drctMatterRegistDt;
    private String reportrInqireDt;
    private String frstRegisterId;
    private LocalDateTime frstRegistPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdtPnttm;

    public static MemoReportDto fromEntity(MemoReport entity) {
        if (entity == null)
            return null;
        return MemoReportDto.builder()
                .reprtId(entity.getReprtId())
                .reprtSj(entity.getReprtSj())
                .reportDe(entity.getReportDe())
                .wrterId(entity.getWrterId())
                .reportrId(entity.getReportrId())
                .reportCn(entity.getReportCn())
                .atchFileId(entity.getAtchFileId())
                .drctMatter(entity.getDrctMatter())
                .drctMatterRegistDt(entity.getDrctMatterRegistDt())
                .reportrInqireDt(entity.getReportrInqireDt())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegistPnttm(entity.getFrstRegistPnttm())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdtPnttm(entity.getLastUpdtPnttm())
                .build();
    }

    public MemoReport toEntity() {
        return MemoReport.builder()
                .reprtId(this.reprtId)
                .reprtSj(this.reprtSj)
                .reportDe(this.reportDe)
                .wrterId(this.wrterId)
                .reportrId(this.reportrId)
                .reportCn(this.reportCn)
                .atchFileId(this.atchFileId)
                .drctMatter(this.drctMatter)
                .drctMatterRegistDt(this.drctMatterRegistDt)
                .reportrInqireDt(this.reportrInqireDt)
                .frstRegisterId(this.frstRegisterId)
                .frstRegistPnttm(this.frstRegistPnttm)
                .lastUpdusrId(this.lastUpdusrId)
                .lastUpdtPnttm(this.lastUpdtPnttm)
                .build();
    }
}
