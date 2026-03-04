package com.company.project.service.stats.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * ????寃곌??DTO
 */
@Getter
@Builder
public class StatsDto {
    // 寃??議곌?
                     String fromDate;
    private String toDate;
    private String statsKind;
    private String detailStatsKind;
    private String pdKind;

    // 寃곌???곗씠??
    private String statsDate;
    private int statsCo;
    private int maxStatsCo;
    private int minStatsCo;

    // CRUD ????
                     int creatCo;
    private int inqireCo;
    private int updtCo;
    private int deleteCo;
    private int outptCo;
    private int errorCo;

    // 寃뚯???????
                     int totInqireCo;
    private float avrgInqireCo;
    private String mxmmInqireBbsId;
    private String mxmmInqireBbsNm;
    private String topNtcepersonId;
    private int topNtcepersonCo;

    // 洹몃???
    private float maxUnit;
}