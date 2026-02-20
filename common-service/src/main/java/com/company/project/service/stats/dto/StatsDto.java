package com.company.project.service.stats.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * ?듦퀎 寃곌낵 DTO
 */
@Getter
@Builder
public class StatsDto {
    // 寃??議곌굔
    private String fromDate;
    private String toDate;
    private String statsKind;
    private String detailStatsKind;
    private String pdKind;

    // 寃곌낵 ?곗씠??
    private String statsDate;
    private int statsCo;
    private int maxStatsCo;
    private int minStatsCo;

    // CRUD ?듦퀎
    private int creatCo;
    private int inqireCo;
    private int updtCo;
    private int deleteCo;
    private int outptCo;
    private int errorCo;

    // 寃뚯떆???듦퀎
    private int totInqireCo;
    private float avrgInqireCo;
    private String mxmmInqireBbsId;
    private String mxmmInqireBbsNm;
    private String topNtcepersonId;
    private int topNtcepersonCo;

    // 洹몃옒??
    private float maxUnit;
}
