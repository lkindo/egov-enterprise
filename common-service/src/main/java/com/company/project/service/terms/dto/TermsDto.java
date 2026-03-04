package com.company.project.service.terms.dto;

import com.company.project.domain.terms.Terms;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TermsDto {
    private String useStplatId;
    private String useStplatNm;
    private String useStplatCn;
    private String infoProvdAgreCn;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;

    public static TermsDto from(Terms entity) {
        return TermsDto.builder()
                .useStplatId(entity.getUseStplatId())
                .useStplatNm(entity.getUseStplatNm())
                .useStplatCn(entity.getUseStplatCn())
                .infoProvdAgreCn(entity.getInfoProvdAgreCn())
                .frstRegisterId(entity.getFrstRegisterId())
                .frstRegisterPnttm(entity.getCreatedDate())
                .lastUpdusrId(entity.getLastUpdusrId())
                .lastUpdusrPnttm(entity.getModifiedDate())
                .build();
    }
}