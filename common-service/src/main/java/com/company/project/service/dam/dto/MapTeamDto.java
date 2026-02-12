package com.company.project.service.dam.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MapTeamDto {
    private String orgnztId;
    private String orgnztNm;
    private String clYmd;
    private String knoUrl;
    private String lastUpdusrId;
}
