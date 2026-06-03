package nuri.business.service.stats.dto;

import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Getter;

/**
 * 통계 결과 DTO
 */
@Getter
@Builder
public class StatsDto {
    // 검색조건
    @Size(max = 20)
    private String fromDate;

    @Size(max = 20)
    private String toDate;

    @Size(max = 20)
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
    private int inqCnt;
    private int updtCo;
    private int deleteCo;
    private int outptCo;
    private int errorCo;

    // 게시물 통계
    private int totInqCnt;
    private float avrgInqCnt;
    private String mxmmInqireBbsId;
    private String mxmmInqireBbsNm;
    private String topNtcepersonId;
    private int topNtcepersonCo;

    // 기타
    private float maxUnit;
}
