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
@Schema(description = "명함 정보 DTO")
public class NameCardDto {

    @Schema(description = "명함 ID")
    private String ncrdId;

    @Schema(description = "이름")
    private String ncrdNm;

    @Schema(description = "회사명")
    private String cmpnyNm;

    @Schema(description = "부서명")
    private String deptNm;

    @Schema(description = "직급명")
    private String clsfNm;

    @Schema(description = "직위명")
    private String ofcpsNm;

    @Schema(description = "이메일 주소")
    private String emailAdres;

    @Schema(description = "전화번호")
    private String telNo;

    @Schema(description = "휴대폰번호")
    private String mbtlNum;

    @Schema(description = "주소")
    private String adres;

    @Schema(description = "상세주소")
    private String detailAdres;

    @Schema(description = "우편번호")
    private String zipCode;

    @Schema(description = "비고")
    private String remark;

    @Schema(description = "공개여부")
    private String othbcAt;

    @Schema(description = "명함대상자 ID")
    private String ncrdTrgterId;

    @Schema(description = "외부사용자여부")
    private String extrlUserAt;

    @Schema(description = "등록자 ID")
    private String frstRegisterId;

    @Schema(description = "등록일시")
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
