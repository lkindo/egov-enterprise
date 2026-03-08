package com.company.project.service.memoreport.dto;

import com.company.project.domain.memoreport.MemoReport;
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
public class MemoReportDto {

    @Schema(description = "Description")
    private String reprtId;

    @Schema(description = "Description")
    private String reprtSj;

    @Schema(description = "Description")
    private String reportDe;

    @Schema(description = "Description")
    private String wrterId;

    @Schema(description = "Description")
    private String wrterNm;

    @Schema(description = "Description")
    private String reportrId;

    @Schema(description = "Description")
    private String reportrNm;

    @Schema(description = "Description")
    private String reportCn;

    @Schema(description = "Description")
    private String atchFileId;

    @Schema(description = "Description")
    private String drctMatter;

    @Schema(description = "Description")
    private String drctMatterRegistDt;

    @Schema(description = "Description")
    private String reportrInqireDt;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public String getFrstRegisterId() {
        return wrterId;
    }

    public LocalDateTime getFrstRegistPnttm() {
        return createdDate;
    }

    public static MemoReportDto from(MemoReport entity) {
        if (entity == null) return null;
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
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
