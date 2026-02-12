package com.company.project.domain.dam;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeInfSearchResult {
    private String knoId;
    private String knoNm;
    private String orgnztNm;
    private String knoTypeNm;
    private String userNm;
    private String appYmd;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
}
