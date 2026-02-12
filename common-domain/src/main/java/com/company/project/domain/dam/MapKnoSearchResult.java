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
public class MapKnoSearchResult {
    private String knoTypeCd;
    private String knoTypeNm;
    private String orgnztNm;
    private String speId;
    private String knoUrl;
    private String clYmd;
    private String frstRegisterId;
    private LocalDateTime frstRegisterPnttm;
}
