package com.company.project.domain.digitalassetmanagement;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfessionalSearchResult {
    private String orgnztNm;
    private String knoTypeCd;
    private String knoTypeNm;
    private String userNm;
    private String appTypeCd; // EXPERT_GRAD
    private String speConfmDe;
    private String speId;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
}
