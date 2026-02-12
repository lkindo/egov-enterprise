package com.company.project.service.consult.dto;

import com.company.project.domain.consult.CnsltManage;
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
@Schema(description = "상담 관리 DTO")
public class CnsltManageDto {

    @Schema(description = "상담 ID")
    private String cnsltId;

    @Schema(description = "상담 제목")
    private String cnsltSj;

    @Schema(description = "상담 내용")
    private String cnsltCn;

    @Schema(description = "공개 여부")
    private String othbcAt;

    @Schema(description = "작성 비밀번호")
    private String writngPassword;

    @Schema(description = "작성자 명")
    private String wrterNm;

    @Schema(description = "조회수")
    private Integer inqireCo;

    @Schema(description = "진행 상태 코드")
    private String qnaProcessSttusCode;

    @Schema(description = "처리 내용")
    private String managtCn;

    @Schema(description = "처리 일자")
    private String managtDe;

    @Schema(description = "등록자 ID")
    private String createdBy;

    @Schema(description = "등록일시")
    private LocalDateTime createdDate;

    public static CnsltManageDto from(CnsltManage entity) {
        if (entity == null) return null;
        return CnsltManageDto.builder()
                .cnsltId(entity.getCnsltId())
                .cnsltSj(entity.getCnsltSj())
                .cnsltCn(entity.getCnsltCn())
                .othbcAt(entity.getOthbcAt())
                .writngPassword(entity.getWritngPassword())
                .wrterNm(entity.getWrterNm())
                .inqireCo(entity.getInqireCo())
                .qnaProcessSttusCode(entity.getQnaProcessSttusCode())
                .managtCn(entity.getManagtCn())
                .managtDe(entity.getManagtDe())
                .createdBy(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
