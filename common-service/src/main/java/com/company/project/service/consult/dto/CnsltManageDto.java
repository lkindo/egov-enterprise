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
@Schema(description = "Consultation Management DTO")
public class CnsltManageDto {

    @Schema(description = "Consultation ID")
    private String cnsltId;

    @Schema(description = "Consultation Subject")
    private String cnsltSj;

    @Schema(description = "Consultation Content")
    private String cnsltCn;

    @Schema(description = "Public Status")
    private String othbcAt;

    @Schema(description = "Writing Password")
    private String writngPassword;

    @Schema(description = "Writer Name")
    private String wrterNm;

    @Schema(description = "Inquiry Count")
    private Integer inqireCo;

    @Schema(description = "Process Status Code")
    private String qnaProcessSttusCode;

    @Schema(description = "Management Content")
    private String managtCn;

    @Schema(description = "Management Date")
    private String managtDe;

    @Schema(description = "Created By ID")
    private String createdBy;

    @Schema(description = "Created Date")
    private LocalDateTime createdDate;

    public static CnsltManageDto from(CnsltManage entity) {
        if (entity == null)
            return null;
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
                .createdBy(entity.getFrstRegisterId())
                .createdDate(entity.getFrstRegisterPnttm())
                .build();
    }
}