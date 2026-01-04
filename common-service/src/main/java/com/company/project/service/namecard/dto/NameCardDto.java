package com.company.project.service.namecard.dto;

import com.company.project.domain.namecard.NameCard;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * 명함 DTO
 */
@Getter
@Builder
public class NameCardDto {
    private String ncrdId;
    private String ncrdNm;
    private String cmpnyNm;
    private String deptNm;
    private String clsfNm;
    private String ofcpsNm;
    private String emailAdres;
    private String telNo;
    private String mbtlNum;
    private String adres;
    private String detailAdres;
    private String zipCode;
    private String remark;
    private String othbcAt;
    private String ncrdTrgterId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;

    public static NameCardDto from(NameCard entity) {
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
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getFrstRegisterPnttm())
                .build();
    }
}
