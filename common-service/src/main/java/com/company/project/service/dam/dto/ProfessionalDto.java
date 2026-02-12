package com.company.project.service.dam.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfessionalDto {
    private String speId;
    private String userNm;
    private String knoTypeCd;
    private String knoTypeNm;
    private String orgnztId;
    private String orgnztNm;
    private String appTypeCd; // EXPERT_GRAD
    private String speExpCn;
    private String speConfmDe;
    private String lastUpdusrId;
}
