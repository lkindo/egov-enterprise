package com.company.project.service.dam.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MapKnoDto {
    private String knoTypeCd;
    private String knoTypeNm;
    private String orgnztId;
    private String orgnztNm;
    private String speId;
    private String clYmd;
    private String knoUrl;
    private String frstRegisterId;
}
