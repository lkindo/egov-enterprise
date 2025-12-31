package com.company.project.api.controller.stats;

import egovframework.com.sts.com.StatsVO;
import egovframework.com.sts.cst.service.EgovConectStatsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 접속 통계 API 컨트롤러
 */
@RestController
@RequestMapping("/api/v1/stats")
public class ConnectStatsController {

    private final EgovConectStatsService connectStatsService;

    public ConnectStatsController(
            @org.springframework.context.annotation.Lazy EgovConectStatsService connectStatsService) {
        this.connectStatsService = connectStatsService;
    }

    /**
     * 접속 통계 조회
     * 
     * @param pdKind          기간구분 (Y: 년도별, M: 월별, D: 일별)
     * @param statsKind       통계구분 (SERVICE: 서비스별, PRSONAL: 개인별)
     * @param fromDate        시작일자 (YYYYMMDD)
     * @param toDate          종료일자 (YYYYMMDD)
     * @param detailStatsKind 세부통계구분 (서비스명 또는 사용자ID)
     * @return 통계 결과 리스트
     */
    @GetMapping("/connect")
    public ResponseEntity<List<?>> getConnectStats(
            @RequestParam(required = false, defaultValue = "D") String pdKind,
            @RequestParam(required = false, defaultValue = "SERVICE") String statsKind,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String detailStatsKind) throws Exception {

        StatsVO statsVO = new StatsVO();
        statsVO.setPdKind(pdKind);
        statsVO.setStatsKind(statsKind);
        statsVO.setFromDate(fromDate != null ? fromDate.replace("-", "") : "");
        statsVO.setToDate(toDate != null ? toDate.replace("-", "") : "");
        statsVO.setDetailStatsKind(detailStatsKind);

        List<StatsVO> resultList = (List<StatsVO>) connectStatsService.selectConectStats(statsVO);

        return ResponseEntity.ok(resultList);
    }
}
