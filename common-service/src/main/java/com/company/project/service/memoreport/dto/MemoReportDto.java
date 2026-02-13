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
@Schema(description = "메모보고 정보 DTO")
public class MemoReportDto {

    @Schema(description = "보고 ID")
    private String reprtId;

    @Schema(description = "보고 제목")
    private String reprtSj;

    @Schema(description = "보고 일자")
    private String reportDe;

    @Schema(description = "작성자 ID")
    private String wrterId;

    @Schema(description = "작성자 명")
    private String wrterNm;

    @Schema(description = "보고대상자 ID")
    private String reportrId;

    @Schema(description = "보고대상자 명")
    private String reportrNm;

    @Schema(description = "보고 내용")
    private String reportCn;

    @Schema(description = "첨부파일 ID")
    private String atchFileId;

    @Schema(description = "지시 사항")
    private String drctMatter;

    @Schema(description = "지시 사항 등록 일시")
    private String drctMatterRegistDt;

    @Schema(description = "보고대상자 확인 일시")
    private String reportrInqireDt;

    @Schema(description = "등록일시")
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
