package com.company.project.service.dam.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class KnowledgeRequestDto {
    private String knoId;
    private String knoNm;
    private String knoCn;
    private String knoTypeCd;
    private String orgnztId;
    private String speId;
    private String emplyrId;
    private String atchFileId;
    private String ansParents;
    private Integer ansDepth;
    private Integer ansSeq;
    private Long ansNumber;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
    private String lastUpdusrId;
    private LocalDateTime lastUpdusrPnttm;
}
