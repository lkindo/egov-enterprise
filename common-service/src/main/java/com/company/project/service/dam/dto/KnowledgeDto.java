package com.company.project.service.dam.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeDto {
    private String knoId;
    private String knoNm;
    private String knoCn;
    private String knoTypeCd;
    private String knoTypeNm;
    private String orgnztId;
    private String orgnztNm;
    private String speId;
    private String speNm;
    private String othbcAt;
    private String appYmd;
    private String knoAps;
    private String junkYmd;
    private String atchFileId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;
}
