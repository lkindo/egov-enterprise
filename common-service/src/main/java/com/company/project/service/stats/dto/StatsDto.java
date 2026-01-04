package com.company.project.service.stats.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * 통계 결과 DTO
 */
@Getter
@Builder
public class StatsDto {
    // 검색 조건
    private String fromDate;
    private String toDate;
    private String statsKind;
    private String detailStatsKind;
    private String pdKind;

    // 결과 데이터
    private String statsDate;
    private int statsCo;
    private int maxStatsCo;
    private int minStatsCo;

    // CRUD 통계
    private int creatCo;
    private int inqireCo;
    private int updtCo;
    private int deleteCo;
    private int outptCo;
    private int errorCo;

    // 게시판 통계
    private int totInqireCo;
    private float avrgInqireCo;
    private String mxmmInqireBbsId;
    private String mxmmInqireBbsNm;
    private String topNtcepersonId;
    private int topNtcepersonCo;

    // 그래프
    private float maxUnit;
}
