package com.company.project.service.namecard.dto;

import com.company.project.domain.namecard.NameCard;
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
public class NameCardDto {

    @Schema(description = "Description")
    private String ncrdId;

    @Schema(description = "Description")
    private String ncrdNm;

    @Schema(description = "Description")
    private String cmpnyNm;

    @Schema(description = "Description")
    private String deptNm;

    @Schema(description = "Description")
    private String clsfNm;

    @Schema(description = "Description")
    private String ofcpsNm;

    @Schema(description = "Description")
    private String emailAdres;

    @Schema(description = "Description")
    private String telNo;

    @Schema(description = "Description")
    private String mbtlNum;

    @Schema(description = "Description")
    private String adres;

    @Schema(description = "Description")
    private String detailAdres;

    @Schema(description = "Description")
    private String zipCode;

    @Schema(description = "Description")
    private String remark;

    @Schema(description = "Description")
    private String othbcAt;

    @Schema(description = "Description")
    private String ncrdTrgterId;

    @Schema(description = "Description")
    private String extrlUserAt;

    @Schema(description = "Description")
    private String frstRegisterId;

    @Schema(description = "Description")
    private LocalDateTime createdDate;

    public String getFrstRegisterId() {
        return frstRegisterId;
    }

    public LocalDateTime getFrstRegisterPnttm() {
        return createdDate;
    }

    public static NameCardDto from(NameCard entity) {
        if (entity == null) return null;
        return NameCardDto.builder()
                .ncrdId(entity.getNcrdId())
                .ncrdNm(entity.getNcrdNm())
                .cmpnyNm(entity.getCmpnyNm())
                .deptNm(entity.getDeptNm())
                .clsfNm(entity.getClsfNm())
                .ofcpsNm(entity.getOfcpsNm())
                .emailAdres(entity.getEmailAdres())
                .telNo(entity.getTelNo())
                .mbtlNum(entity.getMbtlNum())
                .adres(entity.getAdres())
                .detailAdres(entity.getDetailAdres())
                .zipCode(entity.getZipCode())
                .remark(entity.getRemark())
                .othbcAt(entity.getOthbcAt())
                .ncrdTrgterId(entity.getNcrdTrgterId())
                .extrlUserAt(entity.getExtrlUserAt())
                .frstRegisterId(entity.getCreatedBy())
                .createdDate(entity.getCreatedDate())
                .build();
    }
}
