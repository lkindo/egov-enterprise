package com.company.project.service.digitalassetmanagement.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Schema(description = "지식 요청 정보")
public class KnowledgeRequestDto {
    @Schema(description = "지식 ID")
    private String knoId;
    @Schema(description = "지식 명칭")
    private String knoNm;
    @Schema(description = "지식 내용")
    private String knoCn;
    @Schema(description = "지식 유형 코드")
    private String knoTypeCd;
    @Schema(description = "조직(부서) ID")
    private String orgnztId;
    @Schema(description = "전문가 ID")
    private String speId;
    @Schema(description = "사용자 ID")
    private String emplyrId;
    @Schema(description = "첨부 파일 ID")
    private String atchFileId;
    @Schema(description = "상위 질문/답변 ID")
    private String ansParents;
    @Schema(description = "답변 깊이")
    private Integer ansDepth;
    @Schema(description = "답변 순서")
    private Integer ansSeq;
    @Schema(description = "답변 번호")
    private Long ansNumber;
    @Schema(description = "최초 등록자 ID")
    private String frstRegisterId;
    @Schema(description = "최초 등록 일시")
    private LocalDateTime frstRegisterPnttm;
    @Schema(description = "최종 수정자 ID")
    private String lastUpdusrId;
    @Schema(description = "최종 수정 일시")
    private LocalDateTime lastUpdusrPnttm;
}
